# Dukane QR Code Inventory System - Getting Started

## What You Have

A complete voice-controlled QR code inventory system for your lab. Here's what's built:

### 📦 Generated Assets:
1. **bin_labels.pdf** - 50 bin labels (BIN-001 to BIN-050)
2. **location_labels.pdf** - 28 location labels (racks, toolboxes, tables, machines)
3. **weld_labels.pdf** - Example weld part labels (WELD-001 to WELD-080)

### 💻 PWA Application:
- `inventory-app/` - Full-featured progressive web app
- QR scanner (uses phone camera)
- Voice input (browser speech recognition)
- Claude AI integration (parses natural language commands)
- TursoDB backend (already connected)
- Search functionality
- Undo feature
- Movement history

---

## Setup Steps (5 minutes)

### Step 1: Initialize Database

Run the SQL schema in your TursoDB dashboard:

1. Go to https://turso.tech/app
2. Select database: `dukane-laser-item-location-mark2messmore`
3. Open SQL console
4. Copy and paste contents of `schema.sql`
5. Run it

**This creates:**
- Tables for items, locations, movements
- Pre-populated locations (racks, toolboxes, etc.)

### Step 2: Add Claude API Key

1. Go to https://console.anthropic.com
2. Create account / Log in
3. Go to "API Keys"
4. Create new key
5. Copy the key (starts with `sk-ant-`)
6. Edit `inventory-app/.env`:
   ```
   VITE_CLAUDE_API_KEY=sk-ant-your-key-here
   ```

### Step 3: Run the App

```bash
cd inventory-app
npm install
npm run dev
```

Open http://localhost:5173

**To access from your phone on same WiFi:**
```bash
npm run dev -- --host
```
Then visit http://YOUR_PC_IP:5173 on your phone

### Step 4: Print Labels

Print these PDFs on 1" × 1" label sheets:
- `bin_labels.pdf` - For your 50 bins
- `location_labels.pdf` - For racks, toolboxes, tables

Label sheet specs:
- 8.5" × 11" sheets
- 1" × 1" square labels
- 80 labels per sheet (8 columns × 10 rows)
- Compatible with: https://theshippingstore.com/products/1-x-1-square-laser-inkjet-labels-s001

---

## How to Use

### Initial Setup (Labeling):

1. **Stick QR labels on everything:**
   - All bins (BIN-001, BIN-002, etc.)
   - Racks (LAB-RACK-1, SHOP-RACK-4, etc.)
   - Husky toolboxes drawers (HUSKY-1-D1, etc.)
   - Tables (LAB-TABLE-1, etc.)

2. **Inventory each bin:**
   - Open app on phone
   - Scan bin QR code
   - Tap mic button
   - Say: "Add 3 f40 lenses, blue fixtures, bag of screws"
   - Done!

### Daily Usage:

**Finding something:**
- Open app → type "f40 lenses" → search
- Shows: "BIN-047 (Shop Rack 5)"

**Moving something:**
- Scan bin (or say location)
- Say: "Move upper fixture from Rack 5 to Lab Table 1"
- Done!

**Removing something:**
- Scan bin
- Say: "Remove 2 lenses"
- Done!

**Made a mistake?**
- Tap "Undo Last"

---

## Voice Command Examples

**Adding items to a bin:**
- After scanning BIN-047: "Add 5 lenses, 2 fixtures, bag of screws"
- Full command: "Add 3 f40 2 micron lenses to BIN-023"

**Moving items:**
- "Move upper fixture from RACK-5 to LAB-TABLE-1"
- "Move 2 lenses from BIN-047 to BIN-023"

**Removing items:**
- After scanning: "Remove 2 lenses"
- Full command: "Remove blue fixture from LAB-TABLE-1"

**Searching:**
- "Where are the f40 lenses?"
- "Do we have any blue fixtures?"

**For optics (with quantity tracking):**
- "Add 5 f40 2 micron collimating lenses to BIN-047"
- System tracks: 5 lenses
- Later: "Remove 2 lenses" → Now 3 left

**For fixtures (always qty 1):**
- "Add upper fixture to RACK-5"
- "Move upper fixture to LAB-TABLE-1"
- "Remove upper fixture" (goes to TRASH)

---

## Database Structure

**Items tracked:**
- Optics (lenses, connectors) - WITH quantity
- Fixtures (always qty = 1)
- Welded parts (WELD-001, WELD-002, etc.)
- General items

**Locations:**
- Bins: BIN-001 to BIN-050
- Lab racks: LAB-RACK-1/2/3
- Shop racks: SHOP-RACK-1/2/3/4
- Tables: LAB-TABLE-1/2/3
- Machines: LAB-MACHINE-1/2/3
- Toolboxes: HUSKY-1-D1 through HUSKY-3-D5
- Special: TRASH, CUSTOMER, IN-USE

**Everything is logged:**
- Every add/move/remove is in `movements` table
- Full audit trail
- Undo works by reversing last movement

---

## Integration with Welding Software

**Future:** Auto-create WELD-XXX parts when weld completes

In your Electron welding software:
```javascript
// After weld completes
const partId = `WELD-${nextNumber}`;

// Insert into TursoDB
await db.addItem(
  partId,
  'Welded part',
  'weld_part',
  1,  // qty always 1
  null  // no location yet
);

// Print QR label
printLabel(partId);

// User scans label + says location
// "WELD-087 to BIN-023"
```

---

## Cost Breakdown

**One-time:**
- Label sheets: ~$20 for 1000 labels
- TursoDB: FREE (you're already using it)

**Ongoing:**
- Claude API: ~$0.01 per voice command
- Typical usage: ~$5-10/month
- TursoDB: FREE tier is generous

**Total: Basically free for internal lab use.**

---

## Deployment Options

**Option 1: Run on lab PC (easiest)**
```bash
npm run dev -- --host
```
Access from phone on same WiFi.

**Option 2: Deploy to Railway (remote access)**
```bash
npm i -g @railway/cli
railway login
railway init
railway up
```
Get public URL, access from anywhere.

**Option 3: Cloudflare Pages**
- Free hosting
- Build: `npm run build`
- Upload `dist/` folder

---

## What's Next?

**Immediate:**
1. Print labels
2. Stick them on bins/racks
3. Inventory your stuff

**Future enhancements:**
- Photo capture per item (upload to R2)
- Integration with welding software
- Export reports
- Low stock alerts
- Customer tracking
- Fixture→customer assignments

---

## Troubleshooting

**App won't start:**
- Make sure you're in `inventory-app/` directory
- Run `npm install` first
- Check `.env` has Claude API key

**QR scanner not working:**
- Must use HTTPS or localhost
- Grant camera permission
- Try Chrome/Safari (best support)

**Voice not working:**
- Browser speech recognition works in Chrome/Safari
- Or just type commands in search box
- Claude still parses them!

**Database errors:**
- Make sure you ran `schema.sql` in TursoDB
- Check `.env` has correct database URL/token

**Can't find items:**
- Make sure you added them first!
- Check "Recent Activity" to see if it was logged
- Search is case-insensitive and fuzzy

---

## Files Overview

```
dukane-qr-code/
├── bin_labels.pdf              # Print these!
├── location_labels.pdf         # Print these!
├── weld_labels.pdf             # Example weld labels
├── schema.sql                  # Run this in TursoDB
├── generate_labels.py          # Generate more labels
├── generate_bin_labels.py      # Generate bin/location labels
└── inventory-app/              # Main PWA
    ├── src/
    │   ├── components/
    │   │   ├── QRScanner.jsx   # Camera scanner
    │   │   └── VoiceInput.jsx  # Voice recording
    │   ├── services/
    │   │   ├── database.js     # TursoDB connection
    │   │   └── claude.js       # AI parsing
    │   └── App.jsx             # Main app
    ├── .env                    # API keys (ADD CLAUDE KEY HERE)
    └── README.md               # Detailed docs
```

---

## Questions?

The code is well-commented. Explore and modify as needed!

**Key files to understand:**
- `inventory-app/src/App.jsx` - Main logic
- `inventory-app/src/services/database.js` - Database queries
- `inventory-app/src/services/claude.js` - AI parsing

**Enjoy your automated inventory system!** 🚀
