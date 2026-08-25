const DISTRICT_CODES = Object.freeze({
  Bagerhat: "BGH",
  Bandarban: "BDN",
  Barguna: "BGN",
  Barishal: "BSL",
  Bhola: "BHL",
  Bogura: "BGR",
  Brahmanbaria: "BBA",
  Chandpur: "CDP",
  Chapainawabganj: "CNJ",
  Chattogram: "CTG",
  Chuadanga: "CUA",
  "Cox's Bazar": "CXB",
  Cumilla: "CML",
  Dhaka: "DHK",
  Dinajpur: "DNP",
  Faridpur: "FDP",
  Feni: "FEN",
  Gaibandha: "GBD",
  Gazipur: "GZP",
  Gopalganj: "GPG",
  Habiganj: "HBG",
  Jamalpur: "JMP",
  Jashore: "JSR",
  Jhalokathi: "JKT",
  Jhenaidah: "JHD",
  Joypurhat: "JPH",
  Khagrachhari: "KGC",
  Khulna: "KHL",
  Kishoreganj: "KSG",
  Kurigram: "KRG",
  Kushtia: "KST",
  Lakshmipur: "LKP",
  Lalmonirhat: "LLM",
  Madaripur: "MDP",
  Magura: "MGR",
  Manikganj: "MKG",
  Meherpur: "MHP",
  Moulvibazar: "MLB",
  Munshiganj: "MSG",
  Mymensingh: "MYM",
  Naogaon: "NGN",
  Narail: "NRL",
  Narayanganj: "NRJ",
  Narsingdi: "NSD",
  Natore: "NTR",
  Netrokona: "NTK",
  Nilphamari: "NPM",
  Noakhali: "NOK",
  Pabna: "PBN",
  Panchagarh: "PNG",
  Patuakhali: "PTK",
  Pirojpur: "PRJ",
  Rajbari: "RJB",
  Rajshahi: "RJH",
  Rangamati: "RGM",
  Rangpur: "RGP",
  Satkhira: "STK",
  Shariatpur: "SHP",
  Sherpur: "SRP",
  Sirajganj: "SRJ",
  Sunamganj: "SNG",
  Sylhet: "SYL",
  Tangail: "TNG",
  Thakurgaon: "THG",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Dhaka",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getDistrictCode(district) {
  const normalized = String(district || "").trim();
  if (DISTRICT_CODES[normalized]) return DISTRICT_CODES[normalized];

  const fallback = normalized.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
  return fallback.padEnd(3, "X") || "UNK";
}

export function getReportDateKey(time = new Date()) {
  const date = new Date(time);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const parts = Object.fromEntries(
    DATE_FORMATTER.formatToParts(safeDate)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}${parts.month}${parts.day}`;
}

export function getReportReferencePrefix({ district, time }) {
  return `${getDistrictCode(district)}-${getReportDateKey(time)}`;
}

export function createReportReference(report, existingReports = []) {
  const prefix = getReportReferencePrefix(report);
  const pattern = new RegExp(`^${prefix}-(\\d{4})$`);
  const nextSequence = existingReports.reduce((highest, existingReport) => {
    const match = String(existingReport.reference || "").match(pattern);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0) + 1;

  return `${prefix}-${String(nextSequence).padStart(4, "0")}`;
}

export function getReportReference(report) {
  return report?.reference || report?.id || "—";
}
