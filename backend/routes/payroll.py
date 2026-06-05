from flask import Blueprint, jsonify, request
from database import get_db
from datetime import datetime, date
import calendar

payroll_bp = Blueprint('payroll', __name__)

TAX_BRACKETS = [
    (235000,    0),
    (335000,  0.10),
    (410000,  0.20),
    (10000000,0.30),
    (float('inf'), 0.40)
]

def calc_tax(gross):
    tax = 0
    prev = 0
    brackets = [(235000,0),(335000,.10),(410000,.20),(10000000,.30),(float('inf'),.40)]
    limits = [235000, 335000, 410000, 10000000]
    for i,(limit,rate) in enumerate(brackets):
        if gross <= prev: break
        taxable = min(gross, limit) - prev
        tax += taxable * rate
        prev = limit
    return round(tax, 2)

@payroll_bp.route('/', methods=['GET'])
def list_payroll():
    db = get_db()
    period = request.args.get('period', '')
    dept = request.args.get('department_id', '')
    status = request.args.get('status', '')
    sql = """
        SELECT p.*, e.first_name||' '||e.last_name AS name, e.employee_no,
               d.name AS department
        FROM payroll p
        JOIN employees e ON e.id = p.employee_id
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE 1=1
    """
    params = []
    if period:
        sql += " AND strftime('%Y-%m', p.period_start) = ?"
        params.append(period)
    if dept:
        sql += " AND e.department_id = ?"
        params.append(dept)
    if status:
        sql += " AND p.status = ?"
        params.append(status)
    sql += " ORDER BY p.period_start DESC, e.first_name"
    rows = db.execute(sql, params).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@payroll_bp.route('/process', methods=['POST'])
def process_payroll():
    """Process payroll for a period for all or specific employees."""
    db = get_db()
    data = request.json
    period_start = data.get('period_start')
    period_end = data.get('period_end')
    dept_id = data.get('department_id')

    if not period_start or not period_end:
        return jsonify({'error': 'period_start and period_end required'}), 400

    sql = "SELECT * FROM employees WHERE status='active'"
    params = []
    if dept_id:
        sql += " AND department_id=?"
        params.append(dept_id)
    employees = db.execute(sql, params).fetchall()

    # Count working days in period
    from datetime import timedelta
    ps = datetime.strptime(period_start, '%Y-%m-%d').date()
    pe = datetime.strptime(period_end, '%Y-%m-%d').date()
    work_days = sum(1 for d in range((pe-ps).days+1) if (ps+timedelta(d)).weekday()<5)

    processed = []
    for emp in employees:
        # Actual attendance in period
        att = db.execute("""
            SELECT COUNT(*) as days_worked, SUM(overtime_hrs) as ot
            FROM attendance
            WHERE employee_id=? AND date BETWEEN ? AND ? AND status='present'
        """, (emp['id'], period_start, period_end)).fetchone()

        days_worked = att['days_worked'] or 0
        days_absent = work_days - days_worked
        overtime_hrs = att['ot'] or 0

        daily_rate = emp['salary'] / 22  # ~22 working days/month
        base = round(emp['salary'] * (days_worked / work_days), 2) if work_days else emp['salary']
        allowances = round(emp['salary'] * 0.15, 2)  # 15% allowances
        overtime_pay = round(daily_rate / 8 * 1.5 * overtime_hrs, 2)
        gross = base + allowances + overtime_pay
        tax = calc_tax(gross)
        nssf = round(gross * 0.05, 2)  # 5% NSSF employee contribution
        deductions = round(nssf, 2)
        net_pay = round(gross - tax - deductions, 2)

        # Remove existing draft for this period
        db.execute("DELETE FROM payroll WHERE employee_id=? AND period_start=? AND status='draft'",
                   (emp['id'], period_start))
        db.execute("""
            INSERT INTO payroll
            (employee_id,period_start,period_end,base_salary,allowances,deductions,
             overtime_pay,tax,net_pay,days_worked,days_absent,status,processed_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,'processed',datetime('now'))
        """, (emp['id'], period_start, period_end, base, allowances, deductions,
              overtime_pay, tax, net_pay, days_worked, days_absent))
        processed.append({'employee_id': emp['id'], 'net_pay': net_pay})

    db.commit(); db.close()
    total_payout = sum(p['net_pay'] for p in processed)
    return jsonify({
        'message': f'Payroll processed for {len(processed)} employees',
        'count': len(processed),
        'total_payout': total_payout,
        'period': f'{period_start} — {period_end}'
    })

@payroll_bp.route('/summary', methods=['GET'])
def payroll_summary():
    db = get_db()
    period = request.args.get('period', datetime.now().strftime('%Y-%m'))
    rows = db.execute("""
        SELECT d.name AS department, SUM(p.net_pay) AS total_net,
               SUM(p.tax) AS total_tax, SUM(p.base_salary) AS total_base,
               COUNT(*) AS employee_count
        FROM payroll p
        JOIN employees e ON e.id = p.employee_id
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE strftime('%Y-%m', p.period_start) = ? AND p.status='processed'
        GROUP BY d.id
    """, (period,)).fetchall()
    totals = db.execute("""
        SELECT SUM(net_pay) as net, SUM(tax) as tax, SUM(base_salary) as base,
               SUM(overtime_pay) as ot, COUNT(*) as count
        FROM payroll WHERE strftime('%Y-%m', period_start) = ? AND status='processed'
    """, (period,)).fetchone()
    db.close()
    return jsonify({
        'period': period,
        'by_department': [dict(r) for r in rows],
        'totals': dict(totals) if totals else {}
    })
