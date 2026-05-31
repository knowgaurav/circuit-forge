# CircuitForge Deployment

CircuitForge deploys for **$0/month** on managed free tiers with CI/CD via
GitHub Actions:

- **Vercel** — Next.js frontend
- **Render** — FastAPI backend (WebSockets supported)
- **MongoDB Atlas** — database
- **Axiom** *(optional)* — logging

## Full guide

The complete, step-by-step guide lives in the spec folder:

➡️ **[.kiro/specs/deployment/deployment.md](./.kiro/specs/deployment/deployment.md)**

It covers Atlas setup, the Render blueprint (`backend/render.yaml`), Vercel
configuration, the required GitHub secrets, CORS wiring, and troubleshooting.

## CI/CD at a glance

`.github/workflows/deploy-free.yml`:

1. **Validate frontend** — lint, type-check, build
2. **Validate backend** — ruff, mypy
3. **Deploy frontend** → Vercel (push to `main` only)
4. **Deploy backend** → Render deploy hook (push to `main` only)

## Required GitHub secrets

| Secret | Purpose |
|--------|---------|
| `VERCEL_TOKEN` | Authenticate the Vercel deploy |
| `VERCEL_ORG_ID` | Vercel org (`frontend/.vercel/project.json`) |
| `VERCEL_PROJECT_ID` | Vercel project (`frontend/.vercel/project.json`) |
| `RENDER_DEPLOY_HOOK_URL` | Trigger the Render backend deploy |

> Production env values are set in the Render and Vercel dashboards, not in the
> repo. `.env` files are gitignored. See `backend/.env.example` and
> `frontend/.env.example` for the full variable list.

## Always-on alternative

[Railway](https://railway.app) ($5 free credit/month) avoids Render's cold
starts and can host both services. See the spec for details.
