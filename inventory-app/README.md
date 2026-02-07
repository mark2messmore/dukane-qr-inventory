# Dukane Inventory System

Voice-controlled QR code inventory tracking for lab equipment, parts, and fixtures.

## Features

- 📷 **QR Code Scanning** - Scan bins, locations, and parts
- 🎤 **Voice Commands** - Natural language inventory management
- 🤖 **AI-Powered** - Claude parses commands intelligently
- 📍 **Location Tracking** - Track items across lab and shop
- ↩️ **Undo** - Reverse mistakes instantly
- 🔍 **Smart Search** - Find items by description or location
- 📱 **PWA** - Install on phone, works like a native app

## Quick Start

### 1. Initialize Database

First, run the SQL schema in your TursoDB instance:

```bash
# Option 1: Turso CLI
turso db shell dukane-laser-item-location-mark2messmore < ../schema.sql
```

### 2. Add API Keys

Edit `.env`:
```
VITE_CLAUDE_API_KEY=sk-ant-...  # Get from https://console.anthropic.com
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

### 4. Install on Phone (PWA)

1. Open the app on your phone's browser
2. Tap "Share" → "Add to Home Screen" (iOS) or "Install App" (Android)
3. Now you have a native-like app!

## How to Use

### Basic Workflow:

**1. Scan a bin:**
- Tap "📷 Scan QR Code"
- Point camera at bin label (e.g., BIN-047)

**2. Tell it what's in there:**
- Tap "🎤 Hold to Talk"
- Say: "Add 3 lenses, blue fixtures, bag of screws"
- Done!

### Voice Commands:

**Adding items:**
- "Add 5 f40 2 micron lenses to BIN-047"
- "Add blue fixture to LAB-TABLE-1"

**Moving items:**
- "Move upper fixture from RACK-5 to LAB-TABLE-1"
- "Move 3 lenses from BIN-047 to BIN-023"

**Removing items:**
- "Remove 2 lenses from BIN-047"

**Searching:**
- "Where are the f40 lenses?"

**Undo:**
- Tap "↩️ Undo Last"

## API Keys Needed

1. **TursoDB** - Already configured ✅
2. **Claude API** - Get from https://console.anthropic.com
   - Costs ~$0.01 per command

## Deployment

Run locally or deploy to Railway/Cloudflare Pages.

For local network access:
```bash
npm run dev -- --host
# Access from phone via http://YOUR_PC_IP:5173
```
