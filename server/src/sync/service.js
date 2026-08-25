import { AuthoritativeRepository, ProposalRepository } from "./repository.js";
import { createReportReference, getReportReferencePrefix } from "../../../src/lib/reportReference.js";

const TYPES = new Set([
  "ADD_REPORT", "UPDATE_REPORT", "ADD_REPORT_NOTE",
  "ADD_TASK", "UPDATE_TASK",
  "ADD_INVENTORY", "UPDATE_INVENTORY", "UPDATE_ITEM_QTY",
  "ADD_STOCK_LOG",
  "ADD_MAP_PIN", "MARK_NOTIFICATION_READ", "MARK_ALL_NOTIFICATIONS_READ",
]);

export class SyncError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "SyncError";
    this.status = status;
    this.code = code;
  }
}

function text(value, field, max = 500) {
  if (typeof value !== "string" || !value.trim()) {
    throw new SyncError(400, "VALIDATION_ERROR", `${field} is required.`);
  }
  const normalized = value.trim();
  if (normalized.length > max) throw new SyncError(400, "VALIDATION_ERROR", `${field} is too long.`);
  return normalized;
}

function proposalType(value) {
  if (!TYPES.has(value)) throw new SyncError(400, "UNSUPPORTED_PROPOSAL", "Unsupported proposal type.");
  return value;
}

function mutationId(type, payload) {
  if (type === "ADD_REPORT" || type === "ADD_TASK" || type === "ADD_INVENTORY" || type === "ADD_STOCK_LOG" || type === "ADD_MAP_PIN") return payload.id;
  if (type === "UPDATE_ITEM_QTY") return payload.itemId;
  if (type === "MARK_NOTIFICATION_READ") return payload.id;
  if (type === "MARK_ALL_NOTIFICATIONS_READ") return payload.userId || "all";
  return payload.id;
}

function conflictKey(type, payload) {
  const id = mutationId(type, payload);
  return id ? `${type.replace(/^ADD_/, "UPDATE_")}:${id}` : null;
}

function mapProposal(row) {
  return {
    id: row.id,
    type: row.proposal_type,
    payload: typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload,
    userId: row.user_id,
    userName: row.user_name || null,
    status: row.status,
    rejectionReason: row.rejection_reason,
    conflictState: row.rejection_reason?.startsWith("Conflict:") ? "conflict" : "none",
    baseSnapshotSeq: Number(row.base_snapshot_seq),
    createdAt: row.created_at,
    decidedAt: row.decided_at,
    decidedBy: row.decided_by,
    decidedSnapshotSeq: row.decided_snapshot_seq == null ? null : Number(row.decided_snapshot_seq),
  };
}

function updateSql(table, idColumn, id, patch, columnMap) {
  const entries = Object.entries(patch).filter(([key]) => Object.hasOwn(columnMap, key));
  if (!entries.length) throw new SyncError(400, "VALIDATION_ERROR", "No supported changes were provided.");
  const assignments = entries.map(([key], index) => `${columnMap[key]} = $${index + 2}`);
  assignments.push("updated_at = NOW()");
  return {
    sql: `UPDATE ${table} SET ${assignments.join(", ")} WHERE ${idColumn} = $1 RETURNING ${idColumn}`,
    values: [id, ...entries.map(([, value]) => value)],
  };
}

async function requireChanged(result) {
  if (result.rowCount !== 1) throw new SyncError(404, "RECORD_NOT_FOUND", "The target record was not found.");
}

async function insertStockLog(db, entry, itemId, actor) {
  if (!entry) return;
  await db.query(
    `INSERT INTO stock_log (id, item_id, change_amount, reason, user_id, user_name, occurred_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [entry.id || crypto.randomUUID(), itemId, Number(entry.change), entry.reason || "Adjustment",
      actor.id, actor.name, entry.timestamp || new Date().toISOString()],
  );
}

export async function applyMutation(db, type, payload, actor) {
  switch (type) {
    case "ADD_REPORT": {
      const location = payload.location || {};
      const reportedAt = payload.time || new Date().toISOString();
      const referencePrefix = getReportReferencePrefix({ ...payload, time: reportedAt });
      const existingReferences = await db.query(
        "SELECT reference FROM reports WHERE reference LIKE $1",
        [`${referencePrefix}-%`],
      );
      const reference = createReportReference({ ...payload, time: reportedAt }, existingReferences.rows);
      await db.query(
        `INSERT INTO reports (
           id, type, district, latitude, longitude, severity, status, submitted_by_id,
           assigned_team_id, reported_at, description, affected_count, people_count,
           days_without_food, water_level_ft, distance_from_aid_km, urgency_score,
           urgency_zone, urgency_factors, children_present, elderly_present, notes, reference
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb,$20,$21,$22::jsonb,$23)`,
        [
          text(payload.id, "Report ID", 100), text(payload.type, "Report type", 100), payload.district || null,
          location.lat ?? null, location.lng ?? null, Number(payload.severity), payload.status || "Pending",
          actor.id, payload.assignedTeamId || null, reportedAt, payload.description || "",
          payload.affectedCount ?? 0, payload.peopleCount ?? payload.affectedCount ?? 0,
          payload.daysWithoutFood ?? 0, payload.waterLevelFt ?? 0, payload.distanceFromAidKm ?? 0,
          payload.urgencyScore ?? 0, payload.urgencyZone || "green", JSON.stringify(payload.urgencyFactors || []),
          payload.childrenPresent ?? false, payload.elderlyPresent ?? false, JSON.stringify(payload.notes || []),
          reference,
        ],
      );
      return;
    }
    case "UPDATE_REPORT": {
      const patch = { ...payload.patch };
      if (Object.hasOwn(patch, "assignedTeamId")) patch.assignedTeamId ||= null;
      const query = updateSql("reports", "id", payload.id, patch, {
        status: "status", assignedTeamId: "assigned_team_id", description: "description",
        severity: "severity", affectedCount: "affected_count",
      });
      await requireChanged(await db.query(query.sql, query.values));
      return;
    }
    case "ADD_REPORT_NOTE": {
      const note = { id: payload.note?.id || crypto.randomUUID(), authorId: actor.id, author: actor.name,
        text: text(payload.note?.text, "Note", 2000), timestamp: new Date().toISOString() };
      const result = await db.query(
        `UPDATE reports SET notes = notes || $2::jsonb, updated_at = NOW() WHERE id = $1 RETURNING id`,
        [payload.id, JSON.stringify([note])],
      );
      await requireChanged(result);
      return;
    }
    case "ADD_TASK":
      await db.query(
        `INSERT INTO tasks (id, title, description, priority, assigned_team_id, assigned_user_id,
                            due_time, status, linked_report_id, resources, updates)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb)`,
        [text(payload.id, "Task ID", 100), text(payload.title, "Task title", 200), payload.description || "",
          payload.priority || "Medium", payload.assignedTeamId || null, payload.assignedUserId || null,
          payload.dueTime || null, payload.status || "To Do", payload.linkedReportId || null,
          JSON.stringify(payload.resources || {}), JSON.stringify(payload.updates || [])],
      );
      return;
    case "UPDATE_TASK": {
      const patch = { ...payload.patch };
      if (patch.resources) patch.resources = JSON.stringify(patch.resources);
      if (patch.updates) patch.updates = JSON.stringify(patch.updates);
      const query = updateSql("tasks", "id", payload.id, patch, {
        title: "title", description: "description", priority: "priority",
        assignedTeamId: "assigned_team_id", assignedUserId: "assigned_user_id",
        dueTime: "due_time", status: "status", linkedReportId: "linked_report_id",
        resources: "resources", updates: "updates",
      });
      await requireChanged(await db.query(query.sql, query.values));
      return;
    }
    case "ADD_INVENTORY":
      await db.query(
        `INSERT INTO inventory (id, name, category, quantity, unit, status, warehouse_id, last_updated)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [text(payload.id, "Inventory ID", 100), text(payload.name, "Item name", 200),
          text(payload.category, "Category", 100), Number(payload.qty), text(payload.unit, "Unit", 50),
          payload.status || "OK", text(payload.warehouseId, "Warehouse", 100),
          payload.lastUpdated || new Date().toISOString()],
      );
      await insertStockLog(db, payload.stockLog, payload.id, actor);
      return;
    case "UPDATE_INVENTORY": {
      const query = updateSql("inventory", "id", payload.id, payload.patch || {}, {
        name: "name", category: "category", qty: "quantity", unit: "unit",
        status: "status", warehouseId: "warehouse_id", lastUpdated: "last_updated",
      });
      await requireChanged(await db.query(query.sql, query.values));
      await insertStockLog(db, payload.patch?.stockLog, payload.id, actor);
      return;
    }
    case "UPDATE_ITEM_QTY": {
      const result = await db.query(
        `UPDATE inventory SET quantity = quantity + $2, last_updated = NOW(), updated_at = NOW()
         WHERE id = $1 AND quantity + $2 >= 0 RETURNING id`,
        [payload.itemId, Number(payload.delta)],
      );
      await requireChanged(result);
      await db.query(
        `INSERT INTO stock_log (id, item_id, change_amount, reason, user_id, user_name)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [payload.logId || crypto.randomUUID(), payload.itemId, Number(payload.delta),
          payload.reason || "Adjustment", actor.id, actor.name],
      );
      return;
    }
    case "ADD_STOCK_LOG":
      await insertStockLog(db, { ...payload, id: text(payload.id, "Stock log ID", 100) },
        text(payload.itemId, "Inventory item", 100), actor);
      return;
    case "ADD_MAP_PIN":
      await db.query(
        `INSERT INTO map_pins (id, report_id, latitude, longitude, location, water_level_ft,
                               people_count, children_present)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [text(payload.id, "Pin ID", 100), payload.reportId || null, payload.lat ?? payload.location?.lat,
          payload.lng ?? payload.location?.lng, payload.locationName || payload.district || null,
          payload.waterLevelFt ?? null, payload.peopleCount ?? null, payload.childrenPresent ?? null],
      );
      return;
    case "MARK_NOTIFICATION_READ": {
      const result = await db.query(
        `UPDATE notifications SET is_read = $2 WHERE id = $1 AND (user_id IS NULL OR user_id = $3) RETURNING id`,
        [payload.id, payload.read !== false, actor.id],
      );
      await requireChanged(result);
      return;
    }
    case "MARK_ALL_NOTIFICATIONS_READ":
      await db.query(
        "UPDATE notifications SET is_read = TRUE WHERE user_id IS NULL OR user_id = $1",
        [actor.id],
      );
      return;
    default:
      throw new SyncError(400, "UNSUPPORTED_PROPOSAL", "Unsupported proposal type.");
  }
}

export class SyncService {
  constructor(db) {
    this.db = db;
    this.authoritative = new AuthoritativeRepository(db);
    this.proposals = new ProposalRepository(db);
  }

  snapshot() {
    return this.authoritative.snapshot();
  }

  async submit(input, actor) {
    const id = text(input?.id, "Proposal ID", 100);
    const type = proposalType(input?.type);
    const payload = input?.payload;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new SyncError(400, "VALIDATION_ERROR", "Proposal payload must be an object.");
    }
    const current = await this.authoritative.snapshot();
    const baseSnapshotSeq = Number(input.baseSnapshotSeq);
    if (!Number.isSafeInteger(baseSnapshotSeq) || baseSnapshotSeq < 0 || baseSnapshotSeq > current.snapshotSeq) {
      throw new SyncError(409, "INVALID_BASE_SNAPSHOT", "Refresh the authoritative snapshot before submitting.");
    }
    const existing = await this.proposals.find(id);
    if (existing) return { proposal: mapProposal(existing), duplicate: true };
    const row = await this.proposals.create({
      id, type, payload, userId: actor.id, baseSnapshotSeq,
      conflictKey: conflictKey(type, payload),
    });
    return { proposal: mapProposal(row), duplicate: false };
  }

  async list() {
    return (await this.proposals.list()).map(mapProposal);
  }

  async transact(callback) {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT snapshot_seq FROM snapshot_meta WHERE singleton = TRUE FOR UPDATE");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  decide(id, input, actor) {
    return this.transact(async (client) => {
      const proposals = new ProposalRepository(client);
      const authoritative = new AuthoritativeRepository(client);
      const proposal = await proposals.find(id);
      if (!proposal) throw new SyncError(404, "PROPOSAL_NOT_FOUND", "Proposal not found.");
      if (proposal.status !== "Pending") return { proposal: mapProposal(proposal), duplicate: true };

      if (input?.decision === "Rejected") {
        const reason = text(input.reason, "Rejection reason", 1000);
        const current = await authoritative.snapshot();
        return { proposal: mapProposal(await proposals.decide(id, {
          status: "Rejected", reason, actorId: actor.id, snapshotSeq: current.snapshotSeq,
        })), duplicate: false };
      }
      if (input?.decision !== "Accepted") {
        throw new SyncError(400, "VALIDATION_ERROR", "Decision must be Accepted or Rejected.");
      }

      const earlier = await proposals.earlierPendingConflict(proposal);
      if (earlier) throw new SyncError(409, "PROCESS_EARLIER_FIRST", `Process earlier proposal ${earlier} first.`);
      const conflict = await proposals.acceptedConflict(proposal);
      if (conflict) {
        const current = await authoritative.snapshot();
        const rejected = await proposals.decide(id, {
          status: "Rejected", reason: `Conflict: ${conflict} was accepted first.`,
          actorId: actor.id, snapshotSeq: current.snapshotSeq,
        });
        return { proposal: mapProposal(rejected), duplicate: false };
      }

      await applyMutation(client, proposal.proposal_type, proposal.payload, {
        id: proposal.user_id,
        name: "Proposal submitter",
      });
      const sequence = await authoritative.advanceSnapshot();
      const accepted = await proposals.decide(id, {
        status: "Accepted", actorId: actor.id, snapshotSeq: sequence.snapshotSeq,
      });
      return { proposal: mapProposal(accepted), duplicate: false };
    });
  }

  direct(typeValue, payload, actor) {
    const type = proposalType(typeValue);
    return this.transact(async (client) => {
      await applyMutation(client, type, payload, actor);
      return new AuthoritativeRepository(client).advanceSnapshot();
    });
  }
}
