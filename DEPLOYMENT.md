# Deployment Guide

## Backend Deployment (Render.com - FREE)

### Step 1: Deploy Backend to Render

1. Go to https://render.com and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository (or upload this folder)
4. Configure:
   - **Name**: `global-chat-backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`

5. Add Environment Variables:
   ```
   MONGO_URI=mongodb+srv://shafvan:fb049KrOtGbtNgiz@global-chat.aofez8f.mongodb.net/
   ADMIN_API_SECRET=talat
   PORT=3001
   ```

6. Click **"Create Web Service"**
7. Wait for deployment (5-10 minutes)
8. Copy your backend URL (e.g., `https://global-chat-backend.onrender.com`)

### Step 2: Update Frontend on Netlify

1. Go to your Netlify dashboard
2. Go to **Site configuration** → **Environment variables**
3. Add new variable:
   ```
   VITE_BACKEND_URL=https://your-backend-url.onrender.com
   ```
   (Replace with your actual Render URL from Step 1)

4. Go to **Deploys** → **Trigger deploy** → **Deploy site**

### Alternative: Deploy Backend to Railway (Also FREE)

1. Go to https://railway.app
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Add environment variables:
   - `MONGO_URI`
   - `ADMIN_API_SECRET`
   - `PORT` (Railway auto-assigns)
5. Deploy and copy the public URL
6. Update Netlify with `VITE_BACKEND_URL`

---

## Testing Locally

To test with production backend locally:
```bash
# Create .env.local file
echo "VITE_BACKEND_URL=https://your-backend.onrender.com" > .env.local

# Run frontend
npm run dev
```

---

## Important Notes

⚠️ **Render Free Tier**: The backend will spin down after 15 minutes of inactivity. First request after idle will take ~30 seconds.

💡 **Tip**: Use Railway or Render's paid plan ($7/month) for always-on service.

🔒 **Security**: Never commit `.env` file to GitHub. Use environment variables in hosting platforms.
