import test from "node:test";
import assert from "node:assert/strict";

test("unit-test environment uses local defaults", () => {
  assert.equal(process.env.NODE_ENV, "test");
  assert.equal(process.env.VITE_API_URL, "http://127.0.0.1:4000");
});
