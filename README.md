<div align="center">

<img src="https://img.shields.io/badge/Groove-AI-6366f1?style=for-the-badge&logoColor=white" alt="Groove AI" />

# Groove AI

**AI-Powered GitHub Repository Analyser**

Dependency graphs · Semantic search · AI code explanations · Execution flow visualization

<br/>

[![MIT License](https://img.shields.io/badge/License-MIT-6366f1?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docs.docker.com/compose)
[![Neo4j](https://img.shields.io/badge/Neo4j-Graph_DB-008CC1?style=flat-square&logo=neo4j&logoColor=white)](https://neo4j.com)

<br/>

</div>

---

## ✨ What is Groove AI?

Groove AI turns any GitHub repository into an interactive knowledge base. Drop in a repo URL and instantly explore:

| Feature | Description |
|---|---|
| 🔍 **Semantic Search** | Query your codebase in plain English using FAISS vector embeddings |
| 🌐 **Dependency Graphs** | Visualize module relationships parsed by Tree-sitter, stored in Neo4j |
| 🤖 **AI Code Explanations** | LangChain + OpenAI explains any function, class, or file on demand |
| 🔀 **Execution Flow** | Interactive call-graph visualization powered by React Flow |
| ✏️ **In-Browser Editing** | Full Monaco Editor — read, edit, and understand code without leaving the tab |

---

## 🏗️ Architecture
```
groove-ai/
├── client/              # React 18 + Vite (Zustand, React Router, React Flow)
├── node-api/            # Node.js + Express API Gateway (auth, job orchestration)
├── fastapi-engine/      # FastAPI (AI interactions, Tree-sitter parsing, graph engine)
├── worker/              # Celery async job worker (background processing)
├── database/            # DB schemas & migrations
├── infra/               # Docker, deployment configs
├── shared/              # Shared types & utilities
├── scripts/             # Setup and utility scripts
├── docker-compose.yml
└── .env.example
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Zustand, React Router v6, Axios |
| **API Gateway** | Node.js, Express, Passport.js, JWT, Sequelize |
| **AI Engine** | FastAPI, LangChain, FAISS, Tree-sitter, OpenAI API |
| **Graph DB** | Neo4j |
| **Relational DB** | PostgreSQL |
| **Cache / Queue** | Redis · BullMQ · Celery |
| **Code Editor** | Monaco Editor |
| **Graph Visualization** | React Flow |

---

## 🚀 Quick Start

### Prerequisites

- [Docker & Docker Compose](https://docs.docker.com/get-docker/) *(recommended)*
- Node.js 18+ and Python 3.10+ *(for manual setup only)*
- An [OpenAI API Key](https://platform.openai.com/api-keys)

---

### Step 1 — Clone & configure
```bash
git clone https://github.com/harsherchauhan18/Groove_Ai.git groove-ai
cd groove-ai

cp .env.example .env
cp node-api/.env.example       node-api/.env
cp client/.env.example         client/.env
cp fastapi-engine/.env.example fastapi-engine/.env
cp worker/.env.example         worker/.env
```

Fill in your secrets in each `.env` file before proceeding.

---

### Step 2 — Google OAuth *(optional)*

> Skip this step if you only need email/password auth.

1. Open [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID** → Web Application
3. Add this as an **Authorized Redirect URI**:
```
   http://localhost:5000/api/auth/google/callback
```
4. Paste the **Client ID** and **Client Secret** into `node-api/.env`

---

### Step 3 — Start with Docker Compose *(recommended)*
```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| React Client | http://localhost:3000 |
| Node API Gateway | http://localhost:5000 |
| FastAPI AI Engine | http://localhost:8000 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |
| Neo4j Browser | http://localhost:7474 |

---

### Step 4 — Start manually *(dev mode)*

> Ensure your databases are running first:
> ```bash
> docker-compose up postgres redis neo4j -d
> ```

**Node API**
```bash
cd node-api && npm install && npm run dev
```

**FastAPI Engine**
```bash
cd fastapi-engine
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**React Client**
```bash
cd client && npm install && npm run dev
```

---

## 🔐 Authentication

Groove AI uses a **dual-auth** system supporting both local credentials and Google OAuth.

| Method | Flow |
|---|---|
| **Email + Password** | Register / Login → Node API issues JWT access + refresh tokens |
| **Google OAuth 2.0** | Passport.js Google strategy → redirects back to the React app with an access token |

### Token Strategy

| Token | Lifetime | Storage | Transport |
|---|---|---|---|
| **Access Token** | 7 days | `localStorage` | `Authorization: Bearer <token>` header |
| **Refresh Token** | 30 days | `httpOnly` cookie + DB | Axios interceptor silently refreshes on `401` |

> The FastAPI engine validates the **same JWT secret** — no separate auth layer needed for AI routes.

---

## 📡 API Reference

### Auth — Email

| Method | Endpoint | Body | Returns |
|---|---|---|---|
| `POST` | `/api/auth/register` | `{ name, email, password }` | `{ accessToken, user }` |
| `POST` | `/api/auth/login` | `{ email, password }` | `{ accessToken, user }` |
| `GET` | `/api/auth/me` | — *(requires Bearer token)* | `{ user }` |

### Auth — OAuth & Tokens

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/refresh` | Reads `refreshToken` cookie → returns `{ accessToken }` |
| `POST` | `/api/auth/logout` | Clears refresh token from DB and cookie |
| `GET` | `/api/auth/google` | Redirects to Google OAuth consent screen |
| `GET` | `/api/auth/google/callback` | Google callback → redirects to `http://localhost:3000/auth/callback?token=<accessToken>` |

---

## 🌱 Environment Variables

| File | Purpose |
|---|---|
| `.env.example` | Root — shared variables overview |
| `client/.env.example` | Vite env vars (`VITE_` prefix required for client exposure) |
| `node-api/.env.example` | Express + Passport.js + DB config |
| `fastapi-engine/.env.example` | FastAPI config + AI secrets (OpenAI, etc.) |
| `worker/.env.example` | Celery broker / backend config |

---

## 🐛 Troubleshooting

**`Cannot find module 'vite'` in the client**
```bash
cd client && npm install
# If peer dependency errors appear:
npm install --legacy-peer-deps
```

**PostgreSQL connection refused**
Verify the port in `node-api/.env` and `fastapi-engine/.env` matches the Docker mapping. The default is `5432` but may be `5433` if another PostgreSQL instance is already running locally.

**Pydantic `ValidationError` in FastAPI engine**
Ensure every variable referenced in your `Settings` model (`config.py`) — such as `CELERY_BROKER_URL` — is present and correctly named in `fastapi-engine/.env`.

---

## 🤝 Contributing

Contributions are very welcome!

1. Fork the repository
2. Create your branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

Please open an issue first for major changes so we can discuss the approach.

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.

---

<div align="center">

Built with ❤️ by OnlyBasics

⭐ Star this repo if you find it useful!

</div>
