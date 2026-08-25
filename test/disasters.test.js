import test from "node:test";
import assert from "node:assert/strict";
import { disasterTypes, findDisasterType } from "../src/lib/disasters.js";
import { districtNames } from "../src/lib/districts.js";
import { extractFields } from "../src/lib/extract.js";

test("disaster vocabulary maps broad report wording to canonical types", () => {
  const examples = new Map([
    ["Flash flooding has submerged the village", "Flood"],
    ["A tropical storm is approaching the coast", "Cyclone"],
    ["Strong tremors damaged several homes", "Earthquake"],
    ["A warehouse blaze is spreading", "Fire"],
    ["A mudslide blocked the hill road", "Landslide"],
    ["The dry spell caused crop failure", "Drought"],
    ["Riverbank erosion destroyed several houses", "River Erosion"],
    ["A twister damaged the market", "Tornado"],
    ["Multiple lightning strikes injured residents", "Thunderstorm"],
    ["Extreme heat is causing illness", "Heatwave"],
    ["A severe cold spell has started", "Cold Wave"],
    ["A tidal wave reached the coast", "Tsunami"],
    ["A cholera outbreak was reported", "Epidemic"],
    ["A collapsed building trapped residents", "Building Collapse"],
    ["A boiler explosion damaged the factory", "Explosion"],
    ["A toxic gas leak is affecting the area", "Chemical Spill"],
    ["A boat capsized with passengers aboard", "Transport Accident"],
  ]);

  for (const [transcript, expected] of examples) {
    assert.equal(findDisasterType(transcript), expected, transcript);
  }
  assert.equal(disasterTypes.length, 18);
  assert.equal(findDisasterType("People need emergency shelter"), null);
});

test("voice extraction detects every district alongside a disaster type", () => {
  for (const district of districtNames) {
    const result = extractFields(`Flood reported in ${district}`);
    assert.equal(result.location, district, district);
    assert.equal(result.disasterType, "Flood", district);
  }
});

test("voice extraction understands expanded emergency-report wording", () => {
  const result = extractFields(
    "Flash flooding in Comilla with 4 ft floodwater, 12 residents stranded, including babies and seniors without meals for 2 days",
  );

  assert.deepEqual(
    {
      language: result.language,
      disasterType: result.disasterType,
      location: result.location,
      waterLevelFt: result.waterLevelFt,
      peopleCount: result.peopleCount,
      daysWithoutFood: result.daysWithoutFood,
      childrenPresent: result.childrenPresent,
      elderlyPresent: result.elderlyPresent,
    },
    {
      language: "en",
      disasterType: "Flood",
      location: "Cumilla",
      waterLevelFt: 4,
      peopleCount: 12,
      daysWithoutFood: 2,
      childrenPresent: true,
      elderlyPresent: true,
    },
  );
});
