CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  leader_id TEXT,
  member_count INTEGER NOT NULL DEFAULT 0 CHECK (member_count >= 0),
  status TEXT NOT NULL DEFAULT 'Standby' CHECK (status IN ('Deployed', 'Standby', 'Offline')),
  location TEXT,
  active_task TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('central_admin', 'warehouse_manager', 'field_worker')),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Offline')),
  team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  phone TEXT,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX users_username_lower_unique ON users (LOWER(username));
CREATE INDEX users_team_id_index ON users (team_id);
ALTER TABLE teams
  ADD CONSTRAINT teams_leader_id_foreign_key
  FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE warehouses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  district TEXT,
  latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
  severity SMALLINT NOT NULL CHECK (severity BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Acknowledged', 'Resolved')),
  submitted_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  assigned_team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT NOT NULL DEFAULT '',
  affected_count INTEGER CHECK (affected_count >= 0),
  people_count INTEGER CHECK (people_count >= 0),
  days_without_food INTEGER CHECK (days_without_food >= 0),
  water_level_ft DOUBLE PRECISION CHECK (water_level_ft >= 0),
  distance_from_aid_km DOUBLE PRECISION CHECK (distance_from_aid_km >= 0),
  urgency_score SMALLINT CHECK (urgency_score BETWEEN 0 AND 100),
  urgency_zone TEXT CHECK (urgency_zone IN ('green', 'amber', 'red')),
  urgency_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  children_present BOOLEAN,
  elderly_present BOOLEAN,
  notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX reports_status_index ON reports (status);
CREATE INDEX reports_submitted_by_id_index ON reports (submitted_by_id);
CREATE INDEX reports_assigned_team_id_index ON reports (assigned_team_id);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')),
  assigned_team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  assigned_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  due_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'To Do' CHECK (status IN ('To Do', 'In Progress', 'En Route', 'Completed')),
  linked_report_id TEXT REFERENCES reports(id) ON DELETE SET NULL,
  resources JSONB NOT NULL DEFAULT '{}'::jsonb,
  updates JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX tasks_assigned_team_id_index ON tasks (assigned_team_id);
CREATE INDEX tasks_assigned_user_id_index ON tasks (assigned_user_id);
CREATE INDEX tasks_status_index ON tasks (status);

CREATE TABLE inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('OK', 'Low', 'Critical', 'Out of Stock')),
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (warehouse_id, name)
);

CREATE INDEX inventory_warehouse_id_index ON inventory (warehouse_id);

CREATE TABLE stock_log (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  change_amount DOUBLE PRECISION NOT NULL,
  reason TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX stock_log_item_id_index ON stock_log (item_id);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('Critical', 'System', 'Info')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_id_index ON notifications (user_id);
CREATE INDEX notifications_unread_index ON notifications (user_id, is_read);

CREATE TABLE map_pins (
  id TEXT PRIMARY KEY,
  report_id TEXT REFERENCES reports(id) ON DELETE SET NULL,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  location TEXT,
  water_level_ft DOUBLE PRECISION CHECK (water_level_ft >= 0),
  people_count INTEGER CHECK (people_count >= 0),
  children_present BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE proposals (
  id TEXT PRIMARY KEY,
  proposal_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'Rejected')),
  rejection_reason TEXT,
  base_snapshot_seq BIGINT NOT NULL DEFAULT 0 CHECK (base_snapshot_seq >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  decided_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  CHECK ((status <> 'Rejected') OR rejection_reason IS NOT NULL)
);

CREATE INDEX proposals_status_created_at_index ON proposals (status, created_at);
CREATE INDEX proposals_user_id_index ON proposals (user_id);

CREATE TABLE snapshot_meta (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton = TRUE),
  snapshot_seq BIGINT NOT NULL DEFAULT 0 CHECK (snapshot_seq >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO snapshot_meta (singleton, snapshot_seq) VALUES (TRUE, 0);

CREATE TABLE processed_proposal_ids (
  proposal_id TEXT PRIMARY KEY,
  result TEXT NOT NULL CHECK (result IN ('Accepted', 'Rejected')),
  snapshot_seq BIGINT NOT NULL CHECK (snapshot_seq >= 0),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
