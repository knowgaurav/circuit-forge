# CircuitForge Deployment Guide (Free Tier)

Deploy CircuitForge end-to-end on $0/month using managed free tiers, with
CI/CD driven by GitHub Actions.

## Service Topology

| Service | Hosts | Free tier |
|---------|-------|-----------|
| **Vercel** | Next.js frontend | Unlimited static sites, 100GB bandwidth |
| **Render** | FastAPI backend (+ WebSockets) | 750 instance-hours/month, sleeps after 15 min idle |
| **MongoDB Atlas** | Database | M0 cluster, 512MB storage |
| **Axiom** *(optional)* | Logs | 1TB ingest/month |

```text
  Push to main
       |
       v
  GitHub Actions
       |
       | validate FE + BE
       v
  Checks pass? --no--> fail run
       |
       | yes
       +------------------+
       v                  v
  Vercel deploy     Render deploy hook

  Runtime:
  User browser --HTTPS/WSS--> Vercel
  Vercel --NEXT_PUBLIC_API_URL--> Render
  Render --mongodb+srv--> MongoDB Atlas
  Render --OpenAI-compatible API--> LLM provider
  Render ...optional logs...> Axiom
```

## CI/CD Pipeline

The pipeline lives in `.github/workflows/deploy-free.yml`:

1. **validate-frontend** — `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build`
2. **validate-backend** — `uv pip install -e ".[dev]"`, `ruff check app`, `mypy app`
3. **deploy-frontend** — deploys `frontend/` to Vercel (`--prod`) — runs only on push to `main`
4. **deploy-backend** — POSTs the Render deploy hook — runs only on push to `main`

Deploy jobs require both validation jobs to pass and use the `production`
GitHub Environment, so you can add required reviewers/branch protection there.

```text
  validate-frontend --+
                      |
                      +--> deploy-frontend  (push to main only)
                      |
  validate-backend ---+--> deploy-backend   (push to main only)

  Both deploy jobs require BOTH validation jobs to pass.
```

> Tests run separately in `.github/workflows/test.yml` and `ci-cd.yml`. This
> workflow focuses on the free-tier release path.

## Step 1 — MongoDB Atlas (Database)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a cluster → choose **M0 Sandbox** (free).
3. **Database Access** → add a user with a username/password (save them).
4. **Network Access** → add IP `0.0.0.0/0` (Allow access from anywhere). Render
   does not expose static egress IPs on the free tier.
5. **Database → Connect → Drivers** → copy the connection string and append the
   database name:
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/circuitforge
   ```

## Step 2 — Render (Backend)

Two options — pick one.

### Option A: Blueprint (recommended)

The repo ships `backend/render.yaml`. In Render: **New + → Blueprint**, connect
the repo, and Render reads the config. Then fill the `sync: false` secrets
(`MONGODB_URI`, `CORS_ORIGINS`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and the
Axiom values if used) in the dashboard.

### Option B: Manual web service

1. **New + → Web Service**, connect the GitHub repo.
2. Configure:
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -e .`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
3. Add the environment variables from the table below.

### Backend environment variables

| Variable | Required | Example / notes |
|----------|----------|-----------------|
| `MONGODB_URI` | ✅ | Atlas connection string from Step 1 |
| `MONGODB_DATABASE` | ✅ | `circuitforge` |
| `CORS_ORIGINS` | ✅ | JSON array, e.g. `["https://your-app.vercel.app"]` |
| `OPENAI_API_KEY` | ✅ (for AI) | LLM provider key |
| `OPENAI_BASE_URL` | ✅ (for AI) | OpenAI-compatible chat completions URL |
| `OPENAI_MODEL` | optional | defaults to `gpt-4o` |
| `OPENAI_MAX_TOKENS` | optional | defaults to `4000` |
| `OPENAI_TEMPERATURE` | optional | defaults to `0.7` |
| `DEBUG` | optional | set `false` in production |
| `LOG_LEVEL` | optional | `INFO` |
| `GOOGLE_CLOUD_PROJECT` | optional | only if using Vertex AI/Gemini |
| `AXIOM_TOKEN` / `AXIOM_ORG_ID` / `AXIOM_DATASET` | optional | enables Axiom logging |

After the first deploy, copy the service URL (e.g.
`https://circuitforge-api.onrender.com`) and create a **Deploy Hook**
(Settings → Deploy Hook) for CI to trigger.

## Step 3 — Vercel (Frontend)

1. **Add New → Project**, import the GitHub repo.
2. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
3. Add environment variables (note the `/api` suffix and `wss://` scheme):

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `https://circuitforge-api.onrender.com/api` |
| `NEXT_PUBLIC_WS_URL` | `wss://circuitforge-api.onrender.com/api/ws` |
| `NEXT_PUBLIC_AXIOM_TOKEN` *(optional)* | Axiom token |
| `NEXT_PUBLIC_AXIOM_DATASET` *(optional)* | `circuitforge-logs` |

4. Deploy once from the dashboard, then collect the CI credentials:
   - Install CLI: `npm i -g vercel`
   - `vercel login`, then `vercel link` inside `frontend/`
   - `orgId` and `projectId` are written to `frontend/.vercel/project.json`
   - Create a token at **Vercel → Account Settings → Tokens**

## Step 4 — GitHub Secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**.

| Secret | Used by | Source |
|--------|---------|--------|
| `VERCEL_TOKEN` | `deploy-frontend` | Vercel account → Tokens |
| `VERCEL_ORG_ID` | `deploy-frontend` | `frontend/.vercel/project.json` (`orgId`) |
| `VERCEL_PROJECT_ID` | `deploy-frontend` | `frontend/.vercel/project.json` (`projectId`) |
| `RENDER_DEPLOY_HOOK_URL` | `deploy-backend` | Render service → Settings → Deploy Hook |

The legacy `ci-cd.yml` (Azure path) additionally expects `AZURE_CREDENTIALS`
and `AZURE_RESOURCE_GROUP`; ignore those for the free-tier flow.

> **Never commit secrets.** `.env` files are gitignored. The repo's
> `backend/.env` and `frontend/.env` hold local dev values only — set
> production values in the Render and Vercel dashboards.

## Step 5 — Wire CORS Both Ways

Once the Vercel domain is known, set the backend `CORS_ORIGINS` to include it
(JSON array), then redeploy the backend. The frontend `NEXT_PUBLIC_API_URL` /
`NEXT_PUBLIC_WS_URL` must point at the Render URL.

## Verification

1. `GET https://<render-url>/health` → `{"status":"healthy"}`
2. Open the Vercel URL, create a session, and confirm real-time sync (WebSocket
   connects over `wss://`).
3. Generate a course to confirm the LLM key works.
4. Check the **Actions** tab: validation + deploy jobs are green.

## Free-Tier Limitations

- **Render**: instance sleeps after 15 min idle; first request after sleep
  takes ~30s (cold start). WebSockets are supported on the free tier.
- **MongoDB Atlas**: 512MB storage, shared resources.
- **Vercel**: 100GB bandwidth, serverless function limits.

## Always-on Alternative

[Railway](https://railway.app) ($5 free credit/month) avoids cold starts and
can host both apps. Swap the `deploy-backend` job's deploy hook for Railway's,
keeping the rest of the pipeline intact.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Backend can't reach MongoDB | Verify `MONGODB_URI`; ensure Atlas Network Access allows `0.0.0.0/0`; user has `readWrite` |
| CORS errors in browser | Add the exact Vercel origin to `CORS_ORIGINS` (JSON array) and redeploy backend |
| WebSocket won't connect | Use `wss://` (not `ws://`) and the `/api/ws` path in `NEXT_PUBLIC_WS_URL` |
| First request very slow | Render cold start after idle — expected on free tier |
| Vercel deploy fails in CI | Confirm `VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` secrets are set |
