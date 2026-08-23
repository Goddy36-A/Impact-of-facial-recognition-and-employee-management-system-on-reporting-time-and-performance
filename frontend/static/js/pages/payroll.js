// Payroll Page
async function renderPayroll() {
  const now = new Date();
  const month = now.toISOString().slice(0,7);
  const firstDay = month + '-01';
  const lastDay = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().split('T')[0];

  document.getElementById('page-content').innerHTML = `
    <div class="page-topbar">
      <div class="page-title-block">
        <h1 class="page-title">Payroll</h1>
        <p class="page-subtitle">Process salaries, deductions, and tax computations</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="openProcessModal('${firstDay}','${lastDay}')">Process Payroll</button>
      </div>
    </div>
    <div class="page-body">
      <div id="payrollSummaryCards" class="stat-grid">
        ${[1,2,3,4].map(()=>`<div class="stat-card"><div class="skeleton" style="height:70px"></div></div>`).join('')}
      </div>

      <div class="toolbar">
        <div class="form-group" style="flex-direction:row;align-items:center;gap:8px;margin:0">
          <label class="form-label">PERIOD</label>
          <input type="month" class="form-control" id="payrollMonth" value="${month}" style="width:170px" onchange="loadPayrollTable()"/>
        </div>
        <select class="form-control" id="payrollStatus" style="width:140px" onchange="loadPayrollTable()">
          <option value="">All</option>
          <option value="processed">Processed</option>
          <option value="draft">Draft</option>
        </select>
        <div class="toolbar-spacer"></div>
        <span class="tag tag-muted" id="payrollCountTag">—</span>
      </div>

      <div class="card">
        <div class="table-scroll">
          <table class="data-table" role="grid" aria-label="Payroll records">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Period</th>
                <th>Days Worked</th>
                <th>Base Salary</th>
                <th>Allowances</th>
                <th>Overtime</th>
                <th>Tax</th>
                <th>Net Pay</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="payrollTableBody">${loadingRows(10,5)}</tbody>
          </table>
        </div>
      </div>
    </div>`;

  loadPayrollSummary(month);
  loadPayrollTable();
}

async function loadPayrollSummary(period) {
  try {
    const s = await API.payroll.summary(period);
    const t = s.totals || {};
    document.getElementById('payrollSummaryCards').innerHTML = `
      <div class="stat-card">
        <div class="stat-card-accent" style="background:var(--citron)"></div>
        <div class="stat-label">Gross Payroll</div>
        <div class="stat-value amount gross" style="font-size:24px">${fmtCurrency(t.base||0,'UGX')}</div>
        <div class="stat-delta">${t.count||0} employees processed</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-accent" style="background:var(--mint)"></div>
        <div class="stat-label">Net Payout</div>
        <div class="stat-value amount net" style="font-size:24px">${fmtCurrency(t.net||0,'UGX')}</div>
        <div class="stat-delta up">After all deductions</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-accent" style="background:var(--coral)"></div>
        <div class="stat-label">Total Tax</div>
        <div class="stat-value amount tax" style="font-size:24px">${fmtCurrency(t.tax||0,'UGX')}</div>
        <div class="stat-delta dn">PAYE withheld</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-accent" style="background:var(--periwinkle)"></div>
        <div class="stat-label">Employees Paid</div>
        <div class="stat-value" style="color:var(--periwinkle)">${t.count||0}</div>
        <div class="stat-delta">This period</div>
      </div>`;
  } catch(e) {
    document.getElementById('payrollSummaryCards').innerHTML = `
      ${[['Gross Payroll','—'],['Net Payout','—'],['Total Tax','—'],['Employees Paid','0']].map(([l,v])=>`
        <div class="stat-card"><div class="stat-label">${l}</div><div class="stat-value" style="font-size:24px">${v}</div></div>`).join('')}`;
  }
}

async function loadPayrollTable() {
  const period = document.getElementById('payrollMonth')?.value || '';
  const status = document.getElementById('payrollStatus')?.value || '';
  try {
    const data = await API.payroll.list({ period, status });
    document.getElementById('payrollCountTag').textContent = `${data.length} records`;
    if(!data.length) {
      document.getElementById('payrollTableBody').innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="empty-icon">o</div>No payroll processed for this period.<br/><button class="btn btn-primary" style="margin-top:12px" onclick="openProcessModal()">Process Now</button></div></td></tr>`;
      return;
    }
    document.getElementById('payrollTableBody').innerHTML = data.map(r=>`
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            ${avatar(r.name)}
            <div>
              <div style="font-weight:600">${r.name}</div>
              <div style="font-size:11px;color:var(--text-2);font-family:var(--font-mono)">${r.employee_no}</div>
            </div>
          </div>
        </td>
        <td style="color:var(--text-2)">${r.department||'—'}</td>
        <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-2)">${r.period_start} — ${r.period_end}</td>
        <td style="text-align:center">
          <span style="font-family:var(--font-mono)">
            <span style="color:var(--mint)">${r.days_worked}</span>/<span style="color:var(--coral)">${r.days_absent}</span>
          </span>
        </td>
        <td class="amount">${fmtCurrency(r.base_salary,'UGX')}</td>
        <td class="amount" style="color:var(--amber)">${fmtCurrency(r.allowances,'UGX')}</td>
        <td class="amount" style="color:var(--periwinkle)">${fmtCurrency(r.overtime_pay,'UGX')}</td>
        <td class="amount tax">${fmtCurrency(r.tax,'UGX')}</td>
        <td class="amount net">${fmtCurrency(r.net_pay,'UGX')}</td>
        <td>${statusTag(r.status)}</td>
      </tr>`).join('');
    loadPayrollSummary(period);
  } catch(e) { toast('Failed: '+e.message,'error'); }
}

function openProcessModal(start='', end='') {
  const now = new Date();
  const defaultStart = start || new Date(now.getFullYear(),now.getMonth(),1).toISOString().split('T')[0];
  const defaultEnd   = end   || new Date(now.getFullYear(),now.getMonth()+1,0).toISOString().split('T')[0];
  openModal(`
    <div class="modal-header">
      <span class="modal-title">Process Payroll</span>
      <button class="modal-close" onclick="closeModal()">x</button>
    </div>
    <div class="modal-body">
      <div style="background:var(--obsidian3);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:14px;font-size:13px;color:var(--text-2)">
        This will compute salaries based on actual attendance data, apply PAYE tax brackets, NSSF deductions, and calculate overtime pay.
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Period Start *</label><input class="form-control" id="procStart" type="date" value="${defaultStart}"/></div>
        <div class="form-group"><label class="form-label">Period End *</label><input class="form-control" id="procEnd" type="date" value="${defaultEnd}"/></div>
      </div>
      <div class="form-group">
        <label class="form-label">Department (optional — leave blank for all)</label>
        <select class="form-control" id="procDept"><option value="">All Departments</option></select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="procBtn" onclick="submitProcess()">Process Payroll</button>
    </div>`);
  API.departments.list().then(depts => {
    const sel = document.getElementById('procDept');
    if(sel) sel.innerHTML += depts.map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
  });
}

async function submitProcess() {
  const body = {
    period_start: document.getElementById('procStart').value,
    period_end:   document.getElementById('procEnd').value,
    department_id: document.getElementById('procDept').value || null,
  };
  if(!body.period_start||!body.period_end) { toast('Period required','error'); return; }
  const btn = document.getElementById('procBtn');
  btn.disabled=true; btn.textContent='Processing...';
  try {
    const r = await API.payroll.process(body);
    toast(`${r.message} — Total: ${fmtCurrency(r.total_payout,'UGX')}`,'success');
    closeModal(); loadPayrollTable();
  } catch(e) { toast('Error: '+e.message,'error'); btn.disabled=false; btn.textContent='Process Payroll'; }
}
