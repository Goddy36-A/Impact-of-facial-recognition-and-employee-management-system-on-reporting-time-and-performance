# FaceForce Pro — Enterprise Employee Intelligence System
### Version 2.0.0

A production-grade facial recognition and employee management system with a Flask REST API backend, SQLite database, and a fully-featured SPA frontend.

---

## Architecture

```
faceforce-pro/
├── backend/
│   ├── app.py              # Flask entry point + route registration
│   ├── database.py         # SQLite schema, migrations, demo seed
│   └── routes/
│       ├── employees.py    # Employee CRUD + stats
│       ├── attendance.py   # Check-in/out, history, CSV export
│       ├── recognition.py  # Face register, identify, AI pipeline
│       ├── payroll.py      # Payroll processing, PAYE tax, NSSF
│       ├── shifts.py       # Shift management & assignment
│       ├── departments.py  # Department CRUD
│       ├── reports.py      # Analytics & trend reports
│       └── auth.py         # Login & session
├── frontend/
│   ├── templates/index.html    # SPA shell
│   └── static/
│       ├── css/main.css        # Enterprise design system
│       └── js/
│           ├── api.js          # REST API client layer
│           ├── ui.js           # Toast, modal, formatters
│           ├── app.js          # SPA router
│           └── pages/          # Page renderers
│               ├── dashboard.js
│               ├── recognition.js
│               ├── register.js
│               ├── employees.js
│               ├── departments.js
│               ├── shifts.js
│               ├── attendance.js
│               ├── payroll.js
│               └── reports.js
├── start.sh                # One-command startup
├── requirements.txt
└── faceforce.db            # Auto-created SQLite database
```

---

## Quick Start

### Requirements
- Python 3.8+
- pip
- A browser with camera (Chrome recommended)
- Internet access on first run (to download face-api.js models ~6MB)

### Run
```bash
chmod +x start.sh
./start.sh
```
Then open **http://localhost:5000**

Default credentials: `admin` / `admin123`

---

## Features

### Face Recognition
- Real-time detection via face-api.js (TinyFaceDetector)
- 128-D face descriptor extraction & matching
- Simulated AI pipeline: liveness detection, anti-spoofing, landmark quality, illumination scoring, pose estimation
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
- Create named shifts with times and days
- Color-coded shift assignments
- Employee-to-shift mapping

### Reports & Analytics
- 7/14/30/60-day attendance trend chart
- Bottom 10 by attendance rate
- Top 10 overtime earners
- Payroll trend by month
- KPI summary panel

---

## REST API

All endpoints at `/api/`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/employees/` | List employees (q, department_id, status, page) |
| POST | `/employees/` | Create employee |
| PUT | `/employees/:id` | Update employee |
| DELETE | `/employees/:id` | Delete employee |
| GET | `/employees/stats/summary` | Dashboard stats |
| GET | `/attendance/` | List attendance (date, department_id, status) |
| POST | `/attendance/checkin` | Check in / check out |
| GET | `/attendance/export` | Download CSV |
| POST | `/recognition/register` | Register face descriptor |
| POST | `/recognition/identify` | Identify from descriptor |
| GET | `/recognition/status` | System status |
| POST | `/payroll/process` | Run payroll for period |
| GET | `/payroll/summary` | Monthly payroll summary |
| GET | `/reports/attendance-summary` | Trend data |
| GET | `/reports/top-absentees` | Absentee report |
| GET | `/reports/overtime` | Overtime report |

---

## Demo Data

Auto-created on first run:
- **18 employees** across 6 departments
- **6 departments**: Engineering, Design, HR, Finance, Sales, Operations
- **4 shifts**: Morning, Afternoon, Night, Weekend
- **82 attendance records** (7 days, ~90% attendance rate)
- **1 admin user**: admin / admin123

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Flask 3.x + Flask-CORS |
| Database | SQLite (via Python sqlite3) |
| Face Detection | face-api.js (TinyFaceDetector) |
| Face Matching | face-api.js (FaceRecognitionNet) |
| AI Pipeline | Simulated liveness/anti-spoof pipeline |
| Frontend | Vanilla JS SPA (no framework) |
| Fonts | DM Serif Display + Plus Jakarta Sans + Geist Mono |
| Design System | Custom CSS (Obsidian + Citron theme) |

---

Built with ♥ — FaceForce Pro Enterprise System
# Impact-of-facial-recognition-and-employee-management-system-on-reporting-time-and-performance
