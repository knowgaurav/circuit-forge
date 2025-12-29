# CircuitForge Deployment Guide (Free Tier)

This guide helps you deploy CircuitForge using free managed services.

## Services Overview

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| **Vercel** | Frontend hosting | Unlimited sites, 100GB bandwidth |
| **Render** | Backend hosting | 750 hours/month, spins down after 15min inactivity |
| **MongoDB Atlas** | Database | 512MB storage, shared cluster |

## Step 1: Set Up MongoDB Atlas (Database)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (choose "M0 Sandbox" - FREE)
4. Set up database access:
   - Go to "Database Access" → Add new user
   - Create username/password (save these!)
5. Set up network access:
   - Go to "Network Access" → Add IP Address
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
6. Get connection string:
   - Go to "Database" → "Connect" → "Connect your application"
   - Copy the connection string (looks like: `mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/`)
   - Replace `<password>` with your actual password
   - Add database name: `mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/circuitforge`

## Step 2: Set Up Render (Backend)

1. Go to [Render](https://render.com) and sign up with GitHub
2. Click "New" → "Web Service"
3. Connect your GitHub repo
4. Configure the service:
   - **Name**: `circuitforge-api`
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -e .`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables:
   ```
   MONGODB_URI=<your-mongodb-connection-string>
   MONGODB_DATABASE=circuitforge
   CORS_ORIGINS=https://your-vercel-domain.vercel.app
   ```
6. Click "Create Web Service"
7. Copy the service URL (e.g., `https://circuitforge-api.onrender.com`)
8. Get Deploy Hook:
   - Go to Settings → Deploy Hook
   - Create a hook and copy the URL

## Step 3: Set Up Vercel (Frontend)

1. Go to [Vercel](https://vercel.com) and sign up with GitHub
2. Click "Add New" → "Project"
3. Import your GitHub repo
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
5. Add environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://circuitforge-api.onrender.com
   NEXT_PUBLIC_WS_URL=wss://circuitforge-api.onrender.com
   ```
6. Click "Deploy"
7. Get Vercel credentials for GitHub Actions:
   - Install Vercel CLI: `npm i -g vercel`
   - Run `vercel login`
   - Run `vercel link` in the frontend directory
   - Get tokens from `~/.vercel` or Vercel dashboard

## Step 4: Configure GitHub Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions

Add these secrets:

```
VERCEL_TOKEN          # From Vercel account settings → Tokens
VERCEL_ORG_ID         # From .vercel/project.json after linking
VERCEL_PROJECT_ID     # From .vercel/project.json after linking
RENDER_DEPLOY_HOOK_URL # From Render service settings
```

## Step 5: Update Frontend API URL

Update `frontend/src/services/api.ts` to use environment variable:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
```

## Deployment Flow

After setup, every push to `main` will:
1. Run linting and type checks
2. Deploy frontend to Vercel
3. Trigger backend deployment on Render

## Cost Summary

| Service | Monthly Cost |
|---------|-------------|
| Vercel | $0 |
| Render | $0 (spins down when idle) |
| MongoDB Atlas | $0 |
| **Total** | **$0** |

## Limitations

- **Render free tier**: Service sleeps after 15 minutes of inactivity. First request after sleep takes ~30 seconds.
- **MongoDB Atlas free tier**: 512MB storage limit, shared resources.
- **Vercel free tier**: 100GB bandwidth, serverless function limits.

## Alternative: Railway.app

If you want always-on backend without cold starts:
- [Railway](https://railway.app) offers $5 free credit/month
- Supports both frontend and backend
- No cold starts

## Troubleshooting

### Backend not connecting to MongoDB
- Check MONGODB_URI is correct
- Ensure IP whitelist includes 0.0.0.0/0
- Verify database user has readWrite permissions

### CORS errors
- Update CORS_ORIGINS in Render to include your Vercel domain
- Include both with and without trailing slash

### WebSocket not connecting
- Render supports WebSockets on free tier
- Ensure NEXT_PUBLIC_WS_URL uses `wss://` (not `ws://`)
