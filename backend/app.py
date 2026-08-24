"""
FaceForce Pro — Facial Recognition & Employee Management System
Flask backend: SQLite, REST API, session-based auth, payroll, shifts, reports.
"""

from datetime import timedelta
import os
import secrets
import sys

from flask import Flask, jsonify, request, render_template, session
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.dirname(__file__))

from database import init_db
from routes.employees import employees_bp
from routes.attendance import attendance_bp
from routes.recognition import recognition_bp
from routes.payroll import payroll_bp
from routes.shifts import shifts_bp
from routes.reports import reports_bp
from routes.auth import auth_bp
from routes.departments import departments_bp
from routes.users import users_bp

app = Flask(
    __name__,
    static_folder=os.path.join(os.path.dirname(__file__), '..', 'frontend', 'static'),
    template_folder=os.path.join(os.path.dirname(__file__), '..', 'frontend', 'templates')
)

# ── Secret key ───────────────────────────────────────────────────────────────
# Required to sign session cookies. Set SECRET_KEY in the environment for any
# real deployment - without it, a random key is generated at process start,
# which means every restart invalidates existing sessions (safe, just a UX
# annoyance in production) and is not suitable for a multi-worker deployment
# (each worker would sign with a different key). This is flagged loudly on
# purpose rather than silently shipping a hardcoded secret.
_env_secret = os.environ.get('SECRET_KEY')
if not _env_secret:
    print("WARNING: SECRET_KEY not set in environment - using a random one-time key. "
          "Set SECRET_KEY for production so sessions survive restarts and work "
          "correctly across multiple worker processes.")
app.config['SECRET_KEY'] = _env_secret or secrets.token_hex(32)

# ── Session cookie hardening ─────────────────────────────────────────────────
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = os.environ.get('FLASK_ENV') == 'production'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=8)

app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), '..', 'uploads')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# ── CORS ──────────────────────────────────────────────────────────────────────
# supports_credentials is required for the session cookie to actually be sent/
# accepted cross-origin. Origins are restricted via env var rather than left
# wide open, since a wildcard origin cannot be combined with credentialed
# requests anyway (browsers reject that combination).
_allowed_origins = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:5000').split(',')
CORS(app, supports_credentials=True, origins=_allowed_origins)

# Register blueprints
app.register_blueprint(auth_bp,         url_prefix='/api/auth')
app.register_blueprint(employees_bp,    url_prefix='/api/employees')
app.register_blueprint(attendance_bp,   url_prefix='/api/attendance')
app.register_blueprint(recognition_bp,  url_prefix='/api/recognition')
app.register_blueprint(payroll_bp,      url_prefix='/api/payroll')
app.register_blueprint(shifts_bp,       url_prefix='/api/shifts')
app.register_blueprint(reports_bp,      url_prefix='/api/reports')
app.register_blueprint(departments_bp,  url_prefix='/api/departments')
app.register_blueprint(users_bp,        url_prefix='/api/users')

# ── Global authentication guard ──────────────────────────────────────────────
_PUBLIC_ENDPOINTS = {
    '/api/auth/login',
    '/api/auth/me',
    '/api/auth/logout',
    '/api/users/register',   # public account request
    '/api/health',
}

@app.before_request
def require_login_for_api():
    path = request.path
    if not path.startswith('/api/'):
        return  # frontend routes are handled separately
    if path in _PUBLIC_ENDPOINTS:
        return
    if not session.get('user_id'):
        return jsonify({'error': 'Authentication required'}), 401


@app.route('/')
@app.route('/<path:path>')
def serve_frontend(path=''):
    return render_template('index.html')


@app.route('/api/health')
def health():
    return jsonify({'status': 'ok', 'version': '2.1.0', 'system': 'FaceForce Pro'})


if __name__ == '__main__':
    init_db()
    debug_mode = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    print(f"\nFaceForce Pro running at http://localhost:5000  (debug={debug_mode})\n")
    app.run(debug=debug_mode, host='0.0.0.0', port=5000)
