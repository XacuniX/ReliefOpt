import test from "node:test";
import assert from "node:assert/strict";
import { ROUTE_ROLES, canAccessRoute, homeForRole } from "../src/lib/rbac.js";
import { sessionFromAccessToken } from "../src/lib/authSession.js";

function token(claims) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode(claims)}.signature`;
}

test("every protected client route permits exactly its configured application roles", () => {
  const roles = ["central_admin", "warehouse_manager", "field_worker"];
  for (const [path, allowedRoles] of Object.entries(ROUTE_ROLES)) {
    for (const role of roles) {
      assert.equal(canAccessRoute(role, path), allowedRoles.includes(role), `${role} access to ${path}`);
    }
  }
  assert.equal(homeForRole("field_worker"), "/map");
  assert.equal(homeForRole("central_admin"), "/dashboard");
  assert.equal(homeForRole("warehouse_manager"), "/dashboard");
});

test("client session parsing fails closed for missing identity fields, invalid roles, and expired claims", () => {
  const now = Date.parse("2026-08-26T00:00:00.000Z");
  const validClaims = { sub: "worker", username: "worker", name: "Worker", role: "field_worker", exp: now / 1000 + 60 };
  assert.equal(sessionFromAccessToken(token(validClaims), now)?.user.id, "worker");
  for (const claims of [
    { ...validClaims, sub: "" },
    { ...validClaims, username: undefined },
    { ...validClaims, name: null },
    { ...validClaims, role: "administrator" },
    { ...validClaims, role: undefined },
    { ...validClaims, exp: now / 1000 },
    { ...validClaims, exp: "later" },
  ]) assert.equal(sessionFromAccessToken(token(claims), now), null);
});
