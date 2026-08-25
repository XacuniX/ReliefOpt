function json(value, fallback) {
  if (value === null || value === undefined) return fallback;
  return typeof value === "string" ? JSON.parse(value) : value;
}

function mapReport(row) {
  return {
    id: row.id,
    reference: row.reference || null,
    type: row.type,
    district: row.district || "",
    location: row.latitude == null || row.longitude == null
      ? null
      : { lat: Number(row.latitude), lng: Number(row.longitude) },
    severity: Number(row.severity),
    status: row.status,
    submittedById: row.submitted_by_id,
    assignedTeamId: row.assigned_team_id,
    time: row.reported_at,
    description: row.description,
    affectedCount: row.affected_count,
    peopleCount: row.people_count,
    daysWithoutFood: row.days_without_food,
    waterLevelFt: row.water_level_ft == null ? null : Number(row.water_level_ft),
    distanceFromAidKm: row.distance_from_aid_km == null ? null : Number(row.distance_from_aid_km),
    urgencyScore: row.urgency_score,
    urgencyZone: row.urgency_zone,
    urgencyFactors: json(row.urgency_factors, []),
    childrenPresent: row.children_present,
    elderlyPresent: row.elderly_present,
    notes: json(row.notes, []),
  };
}

function mapTask(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    assignedTeamId: row.assigned_team_id,
    assignedUserId: row.assigned_user_id,
    dueTime: row.due_time,
    status: row.status,
    linkedReportId: row.linked_report_id,
    resources: json(row.resources, {}),
    updates: json(row.updates, []),
  };
}

export class AuthoritativeRepository {
  constructor(db) {
    this.db = db;
  }

  async snapshot() {
    const [meta, users, reports, tasks, inventory, teams, warehouses, notifications, stockLog, mapPins] = await Promise.all([
      this.db.query("SELECT snapshot_seq, updated_at FROM snapshot_meta WHERE singleton = TRUE"),
      this.db.query(`SELECT u.id, u.username, u.name, u.role, u.status, u.team_id, t.name AS team_name,
                            u.phone, u.last_login, u.created_at, u.updated_at
                     FROM users u LEFT JOIN teams t ON t.id = u.team_id ORDER BY u.name, u.id`),
      this.db.query("SELECT * FROM reports ORDER BY reported_at DESC, id"),
      this.db.query("SELECT * FROM tasks ORDER BY created_at DESC, id"),
      this.db.query(`SELECT i.*, w.name AS warehouse_name
                     FROM inventory i JOIN warehouses w ON w.id = i.warehouse_id
                     ORDER BY i.name, i.id`),
      this.db.query(`SELECT t.*, leader.name AS leader_name
                     FROM teams t LEFT JOIN users leader ON leader.id = t.leader_id
                     ORDER BY t.name, t.id`),
      this.db.query("SELECT * FROM warehouses ORDER BY name, id"),
      this.db.query("SELECT * FROM notifications ORDER BY created_at DESC, id"),
      this.db.query(`SELECT s.*, i.name AS item_name
                     FROM stock_log s JOIN inventory i ON i.id = s.item_id
                     ORDER BY s.occurred_at DESC, s.id`),
      this.db.query("SELECT * FROM map_pins ORDER BY created_at DESC, id"),
    ]);

    return {
      snapshotSeq: Number(meta.rows[0].snapshot_seq),
      generatedAt: meta.rows[0].updated_at,
      data: {
        users: users.rows.map((row) => ({
          id: row.id, username: row.username, name: row.name, role: row.role,
          status: row.status, teamId: row.team_id, teamName: row.team_name,
          team: row.team_name || "", phone: row.phone || "", lastLogin: row.last_login,
          createdAt: row.created_at, updatedAt: row.updated_at,
        })),
        reports: reports.rows.map(mapReport),
        tasks: tasks.rows.map(mapTask),
        inventory: inventory.rows.map((row) => ({
          id: row.id, name: row.name, category: row.category, qty: Number(row.quantity),
          unit: row.unit, status: row.status, warehouseId: row.warehouse_id,
          warehouse: row.warehouse_name, lastUpdated: row.last_updated,
        })),
        teams: teams.rows.map((row) => ({
          id: row.id, name: row.name, leaderId: row.leader_id,
          leader: row.leader_name || "Unassigned", memberCount: row.member_count,
          status: row.status, location: row.location, activeTask: row.active_task,
        })),
        warehouses: warehouses.rows.map((row) => ({
          id: row.id, name: row.name,
          lat: row.latitude == null ? null : Number(row.latitude),
          lng: row.longitude == null ? null : Number(row.longitude),
        })),
        notifications: notifications.rows.map((row) => ({
          id: row.id, userId: row.user_id, type: row.type, title: row.title,
          body: row.body, read: row.is_read, timestamp: row.created_at,
        })),
        stockLog: stockLog.rows.map((row) => ({
          id: row.id, itemId: row.item_id, itemName: row.item_name,
          change: Number(row.change_amount), reason: row.reason,
          userId: row.user_id, user: row.user_name, timestamp: row.occurred_at,
        })),
        mapPins: mapPins.rows.map((row) => ({
          id: row.id, reportId: row.report_id,
          location: row.location, lat: Number(row.latitude), lng: Number(row.longitude),
          waterLevelFt: row.water_level_ft == null ? null : Number(row.water_level_ft),
          peopleCount: row.people_count, childrenPresent: row.children_present,
          createdAt: row.created_at,
        })),
      },
    };
  }

  async advanceSnapshot() {
    const result = await this.db.query(
      `UPDATE snapshot_meta SET snapshot_seq = snapshot_seq + 1, updated_at = NOW()
       WHERE singleton = TRUE RETURNING snapshot_seq, updated_at`,
    );
    return { snapshotSeq: Number(result.rows[0].snapshot_seq), updatedAt: result.rows[0].updated_at };
  }
}

export class ProposalRepository {
  constructor(db) {
    this.db = db;
  }

  async create({ id, type, payload, userId, baseSnapshotSeq, conflictKey }) {
    const result = await this.db.query(
      `INSERT INTO proposals (id, proposal_type, payload, user_id, base_snapshot_seq, conflict_key)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING RETURNING *`,
      [id, type, JSON.stringify(payload), userId, baseSnapshotSeq, conflictKey],
    );
    return result.rows[0] || this.find(id);
  }

  async find(id) {
    const result = await this.db.query("SELECT * FROM proposals WHERE id = $1", [id]);
    return result.rows[0] || null;
  }

  async list() {
    const result = await this.db.query(
      `SELECT p.*, u.name AS user_name
       FROM proposals p LEFT JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at, p.id`,
    );
    return result.rows;
  }

  async earlierPendingConflict(proposal) {
    if (!proposal.conflict_key) return null;
    const result = await this.db.query(
      `SELECT id FROM proposals
       WHERE conflict_key = $1 AND status = 'Pending' AND id <> $2
         AND (created_at < $3 OR (created_at = $3 AND id < $2))
       ORDER BY created_at, id LIMIT 1`,
      [proposal.conflict_key, proposal.id, proposal.created_at],
    );
    return result.rows[0]?.id || null;
  }

  async acceptedConflict(proposal) {
    if (!proposal.conflict_key) return null;
    const result = await this.db.query(
      `SELECT id FROM proposals
       WHERE conflict_key = $1 AND status = 'Accepted' AND id <> $2
         AND decided_snapshot_seq > $3
       ORDER BY decided_at, id LIMIT 1`,
      [proposal.conflict_key, proposal.id, proposal.base_snapshot_seq],
    );
    return result.rows[0]?.id || null;
  }

  async decide(id, { status, reason = null, actorId, snapshotSeq }) {
    const result = await this.db.query(
      `UPDATE proposals SET status = $2, rejection_reason = $3, decided_at = NOW(),
                            decided_by = $4, decided_snapshot_seq = $5
       WHERE id = $1 RETURNING *`,
      [id, status, reason, actorId, snapshotSeq],
    );
    await this.db.query(
      `INSERT INTO processed_proposal_ids (proposal_id, result, snapshot_seq)
       VALUES ($1, $2, $3) ON CONFLICT (proposal_id) DO NOTHING`,
      [id, status, snapshotSeq],
    );
    return result.rows[0];
  }
}

export { mapReport, mapTask };
