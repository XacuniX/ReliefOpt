import { Capacitor, registerPlugin } from "@capacitor/core";

const NativeAudioRecorder = registerPlugin("NativeAudioRecorder");
const PCM_CHUNK_SAMPLES = 8_192;

export function isNativeAndroidAudioRecorderAvailable() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export function decodePcm16Base64(value) {
  const raw = atob(value);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1)
    bytes[index] = raw.charCodeAt(index);

  const audio = new Float32Array(Math.floor(bytes.length / 2));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let index = 0; index < audio.length; index += 1) {
    audio[index] = view.getInt16(index * 2, true) / 32_768;
  }
  return audio;
}

export async function readChunkedPcm(
  metadata,
  readChunk,
  discardCapture = async () => {},
) {
  const totalSamples = Number(metadata?.sampleCount);
  if (!Number.isSafeInteger(totalSamples) || totalSamples <= 0) {
    throw new Error("Android returned an invalid microphone sample count.");
  }

  const audio = new Float32Array(totalSamples);
  let offsetSamples = 0;
  try {
    while (offsetSamples < totalSamples) {
      const requestedSamples = Math.min(
        PCM_CHUNK_SAMPLES,
        totalSamples - offsetSamples,
      );
      const result = await readChunk({
        offsetSamples,
        sampleCount: requestedSamples,
      });
      const chunk = decodePcm16Base64(result?.pcmBase64 || "");
      const returnedOffset = Number(result?.offsetSamples);
      const returnedSamples = Number(result?.sampleCount);
      if (
        returnedOffset !== offsetSamples ||
        returnedSamples !== chunk.length ||
        chunk.length <= 0 ||
        chunk.length > requestedSamples
      ) {
        throw new Error(
          "Android returned an incomplete microphone audio chunk.",
        );
      }
      audio.set(chunk, offsetSamples);
      offsetSamples += chunk.length;
    }
  } finally {
    await Promise.resolve(discardCapture()).catch(() => {});
  }

  if (offsetSamples !== totalSamples) {
    throw new Error(
      "Android did not return the complete microphone recording.",
    );
  }
  return audio;
}

async function readCapturedAudio(metadata) {
  return readChunkedPcm(
    metadata,
    (options) => NativeAudioRecorder.readChunk(options),
    () => NativeAudioRecorder.discardCapture(),
  );
}

export async function createNativeAndroidRecorder() {
  const permission = await NativeAudioRecorder.requestMicrophonePermission();
  if (!permission?.granted)
    throw new Error("Microphone permission was denied.");

  let started = false;
  return {
    start: async () => {
      await NativeAudioRecorder.start();
      started = true;
    },
    getLevel: async () => {
      const result = await NativeAudioRecorder.getLevel();
      return Number(result?.level) || 0;
    },
    stop: async () => {
      if (!started) return null;
      started = false;
      const result = await NativeAudioRecorder.stop();
      const audio = await readCapturedAudio(result);
      if (!audio.length) return null;
      return {
        audio,
        sampleRate: Number(result?.sampleRate) || 16_000,
        durationMs: Number(result?.durationMs) || 0,
      };
    },
  };
}
