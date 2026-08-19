import { pipeline, env } from "@huggingface/transformers";

env.allowLocalModels = false; // always fetch from the internet the first time

const MODEL_ID = "Xenova/whisper-base";
let transcriber = null;

/** Loads the AI model. Call once. onProgress gets {progress: 0-100}. */
export async function loadModel(onProgress) {
  if (transcriber) return transcriber;
  transcriber = await pipeline("automatic-speech-recognition", MODEL_ID, {
    dtype: "q8",
    device: navigator.gpu ? "webgpu" : "wasm",
    progress_callback: onProgress,
  });
  return transcriber;
}

/** Starts recording. Returns an object with a .stop() that resolves to a Blob. */
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "";
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const stopped = new Promise((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType || "audio/webm" }));
    recorder.onerror = (event) => reject(event.error || new Error("Recording failed"));
  });

  recorder.start();
  return {
    stop: async () => {
      recorder.stop();
      const blob = await stopped;
      stream.getTracks().forEach((track) => track.stop());
      return blob;
    },
  };
}

/** Blob -> plain text string. */
export async function transcribe(blob, language = "bn") {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext({ sampleRate: 16000 }); // 16000 is mandatory
  const decoded = await audioCtx.decodeAudioData(arrayBuffer);
  const audio = decoded.getChannelData(0); // channel 0 = mono

  const model = await loadModel();
  const result = await model(audio, {
    language, // Bangla by default. Use "en" if the user picked English.
    task: "transcribe", // NOT "translate" — translate would give you English
    chunk_length_s: 30,
    return_timestamps: false,
  });
  return result.text;
}
