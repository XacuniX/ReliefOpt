export const TARGET_SAMPLE_RATE = 16_000;

export class SpeechInputError extends Error {}

export function mixToMono(channelData) {
  if (!channelData.length) return new Float32Array();
  if (channelData.length === 1) return Float32Array.from(channelData[0]);

  const mono = new Float32Array(channelData[0].length);
  for (const channel of channelData) {
    for (let index = 0; index < mono.length; index += 1) {
      mono[index] += channel[index] / channelData.length;
    }
  }
  return mono;
}

export function resampleAudio(audio, sourceRate, targetRate = TARGET_SAMPLE_RATE) {
  if (sourceRate === targetRate) return audio;
  const output = new Float32Array(Math.max(1, Math.round(audio.length * targetRate / sourceRate)));
  const ratio = sourceRate / targetRate;

  for (let index = 0; index < output.length; index += 1) {
    const position = index * ratio;
    const left = Math.floor(position);
    const right = Math.min(left + 1, audio.length - 1);
    const fraction = position - left;
    output[index] = audio[left] * (1 - fraction) + audio[right] * fraction;
  }
  return output;
}

function rms(audio, start, end) {
  let sum = 0;
  for (let index = start; index < end; index += 1) sum += audio[index] ** 2;
  return Math.sqrt(sum / Math.max(1, end - start));
}

export function trimAndNormalizeSpeech(audio, sampleRate = TARGET_SAMPLE_RATE) {
  const frameLength = Math.max(1, Math.round(sampleRate * 0.02));
  const frameLevels = [];
  for (let start = 0; start < audio.length; start += frameLength) {
    frameLevels.push(rms(audio, start, Math.min(start + frameLength, audio.length)));
  }

  const peakLevel = Math.max(...frameLevels, 0);
  // Reject only a genuinely empty digital stream. Quiet microphones are
  // normalized below and malformed transcripts are rejected separately.
  if (peakLevel < 0.000_000_1) {
    throw new SpeechInputError(
      "No clear speech was captured. Check that the correct PC microphone is selected and try again.",
    );
  }

  const speechThreshold = Math.max(0.000_000_1, peakLevel * 0.1);
  const firstVoiceFrame = frameLevels.findIndex((level) => level >= speechThreshold);
  const lastVoiceFrame = frameLevels.findLastIndex((level) => level >= speechThreshold);
  if (firstVoiceFrame < 0 || lastVoiceFrame < 0) {
    throw new SpeechInputError(
      "No clear speech was captured. Please speak closer to the microphone and try again.",
    );
  }

  const padding = Math.round(sampleRate * 0.25);
  const start = Math.max(0, firstVoiceFrame * frameLength - padding);
  const end = Math.min(audio.length, (lastVoiceFrame + 1) * frameLength + padding);
  const spokenAudio = audio.slice(start, end);
  const level = rms(spokenAudio, 0, spokenAudio.length);
  const gain = Math.min(6, Math.max(0.4, 0.1 / level));

  for (let index = 0; index < spokenAudio.length; index += 1) {
    spokenAudio[index] = Math.max(-1, Math.min(1, spokenAudio[index] * gain));
  }
  return spokenAudio;
}

export function cleanTranscript(text) {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  const words = cleaned.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const uniqueWordCount = new Set(words).size;
  const wordCounts = words.reduce((counts, word) => {
    counts.set(word, (counts.get(word) || 0) + 1);
    return counts;
  }, new Map());
  const dominantWordCount = Math.max(...wordCounts.values(), 0);
  const isSingleWordLoop = words.length >= 4 && uniqueWordCount === 1;
  const isLowDiversityLoop = words.length >= 10 && uniqueWordCount / words.length < 0.35;
  const isDominantWordLoop = words.length >= 10 && dominantWordCount / words.length >= 0.4;
  if (isSingleWordLoop || isLowDiversityLoop || isDominantWordLoop) {
    throw new SpeechInputError(
      "Speech recognition got stuck repeating words. Record again or choose another microphone.",
    );
  }
  return cleaned;
}
