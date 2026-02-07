# TursoDB Setup Instructions

## Initialize the database

Run the SQL schema in your TursoDB instance. You can do this via:

### Option 1: Turso CLI
```bash
turso db shell dukane-laser-item-location-mark2messmore < schema.sql
```

### Option 2: TursoDB Dashboard
1. Go to https://turso.tech/app
2. Select your database: `dukane-laser-item-location-mark2messmore`
3. Open SQL console
4. Copy and paste contents of `schema.sql`
5. Run it

## What this creates:

**Tables:**
- `locations` - All physical locations (bins, racks, tables, etc.)
- `items` - Everything you track (optics, fixtures, welded parts)
- `movements` - Full history of all moves/adds/removes

**Pre-populated locations:**
- TRASH, CUSTOMER, IN-USE (special)
- LAB-RACK-1, LAB-RACK-2, LAB-RACK-3
- SHOP-RACK-1, SHOP-RACK-2, SHOP-RACK-3, SHOP-RACK-4
- LAB-TABLE-1, LAB-TABLE-2, LAB-TABLE-3
- LAB-MACHINE-1, LAB-MACHINE-2, LAB-MACHINE-3
- HUSKY-1-D1 through HUSKY-3-D5 (all drawers)

## Connection Info

Your app will connect using:
- **URL:** `libsql://dukane-laser-item-location-mark2messmore.aws-us-east-2.turso.io`
- **Token:** (stored in `.env` file)
