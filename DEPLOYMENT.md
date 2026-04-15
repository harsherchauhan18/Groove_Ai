# 🚀 Groove AI — Free-Tier Deployment Guide (Option B)

This guide walks you through deploying the fully operational Groove AI stack to free platforms. We will be using Vercel for the frontend and Render for the server backends.

## 🏗️ Architecture Overview

| Service | Platform | Free Tier |
|---|---|---|
| **Client** (React/Vite frontend) | Vercel | ✅ Unlimited |
| **Node API** (Express Gateway) | Render | ✅ 750 hrs/mo (Spins down when idle) |
| **FastAPI Engine** (Python Engine)| Render | ✅ 750 hrs/mo (Spins down when idle) |
| **Celery Worker** (Python) | Render | ✅ 750 hrs/mo (Background Worker) |
| **PostgreSQL Database** | Neon DB | ✅ Already set up in your envs! |
| **Redis Cache & Queues**| Upstash | ✅ 10k commands / day |
| **Neo4j Graph Database**| AuraDB | ✅ 1 free instance |

---

## 🛠️ Step 1 — Prepare your databases

Your PostgreSQL is already configured using NeonDB! We only need Redis and Neo4j.

**A. Redis via Upstash (Free):**
1. Head over to [Upstash](https://upstash.com/) and choose "Create Database".
2. Select your closest region (i.e., `us-east-1` if unsure) and stick with **Redis**.
3. Copy the **Redis URL**. 
   > **Important:** It should start with `rediss://` indicating TLS encryption is on. Render requires this.

**B. Neo4j via AuraDB (Free):**
1. Access [Neo4j Aura Free](https://neo4j.com/cloud/aura/) and create your free instance.
2. **Crucial:** Save the generated password immediately, as it cannot be viewed again.
3. Copy your Connection Info (it will resemble `neo4j+s://XXXXXXXX.databases.neo4j.io`).

---

## 🔧 Step 2 — Ready Configuration Files

This allows Render to deploy all three background services in one single click via a blueprint!

1. Create a `render.yaml` at the root of the project (`c:\Users\harsh\MERN\Groove_AI\render.yaml`).
2. Add the following config to it:

```yaml
services:
  - type: web
    name: groove-node-api
    runtime: node
    rootDir: node-api
    buildCommand: npm ci --omit=dev
    startCommand: node src/server.js
    envVars:
      - key: NODE_ENV
        value: production

  - type: web
    name: groove-fastapi
    runtime: python
    rootDir: fastapi-engine
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: APP_ENV
        value: production
      - key: DEBUG
        value: "false"

  - type: worker
    name: groove-celery-worker
    runtime: python
    rootDir: worker
    buildCommand: pip install -r requirements.txt
    startCommand: celery -A app.worker.celery_app worker --loglevel=info --concurrency=2
```

3. **Commit** and **Push** this file to your GitHub repository along with the latest codebase. Make sure all your local `.env` files are in your `.gitignore` and not checked in.

---

## 🌐 Step 3 — Deploy the Client Frontend (Vercel)

1. Load [Vercel](https://vercel.com/) and register/sign-in via GitHub.
2. Hit **Add New Project** and select your `Groove_Ai` repository.
3. Make the following configurations before hitting Deploy:
   * **Root Directory:** Edit to be `/client`
   * **Framework Preset:** Select **Vite**
   * **Environment Variables:** Add your keys. 
     * `VITE_API_BASE_URL`: `https://groove-node-api.onrender.com/api` (Placeholder, assuming this is your Render app name)
     * `VITE_SOCKET_URL`: `https://groove-node-api.onrender.com`
     * `VITE_GOOGLE_CLIENT_ID`: (Your Google Auth ID)
4. Hit **Deploy**.
5. Once complete, copy the Vercel Domain Name (e.g., `https://groove-client.vercel.app`).

---

## 🚀 Step 4 — Deploy the Render Backends

1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Select **New** -> **Blueprint**.
3. Select your GitHub repository. It will automatically detect your `render.yaml` configurations and spawn the Node API, FastAPI Engine, and Celery Worker simultaneously.
4. While everything builds, you need to go to **Environment** inside each service on the Render dashboard and set up the secrets.

### groove-node-api Environment Variables
* `NODE_ENV`: `production`
* `DB_HOST`: (The URL of your NeonDB, ex. `ep-delicate-tree...neon.tech`)
* `DB_PORT`: `5432`
* `DB_NAME`: `neondb`
* `DB_USER`: `neondb_owner`
* `DB_PASSWORD`: (Your Neon database password)
* `REDIS_URL`: (Your new Upstash `rediss://` URL)
* `FASTAPI_URL`: `https://groove-fastapi.onrender.com`
* `JWT_SECRET`: (Random secure string)
* `JWT_EXPIRES_IN`: `7d`
* `JWT_REFRESH_SECRET`: (Another secure string)
* `JWT_REFRESH_EXPIRES_IN`: `30d`
* `GOOGLE_CLIENT_ID`: (Your Google OAuth Client ID)
* `GOOGLE_CLIENT_SECRET`: (Your Google OAuth Secret)
* `GOOGLE_CALLBACK_URL`: `https://groove-node-api.onrender.com/api/auth/google/callback`
* `CLIENT_URL`: (Your Vercel deployment root domain)
* `COOKIE_SECRET`: (Random string)

### groove-fastapi Environment Variables
* `DATABASE_URL`: (The full URL given by Neon for AsyncPG, ex `postgresql+asyncpg://neondb_owner...`)
* `REDIS_URL`: (Your Upstash `rediss://` URL)
* `NEO4J_URI`: (Your AuraDB `neo4j+s://` URI)
* `NEO4J_USERNAME`: `neo4j`
* `NEO4J_PASSWORD`: (Your AuraDB generated password)
* `JWT_SECRET`: (Use the exact same key as node-api above)
* `GEMINI_API_KEY`: (Your Google Gemini AI API key)
* `ALLOWED_ORIGINS`: `https://groove-node-api.onrender.com,(Your Vercel deployment root domain)`
* `FAISS_INDEX_PATH`: `./data/faiss_index`
* `REPOS_BASE_DIR`: `./data/repos`

### groove-celery-worker Environment Variables
* `CELERY_BROKER_URL`: (Your Upstash `rediss://` URL)
* `CELERY_RESULT_BACKEND`: (Your Upstash `rediss://` URL)
* `DATABASE_URL`: (The same AsyncPG Neon URL)
* `FASTAPI_URL`: `https://groove-fastapi.onrender.com`
* `NEO4J_URI`: (Your AuraDB `neo4j+s://` URI)
* `NEO4J_USERNAME`: `neo4j`
* `NEO4J_PASSWORD`: (Your AuraDB generated password)
* `REPOS_BASE_DIR`: `./data/repos`

*Important Note: If you renamed your App domains during the deployment differently than `groove-node-api.onrender.com` make sure to fix the variables to point exactly mapping to those correct URLs.*

---

## 🔒 Step 5 — Google OAuth Configuration Wrap-up
1. Log into your Google Cloud Platform console. 
2. In `APIs & Services` -> `Credentials`, select your OAuth Client details.
3. Update **Authorized JavaScript Origins** to add `https://groove-node-api.onrender.com` and your new Vercel App URL.
4. Update **Authorized redirect URIs** to `https://groove-node-api.onrender.com/api/auth/google/callback`.

## 🎉 Testing
Head back to Vercel and load it up in the browser! Validate that endpoints exist and health checks are passing! Have a blast showing off your deployed platform!
