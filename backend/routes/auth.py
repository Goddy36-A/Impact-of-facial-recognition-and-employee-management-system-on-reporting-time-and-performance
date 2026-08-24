from flask import Blueprint, jsonify, request, session
from database import get_db
from werkzeug.security import check_password_hash, generate_password_hash
from auth_utils import login_required

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    data     = request.json or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')

    db   = get_db()
    user = db.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
    db.close()

    if not user or not check_password_hash(user['password'], password):
        return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

    if not user['is_active']:
        # Distinguish pending from deactivated so the UI can show a helpful message
        msg = ('Your account is pending admin approval.' if user['role'] == 'pending'
               else 'Your account has been deactivated. Contact an administrator.')
        return jsonify({'success': False, 'error': msg}), 403

    session.clear()
    session['user_id']      = user['id']
    session['username']     = user['username']
    session['role']         = user['role']
    session['department_id']= user['department_id']
    session['employee_id']  = user['employee_id']
    session.permanent = True

    db = get_db()
    db.execute("UPDATE users SET last_login=datetime('now') WHERE id=?", (user['id'],))
    db.commit()
    db.close()

    return jsonify({
        'success':       True,
        'role':          user['role'],
        'username':      user['username'],
        'full_name':     user['full_name'],
        'department_id': user['department_id'],
        'employee_id':   user['employee_id'],
    })


@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})


@auth_bp.route('/me', methods=['GET'])
def me():
    if not session.get('user_id'):
        return jsonify({'authenticated': False}), 401
    return jsonify({
        'authenticated':  True,
        'username':       session.get('username'),
        'role':           session.get('role'),
        'department_id':  session.get('department_id'),
        'employee_id':    session.get('employee_id'),
    })


@auth_bp.route('/change-password', methods=['POST'])
@login_required
def change_password():
    data             = request.json or {}
    current_password = data.get('current_password', '')
    new_password     = data.get('new_password', '')

    if len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters'}), 400

    db   = get_db()
    user = db.execute("SELECT * FROM users WHERE id=?", (session['user_id'],)).fetchone()
    if not user or not check_password_hash(user['password'], current_password):
        db.close()
        return jsonify({'error': 'Current password is incorrect'}), 400

    db.execute("UPDATE users SET password=? WHERE id=?",
               (generate_password_hash(new_password), session['user_id']))
    db.commit()
    db.close()
    return jsonify({'success': True})
