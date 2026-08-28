import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { normalizeEmail } from "../users/service.js";

const VALID_ROLES = new Set(["central_admin", "warehouse_manager", "field_worker"]);

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    status: user.status,
    teamId: user.team_id ?? null,
    email: user.email,
    avatarUrl: user.avatar_url ?? null,
    authProvider: user.auth_provider ?? "local",
  };
}

function googleUsernameBase(email) {
  let base = email
    .split("@", 1)[0]
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/^[^a-z0-9]+/, "")
    .replace(/[._-]+$/, "");
  if (base.length < 3) base = `user.${base || "google"}`;
  return base.slice(0, 50);
}

export class AuthenticationError extends Error {
  constructor(message = "Invalid username or password.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AccountUpdateError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "AccountUpdateError";
    this.status = status;
    this.code = code;
  }
}

export class GoogleAuthenticationError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "GoogleAuthenticationError";
    this.status = status;
    this.code = code;
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
  constructor({
    userRepository,
    userManagementService,
    jwtService,
    googleClient,
    googleClientId,
    bcryptRounds = 12,
    passwordMinLength = 12,
  }) {
    this.userRepository = userRepository;
    this.userManagementService = userManagementService;
    this.jwtService = jwtService;
    this.googleClient = googleClient;
    this.googleClientId = googleClientId;
    this.bcryptRounds = bcryptRounds;
    this.passwordMinLength = passwordMinLength;
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

  async authenticateWithGoogle(credential) {
    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: this.googleClientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new GoogleAuthenticationError(
        401,
        "INVALID_GOOGLE_CREDENTIAL",
        "Google could not verify this sign-in.",
      );
    }

    if (
      !payload ||
      typeof payload.sub !== "string" ||
      !payload.sub ||
      payload.sub.length > 255 ||
      typeof payload.email !== "string" ||
      payload.email_verified !== true
    ) {
      throw new GoogleAuthenticationError(
        401,
        "INVALID_GOOGLE_PROFILE",
        "Google did not provide a verified account profile.",
      );
    }

    let email;
    try {
      email = normalizeEmail(payload.email);
    } catch {
      throw new GoogleAuthenticationError(
        401,
        "INVALID_GOOGLE_PROFILE",
        "Google did not provide a valid email address.",
      );
    }

    const name = typeof payload.name === "string" && payload.name.trim()
      ? payload.name.trim().slice(0, 100)
      : email.split("@", 1)[0].slice(0, 100);
    const avatarUrl = typeof payload.picture === "string" && payload.picture.length <= 4096
      ? payload.picture
      : null;
    const user = await this.userRepository.resolveGoogleAccount({
      googleId: payload.sub,
      email,
      name,
      avatarUrl,
      usernameBase: googleUsernameBase(email),
    });

    if (user.status === "Inactive" || !VALID_ROLES.has(user.role)) {
      throw new GoogleAuthenticationError(
        403,
        "GOOGLE_ACCOUNT_UNAVAILABLE",
        "This ReliefOpt account is not available.",
      );
    }

    const sessionUser = publicUser(user);
    const token = this.jwtService.issue({ ...sessionUser, authVersion: user.auth_version });
    await this.userRepository.updateLastLogin(user.id);
    return { ...token, user: sessionUser };
  }

  /** Public self-registration. Always creates a field_worker with no team assignment. */
  async register(input) {
    const created = await this.userManagementService.registerPublicUser(input);
    const sessionUser = publicUser(created);
    const token = this.jwtService.issue({ ...sessionUser, authVersion: created.auth_version });
    return { ...token, user: sessionUser };
  }

  /** Self-service email/password change. Requires re-entering the current password. */
  async updateOwnAccount(userId, input) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AuthenticationError();

    const currentPassword = input?.currentPassword;
    if (!user.password_hash) {
      throw new AccountUpdateError(
        400,
        "LOCAL_PASSWORD_UNAVAILABLE",
        "This account uses Google Sign-In and does not have a local password.",
      );
    }
    if (typeof currentPassword !== "string" || !currentPassword) {
      throw new AccountUpdateError(400, "CURRENT_PASSWORD_REQUIRED", "Enter your current password to continue.");
    }
    const currentMatches = await bcrypt.compare(currentPassword, user.password_hash);
    if (!currentMatches) {
      throw new AccountUpdateError(401, "INVALID_CURRENT_PASSWORD", "Current password is incorrect.");
    }

    if (input?.email) {
      let email;
      try {
        email = normalizeEmail(input.email);
      } catch {
        throw new AccountUpdateError(400, "VALIDATION_ERROR", "Enter a valid email address.");
      }
      if (email !== user.email) {
        try {
          await this.userRepository.updateEmail(userId, email);
        } catch (error) {
          if (error?.code === "23505" || /duplicate key|unique constraint/i.test(error?.message || "")) {
            throw new AccountUpdateError(409, "EMAIL_TAKEN", "That email is already in use.");
          }
          throw error;
        }
      }
    }

    let passwordChanged = false;
    if (input?.newPassword) {
      if (input.newPassword !== input.confirmNewPassword) {
        throw new AccountUpdateError(400, "PASSWORD_MISMATCH", "New password confirmation does not match.");
      }
      if (input.newPassword.length < this.passwordMinLength || input.newPassword.length > 128) {
        throw new AccountUpdateError(
          400,
          "WEAK_PASSWORD",
          `Password must contain ${this.passwordMinLength}–128 characters.`,
        );
      }
      const passwordHash = await bcrypt.hash(input.newPassword, this.bcryptRounds);
      await this.userRepository.updatePassword(userId, passwordHash);
      passwordChanged = true;
    }

    const updated = await this.userRepository.findById(userId);
    return { user: publicUser(updated), passwordChanged };
  }
}

export { publicUser };
