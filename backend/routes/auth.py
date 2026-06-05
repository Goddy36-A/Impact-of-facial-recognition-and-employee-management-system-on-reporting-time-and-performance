from flask import Blueprint, jsonify, request
from database import get_db
import hashlib

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    db = get_db()
    data = request.json or {}
    pw = hashlib.sha256(data.get('password','').encode()).hexdigest()
    user = db.execute("SELECT * FROM users WHERE username=? AND password=?",
                      (data.get('username',''), pw)).fetchone()
    db.close()
    if user:
        return jsonify({'success': True, 'role': user['role'], 'username': user['username'],
                        'token': f'ff-token-{user["id"]}'})
    return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

@auth_bp.route('/me', methods=['GET'])
def me():
    return jsonify({'username': 'admin', 'role': 'admin'})
