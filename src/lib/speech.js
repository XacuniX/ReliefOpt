import { Capacitor } from "@capacitor/core";
import {
  cleanTranscript,
  mixToMono,
  resampleAudio,
  SpeechInputError,
  TARGET_SAMPLE_RATE,
  trimAndNormalizeSpeech,
} from "./speechAudio";

export { SpeechInputError } from "./speechAudio";

const MODEL_ID = "Xenova/whisper-base.en";
export const isAndroidModelBundled = Capacitor.getPlatform() === "android";
const MODEL_DTYPE = isAndroidModelBundled ? "q4f16" : "q8";
let transcriber = null;
let transcriberPromise = null;
let transformersPromise = null;

async function getPreferredDevices() {
  if (!navigator.gpu?.requestAdapter) return ["wasm"];
  try {
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
    return adapter ? ["webgpu", "wasm"] : ["wasm"];
  } catch {
    return ["wasm"];
  }
}

async function getTransformers() {
  if (!transformersPromise) {
    transformersPromise = import("@huggingface/transformers").then((module) => {
      // The Android build packages this model in Capacitor's /models/<model id>/ assets.
      // Browsers retain the normal Hugging Face download-and-cache behavior.
      module.env.allowLocalModels = isAndroidModelBundled;
      module.env.allowRemoteModels = !isAndroidModelBundled;
      if (isAndroidModelBundled) {
        module.env.localModelPath = "/models/";
      }
      if (module.env.backends?.onnx?.wasm) {
        // A single-thread fallback works without cross-origin isolation and
        // avoids worker startup failures on ordinary web hosting.
        module.env.backends.onnx.wasm.numThreads = globalThis.crossOriginIsolated ? 0 : 1;
        module.env.backends.onnx.wasm.proxy = false;
      }
      return module;
    });
  }
  return transformersPromise;
}

/**
 * Loads the AI model. Call once. Transformers.js emits both per-file progress
 * and aggregate progress; only the aggregate byte progress is forwarded so
 * the UI cannot jump when the next model file starts downloading.
 */
export async function loadModel(onProgress) {
  if (transcriber) return transcriber;
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const { pipeline } = await getTransformers();
      let lastProgress = 0;
      const reportProgress = (info) => {
        if (info?.status === "progress_total" && Number.isFinite(info.progress)) {
          const progress = Math.min(100, Math.max(lastProgress, info.progress));
          lastProgress = progress;
          onProgress?.({ ...info, progress });
        } else if (info?.status === "ready") {
          lastProgress = 100;
          onProgress?.({ ...info, progress: 100 });
        }
      };
      const failures = [];
      for (const device of await getPreferredDevices()) {
        try {
          transcriber = await pipeline("automatic-speech-recognition", MODEL_ID, {
            dtype: MODEL_DTYPE,
            device,
            progress_callback: reportProgress,
          });
          return transcriber;
        } catch (error) {
          failures.push(`${device}: ${error?.message || "unknown initialization error"}`);
        }
      }
      throw new Error(failures.join(" | "));
    })().catch((error) => {
      transcriberPromise = null;
      throw error;
    });
  }
  return transcriberPromise;
}

export async function listMicrophones() {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === "audioinput" && device.deviceId !== "default")
    .map((device, index) => ({
      value: device.deviceId,
      label: device.label || `Microphone ${index + 1}`,
    }));
}

/** Captures raw microphone PCM without passing through MediaRecorder codecs. */
export async function startRecording(deviceId = "") {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new SpeechInputError(
      "Microphone recording is unavailable in this browser. Use a current browser over HTTPS or localhost.",
    );
  }

  const audioConstraints = {
    audio: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  };

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    throw new SpeechInputError("This browser does not support raw microphone recording.");
  }

  // Start both permission-sensitive operations synchronously from the user's
  // click. Awaiting the model or permission prompt first can consume the
  // browser's transient user activation and leave the audio context suspended.
  const audioContext = new AudioContextClass();
  const resumePromise = audioContext.resume();
  const streamPromise = navigator.mediaDevices.getUserMedia(audioConstraints);
  let stream;
  try {
    const [streamResult, resumeResult] = await Promise.allSettled([streamPromise, resumePromise]);
    if (streamResult.status === "fulfilled") stream = streamResult.value;
    if (streamResult.status === "rejected") throw streamResult.reason;
    if (resumeResult.status === "rejected") throw resumeResult.reason;
  } catch (error) {
    stream?.getTracks().forEach((track) => track.stop());
    if (audioContext.state !== "closed") {
      await audioContext.close().catch(() => {});
    }
    throw error;
  }

  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const silentOutput = audioContext.createGain();
  silentOutput.gain.value = 0;
  const chunks = [];
  let currentLevel = 0;
  let started = false;
  let stopped = false;

  processor.onaudioprocess = (event) => {
    const channels = Array.from(
      { length: event.inputBuffer.numberOfChannels },
      (_, index) => event.inputBuffer.getChannelData(index),
    );
    const mono = mixToMono(channels);
    chunks.push(mono);

    let sum = 0;
    for (const sample of mono) sum += sample ** 2;
    currentLevel = Math.min(100, Math.round(Math.sqrt(sum / Math.max(1, mono.length)) * 1_000));
  };

  return {
    start: () => {
      if (stopped) throw new SpeechInputError("Recording has already stopped.");
      if (started) return;
      started = true;
      source.connect(processor);
      processor.connect(silentOutput);
      silentOutput.connect(audioContext.destination);
    },
    getLevel: () => currentLevel,
    stop: async () => {
      if (stopped) throw new SpeechInputError("Recording has already stopped.");
      stopped = true;
      processor.onaudioprocess = null;
      if (started) {
        source.disconnect();
        processor.disconnect();
        silentOutput.disconnect();
      }
      stream.getTracks().forEach((track) => track.stop());
      const sampleRate = audioContext.sampleRate;
      await audioContext.close();

      const sampleCount = chunks.reduce((total, chunk) => total + chunk.length, 0);
      if (!sampleCount) {
        if (!started) return null;
        throw new SpeechInputError("The microphone did not return any audio samples.");
      }
      const audio = new Float32Array(sampleCount);
      let offset = 0;
      for (const chunk of chunks) {
        audio.set(chunk, offset);
        offset += chunk.length;
      }
      return { audio, sampleRate };
    },
  };
}

/** Raw microphone PCM -> plain text string. */
export async function transcribe(recording) {
  const audio = trimAndNormalizeSpeech(
    resampleAudio(recording.audio, recording.sampleRate, TARGET_SAMPLE_RATE),
  );

  const model = await loadModel();
  const durationSeconds = audio.length / TARGET_SAMPLE_RATE;
  const result = await model(audio, {
    chunk_length_s: 30,
    return_timestamps: false,
    max_new_tokens: Math.min(128, Math.max(32, Math.ceil(durationSeconds * 6 + 12))),
    no_repeat_ngram_size: 3,
  });
  return cleanTranscript(result.text);
}
