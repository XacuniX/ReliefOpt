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

/** Strategy pattern: urgency scoring policies can be exchanged by key. */
/**
 * @param {{daysWithoutFood?: number|null, waterLevelFt?: number|null, peopleCount?: number|null,
 * childrenPresent?: boolean|null, elderlyPresent?: boolean|null, distanceFromAidKm?: number|null}} [input]
 */
function ruleBasedUrgency({
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

export const urgencyStrategies = Object.freeze({ ruleBased: ruleBasedUrgency });

/**
 * Calculates urgency using the selected strategy. Null values never add risk.
 */
export function calculateUrgency(input = {}, strategy = "ruleBased") {
  const scorer = urgencyStrategies[strategy];
  if (!scorer) throw new Error(`Unknown urgency strategy: ${strategy}`);
  return scorer(input);
}
