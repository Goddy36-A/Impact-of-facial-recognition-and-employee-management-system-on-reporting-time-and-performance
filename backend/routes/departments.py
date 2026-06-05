from flask import Blueprint, jsonify, request
from database import get_db

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
    data = request.json or {}
    try:
        cur = db.execute("INSERT INTO departments (name,code,manager,budget,color) VALUES (?,?,?,?,?)",
                         (data['name'], data['code'], data.get('manager'), data.get('budget',0),
                          data.get('color','#00e5ff')))
        db.commit(); db.close()
        return jsonify({'id': cur.lastrowid, 'message': 'Created'}), 201
    except Exception as e:
        db.close()
        return jsonify({'error': str(e)}), 400

@departments_bp.route('/<int:dept_id>', methods=['PUT'])
def update_department(dept_id):
    db = get_db()
    data = request.json or {}
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
