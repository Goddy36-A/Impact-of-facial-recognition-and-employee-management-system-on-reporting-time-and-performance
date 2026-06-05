from flask import Blueprint, jsonify, request
from database import get_db
from datetime import datetime

employees_bp = Blueprint('employees', __name__)

def emp_row(row):
    d = dict(row)
    return d

@employees_bp.route('/', methods=['GET'])
def list_employees():
    db = get_db()
    q = request.args.get('q', '')
    dept = request.args.get('department_id', '')
    status = request.args.get('status', '')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))

    sql = """
        SELECT e.*, d.name AS department_name, d.color AS dept_color,
               (SELECT COUNT(*) FROM attendance a WHERE a.employee_id=e.id AND a.date=date('now')) AS present_today
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE 1=1
    """
    params = []
    if q:
        sql += " AND (e.first_name||' '||e.last_name LIKE ? OR e.employee_no LIKE ? OR e.email LIKE ?)"
        params += [f'%{q}%', f'%{q}%', f'%{q}%']
    if dept:
        sql += " AND e.department_id = ?"
        params.append(dept)
    if status:
        sql += " AND e.status = ?"
        params.append(status)

    total = db.execute(f"SELECT COUNT(*) FROM ({sql})", params).fetchone()[0]
    sql += f" ORDER BY e.first_name LIMIT {per_page} OFFSET {(page-1)*per_page}"
    rows = db.execute(sql, params).fetchall()
    db.close()
    return jsonify({
        'employees': [emp_row(r) for r in rows],
        'total': total, 'page': page, 'per_page': per_page,
        'pages': (total + per_page - 1) // per_page
    })

@employees_bp.route('/<int:emp_id>', methods=['GET'])
def get_employee(emp_id):
    db = get_db()
    row = db.execute("""
        SELECT e.*, d.name AS department_name, d.color AS dept_color,
               f.registered_at AS face_registered_at, f.samples AS face_samples,
               s.name AS shift_name, s.start_time, s.end_time
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        LEFT JOIN face_data f ON f.employee_id = e.id
        LEFT JOIN employee_shifts es ON es.employee_id = e.id
        LEFT JOIN shifts s ON s.id = es.shift_id
        WHERE e.id = ?
    """, (emp_id,)).fetchone()
    if not row:
        return jsonify({'error': 'Not found'}), 404

    # Recent attendance
    att = db.execute("""
        SELECT date, check_in, check_out, status, confidence, overtime_hrs
        FROM attendance WHERE employee_id=? ORDER BY date DESC LIMIT 10
    """, (emp_id,)).fetchall()

    # Payroll summary
    payroll = db.execute("""
        SELECT period_start, period_end, net_pay, days_worked, status
        FROM payroll WHERE employee_id=? ORDER BY period_start DESC LIMIT 3
    """, (emp_id,)).fetchall()

    db.close()
    emp = emp_row(row)
    emp['recent_attendance'] = [dict(a) for a in att]
    emp['payroll_history'] = [dict(p) for p in payroll]
    return jsonify(emp)

@employees_bp.route('/', methods=['POST'])
def create_employee():
    db = get_db()
    data = request.json
    required = ['first_name', 'last_name', 'employee_no', 'department_id', 'position']
    for f in required:
        if not data.get(f):
            return jsonify({'error': f'{f} is required'}), 400
    try:
        cur = db.execute("""
            INSERT INTO employees
            (employee_no,first_name,last_name,email,phone,department_id,position,
             role,status,salary,currency,join_date,birth_date,gender,national_id,address,emergency_contact,notes)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (data['employee_no'], data['first_name'], data['last_name'],
              data.get('email'), data.get('phone'), data['department_id'],
              data['position'], data.get('role','employee'), data.get('status','active'),
              data.get('salary',0), data.get('currency','UGX'), data.get('join_date'),
              data.get('birth_date'), data.get('gender'), data.get('national_id'),
              data.get('address'), data.get('emergency_contact'), data.get('notes')))
        db.execute("UPDATE departments SET headcount=headcount+1 WHERE id=?", (data['department_id'],))
        db.commit()
        emp_id = cur.lastrowid
        db.close()
        return jsonify({'id': emp_id, 'message': 'Employee created'}), 201
    except Exception as e:
        db.close()
        return jsonify({'error': str(e)}), 400

@employees_bp.route('/<int:emp_id>', methods=['PUT'])
def update_employee(emp_id):
    db = get_db()
    data = request.json
    fields = ['first_name','last_name','email','phone','department_id','position',
              'role','status','salary','currency','join_date','birth_date',
              'gender','national_id','address','emergency_contact','notes']
    sets = ', '.join(f"{f}=?" for f in fields if f in data)
    vals = [data[f] for f in fields if f in data]
    if not sets:
        db.close()
        return jsonify({'error': 'Nothing to update'}), 400
    vals.append(emp_id)
    db.execute(f"UPDATE employees SET {sets}, updated_at=datetime('now') WHERE id=?", vals)
    db.commit(); db.close()
    return jsonify({'message': 'Updated'})

@employees_bp.route('/<int:emp_id>', methods=['DELETE'])
def delete_employee(emp_id):
    db = get_db()
    emp = db.execute("SELECT department_id FROM employees WHERE id=?", (emp_id,)).fetchone()
    if emp:
        db.execute("DELETE FROM employees WHERE id=?", (emp_id,))
        db.execute("UPDATE departments SET headcount=MAX(0,headcount-1) WHERE id=?", (emp['department_id'],))
        db.commit()
    db.close()
    return jsonify({'message': 'Deleted'})

@employees_bp.route('/stats/summary', methods=['GET'])
def stats_summary():
    db = get_db()
    total = db.execute("SELECT COUNT(*) FROM employees WHERE status='active'").fetchone()[0]
    present = db.execute("SELECT COUNT(DISTINCT employee_id) FROM attendance WHERE date=date('now')").fetchone()[0]
    new_this_month = db.execute("SELECT COUNT(*) FROM employees WHERE strftime('%Y-%m',created_at)=strftime('%Y-%m','now')").fetchone()[0]
    face_reg = db.execute("SELECT COUNT(*) FROM employees WHERE face_registered=1").fetchone()[0]
    total_payroll = db.execute("SELECT SUM(salary) FROM employees WHERE status='active'").fetchone()[0] or 0
    dept_breakdown = db.execute("""
        SELECT d.name, d.color, COUNT(e.id) as count
        FROM departments d LEFT JOIN employees e ON e.department_id=d.id AND e.status='active'
        GROUP BY d.id ORDER BY count DESC
    """).fetchall()
    weekly_att = db.execute("""
        SELECT date, COUNT(DISTINCT employee_id) as present
        FROM attendance WHERE date >= date('now','-6 days')
        GROUP BY date ORDER BY date
    """).fetchall()
    db.close()
    return jsonify({
        'total_employees': total,
        'present_today': present,
        'absent_today': total - present,
        'attendance_rate': round(present/total*100, 1) if total else 0,
        'new_this_month': new_this_month,
        'face_registered': face_reg,
        'total_monthly_payroll': total_payroll,
        'department_breakdown': [dict(d) for d in dept_breakdown],
        'weekly_attendance': [dict(w) for w in weekly_att],
    })
