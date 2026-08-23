import test from "node:test";
import assert from "node:assert/strict";
import { extractFields, normaliseDigits } from "../src/lib/extract.js";

test("normaliseDigits converts Bengali digits", () => {
  assert.equal(normaliseDigits("০১২৩৪৫৬৭৮৯"), "0123456789");
});

test("extracts English, Banglish, and Bangla reports", () => {
  const english = extractFields(
    "Dhaka water 5 feet, 200 people, children, no food for 3 days",
  );
  assert.deepEqual(
    {
      location: english.location,
      water: english.waterLevelFt,
      people: english.peopleCount,
      days: english.daysWithoutFood,
      children: english.childrenPresent,
    },
    { location: "Dhaka", water: 5, people: 200, days: 3, children: true },
  );

  const banglish = extractFields(
    "Sylhet e pani 6 fut, 50 jon, baccha, 2 din khabar nai",
  );
  assert.deepEqual(
    {
      location: banglish.location,
      water: banglish.waterLevelFt,
      people: banglish.peopleCount,
      days: banglish.daysWithoutFood,
      children: banglish.childrenPresent,
    },
    { location: "Sylhet", water: 6, people: 50, days: 2, children: true },
  );

  const bangla = extractFields(
    "সিলেটে পানি ৭ ফুট, ২৫০ জন মানুষ, শিশু ও বৃদ্ধ, ৪ দিন খাবার নেই",
  );
  assert.deepEqual(
    {
      location: bangla.location,
      water: bangla.waterLevelFt,
      people: bangla.peopleCount,
      days: bangla.daysWithoutFood,
      children: bangla.childrenPresent,
      elderly: bangla.elderlyPresent,
    },
    {
      location: "Sylhet",
      water: 7,
      people: 250,
      days: 4,
      children: true,
      elderly: true,
    },
  );
});

test("missing extraction values remain null or false", () => {
  assert.deepEqual(extractFields("").location, null);
  const result = extractFields("Help is requested");
  assert.equal(result.waterLevelFt, null);
  assert.equal(result.peopleCount, null);
  assert.equal(result.daysWithoutFood, null);
  assert.equal(result.childrenPresent, false);
});
