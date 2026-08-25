import test from "node:test";
import assert from "node:assert/strict";
import {
  createReportReference,
  getReportDateKey,
  getReportReferencePrefix,
} from "../src/lib/reportReference.js";

test("report references use the Bangladesh calendar date and district code", () => {
  const report = { district: "Dhaka", time: "2026-08-24T18:30:00.000Z" };

  assert.equal(getReportDateKey(report.time), "20260825");
  assert.equal(getReportReferencePrefix(report), "DHK-20260825");
});

test("report references increment only within the same district and day", () => {
  const report = { district: "Dhaka", time: "2026-08-25T10:00:00.000Z" };
  const reports = [
    { reference: "DHK-20260825-0001" },
    { reference: "DHK-20260825-0007" },
    { reference: "SYL-20260825-0003" },
    { reference: "DHK-20260824-0009" },
  ];

  assert.equal(createReportReference(report, reports), "DHK-20260825-0008");
});
