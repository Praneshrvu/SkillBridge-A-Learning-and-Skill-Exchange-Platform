# 🌉 SkillBridge - Peer-to-Peer Skill Sharing & Mentorship Platform

> **Major Project** developed using **RESTful Web Services**, **Python FastAPI**, **MySQL**, **Postman**, **Swagger/OpenAPI**, and **Docker**.

---

## 📌 Executive Summary & Objective

In modern academic and professional landscapes, learning new skills is essential for career progression. However, finding the right mentor or peer to learn from is often expensive, intimidating, or time-consuming. 

**SkillBridge** solves this problem by providing a common, secure, and user-friendly platform where learners and mentors connect through flexible exchange models:
1. **Skill-for-Skill Barter ($0 Swap)**: Exchange knowledge directly without monetary barriers (e.g., *Student A teaches C++ in exchange for Student B teaching Java*).
2. **Paid Mentorship / Tutoring**: Mentors can set an hourly fee; learners can review the terms and pay securely via escrow.
3. **Confidentiality & Privacy Protection**: Users can toggle **Confidential Mode** so that only their alias/display name and what they can teach / are good at explaining are visible, masking all personal details (full name, email, phone, company, bio).
4. **Company Interview & Training Question Bank**: Curated collection of technical questions asked during hiring and training assessments at **Google, Amazon, Microsoft, TCS, Infosys**, complete with solutions, code snippets, and community upvoting.
5. **Connect Directly with Company Mentors**: Industry professionals from top companies can offer free AMAs, 1-on-1 mock interviews, or answer direct questions through dedicated threads.

---

## 🏗️ System Architecture

SkillBridge is built as a modular RESTful microservice with clean separation of concerns:

```
                                  +---------------------------------------+
                                  |     Web Browser / Postman / Client     |
                                  +---------------------------------------+
                                                      |
                                           HTTP / JSON (REST)
                                                      v
                                  +---------------------------------------+
                                  |            FastAPI Gateway            |
                                  |   (CORS, JWT Auth Middleware, Static) |
                                  +---------------------------------------+
                                                      |
       +--------------------+-------------------------+--------------------+--------------------+
       |                    |                         |                    |                    |
       v                    v                         v                    v                    v
+--------------+   +-------------------+   +--------------------+   +--------------+   +--------------------+
|  /api/auth   |   |   /api/skills     |   |   /api/exchanges   |   |  /api/users  |   |   /api/questions   |
|   & Users    |   |  & Barter Engine  |   |  & Escrow Payment  |   | (Privacy/Mask|   | & Company Mentors  |
+--------------+   +-------------------+   +--------------------+   +--------------+   +--------------------+
       |                    |                         |                    |                    |
       +--------------------+-------------------------+--------------------+--------------------+
                                                      |
                                           SQLAlchemy 2.0 ORM
                                                      v
                                  +---------------------------------------+
                                  |     MySQL 8.0 (or SQLite Fallback)    |
                                  +---------------------------------------+
```

---

## 🌟 Key Features

### 1. 🔒 Granular Confidentiality Options for Both Teachers & Learners
- **For the Teacher (Offering to Teach)**:
  - Can choose whether to reveal their real identity or keep their teaching profile confidential.
  - If confidential: only their alias (e.g. `StealthArchitect_99`), what they teach, and what they are good at explaining are shown. Real name, email, phone, company, and bio are hidden.
- **For the Learner (Person Wanting to Get Taught)**:
  - Has the exact same confidentiality option!
  - Can browse and list skills they want to learn either publicly or confidentially.
  - If confidential: only their alias (e.g. `StealthLearner_Maya`) and their learning goals / what they need explained are visible to mentors.
- **Learners & Teachers Dual Catalog**:
  - The catalog allows toggling between **👨‍🏫 Browse Teachers (People Offering to Teach)** and **🎓 Browse Learners (People Looking to be Taught)**, with dedicated privacy filters on both!

### 2. 🤝 Dual Exchange Modes: Barter vs Paid Tutoring
- **Skill-for-Skill Barter ($0 Swap)**: 
  - Perfect for students! Alice knows **C++** and wants to learn **Java**. Bob knows **Java** and wants to learn **C++**.
  - The system detects the 2-way mutual fit and facilitates a $0 barter agreement.
- **Paid Tutoring**:
  - The teacher demands money for instruction (e.g., $30/hr).
  - The learner reviews the proposal and decides whether to accept and pay.
  - Features a simulated **Escrow Lifecycle**: `PAYMENT_PENDING` ➔ `PAID_ESCROW` ➔ `RELEASED_TO_TEACHER` (or `REFUNDED` if cancelled).

### 3. 📚 Company Interview & Corporate Training Question Bank
- Real questions asked across placement drives and corporate training programs:
  - **Google**: Distributed Rate Limiter design with Redis Token Bucket.
  - **Amazon**: Conference Room scheduling (Meeting Rooms II) with min-heaps.
  - **Microsoft**: Deadlock Coffman conditions and multithreading lock hierarchies.
  - **TCS**: Java Garbage Collection internals (G1GC vs ZGC).
  - **Infosys**: SQL CTEs and Window Functions (`DENSE_RANK()`).
- Searchable by company, difficulty, role, and keywords with solution toggles and live upvotes.

### 4. 🏢 Company Professionals & Direct 1-on-1 Q&A
- Verified employees from tech companies list their profiles with referral availability and mock interview slots.
- Users can ask direct questions (public for community learning or private 1-on-1).
- Mentors can answer questions directly via the web interface or REST API.

---

## 🛠️ Technology Stack

| Component | Technology | Description |
|-----------|------------|-------------|
| **Backend Framework** | Python 3.11+ / FastAPI | High-performance asynchronous RESTful API framework |
| **Database** | MySQL 8.0 / SQLite | Relational database with automatic SQLite fallback for zero-setup execution |
| **ORM** | SQLAlchemy 2.0 | Type-safe database queries and schema migrations |
| **Authentication** | PyJWT + Bcrypt | Secure password hashing and JSON Web Tokens |
| **API Documentation** | Swagger UI / ReDoc | Auto-generated interactive OpenAPI 3.0 specs |
| **Testing** | Postman & Pytest | Full test suite and ready-to-import Postman collection |
| **Containerization** | Docker & Docker Compose | Multi-container setup with MySQL 8.0, phpMyAdmin, and FastAPI |
| **Frontend UI** | HTML5, CSS3, JavaScript | Modern, responsive dashboard with demo persona switcher |

---

## 🚀 Quick Start Guide

### Option 1: Run Locally with Python Virtual Environment

1. **Activate the virtual environment**:
   ```powershell
   # Windows PowerShell
   .\.venv\Scripts\Activate.ps1
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Seed database with demo data**:
   ```bash
   python seed_data.py
   ```

4. **Start the FastAPI server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

5. **Open in your browser**:
   - Web Dashboard: `http://localhost:8000`
   - Swagger OpenAPI Docs: `http://localhost:8000/docs`
   - ReDoc Documentation: `http://localhost:8000/redoc`

---

### Option 2: Run with Docker & Docker Compose

To spin up the complete production stack (FastAPI backend + MySQL 8.0 + phpMyAdmin database viewer):

```bash
docker compose up --build -d
```

- **SkillBridge Web Dashboard & API**: `http://localhost:8000`
- **Swagger Documentation**: `http://localhost:8000/docs`
- **phpMyAdmin (MySQL GUI)**: `http://localhost:8080` (User: `skillbridge_user`, Password: `skillbridge_pass`)

---

## 🧪 Testing

### Automated Pytest Suite
Run the test suite that validates confidentiality masking, barter matching, question banks, and escrow workflows:
```bash
pytest -v test_api.py
```

### Postman Collection
Import `SkillBridge_Postman_Collection.json` into Postman. It includes:
- **Authentication**: Registration, Login, Profile, Confidentiality Toggle
- **Users**: Public profile viewing with privacy masking verification
- **Skills & Barter Engine**: Master skill listings, catalog search, 2-way barter matcher
- **Exchanges & Payments**: Barter proposals, escrow funding, release to teacher, reviews
- **Question Bank**: Company filtering (Google, Amazon, TCS, Infosys), upvoting, new contributions
- **Company Mentors**: Direct professional Q&A threads

---

## 👥 Pre-Configured Demo Personas

SkillBridge includes 5 pre-seeded demo users for rapid evaluation:

| Name / Alias | Email | Password | Role / Persona |
|--------------|-------|----------|----------------|
| **Alice Chen** | `alice@skillbridge.dev` | `pass123` | Knows **C++**, wants **Java** (Barter Swap) |
| **Bob Smith** | `bob@skillbridge.dev` | `pass123` | Knows **Java**, wants **C++** (Barter Swap) |
| **Stealth Mentor** | `anonymous_guru@skillbridge.dev` | `pass123` | **Confidential Mode ON** (Python/FastAPI, $30/hr) |
| **Sarah Jenkins** | `sarah.google@skillbridge.dev` | `pass123` | **Google** Staff Engineer (Free AMA & Referrals) |
| **Rahul Sharma** | `rahul.amazon@skillbridge.dev` | `pass123` | **Amazon** Solutions Architect (Paid Mock Interviews) |

---

## 📂 Project Directory Structure

```
Major-Project/
├── app/
│   ├── api/
│   │   ├── auth.py             # User registration, login, JWT token generation
│   │   ├── users.py            # User profiles with confidentiality enforcement
│   │   ├── skills.py           # Skills catalog & 2-way barter matching engine
│   │   ├── exchanges.py        # Barter / Paid proposals & escrow payments
│   │   ├── questions.py        # Company training & interview question bank
│   │   ├── company_mentors.py  # Company professionals & direct Q&A
│   │   └── deps.py             # JWT authentication dependency
│   ├── core/
│   │   ├── config.py           # App settings & environment config
│   │   ├── database.py         # SQLAlchemy engine with MySQL & SQLite fallback
│   │   └── security.py         # Bcrypt password hashing & PyJWT tokens
│   ├── models/                 # SQLAlchemy ORM models
│   ├── schemas/                # Pydantic schemas with privacy masking
│   ├── static/                 # Frontend CSS and JavaScript
│   ├── templates/
│   │   └── index.html          # Interactive Web UI dashboard
│   └── main.py                 # FastAPI application root & middleware
├── seed_data.py                # Pre-populates demo users, questions & barter pairs
├── test_api.py                 # Pytest automated test suite
├── SkillBridge_Postman_Collection.json # Postman collection (v2.1)
├── Dockerfile                  # Container definition
├── docker-compose.yml          # Multi-container orchestration (FastAPI + MySQL + phpMyAdmin)
├── requirements.txt            # Python dependencies
└── README.md                   # Comprehensive documentation
```

---

## 📜 License & Academic Integrity
Developed as an enterprise-grade Major Project demonstrating peer-to-peer distributed learning, secure RESTful web service architecture, and privacy-preserving data models.

