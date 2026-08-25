import test from "node:test";
import assert from "node:assert/strict";
import {
  districtCoords,
  districtNames,
  findDistrictName,
} from "../src/lib/districts.js";
import { getDistrictCode } from "../src/lib/reportReference.js";

const EXPECTED_DISTRICTS = [
  "Bagerhat",
  "Bandarban",
  "Barguna",
  "Barishal",
  "Bhola",
  "Bogura",
  "Brahmanbaria",
  "Chandpur",
  "Chapainawabganj",
  "Chattogram",
  "Chuadanga",
  "Cox's Bazar",
  "Cumilla",
  "Dhaka",
  "Dinajpur",
  "Faridpur",
  "Feni",
  "Gaibandha",
  "Gazipur",
  "Gopalganj",
  "Habiganj",
  "Jamalpur",
  "Jashore",
  "Jhalokathi",
  "Jhenaidah",
  "Joypurhat",
  "Khagrachhari",
  "Khulna",
  "Kishoreganj",
  "Kurigram",
  "Kushtia",
  "Lakshmipur",
  "Lalmonirhat",
  "Madaripur",
  "Magura",
  "Manikganj",
  "Meherpur",
  "Moulvibazar",
  "Munshiganj",
  "Mymensingh",
  "Naogaon",
  "Narail",
  "Narayanganj",
  "Narsingdi",
  "Natore",
  "Netrokona",
  "Nilphamari",
  "Noakhali",
  "Pabna",
  "Panchagarh",
  "Patuakhali",
  "Pirojpur",
  "Rajbari",
  "Rajshahi",
  "Rangamati",
  "Rangpur",
  "Satkhira",
  "Shariatpur",
  "Sherpur",
  "Sirajganj",
  "Sunamganj",
  "Sylhet",
  "Tangail",
  "Thakurgaon",
];

test("district catalog contains all 64 Bangladesh districts with map coordinates", () => {
  assert.equal(districtNames.length, 64);
  assert.deepEqual(districtNames, EXPECTED_DISTRICTS);

  for (const district of districtNames) {
    const coords = districtCoords[district];
    assert.equal(
      coords.length,
      2,
      `${district} should have latitude and longitude`,
    );
    assert.ok(
      coords.every(Number.isFinite),
      `${district} coordinates should be numeric`,
    );
  }
});

test("district extraction recognizes canonical names and common transcription variants", () => {
  for (const district of EXPECTED_DISTRICTS) {
    assert.equal(
      findDistrictName(`Emergency reported in ${district}.`),
      district,
    );
  }

  assert.equal(findDistrictName("Severe flooding in Chittagong"), "Chattogram");
  assert.equal(findDistrictName("Families need help in Comilla"), "Cumilla");
  assert.equal(findDistrictName("Road blocked in Jessore"), "Jashore");
  assert.equal(findDistrictName("Shelter needed in Bogra"), "Bogura");
  assert.equal(
    findDistrictName("Rescue requested at Cox’s Bazaar"),
    "Cox's Bazar",
  );
  assert.equal(
    findDistrictName("Comilla team is supporting Cox's Bazar"),
    "Cumilla",
  );
});

test("every district has a unique report reference code", () => {
  const codes = districtNames.map(getDistrictCode);
  assert.equal(new Set(codes).size, 64);
  assert.ok(codes.every((code) => /^[A-Z]{3}$/.test(code)));
});
