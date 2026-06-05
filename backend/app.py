"""
FaceForce Pro — Production-Grade Facial Recognition & Employee Management System
Flask Backend with SQLite, REST API, Role-based Auth, Payroll, Shifts, Reports
"""

from flask import Flask, jsonify, request, send_from_directory, render_template
from flask_cors import CORS
import os, sys

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

app = Flask(
    __name__,
    static_folder=os.path.join(os.path.dirname(__file__), '..', 'frontend', 'static'),
    template_folder=os.path.join(os.path.dirname(__file__), '..', 'frontend', 'templates')
)
CORS(app)
app.config['SECRET_KEY'] = 'faceforce-secret-2025'
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), '..', 'uploads')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Register blueprints
app.register_blueprint(auth_bp,         url_prefix='/api/auth')
app.register_blueprint(employees_bp,    url_prefix='/api/employees')
app.register_blueprint(attendance_bp,   url_prefix='/api/attendance')
app.register_blueprint(recognition_bp,  url_prefix='/api/recognition')
app.register_blueprint(payroll_bp,      url_prefix='/api/payroll')
app.register_blueprint(shifts_bp,       url_prefix='/api/shifts')
app.register_blueprint(reports_bp,      url_prefix='/api/reports')
app.register_blueprint(departments_bp,  url_prefix='/api/departments')

@app.route('/')
@app.route('/<path:path>')
def serve_frontend(path=''):
    return render_template('index.html')

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok', 'version': '2.0.0', 'system': 'FaceForce Pro'})

if __name__ == '__main__':
    init_db()
    print("\n🟢 FaceForce Pro running at http://localhost:5000\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
