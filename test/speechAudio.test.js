import test from "node:test";
import assert from "node:assert/strict";
import {
  SpeechInputError,
  cleanTranscript,
  mixToMono,
  resampleAudio,
  trimAndNormalizeSpeech,
} from "../src/lib/speechAudio.js";

test("speech audio is mixed and resampled to the model rate", () => {
  for (const value of mixToMono([
    Float32Array.from([0.2, 0.6]),
    Float32Array.from([0.6, 0.2]),
  ])) {
    assert.ok(Math.abs(value - 0.4) < 0.000_001);
  }
  assert.equal(
    resampleAudio(Float32Array.from([0, 1, 0, -1]), 8_000, 16_000).length,
    8,
  );
});

test("speech audio rejects silence and removes leading and trailing silence", () => {
  assert.throws(
    () => trimAndNormalizeSpeech(new Float32Array(320)),
    SpeechInputError,
  );
  const audio = Float32Array.from([
    ...new Float32Array(10),
    0.1,
    0.2,
    0.1,
    ...new Float32Array(10),
  ]);
  assert.ok(trimAndNormalizeSpeech(audio, 10).length < audio.length);
});

test("very quiet microphone speech is normalized instead of rejected", () => {
  const quietSpeech = Float32Array.from(
    { length: 1_600 },
    (_, index) => Math.sin(index / 5) * 0.0001,
  );
  const normalized = trimAndNormalizeSpeech(quietSpeech, 16_000);

  assert.ok(normalized.some((sample) => Math.abs(sample) > 0.0001));
});

test("repeated hallucinated tokens are rejected", () => {
  assert.throws(() => cleanTranscript("A A A A A"), SpeechInputError);
  assert.throws(
    () =>
      cleanTranscript(
        "There's there is there are there there is a there are there yeah yeah yeah yeah",
      ),
    SpeechInputError,
  );
  assert.equal(
    cleanTranscript("Water is rising near Sylhet"),
    "Water is rising near Sylhet",
  );
});
