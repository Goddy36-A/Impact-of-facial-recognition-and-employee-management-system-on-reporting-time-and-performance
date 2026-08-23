# FaceForce — Facial Recognition & Employee Management System

**Academic research context:** *Impact of a Facial Recognition and Employee Management System on
Reporting Time and Performance*

A working Flask + vanilla-JS full-stack application: facial-recognition-based attendance check-in,
employee records, payroll processing, shift management, and reporting. Built to support a research
project measuring whether such a system measurably changes reporting time and reported performance,
not to make unverified claims that it already has.

---

## 1. What this is (and isn't)

This is a functional prototype: real database persistence, real session-based authentication, real
payroll math, and a real (if intentionally simplified) facial recognition pipeline via
[face-api.js](https://github.com/justadudewhohacks/face-api.js). It is **not** a commercial-grade
biometric security product, and a few things are worth being upfront about before anyone treats it as one:

- **The "AI pipeline" beyond face detection/matching is simulated.** Liveness detection, anti-spoofing,
  and pose/illumination scoring are heuristic approximations for demonstration purposes, not outputs of a
  trained anti-spoofing model. Don't rely on this for real access-control security.
- **Face descriptors are stored as plain JSON in SQLite**, not encrypted at rest. For a real deployment
  handling real biometric data, that would need to change — see Known Limitations.
- **face-api.js's model weights (~6MB) load from a CDN at runtime**, so first use requires internet
  access. The library itself and every other frontend asset are self-contained.

## 2. Architecture

```
faceforce/
├── backend/
│   ├── app.py              # Flask entry point, route registration, global auth guard
│   ├── auth_utils.py       # login_required / role_required decorators
│   ├── database.py         # SQLite schema, demo seed, admin bootstrap
│   └── routes/
│       ├── auth.py         # Login, logout, session check, change password
│       ├── employees.py    # Employee CRUD + stats
│       ├── attendance.py   # Check-in/out, history, CSV export
│       ├── recognition.py  # Face register, identify, simulated pipeline
│       ├── payroll.py      # Payroll processing, PAYE tax, NSSF
│       ├── shifts.py       # Shift management & assignment
│       ├── departments.py  # Department CRUD
│       └── reports.py      # Analytics & trend reports
├── frontend/
│   ├── templates/index.html    # SPA shell + login screen
│   └── static/
│       ├── css/main.css        # Design system (dark theme)
│       └── js/
│           ├── api.js          # REST API client (sends session cookie, handles 401s)
│           ├── auth.js         # Login/logout, session check on load, mobile sidebar toggle
│           ├── ui.js           # Toast, modal, formatters
│           ├── app.js          # SPA router
│           └── pages/          # Page renderers (dashboard, employees, payroll, etc.)
├── start.sh                # venv setup + run
├── requirements.txt
├── .env.example
└── faceforce.db             # Auto-created SQLite database (git-ignored)
```

## 3. Installation

```bash
git clone <your-repo-url> faceforce
cd faceforce
./start.sh
```

`start.sh` creates a virtual environment, installs dependencies, copies `.env.example` to `.env` if you
don't have one yet, and starts the server. Open **http://localhost:5000**.

On first run, watch the console output for a block like:
```
Bootstrap admin account created — username: admin
Generated temporary password: <random string>
```
Log in with that, then change the password immediately (account menu → Change password). There is no
hardcoded default password anywhere in this repository — see section 6.

### Manual setup (if you'd rather not use the script)
```bash
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # edit SECRET_KEY etc.
cd backend
python3 app.py
```

## 4. Requirements

- Python 3.9+
- A browser with camera access (Chrome recommended) for the face-scan features
- Internet access on first run only, to fetch face-api.js's model weights

## 5. Environment Variables

See `.env.example` for the full list with descriptions. The important ones:

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Signs session cookies. Required for production — without it, a random key is generated per process start, which invalidates sessions on restart. |
| `FLASK_ENV` | `development` or `production` — controls whether the session cookie requires HTTPS. |
| `ALLOWED_ORIGINS` | Comma-separated origins allowed to make credentialed API requests. |
| `INITIAL_ADMIN_USERNAME` / `INITIAL_ADMIN_PASSWORD` | Set your own bootstrap admin credentials instead of relying on the auto-generated one. |
| `FLASK_DEBUG` | Leave `false` unless you're actively debugging locally — Flask's interactive debugger allows arbitrary code execution if it's reachable by anyone but you. |

## 6. Authentication & Security

- **Session-based auth**: login sets a signed, `HttpOnly`, `SameSite=Lax` session cookie (Flask's built-in
  session, backed by `itsdangerous`). No custom token scheme.
- **Password hashing**: Werkzeug's `generate_password_hash`/`check_password_hash` (salted, not raw
  SHA-256).
- **Every `/api/*` route requires an authenticated session**, enforced by a single global
  `before_request` guard in `app.py` rather than a decorator that has to be remembered on each new route.
  Only `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`, and `/api/health` are reachable without one.
- **No hardcoded credentials anywhere in source or docs.** The bootstrap admin account's password is
  either generated at first run (printed once to the console) or set by you via `INITIAL_ADMIN_PASSWORD`.
- **CORS** requires explicit origins (`ALLOWED_ORIGINS`) and `supports_credentials=True` — a wildcard
  origin can't be combined with credentialed requests regardless, so this is enforced structurally, not
  just by convention.

### Known limitations (be aware of these before treating this as production-ready)
- Biometric face descriptors are stored unencrypted in SQLite. A real deployment handling real employee
  biometric data should encrypt this at rest and would likely need a documented data-retention/consent
  policy — a genuinely non-trivial compliance question this prototype doesn't attempt to solve.
- There's a single `admin` role in practice; the `role_required` decorator exists and department/payroll
  routes are natural candidates for tighter per-role restriction, but only one operator account is seeded
  by default (see `docs/` — not present yet — for where role expansion would go if this became a
  multi-operator deployment).
- No rate limiting on the login endpoint. Fine for a local/single-organization demo; add one
  (e.g. Flask-Limiter) before exposing this to the open internet.
- SQLite is fine for a single-instance research deployment; it is not the right choice for concurrent
  multi-writer production use.

## 7. Features

### Face Recognition
- Real-time detection via face-api.js (TinyFaceDetector)
- 128-D face descriptor extraction & matching
- Simulated pipeline for liveness/anti-spoof/pose/illumination scoring (see section 1 — this is
  heuristic, not a trained model)
- Configurable match threshold (default: 0.45 Euclidean distance)
- Auto check-in with cooldown to prevent duplicate entries

### Employee Management
- Full CRUD with validation
- Searchable, filterable, paginated table
- Department assignment with color-coded badges
- Face registration status tracking
- Employee profile view with attendance history

### Attendance
- Face-scan automated check-in/check-out
- Manual check-in override
- Per-day, per-department filtering
- CSV export
- Duration tracking with overtime calculation

### Payroll Engine
- Period-based processing (any date range)
- PAYE tax computation (Uganda graduated brackets)
- NSSF deduction (5% employee contribution)
- Allowances (15% of base), overtime pay (1.5x hourly)
- Pro-rata salary based on actual days worked
- Per-department or company-wide processing

### Shifts
- Named shifts with times and days
- Color-coded shift assignments
- Employee-to-shift mapping

### Reports & Analytics
- 7/14/30/60-day attendance trend chart
- Bottom 10 by attendance rate, top 10 overtime earners
- Payroll trend by month
- KPI summary panel

## 8. REST API

All endpoints are under `/api/`. **Every route below requires an authenticated session** (via
`/api/auth/login`) except where noted.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | Public | Log in, sets session cookie |
| GET | `/auth/me` | Public* | Check current session status |
| POST | `/auth/logout` | Public* | Clear session |
| POST | `/auth/change-password` | Required | Change own password |
| GET | `/employees/` | Required | List employees (q, department_id, status, page) |
| POST | `/employees/` | Required | Create employee |
| PUT | `/employees/:id` | Required | Update employee |
| DELETE | `/employees/:id` | Required | Delete employee |
| GET | `/employees/stats/summary` | Required | Dashboard stats |
| GET | `/attendance/` | Required | List attendance (date, department_id, status) |
| POST | `/attendance/checkin` | Required | Check in / check out |
| GET | `/attendance/export` | Required | Download CSV |
| POST | `/recognition/register` | Required | Register face descriptor |
| POST | `/recognition/identify` | Required | Identify from descriptor |
| GET | `/recognition/status` | Required | System status |
| POST | `/payroll/process` | Required | Run payroll for period |
| GET | `/payroll/summary` | Required | Monthly payroll summary |
| GET | `/reports/attendance-summary` | Required | Trend data |
| GET | `/reports/top-absentees` | Required | Absentee report |
| GET | `/reports/overtime` | Required | Overtime report |
| GET | `/health` | Public | Health check |

\* `/auth/me` and `/auth/logout` don't *require* a session to be callable (that would be circular for the
former, and pointless for the latter), but they don't expose any data to an unauthenticated caller either.

## 9. Demo Data

Auto-created on first run — fictional, for demonstration/evaluation purposes:
- **18 employees** across 6 departments
- **6 departments**: Engineering, Design, HR, Finance, Sales, Operations
- **4 shifts**: Morning, Afternoon, Night, Weekend
- **82 attendance records** (7 days, ~90% attendance rate)
- **1 bootstrap admin account** (credentials never hardcoded — see section 3)

## 10. Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Flask 3.x, Flask-Cors, Werkzeug (password hashing), python-dotenv |
| Database | SQLite (via Python's built-in `sqlite3`) |
| Auth | Flask signed session cookies |
| Face Detection/Matching | face-api.js (TinyFaceDetector + FaceRecognitionNet) |
| Frontend | Vanilla JS SPA (no framework), self-contained CSS design system |
| WSGI server (production) | gunicorn |

## 11. Deployment

```bash
gunicorn --bind 0.0.0.0:5000 --chdir backend app:app
```
Set `SECRET_KEY`, `FLASK_ENV=production`, and `ALLOWED_ORIGINS` in the environment first. Behind a
reverse proxy with HTTPS, `SESSION_COOKIE_SECURE` (automatically enabled when `FLASK_ENV=production`)
ensures session cookies are never sent over plain HTTP.

## 12. Research Context

This system was built to support empirical evaluation of two questions: whether automating attendance
capture via facial recognition changes **reporting time** (how long it takes to produce accurate
attendance/payroll figures) relative to manual processes, and whether it's associated with measurable
changes in **employee performance** indicators available to the organization (e.g. attendance
consistency, punctuality). The software provides the mechanisms to capture and report this data; it does
not itself draw or assert causal conclusions about efficiency or performance gains — that interpretation
belongs to whoever analyzes the data collected during the study period, informed by an actual baseline
comparison against the organization's prior manual process.
