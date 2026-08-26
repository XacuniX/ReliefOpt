ALTER TABLE warehouses
  ADD COLUMN address TEXT,
  ADD COLUMN capacity DOUBLE PRECISION CHECK (capacity IS NULL OR capacity >= 0),
  ADD COLUMN manager_name TEXT,
  ADD COLUMN manager_phone TEXT;
