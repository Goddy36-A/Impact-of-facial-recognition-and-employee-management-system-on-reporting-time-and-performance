"""
Users management routes — admin only.
Handles creating, listing, updating, and deactivating system user accounts.
"""
from flask import Blueprint, jsonify, request, session
from database import get_db
from werkzeug.security import generate_password_hash, check_password_hash
from auth_utils import role_required, login_required

users_bp = Blueprint('users', __name__)

VALID_ROLES = ('admin', 'hr', 'finance', 'supervisor', 'employee', 'kiosk')


# ── LIST ALL USERS ────────────────────────────────────────────────────────────
@users_bp.route('/', methods=['GET'])
@role_required('admin')
def list_users():
    db = get_db()
    rows = db.execute("""
        SELECT u.id, u.username, u.full_name, u.role, u.is_active,
               u.department_id, u.employee_id, u.last_login, u.created_at,
               d.name AS department_name,
               e.first_name || ' ' || e.last_name AS employee_name
        FROM users u
        LEFT JOIN departments d ON d.id = u.department_id
        LEFT JOIN employees e ON e.id = u.employee_id
        ORDER BY u.created_at DESC
    """).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])


# ── CREATE USER (admin only) ──────────────────────────────────────────────────
@users_bp.route('/', methods=['POST'])
@role_required('admin')
def create_user():
    data = request.json or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    role     = data.get('role', 'employee')
    full_name    = data.get('full_name', '').strip()
    department_id = data.get('department_id') or None
    employee_id   = data.get('employee_id') or None

    if not username:
        return jsonify({'error': 'Username is required'}), 400
    if not password or len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    if role not in VALID_ROLES:
        return jsonify({'error': f'Invalid role. Choose from: {", ".join(VALID_ROLES)}'}), 400

    db = get_db()
    try:
        cur = db.execute("""
            INSERT INTO users (username, password, role, full_name, department_id, employee_id, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)
        """, (username, generate_password_hash(password), role, full_name, department_id, employee_id))
        db.commit()
        uid = cur.lastrowid
        db.close()
        return jsonify({'id': uid, 'message': f'User "{username}" created'}), 201
    except Exception as e:
        db.close()
        if 'UNIQUE' in str(e):
            return jsonify({'error': f'Username "{username}" is already taken'}), 409
        return jsonify({'error': str(e)}), 400


# ── REGISTER (public — creates a pending account, is_active=0) ────────────────
# This is the "Create Account" flow from the login screen. The account is
# inactive until an admin approves it via the Users management page.
@users_bp.route('/register', methods=['POST'])
def public_register():
    data = request.json or {}
    username  = data.get('username', '').strip()
    password  = data.get('password', '').strip()
    full_name = data.get('full_name', '').strip()

    if not username:
        return jsonify({'error': 'Username is required'}), 400
    if not password or len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    db = get_db()
    # Check if any admin exists; if no admin, allow first-user registration as admin
    admin_count = db.execute("SELECT COUNT(*) FROM users WHERE role='admin' AND is_active=1").fetchone()[0]
    new_role = 'admin' if admin_count == 0 else 'pending'

    try:
        cur = db.execute("""
            INSERT INTO users (username, password, role, full_name, is_active)
            VALUES (?, ?, ?, ?, ?)
        """, (username, generate_password_hash(password), new_role, full_name,
              1 if new_role == 'admin' else 0))
        db.commit()
        uid = cur.lastrowid
        db.close()
        if new_role == 'admin':
            return jsonify({'message': 'Admin account created. You can now log in.', 'auto_login': True}), 201
        return jsonify({'message': 'Account request submitted. An admin will activate your account shortly.'}), 201
    except Exception as e:
        db.close()
        if 'UNIQUE' in str(e):
            return jsonify({'error': f'Username "{username}" is already taken'}), 409
        return jsonify({'error': str(e)}), 400


# ── GET ONE USER ──────────────────────────────────────────────────────────────
@users_bp.route('/<int:uid>', methods=['GET'])
@role_required('admin')
def get_user(uid):
    db = get_db()
    row = db.execute("""
        SELECT u.id, u.username, u.full_name, u.role, u.is_active,
               u.department_id, u.employee_id, u.last_login, u.created_at,
               d.name AS department_name,
               e.first_name || ' ' || e.last_name AS employee_name
        FROM users u
        LEFT JOIN departments d ON d.id = u.department_id
        LEFT JOIN employees e ON e.id = u.employee_id
        WHERE u.id = ?
    """, (uid,)).fetchone()
    db.close()
    if not row:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(dict(row))


# ── UPDATE USER ───────────────────────────────────────────────────────────────
@users_bp.route('/<int:uid>', methods=['PUT'])
@role_required('admin')
def update_user(uid):
    data = request.json or {}
    db = get_db()

    # Prevent demoting the last active admin
    if 'role' in data and data['role'] != 'admin':
        target = db.execute("SELECT role FROM users WHERE id=?", (uid,)).fetchone()
        if target and target['role'] == 'admin':
            admin_count = db.execute("SELECT COUNT(*) FROM users WHERE role='admin' AND is_active=1 AND id!=?", (uid,)).fetchone()[0]
            if admin_count == 0:
                db.close()
                return jsonify({'error': 'Cannot demote the last active admin account'}), 400

    fields = ['role', 'full_name', 'department_id', 'employee_id', 'is_active']
    sets   = [f"{f}=?" for f in fields if f in data]
    vals   = [data[f] for f in fields if f in data]

    if 'password' in data and data['password']:
        if len(data['password']) < 6:
            db.close()
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        sets.append('password=?')
        vals.append(generate_password_hash(data['password']))

    if not sets:
        db.close()
        return jsonify({'error': 'Nothing to update'}), 400

    vals.append(uid)
    db.execute(f"UPDATE users SET {', '.join(sets)} WHERE id=?", vals)
    db.commit()
    db.close()
    return jsonify({'message': 'User updated'})


# ── DELETE USER ───────────────────────────────────────────────────────────────
@users_bp.route('/<int:uid>', methods=['DELETE'])
@role_required('admin')
def delete_user(uid):
    if uid == session.get('user_id'):
        return jsonify({'error': 'You cannot delete your own account'}), 400
    db = get_db()
    target = db.execute("SELECT role FROM users WHERE id=?", (uid,)).fetchone()
    if target and target['role'] == 'admin':
        remaining = db.execute("SELECT COUNT(*) FROM users WHERE role='admin' AND is_active=1 AND id!=?", (uid,)).fetchone()[0]
        if remaining == 0:
            db.close()
            return jsonify({'error': 'Cannot delete the last active admin account'}), 400
    db.execute("DELETE FROM users WHERE id=?", (uid,))
    db.commit()
    db.close()
    return jsonify({'message': 'User deleted'})


# ── MY PROFILE (self — any logged-in user) ────────────────────────────────────
@users_bp.route('/me/profile', methods=['GET'])
@login_required
def my_profile():
    db = get_db()
    row = db.execute("""
        SELECT u.id, u.username, u.full_name, u.role, u.department_id,
               u.employee_id, u.last_login,
               d.name AS department_name,
               e.first_name, e.last_name, e.email, e.phone, e.position,
               e.employee_no, e.photo, e.face_registered
        FROM users u
        LEFT JOIN departments d ON d.id = u.department_id
        LEFT JOIN employees e ON e.id = u.employee_id
        WHERE u.id = ?
    """, (session['user_id'],)).fetchone()
    db.close()
    if not row:
        return jsonify({'error': 'Profile not found'}), 404
    return jsonify(dict(row))


# ── PENDING ACCOUNTS COUNT (admin badge) ──────────────────────────────────────
@users_bp.route('/pending/count', methods=['GET'])
@role_required('admin')
def pending_count():
    db = get_db()
    count = db.execute("SELECT COUNT(*) FROM users WHERE role='pending' AND is_active=0").fetchone()[0]
    db.close()
    return jsonify({'count': count})
