const UNKNOWN = "Unknown";

const isUnknown = (value) => value === null || value === undefined;

function numericFactor(label, value, unit, points, maxPoints) {
  return {
    label,
    value: isUnknown(value) ? UNKNOWN : `${value} ${unit} (${points}/${maxPoints})`,
    points,
    maxPoints,
  };
}

// Strategy pattern. Every strategy follows the same calculate(input) contract.
// More disaster-specific strategies can be registered without changing forms.
const urgencyStrategies = {
  standard: calculateStandardUrgency,
  flood: calculateFloodUrgency,
};

export function getUrgencyStrategyName(reportType) {
  return String(reportType || "").toLowerCase() === "flood" ? "flood" : "standard";
}

export function availableUrgencyStrategies() {
  return Object.keys(urgencyStrategies);
}

/**
 * Calculates urgency using five factors whose maximum values total 100.
 * Null values represent missing information and never add points.
 */
export function calculateUrgency(input = {}, strategyName = "standard") {
  const strategy = urgencyStrategies[strategyName] || urgencyStrategies.standard;
  return strategy(input);
}

function calculateStandardUrgency({
  daysWithoutFood,
  waterLevelFt,
  peopleCount,
  childrenPresent,
  elderlyPresent,
  distanceFromAidKm,
} = {}) {
  let foodPoints = 0;
  if (!isUnknown(daysWithoutFood)) {
    if (daysWithoutFood >= 4) foodPoints = 25;
    else if (daysWithoutFood === 3) foodPoints = 20;
    else if (daysWithoutFood === 2) foodPoints = 15;
    else if (daysWithoutFood === 1) foodPoints = 8;
  }

  let waterPoints = 0;
  if (!isUnknown(waterLevelFt)) {
    if (waterLevelFt > 6) waterPoints = 20;
    else if (waterLevelFt > 4) waterPoints = 17;
    else if (waterLevelFt >= 2) waterPoints = 12;
    else if (waterLevelFt > 0) waterPoints = 6;
  }

  let peoplePoints = 0;
  if (!isUnknown(peopleCount)) {
    if (peopleCount >= 1000) peoplePoints = 20;
    else if (peopleCount >= 200) peoplePoints = 17;
    else if (peopleCount >= 50) peoplePoints = 13;
    else if (peopleCount >= 10) peoplePoints = 8;
    // A confirmed zero is a zero-impact report; 1-9 people score 4.
    else if (peopleCount > 0) peoplePoints = 4;
  }

  const childrenPoints = childrenPresent === true ? 12 : 0;
  const elderlyPoints = elderlyPresent === true ? 8 : 0;
  const vulnerablePoints = childrenPoints + elderlyPoints;
  const vulnerableUnknown = isUnknown(childrenPresent) || isUnknown(elderlyPresent);

  let distancePoints = 0;
  if (!isUnknown(distanceFromAidKm)) {
    if (distanceFromAidKm >= 30) distancePoints = 15;
    else if (distanceFromAidKm >= 15) distancePoints = 10;
    else if (distanceFromAidKm >= 5) distancePoints = 5;
  }

  const score = Math.min(
    100,
    Math.max(0, foodPoints + waterPoints + peoplePoints + vulnerablePoints + distancePoints)
  );

  return {
    score,
    zone: score < 40 ? "green" : score < 70 ? "amber" : "red",
    factors: [
      numericFactor("Days Without Food", daysWithoutFood, "days", foodPoints, 25),
      numericFactor("Water Level", waterLevelFt, "ft", waterPoints, 20),
      numericFactor("People Affected", peopleCount, "people", peoplePoints, 20),
      {
        label: "Vulnerable People",
        value: vulnerableUnknown
          ? UNKNOWN
          : `${[
              childrenPresent ? "Children" : null,
              elderlyPresent ? "Elderly" : null,
            ].filter(Boolean).join(", ") || "None"} (${vulnerablePoints}/20)`,
        points: vulnerablePoints,
        maxPoints: 20,
      },
      numericFactor("Distance from Aid", distanceFromAidKm, "km", distancePoints, 15),
    ],
  };
}

/** Flood reports use the standard humanitarian factors plus a water-level
 * escalation. This is intentionally isolated from the generic strategy. */
function calculateFloodUrgency(input = {}) {
  const base = calculateStandardUrgency(input);
  const waterLevel = Number(input.waterLevelFt);
  const escalation = Number.isFinite(waterLevel) && waterLevel >= 6 ? 10 : 0;
  const score = Math.min(100, base.score + escalation);
  return {
    ...base,
    score,
    zone: score < 40 ? "green" : score < 70 ? "amber" : "red",
    factors: [
      ...base.factors,
      numericFactor("Flood escalation", escalation ? waterLevel : null, "ft", escalation, 10),
    ],
  };
}
