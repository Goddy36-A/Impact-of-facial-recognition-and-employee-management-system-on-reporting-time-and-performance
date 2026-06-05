"""
FaceForce Pro — Face Recognition Backend Pipeline
Simulates a production ML pipeline with:
  - Face detection confidence scoring
  - Descriptor extraction & matching
  - Liveness check simulation
  - Anti-spoofing flags
  - Match threshold tuning
  - Recognition event logging
"""

from flask import Blueprint, jsonify, request
from database import get_db
from datetime import datetime
import json, math, os, base64, random

recognition_bp = Blueprint('recognition', __name__)

MATCH_THRESHOLD = 0.45   # Euclidean distance threshold
LIVENESS_THRESHOLD = 0.72
SPOOF_THRESHOLD = 0.85

# ─── HELPERS ──────────────────────────────────────────────────────────────────

def euclidean(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))

def simulate_pipeline(frame_data=None):
    """Simulate the ML pipeline stages that would run in production."""
    return {
        'face_detected': True,
        'face_count': 1,
        'detection_confidence': round(0.88 + random.random() * 0.11, 3),
        'liveness_score': round(0.75 + random.random() * 0.24, 3),
        'anti_spoof_score': round(0.88 + random.random() * 0.11, 3),
        'landmark_quality': round(0.80 + random.random() * 0.19, 3),
        'illumination_score': round(0.70 + random.random() * 0.29, 3),
        'pose_deviation': round(random.random() * 15, 1),
        'occlusion_detected': False,
        'glasses_detected': random.random() > 0.8,
        'mask_detected': False,
    }

# ─── REGISTER ─────────────────────────────────────────────────────────────────

@recognition_bp.route('/register', methods=['POST'])
def register_face():
    db = get_db()
    data = request.json
    emp_id = data.get('employee_id')
    descriptor = data.get('descriptor')  # list of floats [128]
    samples = data.get('samples', 1)

    if not emp_id or not descriptor:
        return jsonify({'error': 'employee_id and descriptor required'}), 400

    emp = db.execute("SELECT id, first_name, last_name FROM employees WHERE id=?", (emp_id,)).fetchone()
    if not emp:
        return jsonify({'error': 'Employee not found'}), 404

    desc_json = json.dumps(descriptor)
    existing = db.execute("SELECT id FROM face_data WHERE employee_id=?", (emp_id,)).fetchone()
    if existing:
        db.execute("""UPDATE face_data SET descriptor=?, samples=?, confidence=?, updated_at=datetime('now')
                      WHERE employee_id=?""", (desc_json, samples, round(90 + random.random()*9,1), emp_id))
    else:
        db.execute("""INSERT INTO face_data (employee_id, descriptor, samples, confidence)
                      VALUES (?,?,?,?)""",
                   (emp_id, desc_json, samples, round(90 + random.random()*9,1)))

    db.execute("UPDATE employees SET face_registered=1 WHERE id=?", (emp_id,))
    db.commit()
    db.close()
    return jsonify({
        'message': f'Face registered for {emp["first_name"]} {emp["last_name"]}',
        'employee_id': emp_id,
        'samples': samples,
        'pipeline': simulate_pipeline()
    })

# ─── IDENTIFY ────────────────────────────────────────────────────────────────

@recognition_bp.route('/identify', methods=['POST'])
def identify():
    db = get_db()
    data = request.json
    probe = data.get('descriptor')  # [128] float list from face-api.js

    if not probe:
        return jsonify({'error': 'descriptor required'}), 400

    pipeline = simulate_pipeline()

    # Liveness check
    if pipeline['liveness_score'] < LIVENESS_THRESHOLD:
        db.close()
        return jsonify({
            'match': False,
            'reason': 'liveness_failed',
            'liveness_score': pipeline['liveness_score'],
            'pipeline': pipeline
        })

    # Load all face records
    faces = db.execute("""
        SELECT f.employee_id, f.descriptor, e.first_name, e.last_name, e.employee_no,
               e.position, e.status, d.name AS department, d.color AS dept_color,
               e.email, e.phone, e.photo, e.salary, e.currency
        FROM face_data f
        JOIN employees e ON e.id = f.employee_id
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE e.status = 'active'
    """).fetchall()

    best_match = None
    best_dist = float('inf')
    second_dist = float('inf')

    for face in faces:
        ref = json.loads(face['descriptor'])
        if len(ref) != len(probe):
            continue
        dist = euclidean(probe, ref)
        if dist < best_dist:
            second_dist = best_dist
            best_dist = dist
            best_match = face
        elif dist < second_dist:
            second_dist = dist

    confidence = max(0, round((1 - best_dist) * 100, 2)) if best_match else 0
    separation = round(second_dist - best_dist, 4) if second_dist != float('inf') else 1.0

    db.close()

    if best_match and best_dist < MATCH_THRESHOLD:
        emp = dict(best_match)
        emp.pop('descriptor', None)
        return jsonify({
            'match': True,
            'employee': emp,
            'distance': round(best_dist, 4),
            'confidence': confidence,
            'separation': separation,
            'pipeline': pipeline,
            'threshold_used': MATCH_THRESHOLD
        })
    else:
        return jsonify({
            'match': False,
            'reason': 'no_match',
            'best_distance': round(best_dist, 4) if best_match else None,
            'confidence': confidence,
            'pipeline': pipeline
        })

# ─── STATUS ───────────────────────────────────────────────────────────────────

@recognition_bp.route('/status', methods=['GET'])
def status():
    db = get_db()
    total_registered = db.execute("SELECT COUNT(*) FROM face_data").fetchone()[0]
    total_employees = db.execute("SELECT COUNT(*) FROM employees WHERE status='active'").fetchone()[0]
    recent_scans = db.execute("""
        SELECT COUNT(*) FROM attendance WHERE method='face' AND date=date('now')
    """).fetchone()[0]
    db.close()
    return jsonify({
        'total_registered': total_registered,
        'total_employees': total_employees,
        'registration_rate': round(total_registered/total_employees*100,1) if total_employees else 0,
        'scans_today': recent_scans,
        'threshold': MATCH_THRESHOLD,
        'models': {
            'detector': 'TinyFaceDetector v1.0',
            'landmarks': 'FaceLandmark68Net v1.0',
            'recognizer': 'FaceRecognitionNet v1.0',
            'anti_spoof': 'AntiSpoofNet v2.1 (simulated)',
            'liveness': 'LivenessNet v1.3 (simulated)'
        },
        'pipeline_version': '2.0.0'
    })

@recognition_bp.route('/unregistered', methods=['GET'])
def unregistered():
    db = get_db()
    rows = db.execute("""
        SELECT e.id, e.first_name||' '||e.last_name AS name, e.employee_no,
               d.name AS department, e.position
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE e.face_registered = 0 AND e.status = 'active'
        ORDER BY e.first_name
    """).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])
