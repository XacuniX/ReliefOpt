import bcrypt from "bcryptjs";
import { mapUser, UserManagementRepository } from "./repository.js";

const ROLES = new Set(["central_admin", "warehouse_manager", "field_worker"]);
const STATUSES = new Set(["Active", "Inactive", "Offline"]);
const TEAM_STATUSES = new Set(["Deployed", "Standby", "Offline"]);
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,49}$/;

export class UserManagementError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "UserManagementError";
    this.status = status;
    this.code = code;
  }
}

function requiredText(value, name, maxLength) {
  if (typeof value !== "string" || !value.trim()) {
    throw new UserManagementError(400, "VALIDATION_ERROR", `${name} is required.`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new UserManagementError(400, "VALIDATION_ERROR", `${name} is too long.`);
  }
  return normalized;
}

function optionalText(value, name, maxLength) {
  if (value === undefined || value === null || value === "") return null;
  return requiredText(value, name, maxLength);
}

function normalizeUsername(value) {
  const username = requiredText(value, "Username", 50).toLowerCase();
  if (!USERNAME_PATTERN.test(username)) {
    throw new UserManagementError(
      400,
      "VALIDATION_ERROR",
      "Username must be 3–50 characters using letters, numbers, dots, underscores, or hyphens.",
    );
  }
  return username;
}

function normalizeRole(value) {
  if (!ROLES.has(value)) {
    throw new UserManagementError(400, "VALIDATION_ERROR", "Invalid role.");
  }
  return value;
}

function normalizeStatus(value) {
  if (!STATUSES.has(value)) {
    throw new UserManagementError(400, "VALIDATION_ERROR", "Invalid status.");
  }
  return value;
}

function normalizeTeamStatus(value) {
  if (!TEAM_STATUSES.has(value)) {
    throw new UserManagementError(400, "VALIDATION_ERROR", "Invalid team status.");
  }
  return value;
}

function normalizeTeamId(value) {
  if (value === undefined || value === null || value === "") return null;
  return requiredText(value, "Team", 100);
}

function normalizePhone(value) {
  if (value === undefined || value === null || value === "") return null;
  return requiredText(value, "Phone", 50);
}

function validatePassword(password, minimumLength) {
  if (typeof password !== "string" || password.length < minimumLength || password.length > 128) {
    throw new UserManagementError(
      400,
      "WEAK_PASSWORD",
      `Password must contain ${minimumLength}–128 characters.`,
    );
  }
  return password;
}

function translateDatabaseError(error) {
  if (error?.code === "23505" || /duplicate key|unique constraint/i.test(error?.message || "")) {
    return new UserManagementError(409, "USERNAME_TAKEN", "That username is already in use.");
  }
  return error;
}

async function advanceSnapshot(repository) {
  await repository.db.query(
    "UPDATE snapshot_meta SET snapshot_seq = snapshot_seq + 1, updated_at = NOW() WHERE singleton = TRUE",
  );
}

export class UserManagementService {
  constructor({ db, bcryptRounds, passwordMinLength }) {
    this.db = db;
    this.repository = new UserManagementRepository(db);
    this.bcryptRounds = bcryptRounds;
    this.passwordMinLength = passwordMinLength;
  }

  listUsers() {
    return this.repository.list();
  }

  listTeams() {
    return this.repository.listTeams();
  }

  async createTeam(input) {
    const team = {
      name: requiredText(input?.name, "Team name", 100),
      status: normalizeTeamStatus(input?.status || "Standby"),
      location: optionalText(input?.location, "Location", 120),
    };

    return this.withTransaction(async (repository) => {
      if (await repository.findTeamByName(team.name)) {
        throw new UserManagementError(409, "TEAM_NAME_TAKEN", "A team with that name already exists.");
      }
      const created = await repository.createTeam(team);
      await advanceSnapshot(repository);
      return created;
    });
  }

  async deleteTeam(id) {
    const teamId = requiredText(id, "Team", 100);
    return this.withTransaction(async (repository) => {
      if (!(await repository.findTeamById(teamId))) {
        throw new UserManagementError(404, "TEAM_NOT_FOUND", "Team not found.");
      }
      const unassignedUserIds = await repository.unassignTeamMembers(teamId);
      await repository.deleteTeam(teamId);
      await advanceSnapshot(repository);
      return { deleted: true, unassignedUserIds };
    });
  }

  async withTransaction(callback) {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const result = await callback(new UserManagementRepository(client));
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw translateDatabaseError(error);
    } finally {
      client.release();
    }
  }

  async createUser(input) {
    const user = {
      username: normalizeUsername(input?.username),
      name: requiredText(input?.name, "Name", 100),
      role: normalizeRole(input?.role),
      status: normalizeStatus(input?.status || "Active"),
      teamId: normalizeTeamId(input?.teamId),
      phone: normalizePhone(input?.phone),
    };
    const password = validatePassword(input?.password, this.passwordMinLength);
    const passwordHash = await bcrypt.hash(password, this.bcryptRounds);

    return this.withTransaction(async (repository) => {
      if (!(await repository.teamExists(user.teamId))) {
        throw new UserManagementError(400, "INVALID_TEAM", "The selected team does not exist.");
      }
      const created = mapUser(await repository.create({ ...user, passwordHash }));
      await advanceSnapshot(repository);
      return created;
    });
  }

  async updateUser(id, input, actor) {
    const source = input || {};
    const patch = {};
    if (Object.hasOwn(source, "username")) patch.username = normalizeUsername(source.username);
    if (Object.hasOwn(source, "name")) patch.name = requiredText(source.name, "Name", 100);
    if (Object.hasOwn(source, "role")) patch.role = normalizeRole(source.role);
    if (Object.hasOwn(source, "status")) patch.status = normalizeStatus(source.status);
    if (Object.hasOwn(source, "teamId")) patch.teamId = normalizeTeamId(source.teamId);
    if (Object.hasOwn(source, "phone")) patch.phone = normalizePhone(source.phone);
    const passwordHash = Object.hasOwn(source, "password")
      ? await bcrypt.hash(validatePassword(source.password, this.passwordMinLength), this.bcryptRounds)
      : null;
    if (Object.keys(patch).length === 0 && !passwordHash) {
      throw new UserManagementError(400, "VALIDATION_ERROR", "No user changes were provided.");
    }

    return this.withTransaction(async (repository) => {
      const current = mapUser(await repository.findById(id));
      if (!current) throw new UserManagementError(404, "USER_NOT_FOUND", "User not found.");
      if (Object.hasOwn(patch, "teamId") && !(await repository.teamExists(patch.teamId))) {
        throw new UserManagementError(400, "INVALID_TEAM", "The selected team does not exist.");
      }
      if (actor.id === id && (
        (patch.role && patch.role !== current.role) ||
        patch.status === "Inactive"
      )) {
        throw new UserManagementError(400, "SELF_LOCKOUT", "You cannot remove your own access.");
      }
      const removesActiveAdmin = Boolean(
        current.role === "central_admin" &&
        current.status !== "Inactive" &&
        ((patch.role && patch.role !== "central_admin") || patch.status === "Inactive")
      );
      if (removesActiveAdmin && await repository.countOtherActiveAdmins(id) === 0) {
        throw new UserManagementError(409, "LAST_ADMIN", "At least one active Central Admin is required.");
      }
      const leavesCurrentTeam = Object.hasOwn(patch, "teamId") && patch.teamId !== current.teamId;
      const becomesInactive = patch.status === "Inactive" && current.status !== "Inactive";
      if (Object.keys(patch).length > 0) await repository.update(id, patch);
      if (current.teamId && (leavesCurrentTeam || becomesInactive)) {
        await repository.reassignLeaderWhenMemberLeaves(current.teamId, id);
      }
      if (passwordHash) await repository.resetPassword(id, passwordHash);
      const updated = mapUser(await repository.findById(id));
      await advanceSnapshot(repository);
      return updated;
    });
  }

  async deactivateUser(id, actor) {
    return this.updateUser(id, { status: "Inactive" }, actor);
  }

  async resetPassword(id, password) {
    validatePassword(password, this.passwordMinLength);
    const passwordHash = await bcrypt.hash(password, this.bcryptRounds);
    return this.withTransaction(async (repository) => {
      if (!(await repository.findById(id))) {
        throw new UserManagementError(404, "USER_NOT_FOUND", "User not found.");
      }
      await repository.resetPassword(id, passwordHash);
      await advanceSnapshot(repository);
      return { reset: true };
    });
  }
}
