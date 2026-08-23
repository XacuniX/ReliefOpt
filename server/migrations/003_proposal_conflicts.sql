ALTER TABLE proposals
  ADD COLUMN conflict_key TEXT,
  ADD COLUMN decided_snapshot_seq BIGINT CHECK (decided_snapshot_seq >= 0);

CREATE INDEX proposals_conflict_order_index
  ON proposals (conflict_key, created_at, id);
