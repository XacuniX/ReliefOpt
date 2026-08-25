import bcrypt from "bcryptjs";
import { demoTeams, demoUsers } from "./demo-data.js";

export async function seedDemoData({ db, password, bcryptRounds }) {
  if (!password || password.length < 8) {
    throw new Error("The demo password must contain at least 8 characters.");
  }
  const passwordHash = await bcrypt.hash(password, bcryptRounds);
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    for (const team of demoTeams) {
      await client.query(
        `INSERT INTO teams (id, name, member_count, status, location)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           member_count = EXCLUDED.member_count,
           status = EXCLUDED.status,
           location = EXCLUDED.location,
           updated_at = NOW()`,
        [team.id, team.name, team.memberCount, team.status, team.location],
      );
    }
    for (const user of demoUsers) {
      await client.query(
        `INSERT INTO users (id, username, password_hash, name, role, status, team_id, phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           username = EXCLUDED.username,
           password_hash = EXCLUDED.password_hash,
           name = EXCLUDED.name,
           role = EXCLUDED.role,
           status = EXCLUDED.status,
           team_id = EXCLUDED.team_id,
           phone = EXCLUDED.phone,
           updated_at = NOW()`,
        [user.id, user.username, passwordHash, user.name, user.role, user.status, user.teamId, user.phone],
      );
    }
    for (const team of demoTeams) {
      await client.query(
        "UPDATE teams SET leader_id = $2, updated_at = NOW() WHERE id = $1",
        [team.id, team.leaderId],
      );
    }
    await client.query("COMMIT");
    return { teams: demoTeams.length, users: demoUsers.length };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
