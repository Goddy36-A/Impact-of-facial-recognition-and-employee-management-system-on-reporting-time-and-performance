from auth_utils import login_required, role_required
from flask import Blueprint, jsonify, request
from database import get_db

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/attendance-summary', methods=['GET'])
@login_required
def attendance_summary():
    db = get_db()
    days = int(request.args.get('days', 30))
    rows = db.execute(f"""
        SELECT a.date, COUNT(DISTINCT a.employee_id) AS present,
               (SELECT COUNT(*) FROM employees WHERE status='active') AS total,
               ROUND(AVG(a.confidence),1) AS avg_confidence,
               SUM(a.overtime_hrs) AS total_overtime
        FROM attendance a WHERE a.date >= date('now','-{days} days')
        GROUP BY a.date ORDER BY a.date DESC
    """).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@reports_bp.route('/top-absentees', methods=['GET'])
@login_required
def top_absentees():
    db = get_db()
    rows = db.execute("""
        SELECT e.first_name||' '||e.last_name AS name, e.employee_no, d.name AS department,
               COUNT(a.id) AS days_present,
               ROUND(100.0*COUNT(a.id)/MAX(1,(SELECT COUNT(DISTINCT date) FROM attendance WHERE date>=date('now','-30 days'))),1) AS rate
        FROM employees e
        LEFT JOIN departments d ON d.id=e.department_id
        LEFT JOIN attendance a ON a.employee_id=e.id AND a.date>=date('now','-30 days')
        WHERE e.status='active' GROUP BY e.id ORDER BY rate ASC LIMIT 10
    """).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@reports_bp.route('/overtime', methods=['GET'])
@login_required
def overtime_report():
    db = get_db()
    rows = db.execute("""
        SELECT e.first_name||' '||e.last_name AS name, e.employee_no, d.name AS department,
               SUM(a.overtime_hrs) AS total_overtime, COUNT(a.id) AS days_with_ot,
               ROUND(AVG(a.overtime_hrs),2) AS avg_ot_per_day
        FROM employees e
        LEFT JOIN departments d ON d.id=e.department_id
        LEFT JOIN attendance a ON a.employee_id=e.id AND a.overtime_hrs>0 AND a.date>=date('now','-30 days')
        WHERE e.status='active' GROUP BY e.id ORDER BY total_overtime DESC LIMIT 10
    """).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@reports_bp.route('/payroll-trend', methods=['GET'])
@login_required
def payroll_trend():
    db = get_db()
    rows = db.execute("""
        SELECT strftime('%Y-%m',period_start) AS month, SUM(net_pay) AS total_net,
               SUM(tax) AS total_tax, COUNT(*) AS employees_paid
        FROM payroll WHERE status='processed'
        GROUP BY month ORDER BY month DESC LIMIT 12
    """).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])
