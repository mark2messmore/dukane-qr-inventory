"""
Initialize TursoDB with schema for Dukane inventory system
"""
import os
from dotenv import load_dotenv
import libsql_experimental as libsql

load_dotenv()

# TursoDB connection
url = os.getenv("TURSO_DATABASE_URL")
auth_token = os.getenv("TURSO_AUTH_TOKEN")

print(f"Connecting to TursoDB...")
conn = libsql.connect("dukane.db", sync_url=url, auth_token=auth_token)
conn.sync()

print("Creating schema...")

# Create tables
conn.execute("""
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  room TEXT,
  description TEXT,
  parent_id TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (parent_id) REFERENCES locations(id)
)
""")

conn.execute("""
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity INTEGER,
  current_location_id TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (current_location_id) REFERENCES locations(id)
)
""")

conn.execute("""
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
)
""")

print("Creating indexes...")

conn.execute("CREATE INDEX IF NOT EXISTS idx_items_location ON items(current_location_id)")
conn.execute("CREATE INDEX IF NOT EXISTS idx_items_type ON items(type)")
conn.execute("CREATE INDEX IF NOT EXISTS idx_items_description ON items(description)")
conn.execute("CREATE INDEX IF NOT EXISTS idx_movements_timestamp ON movements(timestamp DESC)")
conn.execute("CREATE INDEX IF NOT EXISTS idx_movements_item ON movements(item_id)")

print("Inserting default locations...")

# Pre-populate special locations
default_locations = [
    ('TRASH', 'disposal', None, 'Trash/Disposed'),
    ('CUSTOMER', 'customer', None, 'Shipped to Customer'),
    ('IN-USE', 'temporary', None, 'Currently In Use'),
]

for loc in default_locations:
    try:
        conn.execute(
            "INSERT OR IGNORE INTO locations (id, type, room, description) VALUES (?, ?, ?, ?)",
            loc
        )
    except Exception as e:
        print(f"Note: {loc[0]} may already exist")

conn.commit()
conn.sync()

print("\n✅ Database initialized successfully!")
print("\nTables created:")
print("  - locations (bins, racks, tables, etc.)")
print("  - items (everything you track)")
print("  - movements (full history)")
print("\nDefault locations:")
print("  - TRASH")
print("  - CUSTOMER")
print("  - IN-USE")

conn.close()
