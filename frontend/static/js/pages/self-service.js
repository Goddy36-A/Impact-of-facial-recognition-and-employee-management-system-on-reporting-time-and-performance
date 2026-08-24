// FaceForce Pro — Employee Self-Service Dashboard

async function renderSelfService() {
  const content = document.getElementById('page-content');
  const user    = typeof currentUser === 'function' ? currentUser() : {};

  content.innerHTML = `
    <div class="page-topbar">
      <div>
        <div class="page-title">My Dashboard</div>
        <div class="page-subtitle">Your personal attendance and payroll summary</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-ghost" onclick="renderSelfService()">↻ Refresh</button>
      </div>
    </div>
    <div id="selfContent">
      <div class="stat-grid" id="selfStats">
        ${[1,2,3,4].map(()=>`<div class="stat-card"><div class="skeleton" style="height:70px"></div></div>`).join('')}
      </div>
      <div class="grid-2" style="margin-top:20px">
        <div class="card" id="selfAttCard">
          <div class="card-header">
            <span class="card-title">My Attendance — Last 30 Days</span>
          </div>
          <div class="card-body"><div class="skeleton" style="height:180px"></div></div>
        </div>
        <div class="card" id="selfPayCard">
          <div class="card-header">
            <span class="card-title">My Payslips</span>
          </div>
          <div class="card-body"><div class="skeleton" style="height:180px"></div></div>
        </div>
      </div>
      <div class="card" style="margin-top:20px" id="selfRecentCard">
        <div class="card-header"><span class="card-title">Recent Check-ins</span></div>
        <div class="table-scroll">
          <table class="data-table" role="grid" aria-label="My recent attendance">
            <thead>
              <tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Duration</th><th>Status</th><th>Method</th></tr>
            </thead>
            <tbody id="selfAttBody">${loadingRows(6,5)}</tbody>
          </table>
        </div>
      </div>
    </div>`;

  // Need employee_id from session — if not linked, show helpful message
  if(!user.employee_id) {
    document.getElementById('selfContent').innerHTML = `
      <div class="empty-state" style="margin-top:80px">
        <div class="empty-icon">▤</div>
        <p>Your account is not linked to an employee record yet.</p>
        <p style="font-size:12px;color:var(--text-3)">Ask an administrator to link your account to your employee profile.</p>
      </div>`;
    return;
  }

  _loadSelfProfile(user.employee_id);
  _loadSelfAttendance(user.employee_id);
  _loadSelfPayroll(user.employee_id);
}

async function _loadSelfProfile(empId) {
  try {
    const emp = await API.employees.get(empId);

    // Attendance stats
    const att       = emp.recent_attendance || [];
    const present   = att.filter(a=>a.status==='present').length;
    const late      = att.filter(a=>a.status==='late').length;
    const totalDays = att.length;
    const rate      = totalDays ? Math.round(present/totalDays*100) : 0;

    document.getElementById('selfStats').innerHTML = `
      <div class="stat-card">
        <div class="stat-card-accent" style="background:var(--citron)"></div>
        <div class="stat-label">EMPLOYEE NO</div>
        <div class="stat-value" style="font-size:22px">${emp.employee_no}</div>
        <div class="stat-sub">${emp.position||'—'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-accent" style="background:var(--mint)"></div>
        <div class="stat-label">DEPARTMENT</div>
        <div class="stat-value" style="font-size:22px">${emp.department_name||'—'}</div>
        <div class="stat-sub">${emp.shift_name ? emp.shift_name+' · '+emp.start_time+'–'+emp.end_time : 'No shift assigned'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-accent" style="background:${rate>=90?'var(--mint)':rate>=75?'var(--amber)':'var(--coral)'}"></div>
        <div class="stat-label">ATTENDANCE RATE</div>
        <div class="stat-value">${rate}<span style="font-size:16px;color:var(--text-2)">%</span></div>
        <div class="stat-sub">${present} present · ${late} late · last ${totalDays} days</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-accent" style="background:${emp.face_registered?'var(--mint)':'var(--coral)'}"></div>
        <div class="stat-label">FACE ID</div>
        <div class="stat-value" style="font-size:18px">${emp.face_registered?'Registered':'Not set'}</div>
        <div class="stat-sub">${emp.face_registered?'Active · '+fmtDate(emp.face_registered_at):'Contact HR to register'}</div>
      </div>`;
  } catch(e) {
    document.getElementById('selfStats').innerHTML =
      `<div class="alert alert-error" style="grid-column:1/-1">Could not load profile: ${e.message}</div>`;
  }
}

async function _loadSelfAttendance(empId) {
  const card = document.getElementById('selfAttCard');
  const tbody = document.getElementById('selfAttBody');
  try {
    const emp = await API.employees.get(empId);
    const att = emp.recent_attendance || [];

    // Summary chart (last 10 days as mini bar)
    if(card) {
      const bars = att.slice(0, 10).reverse().map(a => {
        const color = a.status==='present'?'var(--mint)':a.status==='late'?'var(--amber)':'var(--coral)';
        const h_in  = a.check_in  ? new Date(a.check_in).getHours()  + new Date(a.check_in).getMinutes()/60  : 0;
        const h_out = a.check_out ? new Date(a.check_out).getHours() + new Date(a.check_out).getMinutes()/60 : 0;
        const hrs   = h_out > h_in ? (h_out - h_in).toFixed(1) : '—';
        return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1">
          <div style="font-size:9px;color:var(--text-3);font-family:var(--font-mono)">${a.date.slice(5)}</div>
          <div style="width:100%;background:var(--surface);border-radius:4px;overflow:hidden;height:60px;display:flex;align-items:flex-end">
            <div style="width:100%;background:${color};height:${a.check_in?Math.min(100,((h_out-h_in)/9)*100):0}%;border-radius:4px;min-height:${a.check_in?'8px':'0'}"></div>
          </div>
          <div style="font-size:9px;color:var(--text-2)">${a.check_in?hrs+'h':'—'}</div>
        </div>`;
      }).join('');

      card.querySelector('.card-body').innerHTML = att.length
        ? `<div style="display:flex;gap:4px;align-items:flex-end;padding:8px 0">${bars}</div>
           <div style="display:flex;gap:12px;margin-top:8px;font-size:11px;font-family:var(--font-mono)">
             <span><span style="color:var(--mint)">●</span> Present</span>
             <span><span style="color:var(--amber)">●</span> Late</span>
             <span><span style="color:var(--coral)">●</span> Absent</span>
           </div>`
        : '<div class="empty-state"><div class="empty-icon">▦</div>No attendance records yet</div>';
    }

    // Table
    if(tbody) {
      tbody.innerHTML = att.length
        ? att.map(a => `<tr>
            <td style="font-family:var(--font-mono);font-size:12px">${fmtDate(a.date)}</td>
            <td style="font-family:var(--font-mono);font-size:12px">${a.check_in?fmtTime(a.check_in):'—'}</td>
            <td style="font-family:var(--font-mono);font-size:12px">${a.check_out?fmtTime(a.check_out):'—'}</td>
            <td style="font-size:12px">${fmtDuration(a.check_in,a.check_out)}</td>
            <td>${statusTag(a.status)}</td>
            <td><span class="tag tag-muted">${a.method||'face'}</span></td>
          </tr>`).join('')
        : `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">▦</div>No records</div></td></tr>`;
    }
  } catch(e) {
    if(tbody) tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">⚠</div>${e.message}</div></td></tr>`;
  }
}

async function _loadSelfPayroll(empId) {
  const card = document.getElementById('selfPayCard');
  if(!card) return;
  try {
    const emp     = await API.employees.get(empId);
    const payroll = emp.payroll_history || [];
    card.querySelector('.card-body').innerHTML = payroll.length
      ? payroll.map(p => `
          <div style="padding:12px;background:var(--obsidian3);border-radius:8px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-weight:600;font-size:13px">${fmtDate(p.period_start)} – ${fmtDate(p.period_end)}</div>
              <div style="font-size:11px;color:var(--text-2);margin-top:2px">${p.days_worked} days worked</div>
            </div>
            <div style="text-align:right">
              <div style="font-family:var(--font-serif);font-size:20px;color:var(--mint)">
                ${fmtCurrency(p.net_pay)}
              </div>
              ${statusTag(p.status)}
            </div>
          </div>`).join('')
      : '<div class="empty-state"><div class="empty-icon">◉</div>No payslips yet</div>';
  } catch(e) {
    card.querySelector('.card-body').innerHTML =
      `<div class="empty-state"><div class="empty-icon">⚠</div>${e.message}</div>`;
  }
}
