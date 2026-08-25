import { randomUUID } from "node:crypto";

const USER_COLUMNS = `
  u.id,
  u.username,
  u.name,
  u.role,
  u.status,
  u.team_id,
  t.name AS team_name,
  u.phone,
  u.last_login,
  u.created_at,
  u.updated_at,
  u.auth_version
`;

export function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    status: row.status,
    teamId: row.team_id ?? null,
    teamName: row.team_name ?? null,
    phone: row.phone ?? "",
    lastLogin: row.last_login ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class UserManagementRepository {
  constructor(db) {
    this.db = db;
  }

  async list() {
    const result = await this.db.query(
      `SELECT ${USER_COLUMNS}
       FROM users u
       LEFT JOIN teams t ON t.id = u.team_id
       ORDER BY u.name, u.id`,
    );
    return result.rows.map(mapUser);
  }

  async findById(id) {
    const result = await this.db.query(
      `SELECT ${USER_COLUMNS}
       FROM users u
       LEFT JOIN teams t ON t.id = u.team_id
       WHERE u.id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async teamExists(teamId) {
    if (teamId === null) return true;
    const result = await this.db.query("SELECT id FROM teams WHERE id = $1", [teamId]);
    return result.rowCount === 1;
  }

  async listTeams() {
    const result = await this.db.query(
      `SELECT
         t.id,
         t.name,
         t.leader_id,
         leader.name AS leader_name,
         t.member_count,
         t.status,
         t.location,
         t.active_task
       FROM teams t
       LEFT JOIN users leader ON leader.id = t.leader_id
       ORDER BY t.name, t.id`,
    );
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      leaderId: row.leader_id ?? null,
      leader: row.leader_name ?? "Unassigned",
      memberCount: row.member_count,
      status: row.status,
      location: row.location,
      activeTask: row.active_task,
    }));
  }

  async create({ id = randomUUID(), username, passwordHash, name, role, status, teamId, phone }) {
    const result = await this.db.query(
      `INSERT INTO users (id, username, password_hash, name, role, status, team_id, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [id, username, passwordHash, name, role, status, teamId, phone],
    );
    return this.findById(result.rows[0].id);
  }

  async update(id, patch) {
    const columnMap = {
      username: "username",
      name: "name",
      role: "role",
      status: "status",
      teamId: "team_id",
      phone: "phone",
    };
    const entries = Object.entries(patch).filter(([key]) => Object.hasOwn(columnMap, key));
    if (entries.length === 0) return this.findById(id);

    const assignments = entries.map(
      ([key], index) => `${columnMap[key]} = $${index + 2}`,
    );
    assignments.push("updated_at = NOW()");
    const result = await this.db.query(
      `UPDATE users
       SET ${assignments.join(", ")}
       WHERE id = $1
       RETURNING id`,
      [id, ...entries.map(([, value]) => value)],
    );
    return result.rowCount === 1 ? this.findById(id) : null;
  }

  async resetPassword(id, passwordHash) {
    const result = await this.db.query(
      `UPDATE users
       SET password_hash = $2, auth_version = auth_version + 1, updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [id, passwordHash],
    );
    return result.rowCount === 1;
  }

  async countOtherActiveAdmins(id) {
    const result = await this.db.query(
      `SELECT COUNT(*)::int AS count
       FROM users
       WHERE id <> $1 AND role = 'central_admin' AND status <> 'Inactive'`,
      [id],
    );
    return result.rows[0].count;
  }
}
