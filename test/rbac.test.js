import test from "node:test";
import assert from "node:assert/strict";
import { canAccessRoute, homeForRole } from "../src/lib/rbac.js";

test("route RBAC matches the three-role access matrix", () => {
  assert.equal(canAccessRoute("field_worker", "/dashboard"), false);
  assert.equal(canAccessRoute("field_worker", "/inventory"), false);
  assert.equal(canAccessRoute("field_worker", "/cargo"), false);
  assert.equal(canAccessRoute("field_worker", "/users"), false);
  assert.equal(canAccessRoute("field_worker", "/map"), true);
  assert.equal(canAccessRoute("field_worker", "/tasks"), true);
  assert.equal(canAccessRoute("warehouse_manager", "/users"), false);
  assert.equal(canAccessRoute("warehouse_manager", "/dashboard"), true);
  assert.equal(canAccessRoute("warehouse_manager", "/cargo"), true);
  assert.equal(canAccessRoute("central_admin", "/users"), true);
  assert.equal(homeForRole("field_worker"), "/map");
  assert.equal(homeForRole("central_admin"), "/dashboard");
});
