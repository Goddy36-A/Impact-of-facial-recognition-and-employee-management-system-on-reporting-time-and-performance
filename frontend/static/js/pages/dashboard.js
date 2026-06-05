// Dashboard Page

async function renderDashboard() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-topbar">
      <div class="page-title-block">
        <h1 class="page-title">Command Center</h1>
        <p class="page-subtitle">Real-time workforce intelligence · ${new Date().toLocaleDateString('en-UG',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary btn-sm" onclick="navigate('recognition')">◎ Face Scan</button>
        <button class="btn btn-primary btn-sm" onclick="navigate('register')">⊕ Register Face</button>
      </div>
    </div>
    <div class="page-body">
      <div class="stat-grid" id="dashStats">
        ${[1,2,3,4].map(()=>`<div class="stat-card"><div class="skeleton" style="height:80px"></div></div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="card" id="weeklyChart">
          <div class="card-header"><span class="card-title">Weekly Attendance</span><span class="tag tag-mint" id="weekRate">—</span></div>
          <div class="card-body" id="weeklyBody"><div class="skeleton" style="height:100px"></div></div>
        </div>
        <div class="card" id="deptChart">
          <div class="card-header"><span class="card-title">Department Distribution</span></div>
          <div class="card-body" id="deptBody"><div class="skeleton" style="height:100px"></div></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Today's Check-ins</span>
            <span class="tag tag-mint" id="liveTag" style="animation:blink 1.5s infinite">● LIVE</span>
          </div>
          <div id="checkinList" style="max-height:300px;overflow-y:auto">
            <div class="empty-state"><div class="empty-icon">◎</div>Loading…</div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Face Recognition System</span></div>
          <div class="card-body" id="faceStatus">
            <div class="skeleton" style="height:120px"></div>
          </div>
        </div>
      </div>
    </div>`;

  try {
    const [stats, faceStatus] = await Promise.all([
      API.employees.stats(),
      API.recognition.status()
    ]);
    renderDashStats(stats);
    renderWeeklyChart(stats.weekly_attendance, stats.total_employees);
    renderDeptChart(stats.department_breakdown);
    renderCheckinList();
    renderFaceStatus(faceStatus);
  } catch(e) {
    toast('Failed to load dashboard: ' + e.message, 'error');
  }
}

function renderDashStats(s) {
  document.getElementById('dashStats').innerHTML = `
    <div class="stat-card">
      <div class="stat-card-accent" style="background:var(--citron)"></div>
      <div class="stat-label">Total Employees</div>
      <div class="stat-value">${s.total_employees}</div>
      <div class="stat-delta">${s.new_this_month} joined this month</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-accent" style="background:var(--mint)"></div>
      <div class="stat-label">Present Today</div>
      <div class="stat-value" style="color:var(--mint)">${s.present_today}</div>
      <div class="stat-delta up">↑ ${s.attendance_rate}% attendance rate</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-accent" style="background:var(--coral)"></div>
      <div class="stat-label">Absent Today</div>
      <div class="stat-value" style="color:var(--coral)">${s.absent_today}</div>
      <div class="stat-delta dn">↓ ${100-s.attendance_rate}% absence rate</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-accent" style="background:var(--amber)"></div>
      <div class="stat-label">Faces Registered</div>
      <div class="stat-value" style="color:var(--amber)">${s.face_registered}</div>
      <div class="stat-delta">of ${s.total_employees} employees</div>
    </div>`;
  document.getElementById('navEmpCount').textContent = s.total_employees;
}

function renderWeeklyChart(data, total) {
  if(!data || !data.length) { document.getElementById('weeklyBody').innerHTML='<div class="empty-state">No data</div>'; return; }
  const max = Math.max(...data.map(d=>d.present), 1);
  const avg = Math.round(data.reduce((s,d)=>s+d.present,0)/data.length);
  document.getElementById('weekRate').textContent = `Avg ${Math.round(avg/total*100)}%`;
  document.getElementById('weeklyBody').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px">
      ${data.slice(0,7).reverse().map(d=>`
        <div class="bar-chart-row">
          <span class="bar-chart-label">${fmtDate(d.date)}</span>
          ${progressBar(Math.round(d.present/total*100))}
          <span class="bar-chart-val">${d.present}/${total}</span>
        </div>`).join('')}
    </div>`;
}

function renderDeptChart(depts) {
  if(!depts||!depts.length){ document.getElementById('deptBody').innerHTML='<div class="empty-state">No data</div>'; return; }
  const max = Math.max(...depts.map(d=>d.count),1);
  document.getElementById('deptBody').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px">
      ${depts.map(d=>`
        <div class="bar-chart-row">
          <span class="bar-chart-label" style="color:${d.color||'var(--text-2)'}">${d.name}</span>
          ${progressBar(Math.round(d.count/max*100), d.color||'var(--citron)')}
          <span class="bar-chart-val">${d.count}</span>
        </div>`).join('')}
    </div>`;
}

async function renderCheckinList() {
  const el = document.getElementById('checkinList');
  try {
    const data = await API.attendance.list({ date: new Date().toISOString().split('T')[0], status:'present', per_page:20 });
    if(!data.records.length) { el.innerHTML='<div class="empty-state"><div class="empty-icon">◎</div>No check-ins yet today</div>'; return; }
    el.innerHTML = data.records.filter(r=>r.is_present).map(r=>`
      <div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--border)">
        ${avatar(r.name)}
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px">${r.name}</div>
          <div style="font-size:11px;color:var(--text-2);font-family:var(--font-mono)">${r.department||'—'}</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--font-mono);font-size:12px;color:var(--mint)">${fmtTime(r.check_in)}</div>
          ${r.check_out?`<div style="font-family:var(--font-mono);font-size:10px;color:var(--text-3)">OUT ${fmtTime(r.check_out)}</div>`:''}
        </div>
      </div>`).join('');
  } catch(e) { el.innerHTML='<div class="empty-state">Failed to load</div>'; }
}

function renderFaceStatus(s) {
  const regPct = s.registration_rate;
  document.getElementById('faceStatus').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px">
      <div class="pipeline-metric">
        <span class="pipeline-metric-label">Detector</span>
        <span class="pipeline-metric-val" style="color:var(--mint)">${s.models.detector}</span>
      </div>
      <div class="pipeline-metric">
        <span class="pipeline-metric-label">Recognizer</span>
        <span class="pipeline-metric-val" style="color:var(--mint)">${s.models.recognizer}</span>
      </div>
      <div class="pipeline-metric">
        <span class="pipeline-metric-label">Anti-Spoof</span>
        <span class="pipeline-metric-val" style="color:var(--amber)">${s.models.anti_spoof}</span>
      </div>
      <div class="pipeline-metric">
        <span class="pipeline-metric-label">Liveness</span>
        <span class="pipeline-metric-val" style="color:var(--amber)">${s.models.liveness}</span>
      </div>
      <div class="pipeline-metric">
        <span class="pipeline-metric-label">Scans Today</span>
        <span class="pipeline-metric-val">${s.scans_today}</span>
      </div>
      <div style="margin-top:4px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span class="pipeline-metric-label">Face Registration Rate</span>
          <span class="pipeline-metric-val">${regPct}%</span>
        </div>
        <div class="conf-bar"><div class="conf-fill" style="width:${regPct}%;background:var(--citron)"></div></div>
      </div>
    </div>`;
}
