import test from "node:test";
import assert from "node:assert/strict";
import {
  decodePcm16Base64,
  readChunkedPcm,
} from "../src/lib/nativeAudioRecorder.js";

function encodePcm16(samples) {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  samples.forEach((sample, index) => view.setInt16(index * 2, sample, true));
  return Buffer.from(bytes).toString("base64");
}

test("PCM16 Base64 decoding preserves signed little-endian samples", () => {
  const decoded = decodePcm16Base64(
    encodePcm16([-32_768, -16_384, 0, 16_384, 32_767]),
  );
  assert.deepEqual(Array.from(decoded.slice(0, 4)), [-1, -0.5, 0, 0.5]);
  assert.ok(Math.abs(decoded[4] - 32_767 / 32_768) < 0.000_001);
});

test("Android PCM transfer reconstructs recordings across every bridge chunk", async () => {
  const samples = Array.from(
    { length: 20_000 },
    (_, index) => ((index * 97) % 65_536) - 32_768,
  );
  const offsets = [];
  let discarded = false;

  const audio = await readChunkedPcm(
    { sampleCount: samples.length },
    async ({ offsetSamples, sampleCount }) => {
      offsets.push(offsetSamples);
      const chunk = samples.slice(offsetSamples, offsetSamples + sampleCount);
      return {
        pcmBase64: encodePcm16(chunk),
        offsetSamples,
        sampleCount: chunk.length,
        totalSamples: samples.length,
      };
    },
    async () => {
      discarded = true;
    },
  );

  assert.deepEqual(offsets, [0, 8_192, 16_384]);
  assert.equal(audio.length, samples.length);
  assert.equal(discarded, true);
  for (const index of [0, 8_191, 8_192, 16_383, 16_384, 19_999]) {
    assert.equal(audio[index], samples[index] / 32_768);
  }
});

test("Android PCM transfer rejects a truncated or misordered chunk", async () => {
  await assert.rejects(
    () =>
      readChunkedPcm({ sampleCount: 10 }, async () => ({
        pcmBase64: encodePcm16([1, 2]),
        offsetSamples: 1,
        sampleCount: 2,
      })),
    /incomplete microphone audio chunk/,
  );
});
