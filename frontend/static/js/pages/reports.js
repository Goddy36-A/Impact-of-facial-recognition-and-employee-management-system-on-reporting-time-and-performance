// Reports Page
async function renderReports() {
  document.getElementById('page-content').innerHTML = `
    <div class="page-topbar">
      <div class="page-title-block">
        <h1 class="page-title">Reports</h1>
        <p class="page-subtitle">Analytics, trends, and workforce insights</p>
      </div>
      <div class="page-actions">
        <select class="form-control" id="reportDays" style="width:140px" onchange="loadAllReports()">
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
          <option value="30" selected>Last 30 days</option>
          <option value="60">Last 60 days</option>
        </select>
      </div>
    </div>
    <div class="page-body">
      <!-- Attendance Trend -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Attendance Trend</span>
          <span class="tag tag-citron" id="avgAttTag">Loading...</span>
        </div>
        <div class="card-body" id="attTrendChart">
          <div class="skeleton" style="height:180px"></div>
        </div>
      </div>

      <div class="grid-2">
        <!-- Absentees -->
        <div class="card">
          <div class="card-header"><span class="card-title">Lowest Attendance — Top 10</span></div>
          <div class="card-body" id="absenteeChart">
            <div class="skeleton" style="height:200px"></div>
          </div>
        </div>

        <!-- Overtime -->
        <div class="card">
          <div class="card-header"><span class="card-title">Top Overtime Hours — Last 30 Days</span></div>
          <div class="card-body" id="overtimeChart">
            <div class="skeleton" style="height:200px"></div>
          </div>
        </div>
      </div>

      <!-- Payroll Trend -->
      <div class="card">
        <div class="card-header"><span class="card-title">Payroll Trend</span></div>
        <div class="card-body" id="payrollTrendChart">
          <div class="skeleton" style="height:120px"></div>
        </div>
      </div>

      <!-- Summary KPIs -->
      <div class="card">
        <div class="card-header"><span class="card-title">Period Summary</span></div>
        <div class="card-body" id="kpiSummary">
          <div class="skeleton" style="height:80px"></div>
        </div>
      </div>
    </div>`;

  loadAllReports();
}

async function loadAllReports() {
  const days = parseInt(document.getElementById('reportDays')?.value||30);
  try {
    const [trend, absentees, overtime, payrollTrend, stats] = await Promise.all([
      API.reports.attendance(days),
      API.reports.absentees(),
      API.reports.overtime(),
      API.reports.payrollTrend(),
      API.employees.stats(),
    ]);
    renderAttTrend(trend, stats.total_employees);
    renderAbsentees(absentees);
    renderOvertime(overtime);
    renderPayrollTrend(payrollTrend);
    renderKPIs(trend, stats);
  } catch(e) { toast('Failed to load reports: '+e.message,'error'); }
}

function renderAttTrend(data, total) {
  if(!data.length) { document.getElementById('attTrendChart').innerHTML='<div class="empty-state">No data</div>'; return; }
  const avg = Math.round(data.reduce((s,d)=>s+(d.present||0),0)/data.length);
  document.getElementById('avgAttTag').textContent = `Avg ${Math.round(avg/total*100)}%`;

  const max = Math.max(...data.map(d=>d.present),1);
  const sorted = [...data].sort((a,b)=>a.date.localeCompare(b.date));

  document.getElementById('attTrendChart').innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:4px;height:140px;margin-bottom:8px">
      ${sorted.map(d=>{
        const pct = Math.round((d.present/max)*100);
        const ratePct = Math.round((d.present/total)*100);
        const barColor = ratePct>=85?'var(--mint)':ratePct>=65?'var(--amber)':'var(--coral)';
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;position:relative;min-width:0">
          <div title="${d.date}: ${d.present}/${total} (${ratePct}%)" style="width:100%;border-radius:3px 3px 0 0;background:${barColor};opacity:0.85;height:${pct}%;min-height:4px;transition:height 0.3s;cursor:default"></div>
        </div>`;
      }).join('')}
    </div>
    <div style="display:flex;gap:4px">
      ${sorted.map(d=>`<div style="flex:1;text-align:center;font-size:9px;color:var(--text-3);font-family:var(--font-mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.date.slice(5)}</div>`).join('')}
    </div>
    <div style="display:flex;gap:16px;margin-top:12px;font-size:11px;font-family:var(--font-mono)">
      <span style="color:var(--mint)">■ ≥85% Good</span>
      <span style="color:var(--amber)">■ 65–84% Average</span>
      <span style="color:var(--coral)">■ &lt;65% Poor</span>
    </div>`;
}

function renderAbsentees(data) {
  if(!data.length) { document.getElementById('absenteeChart').innerHTML='<div class="empty-state">No data</div>'; return; }
  document.getElementById('absenteeChart').innerHTML = data.map(d=>`
    <div class="bar-chart-row">
      <span class="bar-chart-label">${d.name||'—'}</span>
      ${progressBar(d.rate||0, d.rate>=80?'var(--mint)':d.rate>=60?'var(--amber)':'var(--coral)')}
      <span class="bar-chart-val">${d.rate||0}%</span>
    </div>`).join('');
}

function renderOvertime(data) {
  if(!data.length) { document.getElementById('overtimeChart').innerHTML='<div class="empty-state">No overtime recorded</div>'; return; }
  const max = Math.max(...data.map(d=>d.total_overtime||0),1);
  document.getElementById('overtimeChart').innerHTML = data.map(d=>`
    <div class="bar-chart-row">
      <span class="bar-chart-label">${d.name||'—'}</span>
      ${progressBar(Math.round((d.total_overtime/max)*100),'var(--periwinkle)')}
      <span class="bar-chart-val">${(d.total_overtime||0).toFixed(1)}h</span>
    </div>`).join('');
}

function renderPayrollTrend(data) {
  if(!data.length) {
    document.getElementById('payrollTrendChart').innerHTML='<div class="empty-state">No payroll data. Process payroll first.</div>';
    return;
  }
  const sorted = [...data].sort((a,b)=>a.month.localeCompare(b.month));
  const maxNet = Math.max(...sorted.map(d=>d.total_net||0),1);
  document.getElementById('payrollTrendChart').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px">
      ${sorted.map(d=>`
        <div class="bar-chart-row">
          <span class="bar-chart-label">${d.month}</span>
          ${progressBar(Math.round((d.total_net/maxNet)*100),'var(--citron)')}
          <span class="bar-chart-val">${fmtCurrency(d.total_net,'')}</span>
        </div>`).join('')}
    </div>`;
}

function renderKPIs(trend, stats) {
  const totalDays = trend.length;
  const avgPresent = totalDays ? Math.round(trend.reduce((s,d)=>s+(d.present||0),0)/totalDays) : 0;
  const avgConf = totalDays ? Math.round(trend.reduce((s,d)=>s+(d.avg_confidence||0),0)/totalDays) : 0;
  const totalOT = trend.reduce((s,d)=>s+(d.total_overtime||0),0);
  document.getElementById('kpiSummary').innerHTML = `
    <div class="report-kpi-row">
      <div class="kpi-card"><div class="kpi-val">${avgPresent}</div><div class="kpi-label">Avg Daily Present</div></div>
      <div class="kpi-card"><div class="kpi-val">${Math.round(avgPresent/Math.max(stats.total_employees,1)*100)}%</div><div class="kpi-label">Avg Attendance Rate</div></div>
      <div class="kpi-card"><div class="kpi-val">${avgConf}%</div><div class="kpi-label">Avg Scan Confidence</div></div>
    </div>
    <div class="report-kpi-row">
      <div class="kpi-card"><div class="kpi-val">${totalOT.toFixed(0)}h</div><div class="kpi-label">Total Overtime Hours</div></div>
      <div class="kpi-card"><div class="kpi-val">${stats.face_registered}</div><div class="kpi-label">Faces Registered</div></div>
      <div class="kpi-card"><div class="kpi-val">${stats.total_employees}</div><div class="kpi-label">Active Employees</div></div>
    </div>`;
}
