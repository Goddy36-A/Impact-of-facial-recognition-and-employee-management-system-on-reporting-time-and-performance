from auth_utils import login_required, role_required
from flask import Blueprint, jsonify, request
from database import get_db

shifts_bp = Blueprint('shifts', __name__)

@shifts_bp.route('/', methods=['GET'])
@login_required
def list_shifts():
    db = get_db()
    rows = db.execute("""
        SELECT s.*, d.name AS department_name, COUNT(es.employee_id) AS assigned_count
        FROM shifts s
        LEFT JOIN departments d ON d.id = s.department_id
        LEFT JOIN employee_shifts es ON es.shift_id = s.id
        GROUP BY s.id ORDER BY s.name
    """).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@shifts_bp.route('/', methods=['POST'])
@login_required
def create_shift():
    db = get_db()
    data = request.json or {}
    cur = db.execute("INSERT INTO shifts (name,start_time,end_time,days,department_id,color) VALUES (?,?,?,?,?,?)",
                     (data['name'], data['start_time'], data['end_time'], data.get('days','Mon,Tue,Wed,Thu,Fri'),
                      data.get('department_id'), data.get('color','#00e5ff')))
    db.commit(); db.close()
    return jsonify({'id': cur.lastrowid, 'message': 'Created'}), 201

@shifts_bp.route('/assign', methods=['POST'])
@login_required
def assign_shift():
    db = get_db()
    data = request.json or {}
    db.execute("DELETE FROM employee_shifts WHERE employee_id=?", (data['employee_id'],))
    db.execute("INSERT INTO employee_shifts (employee_id,shift_id,effective_from) VALUES (?,?,date('now'))",
               (data['employee_id'], data['shift_id']))
    db.commit(); db.close()
    return jsonify({'message': 'Assigned'})
