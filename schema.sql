-- TursoDB Schema for Dukane Inventory System
-- Run this in your TursoDB dashboard or via turso CLI

-- Locations table (bins, racks, tables, shelves, special locations)
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  room TEXT,
  description TEXT,
  parent_id TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (parent_id) REFERENCES locations(id)
);

-- Items table (everything you track)
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity INTEGER,
  current_location_id TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (current_location_id) REFERENCES locations(id)
);

-- Movement log (full history)
CREATE TABLE IF NOT EXISTS movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER DEFAULT (strftime('%s', 'now')),
  item_id TEXT,
  from_location_id TEXT,
  to_location_id TEXT,
  quantity INTEGER,
  action TEXT NOT NULL,
  transcript TEXT,
  notes TEXT,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (from_location_id) REFERENCES locations(id),
  FOREIGN KEY (to_location_id) REFERENCES locations(id)
);

-- Indexes for fast search
CREATE INDEX IF NOT EXISTS idx_items_location ON items(current_location_id);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_description ON items(description);
CREATE INDEX IF NOT EXISTS idx_movements_timestamp ON movements(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_movements_item ON movements(item_id);

-- Pre-populate special locations
INSERT OR IGNORE INTO locations (id, type, room, description) VALUES
  ('TRASH', 'disposal', null, 'Trash/Disposed'),
  ('CUSTOMER', 'customer', null, 'Shipped to Customer'),
  ('IN-USE', 'temporary', null, 'Currently In Use');

-- Pre-populate lab racks
INSERT OR IGNORE INTO locations (id, type, room, description) VALUES
  ('LAB-RACK-1', 'rack', 'LAB', 'Lab Rack 1'),
  ('LAB-RACK-2', 'rack', 'LAB', 'Lab Rack 2'),
  ('LAB-RACK-3', 'rack', 'LAB', 'Lab Rack 3');

-- Pre-populate shop racks
INSERT OR IGNORE INTO locations (id, type, room, description) VALUES
  ('SHOP-RACK-1', 'rack', 'SHOP', 'Shop Rack 1'),
  ('SHOP-RACK-2', 'rack', 'SHOP', 'Shop Rack 2'),
  ('SHOP-RACK-3', 'rack', 'SHOP', 'Shop Rack 3'),
  ('SHOP-RACK-4', 'rack', 'SHOP', 'Shop Rack 4');

-- Pre-populate lab tables
INSERT OR IGNORE INTO locations (id, type, room, description) VALUES
  ('LAB-TABLE-1', 'table', 'LAB', 'Lab Table 1'),
  ('LAB-TABLE-2', 'table', 'LAB', 'Lab Table 2'),
  ('LAB-TABLE-3', 'table', 'LAB', 'Lab Table 3');

-- Pre-populate lab machines
INSERT OR IGNORE INTO locations (id, type, room, description) VALUES
  ('LAB-MACHINE-1', 'machine', 'LAB', 'Lab Machine 1'),
  ('LAB-MACHINE-2', 'machine', 'LAB', 'Lab Machine 2'),
  ('LAB-MACHINE-3', 'machine', 'LAB', 'Lab Machine 3');

-- Pre-populate Husky toolboxes
INSERT OR IGNORE INTO locations (id, type, room, description) VALUES
  ('HUSKY-1-D1', 'drawer', 'LAB', 'Husky 1 Drawer 1'),
  ('HUSKY-1-D2', 'drawer', 'LAB', 'Husky 1 Drawer 2'),
  ('HUSKY-1-D3', 'drawer', 'LAB', 'Husky 1 Drawer 3'),
  ('HUSKY-1-D4', 'drawer', 'LAB', 'Husky 1 Drawer 4'),
  ('HUSKY-1-D5', 'drawer', 'LAB', 'Husky 1 Drawer 5'),
  ('HUSKY-2-D1', 'drawer', 'LAB', 'Husky 2 Drawer 1'),
  ('HUSKY-2-D2', 'drawer', 'LAB', 'Husky 2 Drawer 2'),
  ('HUSKY-2-D3', 'drawer', 'LAB', 'Husky 2 Drawer 3'),
  ('HUSKY-2-D4', 'drawer', 'LAB', 'Husky 2 Drawer 4'),
  ('HUSKY-2-D5', 'drawer', 'LAB', 'Husky 2 Drawer 5'),
  ('HUSKY-3-D1', 'drawer', 'LAB', 'Husky 3 Drawer 1'),
  ('HUSKY-3-D2', 'drawer', 'LAB', 'Husky 3 Drawer 2'),
  ('HUSKY-3-D3', 'drawer', 'LAB', 'Husky 3 Drawer 3'),
  ('HUSKY-3-D4', 'drawer', 'LAB', 'Husky 3 Drawer 4'),
  ('HUSKY-3-D5', 'drawer', 'LAB', 'Husky 3 Drawer 5');
