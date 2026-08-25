ALTER TABLE reports ADD COLUMN reference VARCHAR(32);
ALTER TABLE reports ADD CONSTRAINT reports_reference_unique UNIQUE (reference);
