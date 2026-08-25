import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const VALID_ROLES = new Set(["central_admin", "warehouse_manager", "field_worker"]);

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    status: user.status,
    teamId: user.team_id ?? null,
  };
}

export class AuthenticationError extends Error {
  constructor(message = "Invalid username or password.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class JwtService {
  constructor({ secret, issuer, audience, expiresInSeconds }) {
    this.secret = secret;
    this.issuer = issuer;
    this.audience = audience;
    this.expiresInSeconds = expiresInSeconds;
  }

  issue(user, { expiresInSeconds = this.expiresInSeconds } = {}) {
    const accessToken = jwt.sign(
      {
        username: user.username,
        name: user.name,
        role: user.role,
        av: user.authVersion,
      },
      this.secret,
      {
        algorithm: "HS256",
        audience: this.audience,
        expiresIn: expiresInSeconds,
        issuer: this.issuer,
        jwtid: randomUUID(),
        subject: user.id,
      },
    );
    const claims = jwt.decode(accessToken);
    return { accessToken, expiresAt: new Date(claims.exp * 1000).toISOString() };
  }

  verify(accessToken) {
    return jwt.verify(accessToken, this.secret, {
      algorithms: ["HS256"],
      audience: this.audience,
      issuer: this.issuer,
    });
  }
}

export class AuthService {
  constructor({ userRepository, jwtService, bcryptRounds = 12 }) {
    this.userRepository = userRepository;
    this.jwtService = jwtService;
    this.dummyHash = bcrypt.hash(randomUUID(), bcryptRounds);
  }

  async authenticate(username, password) {
    const normalizedUsername = username.trim().toLowerCase();
    const user = await this.userRepository.findByUsername(normalizedUsername);
    const passwordHash = user?.password_hash ?? await this.dummyHash;
    const passwordMatches = await bcrypt.compare(password, passwordHash);

    if (!user || !passwordMatches || user.status === "Inactive" || !VALID_ROLES.has(user.role)) {
      throw new AuthenticationError();
    }

    const sessionUser = publicUser(user);
    const token = this.jwtService.issue({ ...sessionUser, authVersion: user.auth_version });
    await this.userRepository.updateLastLogin(user.id);
    return { ...token, user: sessionUser };
  }
}

export { publicUser };
