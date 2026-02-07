# Deploy to Railway

## Quick Steps:

### Option 1: Web Dashboard (Easiest)

1. **Go to Railway:** https://railway.app
2. **Login** with GitHub (mark2messmore account)
3. **New Project** → **Deploy from GitHub repo**
4. **Select:** `mark2messmore/dukane-qr-inventory`
5. **Root Directory:** Change to `inventory-app`
6. **Add Environment Variables:**
   - Click "Variables" tab
   - Add these:
     ```
     VITE_TURSO_DATABASE_URL=libsql://dukane-laser-item-location-mark2messmore.aws-us-east-2.turso.io
     VITE_TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzA0MjU1ODYsImlkIjoiMDhjNTdiM2QtZjMyZi00NjQ0LWE5NWQtNjEzYzdkYjE3YTQzIiwicmlkIjoiZTVmNTEzZDUtOTU1Ni00NTNjLWFiNTUtMTc5NDBiZWJmNDdlIn0.OIFuuP929hoJfbeQHmQvXP_utYtTx7oht1iyKdN84Vk0ige8FbayuZpSZLu0dALn96OokoiaEoWaWL7VL5FEBg
     VITE_CLAUDE_API_KEY=(your Claude API key)
     ```
7. **Deploy!**
8. **Get your URL:** Railway will give you a public URL like `your-app.up.railway.app`

### Option 2: Railway CLI (Advanced)

1. **Open a NEW terminal** (so Railway CLI is in PATH)
2. **Navigate to project:**
   ```bash
   cd C:\MyProjects\dukane-qr-code\inventory-app
   ```
3. **Login:**
   ```bash
   railway login
   ```
   (Opens browser, authenticate with GitHub)

4. **Initialize:**
   ```bash
   railway init
   ```
   Select: Create new project → Name it "dukane-inventory"

5. **Link to GitHub repo:**
   ```bash
   railway link
   ```
   Select the `dukane-qr-inventory` repo

6. **Add environment variables:**
   ```bash
   railway variables set VITE_TURSO_DATABASE_URL="libsql://dukane-laser-item-location-mark2messmore.aws-us-east-2.turso.io"
   railway variables set VITE_TURSO_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzA0MjU1ODYsImlkIjoiMDhjNTdiM2QtZjMyZi00NjQ0LWE5NWQtNjEzYzdkYjE3YTQzIiwicmlkIjoiZTVmNTEzZDUtOTU1Ni00NTNjLWFiNTUtMTc5NDBiZWJmNDdlIn0.OIFuuP929hoJfbeQHmQvXP_utYtTx7oht1iyKdN84Vk0ige8FbayuZpSZLu0dALn96OokoiaEoWaWL7VL5FEBg"
   railway variables set VITE_CLAUDE_API_KEY="sk-ant-..."
   ```

7. **Deploy:**
   ```bash
   railway up
   ```

8. **Get URL:**
   ```bash
   railway domain
   ```

---

## After Deployment:

1. **Visit your URL** (Railway gives you a public URL)
2. **Install on phone:** Open URL on phone → "Add to Home Screen"
3. **Done!** Now accessible from anywhere.

---

## Railway Config (Automatic Detection):

Railway will automatically detect:
- **Framework:** Vite
- **Build Command:** `npm run build`
- **Start Command:** `npm run preview` (or serves the `dist` folder)

**If it doesn't work:**
- Set Root Directory to `inventory-app` in Railway dashboard
- Or add a `railway.json` in `inventory-app/`:
  ```json
  {
    "build": {
      "builder": "NIXPACKS"
    },
    "deploy": {
      "startCommand": "npm run preview",
      "restartPolicyType": "ON_FAILURE",
      "restartPolicyMaxRetries": 10
    }
  }
  ```

---

## Troubleshooting:

**Build fails:**
- Check Railway logs
- Make sure environment variables are set
- Verify Root Directory is `inventory-app`

**App loads but errors:**
- Check browser console
- Verify VITE_ environment variables are set (Railway dashboard)
- Make sure Claude API key is valid

**Can't access from phone:**
- Make sure you're using the Railway URL (not localhost)
- Check that it's HTTPS (Railway does this automatically)
- Grant camera permission for QR scanning

---

## Cost:

**Railway Free Tier:**
- $5 credit/month
- Should be enough for internal use
- ~500 hours of runtime

**If you need more:**
- Hobby plan: $5/month
- Pro plan: $20/month

---

**Recommended: Use Web Dashboard (Option 1) - it's the easiest!**
