import { cityCoords } from "../mockData.js";

const BN_DIGITS = {
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
  "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
};
export const normaliseDigits = (s) =>
  String(s).replace(/[০-৯]/g, (d) => BN_DIGITS[d]);

const KEYWORDS = {
  water: ["পানি", "পানির", "জল", "pani", "panir", "jol", "water"],
  feet: ["ফুট", "foot", "feet", "fut"],
  people: ["জন", "মানুষ", "লোক", "jon", "manush", "lok", "people"],
  children: ["বাচ্চা", "শিশু", "baccha", "bacha", "shishu", "children", "kids"],
  elderly: ["বৃদ্ধ", "বয়স্ক", "briddho", "boyosko", "elderly", "old"],
  food: ["খাবার", "খাওয়া", "khabar", "khawa", "food"],
  days: ["দিন", "din", "day", "days"],
};

// cityCoords keys are English; Whisper transcripts are Bengali script. Match
// both by giving each city its English name plus common Bangla spellings.
const BN_CITY_NAMES = {
  Sylhet: ["সিলেট"],
  Barishal: ["বরিশাল"],
  Rangpur: ["রংপুর", "রাঙ্গপুর"],
  Cumilla: ["কুমিল্লা"],
  Dhaka: ["ঢাকা"],
  Chattogram: ["চট্টগ্রাম"],
  Mymensingh: ["ময়মনসিংহ", "ময়মনসিংহ"],
  Noakhali: ["নোয়াখালী", "নোয়াখালি"],
  Khulna: ["খুলনা"],
  Rajshahi: ["রাজশাহী", "রাজশাহি"],
  Mirpur: ["মিরপুর"],
};

const LOCATIONS = Object.fromEntries(
  Object.keys(cityCoords).map((name) => [
    name,
    [name, ...(BN_CITY_NAMES[name] || [])].map((alias) => alias.toLowerCase()),
  ])
);

/** @returns {{ index: number, value: number }[]} */
function findNumbers(text) {
  return Array.from(text.matchAll(/\d+(\.\d+)?/g)).map((m) => ({
    index: m.index,
    value: Number(m[0]),
  }));
}

/** @returns {number[]} character indexes where any alias of the given categories appears */
function findKeywordHits(text, categories) {
  const hits = [];
  for (const category of categories) {
    for (const alias of KEYWORDS[category]) {
      const lower = alias.toLowerCase();
      let from = 0;
      let index = text.toLowerCase().indexOf(lower, from);
      while (index !== -1) {
        hits.push(index);
        from = index + lower.length;
        index = text.toLowerCase().indexOf(lower, from);
      }
    }
  }
  return hits;
}

function nearestNumber(numbers, keywordHits) {
  if (numbers.length === 0 || keywordHits.length === 0) return null;
  let best = null;
  let bestDistance = Infinity;
  for (const number of numbers) {
    for (const hit of keywordHits) {
      const distance = Math.abs(number.index - hit);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = number.value;
      }
    }
  }
  return best;
}

/**
 * Pulls structured facts out of a spoken/typed transcript.
 * @param {string} rawTranscript
 * @returns {import('./contracts').VoiceExtraction}
 */
export function extractFields(rawTranscript) {
  const text = normaliseDigits(String(rawTranscript ?? ""));
  const numbers = findNumbers(text);

  const waterHits = findKeywordHits(text, ["water", "feet"]);
  const peopleHits = findKeywordHits(text, ["people"]);
  const daysHits = findKeywordHits(text, ["days"]);
  const foodHits = findKeywordHits(text, ["food"]);

  const matchedLocation = Object.entries(LOCATIONS).find(([, aliases]) =>
    aliases.some((alias) => text.toLowerCase().includes(alias))
  );

  return {
    transcript: rawTranscript,
    language: "bn",
    location: matchedLocation ? matchedLocation[0] : null,
    waterLevelFt: nearestNumber(numbers, waterHits),
    peopleCount: nearestNumber(numbers, peopleHits),
    childrenPresent: findKeywordHits(text, ["children"]).length > 0,
    elderlyPresent: findKeywordHits(text, ["elderly"]).length > 0,
    daysWithoutFood:
      foodHits.length > 0 ? nearestNumber(numbers, daysHits) : null,
  };
}
