# 🌉 SkillBridge - Peer-to-Peer Skill Sharing & Mentorship Platform

> **Major Project** — FastAPI (Python) backend + React (Vite) frontend, separated into two independent projects.

---

## 📦 Project Structure

```
Major-Project/
├── app/                  ← FastAPI backend (pure REST API)
│   ├── api/              ← Route handlers (auth, skills, exchanges, chat, …)
│   ├── core/             ← Config, database, security
│   ├── models/           ← SQLAlchemy ORM models
│   └── schemas/          ← Pydantic request/response schemas
├── frontend/             ← React (Vite) frontend SPA
│   └── src/
│       ├── api/          ← API client (client.js)
│       ├── components/   ← One component per tab + Modal/Toast
│       ├── context/      ← AuthContext (JWT, demo persona switching)
│       └── styles/       ← style.css (shared design system)
├── seed_data.py          ← Demo data seeder
├── requirements.txt      ← Python backend dependencies
├── docker-compose.yml
└── Dockerfile
```

---

## 🚀 Running in Development

### 1 — Backend (FastAPI)

```bash
# From project root
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs  
ReDoc: http://localhost:8000/redoc

### 2 — Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:5173

The Vite dev server proxies `/api` → `http://localhost:8000` automatically (configured in `vite.config.js`), so no CORS setup is needed in development.

---

## ⚙️ Environment Variables

### Backend — `.env` (copy from `.env.example`)

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | dev key | JWT signing secret — **change in production** |
| `DATABASE_URL` | MySQL URL | Primary database |
| `FALLBACK_TO_SQLITE` | `True` | Auto-fallback to SQLite if MySQL unavailable |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | Allowed frontend origins |

### Frontend — `frontend/.env` (copy from `frontend/.env.example`)

| Variable | Description |
|---|---|
| `VITE_API_BASE` | Backend URL (only needed for production builds) |

---

## 🐳 Docker

```bash
docker-compose up --build
```

---

## 🔑 Demo Accounts (seeded automatically)

| Persona | Email | Password |
|---|---|---|
| Alice (C++ → Java barter) | alice@skillbridge.dev | pass123 |
| Bob (Java → C++ barter) | bob@skillbridge.dev | pass123 |
| Stealth Mentor (confidential) | anonymous_guru@skillbridge.dev | pass123 |
| Maya (confidential learner) | maya.learner@skillbridge.dev | pass123 |
| Sarah (Google Staff Eng) | sarah.google@skillbridge.dev | pass123 |
| Rahul (Amazon Arch, paid) | rahul.amazon@skillbridge.dev | pass123 |
