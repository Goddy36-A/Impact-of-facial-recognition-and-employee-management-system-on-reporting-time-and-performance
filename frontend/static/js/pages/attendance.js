// Attendance Page
let _attPage = 1;

async function renderAttendance() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('page-content').innerHTML = `
    <div class="page-topbar">
      <div class="page-title-block">
        <h1 class="page-title">Attendance</h1>
        <p class="page-subtitle">Track check-ins, check-outs, and work hours</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary btn-sm" id="exportAttBtn" onclick="exportAtt()">Export CSV</button>
        <button class="btn btn-primary" onclick="openManualCheckin()">+ Manual Check-in</button>
      </div>
    </div>
    <div class="page-body">
      <div class="stat-grid" id="attStats">
        ${[1,2,3,4].map(()=>`<div class="stat-card"><div class="skeleton" style="height:70px"></div></div>`).join('')}
      </div>

      <div class="toolbar">
        <div class="form-group" style="flex-direction:row;align-items:center;gap:8px;margin:0">
          <label class="form-label" style="white-space:nowrap">DATE</label>
          <input type="date" class="form-control" id="attDate" value="${today}" style="width:160px" onchange="loadAttTable()"/>
        </div>
        <div class="search-box">
          <input type="text" id="attSearch" placeholder="Search employee..." oninput="loadAttTable()"/>
        </div>
        <select class="form-control" id="attDeptFilter" style="width:170px" onchange="loadAttTable()">
          <option value="">All Departments</option>
        </select>
        <select class="form-control" id="attStatusFilter" style="width:140px" onchange="loadAttTable()">
          <option value="">All</option>
          <option value="present">Present</option>
          <option value="absent">Absent</option>
        </select>
        <div class="toolbar-spacer"></div>
        <span class="tag tag-muted" id="attCountTag">Loading...</span>
      </div>

      <div class="card">
        <div class="table-scroll">
          <table class="data-table" role="grid" aria-label="Attendance records">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Duration</th>
                <th>Method</th>
                <th>Confidence</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="attTableBody">${loadingRows(9,8)}</tbody>
          </table>
        </div>
        <div id="attPagination"></div>
      </div>
    </div>`;

  await loadAttDepts();
  loadAttStats();
  loadAttTable();
}

async function loadAttDepts() {
  try {
    const depts = await API.departments.list();
    const sel = document.getElementById('attDeptFilter');
    if(sel) sel.innerHTML = '<option value="">All Departments</option>' +
      depts.map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
  } catch(e) {}
}

async function loadAttStats() {
  try {
    const stats = await API.employees.stats();
    document.getElementById('attStats').innerHTML = `
      <div class="stat-card">
        <div class="stat-card-accent" style="background:var(--periwinkle)"></div>
        <div class="stat-label">Today's Date</div>
        <div class="stat-value" style="font-size:18px;margin-top:8px;font-family:var(--font-mono);color:var(--periwinkle)">${new Date().toLocaleDateString('en-UG',{day:'2-digit',month:'short',year:'numeric'})}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-accent" style="background:var(--mint)"></div>
        <div class="stat-label">Present</div>
        <div class="stat-value" style="color:var(--mint)">${stats.present_today}</div>
        <div class="stat-delta up">of ${stats.total_employees} employees</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-accent" style="background:var(--coral)"></div>
        <div class="stat-label">Absent</div>
        <div class="stat-value" style="color:var(--coral)">${stats.absent_today}</div>
        <div class="stat-delta dn">${100-stats.attendance_rate}% absence</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-accent" style="background:var(--citron)"></div>
        <div class="stat-label">Attendance Rate</div>
        <div class="stat-value" style="color:var(--citron)">${stats.attendance_rate}%</div>
        <div style="margin-top:6px"><div class="conf-bar"><div class="conf-fill" style="width:${stats.attendance_rate}%;background:var(--citron)"></div></div></div>
      </div>`;
  } catch(e) {}
}

async function loadAttTable(page=1) {
  _attPage = page;
  const date   = document.getElementById('attDate')?.value || new Date().toISOString().split('T')[0];
  const q      = document.getElementById('attSearch')?.value || '';
  const dept   = document.getElementById('attDeptFilter')?.value || '';
  const status = document.getElementById('attStatusFilter')?.value || '';
  try {
    const data = await API.attendance.list({ date, q, department_id:dept, status, page, per_page:20 });
    document.getElementById('attCountTag').textContent = `${data.total} records`;

    const tbody = document.getElementById('attTableBody');
    if(!data.records.length) {
      tbody.innerHTML=`<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">o</div>No records found</div></td></tr>`;
      return;
    }
    tbody.innerHTML = data.records.map(r => {
      const statusBadge = r.is_present
        ? (r.check_out ? '<span class="tag tag-mint">Complete</span>' : '<span class="tag tag-citron">Active</span>')
        : '<span class="tag tag-coral">Absent</span>';
      const methodTag = r.method==='face'?'<span class="tag tag-peri">Face</span>':'<span class="tag tag-muted">Manual</span>';
      const conf = r.confidence ? `<span style="font-family:var(--font-mono);font-size:12px;color:${r.confidence>85?'var(--mint)':'var(--amber)'}">${r.confidence}%</span>` : '—';
      const dur = fmtDuration(r.check_in, r.check_out);
      return `<tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            ${avatar(r.name)}
            <div>
              <div style="font-weight:600">${r.name}</div>
              <div style="font-size:11px;color:var(--text-2);font-family:var(--font-mono)">${r.employee_no||'—'}</div>
            </div>
          </div>
        </td>
        <td><span class="tag tag-muted" style="border-left:3px solid ${r.dept_color||'var(--border2)'}">${r.department||'—'}</span></td>
        <td><span style="font-family:var(--font-mono);font-size:12px;color:var(--mint)">${fmtTime(r.check_in)}</span></td>
        <td><span style="font-family:var(--font-mono);font-size:12px;color:var(--amber)">${fmtTime(r.check_out)}</span></td>
        <td><span style="font-family:var(--font-mono);font-size:12px;color:var(--text-2)">${dur}</span></td>
        <td>${methodTag}</td>
        <td>${conf}</td>
        <td>${statusBadge}</td>
        <td>
          <div style="display:flex;gap:6px">
            ${r.record_id
              ? `<button class="btn btn-ghost btn-sm" onclick="quickCheckout(${r.record_id})">Check Out</button>
                 <button class="btn btn-danger btn-sm" onclick="deleteAtt(${r.record_id})">x</button>`
              : `<button class="btn btn-secondary btn-sm" onclick="quickCheckinEmp(${r.employee_id})">Check In</button>`}
          </div>
        </td>
      </tr>`;
    }).join('');
    document.getElementById('attPagination').innerHTML = paginate(data.total, page, 20, 'loadAttTable');
  } catch(e) { toast('Failed: '+e.message,'error'); }
}

async function quickCheckinEmp(empId) {
  try {
    const r = await API.attendance.checkin({ employee_id:empId, method:'manual', confidence:100 });
    toast('Checked in','success'); loadAttTable(_attPage); loadAttStats();
  } catch(e) { toast('Error: '+e.message,'error'); }
}

async function quickCheckout(recordId) {
  try {
    await API.attendance.update(recordId, { check_out: new Date().toISOString() });
    toast('Checked out','success'); loadAttTable(_attPage);
  } catch(e) { toast('Error: '+e.message,'error'); }
}

async function deleteAtt(recordId) {
  const ok = await confirmDialog('Delete this attendance record? This action cannot be undone.', true);
  if(!ok) return;
  try { await API.attendance.delete(recordId); toast('Record deleted','info'); loadAttTable(_attPage); loadAttStats(); }
  catch(e) { toast('Error: '+e.message,'error'); }
}

function exportAtt() {
  const date = document.getElementById('attDate')?.value || new Date().toISOString().split('T')[0];
  window.open(API.attendance.exportUrl(date));
}

async function openManualCheckin() {
  try {
    const empData = await API.employees.list({ per_page:200, status:'active' });
    openModal(`
      <div class="modal-header"><span class="modal-title">Manual Check-in</span><button class="modal-close" onclick="closeModal()">x</button></div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Employee *</label>
          <select class="form-control" id="manEmp"><option value="">Choose employee...</option>
            ${empData.employees.map(e=>`<option value="${e.id}">${e.first_name} ${e.last_name} — ${e.department_name||'N/A'}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Check-in Time</label>
          <input class="form-control" id="manTime" type="datetime-local" value="${new Date().toISOString().slice(0,16)}"/>
        </div>
        <div class="form-group">
          <label class="form-label">Notes</label>
          <input class="form-control" id="manNotes" placeholder="Optional reason..."/>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitManualCheckin()">Confirm Check-in</button>
      </div>`);
  } catch(e) {}
}

async function submitManualCheckin() {
  const empId = document.getElementById('manEmp').value;
  if(!empId) { toast('Select employee','error'); return; }
  try {
    await API.attendance.checkin({ employee_id:parseInt(empId), method:'manual', confidence:100 });
    toast('Manual check-in recorded','success');
    closeModal(); loadAttTable(_attPage); loadAttStats();
  } catch(e) { toast('Error: '+e.message,'error'); }
}
