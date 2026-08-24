from auth_utils import login_required, role_required
from flask import Blueprint, jsonify, request
from database import get_db
from datetime import datetime, date

attendance_bp = Blueprint('attendance', __name__)

@attendance_bp.route('/', methods=['GET'])
@login_required
def list_attendance():
    db = get_db()
    att_date = request.args.get('date', date.today().strftime('%Y-%m-%d'))
    dept = request.args.get('department_id', '')
    status = request.args.get('status', '')
    q = request.args.get('q', '')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))

    sql = """
        SELECT e.id AS employee_id, e.first_name||' '||e.last_name AS name,
               e.employee_no, e.position, d.name AS department, d.color AS dept_color,
               a.id AS record_id, a.check_in, a.check_out, a.status,
               a.confidence, a.method, a.overtime_hrs, a.notes,
               CASE WHEN a.check_in IS NOT NULL THEN 1 ELSE 0 END AS is_present
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        LEFT JOIN attendance a ON a.employee_id = e.id AND a.date = ?
        WHERE e.status = 'active'
    """
    params = [att_date]
    if dept:
        sql += " AND e.department_id = ?"
        params.append(dept)
    if status == 'present':
        sql += " AND a.id IS NOT NULL"
    elif status == 'absent':
        sql += " AND a.id IS NULL"
    if q:
        sql += " AND (e.first_name||' '||e.last_name LIKE ? OR e.employee_no LIKE ?)"
        params += [f'%{q}%', f'%{q}%']

    total = db.execute(f"SELECT COUNT(*) FROM ({sql})", params).fetchone()[0]
    sql += f" ORDER BY is_present DESC, e.first_name LIMIT {per_page} OFFSET {(page-1)*per_page}"
    rows = db.execute(sql, params).fetchall()
    db.close()
    return jsonify({
        'records': [dict(r) for r in rows],
        'total': total, 'date': att_date
    })

@attendance_bp.route('/checkin', methods=['POST'])
def checkin():
    db = get_db()
    data = request.json
    emp_id = data.get('employee_id')
    method = data.get('method', 'manual')
    confidence = data.get('confidence', 100)
    today = date.today().strftime('%Y-%m-%d')
    now = datetime.now().isoformat(timespec='seconds')

    existing = db.execute("SELECT * FROM attendance WHERE employee_id=? AND date=?",
                          (emp_id, today)).fetchone()
    if existing:
        if existing['check_out']:
            return jsonify({'message': 'Already completed for today', 'type': 'done'}), 200
        # Check out
        db.execute("UPDATE attendance SET check_out=?, updated_at=datetime('now') WHERE id=?",
                   (now, existing['id']))
        db.commit(); db.close()
        return jsonify({'message': 'Checked out', 'type': 'checkout', 'time': now})

    db.execute("""
        INSERT INTO attendance (employee_id,date,check_in,method,confidence,status)
        VALUES (?,?,?,?,?,'present')
    """, (emp_id, today, now, method, confidence))
    db.commit(); db.close()
    return jsonify({'message': 'Checked in', 'type': 'checkin', 'time': now})

@attendance_bp.route('/<int:record_id>', methods=['PUT'])
def update_record(record_id):
    db = get_db()
    data = request.json
    fields = ['check_in','check_out','status','notes','overtime_hrs']
    sets = ', '.join(f"{f}=?" for f in fields if f in data)
    vals = [data[f] for f in fields if f in data] + [record_id]
    db.execute(f"UPDATE attendance SET {sets} WHERE id=?", vals)
    db.commit(); db.close()
    return jsonify({'message': 'Updated'})

@attendance_bp.route('/<int:record_id>', methods=['DELETE'])
def delete_record(record_id):
    db = get_db()
    db.execute("DELETE FROM attendance WHERE id=?", (record_id,))
    db.commit(); db.close()
    return jsonify({'message': 'Deleted'})

@attendance_bp.route('/history/<int:emp_id>', methods=['GET'])
def employee_history(emp_id):
    db = get_db()
    rows = db.execute("""
        SELECT date, check_in, check_out, status, confidence, method, overtime_hrs
        FROM attendance WHERE employee_id=? ORDER BY date DESC LIMIT 30
    """, (emp_id,)).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@attendance_bp.route('/export', methods=['GET'])
def export_csv():
    from flask import Response
    db = get_db()
    att_date = request.args.get('date', date.today().strftime('%Y-%m-%d'))
    rows = db.execute("""
        SELECT e.employee_no, e.first_name||' '||e.last_name AS name,
               d.name AS department, e.position,
               a.check_in, a.check_out, a.status, a.confidence, a.overtime_hrs
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        LEFT JOIN attendance a ON a.employee_id = e.id AND a.date = ?
        WHERE e.status = 'active'
        ORDER BY d.name, e.first_name
    """, (att_date,)).fetchall()
    db.close()
    lines = ['Employee No,Name,Department,Position,Check In,Check Out,Status,Confidence,Overtime Hrs']
    for r in rows:
        def t(v): return str(v or '')
        ci = r['check_in'].split('T')[1][:5] if r['check_in'] else ''
        co = r['check_out'].split('T')[1][:5] if r['check_out'] else ''
        lines.append(f"{t(r['employee_no'])},{t(r['name'])},{t(r['department'])},{t(r['position'])},{ci},{co},{t(r['status']) or 'absent'},{t(r['confidence'])},{t(r['overtime_hrs'])}")
    csv = '\n'.join(lines)
    return Response(csv, mimetype='text/csv',
                    headers={'Content-Disposition': f'attachment; filename=attendance-{att_date}.csv'})
