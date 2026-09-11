"""
FaceForce Pro — Database Layer
SQLite with full schema: employees, departments, attendance, payroll, shifts, users, face_data
"""

import sqlite3, os, json
from datetime import datetime, date
from werkzeug.security import generate_password_hash

# Use /data for persistent storage on Railway, fall back to local for development
_data_dir = '/data' if os.path.isdir('/data') else os.path.join(os.path.dirname(__file__), '..')
DB_PATH = os.path.join(_data_dir, 'faceforce.db')


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    cur = conn.cursor()

    # ── DEPARTMENTS ───────────────────────────────────────────────────────────
    cur.execute("""
    CREATE TABLE IF NOT EXISTS departments (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        name      TEXT NOT NULL UNIQUE,
        code      TEXT NOT NULL UNIQUE,
        manager   TEXT,
        budget    REAL DEFAULT 0,
        headcount INTEGER DEFAULT 0,
        color     TEXT DEFAULT '#00e5ff',
        created_at TEXT DEFAULT (datetime('now'))
    )""")

    # ── EMPLOYEES ─────────────────────────────────────────────────────────────
    cur.execute("""
    CREATE TABLE IF NOT EXISTS employees (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_no   TEXT NOT NULL UNIQUE,
        first_name    TEXT NOT NULL,
        last_name     TEXT NOT NULL,
        email         TEXT UNIQUE,
        phone         TEXT,
        department_id INTEGER REFERENCES departments(id),
        position      TEXT,
        role          TEXT DEFAULT 'employee',
        status        TEXT DEFAULT 'active',
        salary        REAL DEFAULT 0,
        currency      TEXT DEFAULT 'UGX',
        join_date     TEXT,
        birth_date    TEXT,
        gender        TEXT,
        national_id   TEXT,
        address       TEXT,
        emergency_contact TEXT,
        notes         TEXT,
        photo         TEXT,
        face_registered INTEGER DEFAULT 0,
        created_at    TEXT DEFAULT (datetime('now')),
        updated_at    TEXT DEFAULT (datetime('now'))
    )""")

    # ── FACE DATA ─────────────────────────────────────────────────────────────
    cur.execute("""
    CREATE TABLE IF NOT EXISTS face_data (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id  INTEGER NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
        descriptor   TEXT NOT NULL,
        samples      INTEGER DEFAULT 1,
        confidence   REAL DEFAULT 0,
        registered_at TEXT DEFAULT (datetime('now')),
        updated_at   TEXT DEFAULT (datetime('now'))
    )""")

    # ── ATTENDANCE ────────────────────────────────────────────────────────────
    cur.execute("""
    CREATE TABLE IF NOT EXISTS attendance (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id  INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        date         TEXT NOT NULL,
        check_in     TEXT,
        check_out    TEXT,
        method       TEXT DEFAULT 'face',
        confidence   REAL DEFAULT 100,
        status       TEXT DEFAULT 'present',
        overtime_hrs REAL DEFAULT 0,
        notes        TEXT,
        created_at   TEXT DEFAULT (datetime('now'))
    )""")

    # ── SHIFTS ────────────────────────────────────────────────────────────────
    cur.execute("""
    CREATE TABLE IF NOT EXISTS shifts (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        name         TEXT NOT NULL,
        start_time   TEXT NOT NULL,
        end_time     TEXT NOT NULL,
        days         TEXT NOT NULL,
        department_id INTEGER REFERENCES departments(id),
        color        TEXT DEFAULT '#00e5ff',
        created_at   TEXT DEFAULT (datetime('now'))
    )""")

    # ── EMPLOYEE SHIFTS ───────────────────────────────────────────────────────
    cur.execute("""
    CREATE TABLE IF NOT EXISTS employee_shifts (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        shift_id    INTEGER REFERENCES shifts(id) ON DELETE CASCADE,
        effective_from TEXT,
        effective_to   TEXT
    )""")

    # ── PAYROLL ───────────────────────────────────────────────────────────────
    cur.execute("""
    CREATE TABLE IF NOT EXISTS payroll (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id   INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        period_start  TEXT NOT NULL,
        period_end    TEXT NOT NULL,
        base_salary   REAL DEFAULT 0,
        allowances    REAL DEFAULT 0,
        deductions    REAL DEFAULT 0,
        overtime_pay  REAL DEFAULT 0,
        tax           REAL DEFAULT 0,
        net_pay       REAL DEFAULT 0,
        days_worked   INTEGER DEFAULT 0,
        days_absent   INTEGER DEFAULT 0,
        status        TEXT DEFAULT 'draft',
        processed_at  TEXT,
        notes         TEXT
    )""")

    # ── USERS (system auth) ───────────────────────────────────────────────────
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        username      TEXT NOT NULL UNIQUE,
        password      TEXT NOT NULL,
        role          TEXT DEFAULT 'employee',
        full_name     TEXT,
        department_id INTEGER REFERENCES departments(id),
        employee_id   INTEGER REFERENCES employees(id),
        is_active     INTEGER DEFAULT 1,
        last_login    TEXT,
        created_at    TEXT DEFAULT (datetime('now'))
    )""")

    # Migration: add columns to existing databases that pre-date this schema
    for col, definition in [
        ('full_name',     'TEXT'),
        ('department_id', 'INTEGER REFERENCES departments(id)'),
        ('is_active',     'INTEGER DEFAULT 1'),
    ]:
        try:
            cur.execute(f"ALTER TABLE users ADD COLUMN {col} {definition}")
            conn.commit()
        except Exception:
            pass  # Column already exists

    # ── AUDIT LOG ─────────────────────────────────────────────────────────────
    cur.execute("""
    CREATE TABLE IF NOT EXISTS audit_log (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user       TEXT,
        action     TEXT NOT NULL,
        target     TEXT,
        details    TEXT,
        ip         TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    )""")

    conn.commit()
    _seed_demo_data(conn)
    conn.close()
    print("✅ Database initialized")


def _seed_demo_data(conn):
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM departments")
    if cur.fetchone()[0] > 0:
        return  # Already seeded

    # Departments
    depts = [
        ('Engineering',  'ENG', 'Alice Nakato',   18000000, '#00e5ff'),
        ('Design',       'DSN', 'Carol Auma',      12000000, '#ff6b6b'),
        ('HR',           'HR',  'David Ssali',      8000000, '#00ff88'),
        ('Finance',      'FIN', 'Emma Tumwebaze',  10000000, '#ffb300'),
        ('Sales',        'SLS', 'Frank Mugisha',   15000000, '#a78bfa'),
        ('Operations',   'OPS', 'Grace Atim',      11000000, '#fb923c'),
    ]
    for name, code, mgr, budget, color in depts:
        cur.execute("INSERT INTO departments (name,code,manager,budget,color) VALUES (?,?,?,?,?)",
                    (name, code, mgr, budget, color))

    # Employees (18 total)
    employees = [
        ('E001','Alice','Nakato','alice@faceforce.ug','+256701000001',1,'Senior Engineer','admin',4500000),
        ('E002','Brian','Omondi','brian@faceforce.ug','+256701000002',1,'Frontend Dev','employee',3200000),
        ('E003','Charles','Byaruhanga','charles@faceforce.ug','+256701000003',1,'Backend Dev','employee',3500000),
        ('E004','Diana','Nagawa','diana@faceforce.ug','+256701000004',1,'DevOps Engineer','employee',3800000),
        ('E005','Edward','Tumwine','edward@faceforce.ug','+256701000005',2,'Lead Designer','employee',3000000),
        ('E006','Faith','Aciro','faith@faceforce.ug','+256701000006',2,'UI Designer','employee',2500000),
        ('E007','George','Kiggundu','george@faceforce.ug','+256701000007',3,'HR Manager','manager',2800000),
        ('E008','Helen','Atimango','helen@faceforce.ug','+256701000008',3,'HR Officer','employee',2200000),
        ('E009','Ivan','Ssempijja','ivan@faceforce.ug','+256701000009',4,'CFO','manager',5000000),
        ('E010','Jane','Kemigisha','jane@faceforce.ug','+256701000010',4,'Accountant','employee',2600000),
        ('E011','Kevin','Lubega','kevin@faceforce.ug','+256701000011',5,'Sales Lead','manager',3500000),
        ('E012','Linda','Amito','linda@faceforce.ug','+256701000012',5,'Sales Rep','employee',2000000),
        ('E013','Martin','Ouma','martin@faceforce.ug','+256701000013',5,'Sales Rep','employee',2000000),
        ('E014','Nancy','Tendo','nancy@faceforce.ug','+256701000014',6,'Ops Manager','manager',3200000),
        ('E015','Oscar','Wamala','oscar@faceforce.ug','+256701000015',6,'Logistics','employee',2100000),
        ('E016','Patricia','Nankunda','patricia@faceforce.ug','+256701000016',1,'QA Engineer','employee',2900000),
        ('E017','Quinn','Okello','quinn@faceforce.ug','+256701000017',2,'Motion Designer','employee',2700000),
        ('E018','Rachel','Kyomuhendo','rachel@faceforce.ug','+256701000018',4,'Finance Analyst','employee',2400000),
    ]
    for emp in employees:
        emp_no, fn, ln, email, phone, dept_id, position, role, salary = emp
        cur.execute("""
            INSERT INTO employees (employee_no,first_name,last_name,email,phone,
            department_id,position,role,salary,currency,join_date,status,gender)
            VALUES (?,?,?,?,?,?,?,?,?,'UGX',?,?,?)
        """, (emp_no, fn, ln, email, phone, dept_id, position, role, salary,
              '2023-01-15', 'active', ['Male','Female'][int(emp_no[1:])%2]))

    # Shifts
    shifts = [
        ('Morning Shift',   '08:00', '17:00', 'Mon,Tue,Wed,Thu,Fri', 1, '#00e5ff'),
        ('Afternoon Shift', '14:00', '22:00', 'Mon,Tue,Wed,Thu,Fri', 2, '#ff6b6b'),
        ('Night Shift',     '22:00', '06:00', 'Mon,Tue,Wed,Thu,Fri', 6, '#a78bfa'),
        ('Weekend Shift',   '09:00', '18:00', 'Sat,Sun',             5, '#ffb300'),
    ]
    for name, start, end, days, dept_id, color in shifts:
        cur.execute("INSERT INTO shifts (name,start_time,end_time,days,department_id,color) VALUES (?,?,?,?,?,?)",
                    (name, start, end, days, dept_id, color))

    # Attendance for past 7 days
    import random
    from datetime import timedelta
    today = date.today()
    emp_ids = list(range(1, 19))
    for day_offset in range(7, 0, -1):
        att_date = (today - timedelta(days=day_offset)).strftime('%Y-%m-%d')
        weekday = (today - timedelta(days=day_offset)).weekday()
        if weekday >= 5: continue  # skip weekends
        for emp_id in emp_ids:
            if random.random() > 0.1:  # 90% attendance
                h_in  = random.randint(7, 9)
                m_in  = random.randint(0, 59)
                h_out = random.randint(17, 19)
                m_out = random.randint(0, 59)
                check_in  = f"{att_date}T{h_in:02d}:{m_in:02d}:00"
                check_out = f"{att_date}T{h_out:02d}:{m_out:02d}:00"
                overtime  = max(0, h_out - 17 + m_out/60)
                cur.execute("""
                    INSERT INTO attendance (employee_id,date,check_in,check_out,method,confidence,status,overtime_hrs)
                    VALUES (?,?,?,?,'face',?,?,?)
                """, (emp_id, att_date, check_in, check_out,
                      round(85 + random.random() * 14, 1), 'present', round(overtime, 2)))

    # Admin user
    import secrets
    admin_username = os.environ.get('INITIAL_ADMIN_USERNAME', 'admin')
    admin_password = os.environ.get('INITIAL_ADMIN_PASSWORD')
    generated = admin_password is None
    if generated:
        admin_password = secrets.token_urlsafe(12)
    pw_hash = generate_password_hash(admin_password)
    cur.execute("INSERT INTO users (username,password,role,full_name,is_active) VALUES (?,?,?,?,1)",
                (admin_username, pw_hash, 'admin', 'System Administrator'))

    # Sample accounts for each role (demo password: FaceForce2025)
    demo_pw = generate_password_hash('FaceForce2025')
    demo_users = [
        ('hr_manager',     demo_pw, 'hr',         'Helen Atimango',       3,  8),   # dept=HR, emp=E008
        ('finance_officer',demo_pw, 'finance',     'Jane Kemigisha',       4,  10),  # dept=Finance, emp=E010
        ('eng_supervisor', demo_pw, 'supervisor',  'Alice Nakato',         1,  1),   # dept=Eng, emp=E001
        ('kiosk_gate',     demo_pw, 'kiosk',       'Main Gate Kiosk',      None, None),
        ('brian_emp',      demo_pw, 'employee',    'Brian Omondi',         1,  2),   # emp=E002
    ]
    for uname, pw, role, name, dept_id, emp_id in demo_users:
        cur.execute("""INSERT INTO users (username,password,role,full_name,department_id,employee_id,is_active)
                       VALUES (?,?,?,?,?,?,1)""",
                    (uname, pw, role, name, dept_id, emp_id))

    # Update dept headcounts
    cur.execute("""
        UPDATE departments SET headcount = (
            SELECT COUNT(*) FROM employees WHERE department_id = departments.id AND status='active'
        )
    """)

    conn.commit()
    print("✅ Demo data seeded (18 employees, 7 days attendance)")
    if generated:
        print("=" * 64)
        print(f"Bootstrap admin account: username={admin_username}")
        print(f"Generated temporary password: {admin_password}")
        print("Log in and change this password immediately.")
        print("=" * 64)
    print("Demo accounts (password: FaceForce2025):")
    print("  hr_manager | finance_officer | eng_supervisor | kiosk_gate | brian_emp")
    print("=" * 64)
