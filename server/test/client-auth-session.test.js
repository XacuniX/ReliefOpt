import test from "node:test";
import assert from "node:assert/strict";
import { JwtService } from "../src/auth/service.js";
import { sessionFromAccessToken } from "../../src/lib/authSession.js";
import { TEST_CONFIG } from "../test-support/helpers.js";

const jwtService = new JwtService({
  secret: TEST_CONFIG.jwtSecret,
  issuer: TEST_CONFIG.jwtIssuer,
  audience: TEST_CONFIG.jwtAudience,
  expiresInSeconds: TEST_CONFIG.jwtExpiresInSeconds,
});
const user = {
  id: "cached-user",
  username: "cached",
  name: "Cached User",
  role: "field_worker",
};

test("client session derives identity from an unexpired JWT payload", () => {
  const token = jwtService.issue(user).accessToken;
  const session = sessionFromAccessToken(token);
  assert.deepEqual(session.user, user);
  assert.ok(Date.parse(session.expiresAt) > Date.now());
});

test("client session rejects expired, malformed, and unsupported-role tokens", () => {
  const expired = jwtService.issue(user, { expiresInSeconds: -1 }).accessToken;
  assert.equal(sessionFromAccessToken(expired), null);
  assert.equal(sessionFromAccessToken("not-a-jwt"), null);
  assert.equal(sessionFromAccessToken(jwtService.issue({ ...user, role: "owner" }).accessToken), null);
});
