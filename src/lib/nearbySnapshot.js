import { AUTHORITATIVE_STORES } from "./db.js";

export const NEARBY_SNAPSHOT_TYPE = "RELIEFOPT_AUTHORITATIVE_SNAPSHOT";
export const NEARBY_SNAPSHOT_SCHEMA_VERSION = 1;
export const MAX_NEARBY_SNAPSHOT_BYTES = 900_000;

export class NearbySnapshotError extends Error {
  constructor(message, code = "INVALID_SNAPSHOT") {
    super(message);
    this.name = "NearbySnapshotError";
    this.code = code;
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validDate(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function sanitizeAuthoritativeSnapshot(snapshot) {
  if (!isPlainObject(snapshot)) {
    throw new NearbySnapshotError("The nearby phone did not send a valid snapshot.");
  }
  if (!Number.isSafeInteger(snapshot.snapshotSeq) || snapshot.snapshotSeq < 0) {
    throw new NearbySnapshotError("The nearby snapshot has an invalid sequence number.");
  }
  if (!validDate(snapshot.generatedAt)) {
    throw new NearbySnapshotError("The nearby snapshot is missing a valid approval time.");
  }
  if (!isPlainObject(snapshot.data)) {
    throw new NearbySnapshotError("The nearby snapshot does not contain approved ReliefOpt data.");
  }

  const data = {};
  for (const store of AUTHORITATIVE_STORES) {
    const records = snapshot.data[store];
    if (!Array.isArray(records)) {
      throw new NearbySnapshotError(`The nearby snapshot is missing ${store} data.`);
    }
    if (records.some((record) => !isPlainObject(record) || typeof record.id !== "string" || !record.id)) {
      throw new NearbySnapshotError(`The nearby snapshot contains invalid ${store} records.`);
    }
    data[store] = records.map((record) => ({ ...record }));
  }

  return {
    snapshotSeq: snapshot.snapshotSeq,
    generatedAt: new Date(snapshot.generatedAt).toISOString(),
    data,
  };
}

export function createNearbySnapshotPayload(snapshot, sentAt = new Date().toISOString()) {
  const envelope = {
    type: NEARBY_SNAPSHOT_TYPE,
    schemaVersion: NEARBY_SNAPSHOT_SCHEMA_VERSION,
    sentAt,
    snapshot: sanitizeAuthoritativeSnapshot(snapshot),
  };
  const payload = JSON.stringify(envelope);
  const byteLength = new TextEncoder().encode(payload).byteLength;
  if (byteLength > MAX_NEARBY_SNAPSHOT_BYTES) {
    throw new NearbySnapshotError(
      "The approved snapshot is too large for this nearby-sync proof of concept.",
      "PAYLOAD_TOO_LARGE",
    );
  }
  return { payload, byteLength, snapshot: envelope.snapshot };
}

export function parseNearbySnapshotPayload(payload, currentSnapshotSeq = -1) {
  let envelope;
  try {
    envelope = JSON.parse(payload);
  } catch {
    throw new NearbySnapshotError("The received nearby data could not be read.");
  }
  if (
    !isPlainObject(envelope) ||
    envelope.type !== NEARBY_SNAPSHOT_TYPE ||
    envelope.schemaVersion !== NEARBY_SNAPSHOT_SCHEMA_VERSION
  ) {
    throw new NearbySnapshotError("The nearby phone sent an unsupported ReliefOpt data format.");
  }

  const snapshot = sanitizeAuthoritativeSnapshot(envelope.snapshot);
  if (snapshot.snapshotSeq <= currentSnapshotSeq) {
    throw new NearbySnapshotError(
      `Snapshot #${snapshot.snapshotSeq} is not newer than this phone's snapshot #${currentSnapshotSeq}.`,
      "SNAPSHOT_NOT_NEWER",
    );
  }
  return snapshot;
}
