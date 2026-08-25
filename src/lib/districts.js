// Canonical district names and approximate district-headquarters coordinates.
// Keep this list at exactly 64 entries so every district is available anywhere
// the app offers a location selector or map search.
export const districtCoords = Object.freeze({
  Bagerhat: [22.6516, 89.7856],
  Bandarban: [22.1953, 92.2184],
  Barguna: [22.1592, 90.1256],
  Barishal: [22.701, 90.3535],
  Bhola: [22.6859, 90.6482],
  Bogura: [24.8465, 89.3776],
  Brahmanbaria: [23.9571, 91.1119],
  Chandpur: [23.2333, 90.6712],
  Chapainawabganj: [24.5965, 88.2775],
  Chattogram: [22.3569, 91.7832],
  Chuadanga: [23.6402, 88.8418],
  "Cox's Bazar": [21.4272, 92.0058],
  Cumilla: [23.4607, 91.1809],
  Dhaka: [23.8103, 90.4125],
  Dinajpur: [25.6217, 88.6354],
  Faridpur: [23.607, 89.8429],
  Feni: [23.0159, 91.3976],
  Gaibandha: [25.3288, 89.528],
  Gazipur: [24.0023, 90.4264],
  Gopalganj: [23.0051, 89.8266],
  Habiganj: [24.3749, 91.4155],
  Jamalpur: [24.9375, 89.9378],
  Jashore: [23.1664, 89.2081],
  Jhalokathi: [22.6406, 90.1987],
  Jhenaidah: [23.5448, 89.1539],
  Joypurhat: [25.0968, 89.0227],
  Khagrachhari: [23.1193, 91.9847],
  Khulna: [22.8456, 89.5403],
  Kishoreganj: [24.4449, 90.7766],
  Kurigram: [25.8054, 89.6362],
  Kushtia: [23.9013, 89.1205],
  Lakshmipur: [22.9447, 90.8282],
  Lalmonirhat: [25.9162, 89.4451],
  Madaripur: [23.1641, 90.1897],
  Magura: [23.4873, 89.4199],
  Manikganj: [23.8617, 90.0003],
  Meherpur: [23.7622, 88.6318],
  Moulvibazar: [24.4829, 91.7774],
  Munshiganj: [23.5422, 90.5305],
  Mymensingh: [24.7471, 90.4203],
  Naogaon: [24.7936, 88.9318],
  Narail: [23.1725, 89.5127],
  Narayanganj: [23.6238, 90.5],
  Narsingdi: [23.9322, 90.7151],
  Natore: [24.4206, 89.0003],
  Netrokona: [24.8835, 90.728],
  Nilphamari: [25.9318, 88.856],
  Noakhali: [22.8696, 91.0995],
  Pabna: [24.0064, 89.2372],
  Panchagarh: [26.3411, 88.5542],
  Patuakhali: [22.3596, 90.3299],
  Pirojpur: [22.5841, 89.972],
  Rajbari: [23.7574, 89.6445],
  Rajshahi: [24.3745, 88.6042],
  Rangamati: [22.7324, 92.2985],
  Rangpur: [25.7439, 89.2752],
  Satkhira: [22.7185, 89.0705],
  Shariatpur: [23.2423, 90.4348],
  Sherpur: [25.0205, 90.0153],
  Sirajganj: [24.4534, 89.7007],
  Sunamganj: [25.0658, 91.395],
  Sylhet: [24.8949, 91.8687],
  Tangail: [24.2513, 89.9167],
  Thakurgaon: [26.0337, 88.4617],
});

export const districtNames = Object.freeze(Object.keys(districtCoords));

// Common former spellings, spacing variants, and likely English ASR output.
const DISTRICT_ALIASES = Object.freeze({
  Barishal: ["Barisal"],
  Bogura: ["Bogra"],
  Brahmanbaria: ["Brahman Baria", "Brahman Bariya"],
  Chapainawabganj: ["Chapai Nawabganj", "Chapai Nawab Ganj"],
  Chattogram: ["Chittagong"],
  "Cox's Bazar": ["Coxs Bazar", "Cox Bazar", "Cox's Bazaar", "Coxs Bazaar"],
  Cumilla: ["Comilla"],
  Jashore: ["Jessore"],
  Jhalokathi: ["Jhalokati", "Jhalakathi"],
  Jhenaidah: ["Jhenaidaha"],
  Khagrachhari: ["Khagrachari", "Khagra Chari", "Khagra Chhari"],
  Lakshmipur: ["Laxmipur", "Lakshmi Pur"],
  Moulvibazar: ["Maulvibazar", "Moulvi Bazar", "Maulvi Bazar"],
  Munshiganj: ["Munshi Ganj"],
  Mymensingh: ["Mymen Singh"],
  Netrokona: ["Netrakona", "Netra Kona"],
  Shariatpur: ["Shariat Pur"],
  Sirajganj: ["Siraj Ganj"],
  Sunamganj: ["Sunam Ganj"],
  Thakurgaon: ["Thakur Gaon"],
});

function normalizeLocationText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019'`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const SEARCHABLE_DISTRICTS = Object.freeze(
  districtNames
    .flatMap((name) => [name, ...(DISTRICT_ALIASES[name] || [])].map((alias) => ({
      name,
      alias: normalizeLocationText(alias),
    }))),
);

export function findDistrictName(value) {
  const normalized = normalizeLocationText(value);
  if (!normalized) return null;

  const padded = ` ${normalized} `;
  let bestMatch = null;
  for (const candidate of SEARCHABLE_DISTRICTS) {
    const index = padded.indexOf(` ${candidate.alias} `);
    if (index === -1) continue;
    if (
      !bestMatch ||
      index < bestMatch.index ||
      (index === bestMatch.index && candidate.alias.length > bestMatch.alias.length)
    ) {
      bestMatch = { ...candidate, index };
    }
  }

  return bestMatch?.name ?? null;
}
