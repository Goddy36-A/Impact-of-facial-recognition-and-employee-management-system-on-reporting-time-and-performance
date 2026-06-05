from flask import Blueprint, jsonify, request
from database import get_db
import hashlib

# ─── AUTH ─────────────────────────────────────────────────────────────────────
auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    db = get_db()
    data = request.json
    pw = hashlib.sha256(data.get('password','').encode()).hexdigest()
    user = db.execute("SELECT * FROM users WHERE username=? AND password=?",
                      (data.get('username'), pw)).fetchone()
    db.close()
    if user:
        return jsonify({'success': True, 'role': user['role'], 'username': user['username'],
                        'token': f'ff-token-{user["id"]}'})
    return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

@auth_bp.route('/me', methods=['GET'])
def me():
    return jsonify({'username': 'admin', 'role': 'admin'})

# ─── DEPARTMENTS ──────────────────────────────────────────────────────────────
departments_bp = Blueprint('departments', __name__)

@departments_bp.route('/', methods=['GET'])
def list_departments():
    db = get_db()
    rows = db.execute("""
        SELECT d.*, COUNT(e.id) AS employee_count
        FROM departments d
        LEFT JOIN employees e ON e.department_id = d.id AND e.status='active'
        GROUP BY d.id ORDER BY d.name
    """).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@departments_bp.route('/', methods=['POST'])
def create_department():
    db = get_db()
    data = request.json
    try:
        cur = db.execute("INSERT INTO departments (name,code,manager,budget,color) VALUES (?,?,?,?,?)",
                         (data['name'], data['code'], data.get('manager'), data.get('budget',0),
                          data.get('color','#00e5ff')))
        db.commit()
        db.close()
        return jsonify({'id': cur.lastrowid, 'message': 'Department created'}), 201
    except Exception as e:
        db.close()
        return jsonify({'error': str(e)}), 400

@departments_bp.route('/<int:dept_id>', methods=['PUT'])
def update_department(dept_id):
    db = get_db()
    data = request.json
    fields = ['name','code','manager','budget','color']
    sets = ', '.join(f"{f}=?" for f in fields if f in data)
    vals = [data[f] for f in fields if f in data] + [dept_id]
    db.execute(f"UPDATE departments SET {sets} WHERE id=?", vals)
    db.commit(); db.close()
    return jsonify({'message': 'Updated'})

@departments_bp.route('/<int:dept_id>', methods=['DELETE'])
def delete_department(dept_id):
    db = get_db()
    count = db.execute("SELECT COUNT(*) FROM employees WHERE department_id=?", (dept_id,)).fetchone()[0]
    if count > 0:
        db.close()
        return jsonify({'error': f'Cannot delete: {count} employees assigned'}), 400
    db.execute("DELETE FROM departments WHERE id=?", (dept_id,))
    db.commit(); db.close()
    return jsonify({'message': 'Deleted'})

# ─── SHIFTS ───────────────────────────────────────────────────────────────────
shifts_bp = Blueprint('shifts', __name__)

@shifts_bp.route('/', methods=['GET'])
def list_shifts():
    db = get_db()
    rows = db.execute("""
        SELECT s.*, d.name AS department_name,
               COUNT(es.employee_id) AS assigned_count
        FROM shifts s
        LEFT JOIN departments d ON d.id = s.department_id
        LEFT JOIN employee_shifts es ON es.shift_id = s.id
        GROUP BY s.id ORDER BY s.name
    """).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@shifts_bp.route('/', methods=['POST'])
def create_shift():
    db = get_db()
    data = request.json
    cur = db.execute("INSERT INTO shifts (name,start_time,end_time,days,department_id,color) VALUES (?,?,?,?,?,?)",
                     (data['name'], data['start_time'], data['end_time'], data['days'],
                      data.get('department_id'), data.get('color','#00e5ff')))
    db.commit(); db.close()
    return jsonify({'id': cur.lastrowid, 'message': 'Shift created'}), 201

@shifts_bp.route('/assign', methods=['POST'])
def assign_shift():
    db = get_db()
    data = request.json
    db.execute("DELETE FROM employee_shifts WHERE employee_id=?", (data['employee_id'],))
    db.execute("INSERT INTO employee_shifts (employee_id,shift_id,effective_from) VALUES (?,?,date('now'))",
               (data['employee_id'], data['shift_id']))
    db.commit(); db.close()
    return jsonify({'message': 'Shift assigned'})

# ─── REPORTS ──────────────────────────────────────────────────────────────────
reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/attendance-summary', methods=['GET'])
def attendance_summary():
    db = get_db()
    days = int(request.args.get('days', 30))
    rows = db.execute(f"""
        SELECT a.date,
               COUNT(DISTINCT a.employee_id) AS present,
               (SELECT COUNT(*) FROM employees WHERE status='active') AS total,
               ROUND(AVG(a.confidence),1) AS avg_confidence,
               SUM(a.overtime_hrs) AS total_overtime
        FROM attendance a
        WHERE a.date >= date('now','-{days} days')
        GROUP BY a.date ORDER BY a.date DESC
    """).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@reports_bp.route('/top-absentees', methods=['GET'])
def top_absentees():
    db = get_db()
    rows = db.execute("""
        SELECT e.first_name||' '||e.last_name AS name, e.employee_no,
               d.name AS department,
               COUNT(a.id) AS days_present,
               (SELECT COUNT(*) FROM attendance WHERE date >= date('now','-30 days')
                AND date NOT IN (SELECT date FROM (SELECT DISTINCT date FROM attendance
                WHERE strftime('%w',date) NOT IN ('0','6')))
               ) AS work_days,
               ROUND(100.0 * COUNT(a.id) /
                   MAX(1,(SELECT COUNT(DISTINCT date) FROM attendance
                       WHERE date >= date('now','-30 days'))), 1) AS rate
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        LEFT JOIN attendance a ON a.employee_id = e.id AND a.date >= date('now','-30 days')
        WHERE e.status = 'active'
        GROUP BY e.id ORDER BY rate ASC LIMIT 10
    """).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@reports_bp.route('/overtime', methods=['GET'])
def overtime_report():
    db = get_db()
    rows = db.execute("""
        SELECT e.first_name||' '||e.last_name AS name, e.employee_no,
               d.name AS department,
               SUM(a.overtime_hrs) AS total_overtime,
               COUNT(a.id) AS days_with_ot,
               ROUND(AVG(a.overtime_hrs),2) AS avg_ot_per_day
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        LEFT JOIN attendance a ON a.employee_id = e.id AND a.overtime_hrs > 0
            AND a.date >= date('now','-30 days')
        WHERE e.status = 'active'
        GROUP BY e.id ORDER BY total_overtime DESC LIMIT 10
    """).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@reports_bp.route('/payroll-trend', methods=['GET'])
def payroll_trend():
    db = get_db()
    rows = db.execute("""
        SELECT strftime('%Y-%m', period_start) AS month,
               SUM(net_pay) AS total_net, SUM(tax) AS total_tax,
               SUM(base_salary) AS total_base, COUNT(*) AS employees_paid
        FROM payroll WHERE status='processed'
        GROUP BY month ORDER BY month DESC LIMIT 12
    """).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])
