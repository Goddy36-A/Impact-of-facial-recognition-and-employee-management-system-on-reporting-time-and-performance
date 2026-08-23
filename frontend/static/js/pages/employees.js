// Employees Page
let _empPage = 1, _empDepts = [];

async function renderEmployees() {
  document.getElementById('page-content').innerHTML = `
    <div class="page-topbar">
      <div class="page-title-block">
        <h1 class="page-title">Employees</h1>
        <p class="page-subtitle">Manage your workforce records</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary btn-sm" onclick="exportEmployees()">Export CSV</button>
        <button class="btn btn-primary" onclick="openEmpModal()">+ Add Employee</button>
      </div>
    </div>
    <div class="page-body">
      <div class="toolbar">
        <div class="search-box">
          <span class="search-icon" aria-hidden="true">⌕</span>
          <input type="search" id="empSearch" placeholder="Search name, ID, email..." oninput="searchEmployees()" aria-label="Search employees"/>
        </div>
        <select class="form-control" id="empDeptFilter" style="width:180px" onchange="searchEmployees()">
          <option value="">All Departments</option>
        </select>
        <select class="form-control" id="empStatusFilter" style="width:140px" onchange="searchEmployees()">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <div class="toolbar-spacer"></div>
        <span class="tag tag-muted" id="empTotalTag">Loading...</span>
      </div>

      <div class="card">
        <div class="table-scroll">
          <table class="data-table" role="grid" aria-label="Employees list">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Employee No</th>
                <th>Department</th>
                <th>Position</th>
                <th>Salary</th>
                <th>Face</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="empTableBody">${loadingRows(8, 6)}</tbody>
          </table>
        </div>
        <div id="empPagination"></div>
      </div>
    </div>`;

  await loadDepts();
  loadEmployeeTable();
}

async function loadDepts() {
  try {
    _empDepts = await API.departments.list();
    const sel = document.getElementById('empDeptFilter');
    if (sel) sel.innerHTML = '<option value="">All Departments</option>' +
      _empDepts.map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
  } catch(e) {}
}

async function loadEmployeeTable(page=1) {
  _empPage = page;
  const q = document.getElementById('empSearch')?.value || '';
  const dept = document.getElementById('empDeptFilter')?.value || '';
  const status = document.getElementById('empStatusFilter')?.value || '';
  try {
    const data = await API.employees.list({ q, department_id: dept, status, page, per_page: 15 });
    document.getElementById('empTotalTag').textContent = `${data.total} employees`;

    const tbody = document.getElementById('empTableBody');
    if (!data.employees.length) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">o</div>No employees found</div></td></tr>`;
      return;
    }
    tbody.innerHTML = data.employees.map(e => {
      const name = `${e.first_name} ${e.last_name}`;
      const faceTag = e.face_registered
        ? '<span class="tag tag-mint">Registered</span>'
        : '<span class="tag tag-coral">None</span>';
      return `<tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            ${avatar(name, e.photo)}
            <div>
              <div style="font-weight:600">${name}</div>
              <div style="font-size:11px;color:var(--text-2);font-family:var(--font-mono)">${e.email||'—'}</div>
            </div>
          </div>
        </td>
        <td><span style="font-family:var(--font-mono);font-size:12px;color:var(--text-2)">${e.employee_no}</span></td>
        <td>
          <span class="tag tag-muted" style="border-left:3px solid ${e.dept_color||'var(--border2)'}">${e.department_name||'—'}</span>
        </td>
        <td style="color:var(--text-2)">${e.position||'—'}</td>
        <td><span class="amount">${fmtCurrency(e.salary, e.currency||'UGX')}</span></td>
        <td>${faceTag}</td>
        <td>${statusTag(e.status)}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="viewEmployee(${e.id})">View</button>
            <button class="btn btn-ghost btn-sm" onclick="openEmpModal(${e.id})">Edit</button>
            <button class="btn btn-secondary btn-sm" onclick="navigate('register?id='+${e.id})">Face</button>
            <button class="btn btn-danger btn-sm" onclick="deleteEmployee(${e.id},'${name}')">x</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    document.getElementById('empPagination').innerHTML = paginate(data.total, page, 15, 'loadEmployeeTable');
  } catch(e) { toast('Failed to load employees: '+e.message,'error'); }
}

function searchEmployees() { loadEmployeeTable(1); }

async function viewEmployee(id) {
  try {
    const e = await API.employees.get(id);
    const name = `${e.first_name} ${e.last_name}`;
    const attHtml = e.recent_attendance?.length
      ? e.recent_attendance.map(a=>`
          <div style="display:flex;justify-content:space-between;padding:7px 10px;background:var(--obsidian3);border-radius:6px;font-size:12px;margin-bottom:4px">
            <span style="font-family:var(--font-mono);color:var(--text-2)">${a.date}</span>
            <span style="font-family:var(--font-mono);color:var(--mint)">${fmtTime(a.check_in)}</span>
            <span style="font-family:var(--font-mono);color:var(--amber)">${fmtTime(a.check_out)||'Active'}</span>
            <span>${statusTag(a.status)}</span>
          </div>`).join('')
      : '<div style="color:var(--text-3);font-size:12px;padding:8px">No recent attendance</div>';

    openModal(`
      <div class="modal-header">
        <span class="modal-title">${name}</span>
        <button class="modal-close" onclick="closeModal()">x</button>
      </div>
      <div class="modal-body">
        <div style="display:flex;gap:16px;align-items:flex-start">
          ${avatar(name, e.photo, 'lg')}
          <div style="flex:1">
            <div style="font-family:var(--font-serif);font-size:22px">${name}</div>
            <div style="color:var(--text-2);font-size:13px">${e.position||'—'} · ${e.department_name||'—'}</div>
            <div style="margin-top:8px;display:flex;gap:8px">${statusTag(e.status)}${e.face_registered?'<span class="tag tag-mint">Face Registered</span>':'<span class="tag tag-coral">No Face</span>'}</div>
          </div>
        </div>
        <div class="form-row">
          ${[['Employee No',e.employee_no],['Email',e.email],['Phone',e.phone],['Salary',fmtCurrency(e.salary,e.currency)],['Join Date',fmtDate(e.join_date)],['National ID',e.national_id]].map(([l,v])=>`
            <div style="background:var(--obsidian3);border-radius:8px;padding:10px 12px">
              <div style="font-size:10px;color:var(--text-3);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:3px">${l}</div>
              <div style="font-size:13px;font-weight:600">${v||'—'}</div>
            </div>`).join('')}
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:var(--text-3);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:8px">Recent Attendance (Last 10 Days)</div>
          ${attHtml}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
        <button class="btn btn-primary" onclick="closeModal();openEmpModal(${id})">Edit</button>
      </div>`);
  } catch(e) { toast('Failed: '+e.message,'error'); }
}

async function openEmpModal(id=null) {
  let emp = null;
  if(id) { try { emp = await API.employees.get(id); } catch(e) {} }
  const deptOptions = _empDepts.map(d=>`<option value="${d.id}" ${emp?.department_id==d.id?'selected':''}>${d.name}</option>`).join('');
  openModal(`
    <div class="modal-header">
      <span class="modal-title">${emp?'Edit Employee':'Add Employee'}</span>
      <button class="modal-close" onclick="closeModal()">x</button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">First Name *</label>
          <input class="form-control" id="mFName" value="${emp?.first_name||''}"/>
        </div>
        <div class="form-group">
          <label class="form-label">Last Name *</label>
          <input class="form-control" id="mLName" value="${emp?.last_name||''}"/>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Employee No *</label>
          <input class="form-control" id="mEmpNo" value="${emp?.employee_no||''}"/>
        </div>
        <div class="form-group">
          <label class="form-label">National ID</label>
          <input class="form-control" id="mNatId" value="${emp?.national_id||''}"/>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-control" id="mEmail" type="email" value="${emp?.email||''}"/>
        </div>
        <div class="form-group">
          <label class="form-label">Phone</label>
          <input class="form-control" id="mPhone" value="${emp?.phone||''}"/>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Department *</label>
          <select class="form-control" id="mDept"><option value="">Select...</option>${deptOptions}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Position *</label>
          <input class="form-control" id="mPosition" value="${emp?.position||''}"/>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Salary (UGX)</label>
          <input class="form-control" id="mSalary" type="number" value="${emp?.salary||''}"/>
        </div>
        <div class="form-group">
          <label class="form-label">Join Date</label>
          <input class="form-control" id="mJoin" type="date" value="${emp?.join_date||''}"/>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Gender</label>
          <select class="form-control" id="mGender">
            <option value="">Select</option>
            <option value="Male" ${emp?.gender=='Male'?'selected':''}>Male</option>
            <option value="Female" ${emp?.gender=='Female'?'selected':''}>Female</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-control" id="mStatus">
            <option value="active" ${(!emp||emp.status=='active')?'selected':''}>Active</option>
            <option value="inactive" ${emp?.status=='inactive'?'selected':''}>Inactive</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Address</label>
        <input class="form-control" id="mAddress" value="${emp?.address||''}"/>
      </div>
      <div class="form-group">
        <label class="form-label">Emergency Contact</label>
        <input class="form-control" id="mEmerg" value="${emp?.emergency_contact||''}"/>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveEmployee(${id||'null'})">Save Employee</button>
    </div>`);
}

async function saveEmployee(id) {
  const data = {
    first_name: document.getElementById('mFName').value.trim(),
    last_name:  document.getElementById('mLName').value.trim(),
    employee_no:document.getElementById('mEmpNo').value.trim(),
    email:      document.getElementById('mEmail').value.trim(),
    phone:      document.getElementById('mPhone').value.trim(),
    department_id: parseInt(document.getElementById('mDept').value)||null,
    position:   document.getElementById('mPosition').value.trim(),
    salary:     parseFloat(document.getElementById('mSalary').value)||0,
    join_date:  document.getElementById('mJoin').value,
    gender:     document.getElementById('mGender').value,
    status:     document.getElementById('mStatus').value,
    address:    document.getElementById('mAddress').value.trim(),
    emergency_contact: document.getElementById('mEmerg').value.trim(),
    national_id: document.getElementById('mNatId').value.trim(),
  };
  if(!data.first_name||!data.last_name||!data.employee_no||!data.department_id||!data.position) {
    toast('Fill all required fields','error'); return;
  }
  try {
    if(id) await API.employees.update(id, data);
    else await API.employees.create(data);
    toast(id?'Employee updated':'Employee created','success');
    closeModal(); loadEmployeeTable(_empPage);
  } catch(e) { toast('Error: '+e.message,'error'); }
}

async function deleteEmployee(id, name) {
  const ok = await confirmDialog(`Delete <strong>${name}</strong>? This also removes their face data and cannot be undone.`, true);
  if(!ok) return;
  try {
    await API.employees.delete(id);
    toast(`${name} deleted`, 'info');
    loadEmployeeTable(_empPage);
  } catch(e) { toast('Delete failed: '+e.message, 'error'); }
}

function exportEmployees() { window.open('/api/attendance/export?date='+new Date().toISOString().split('T')[0]); }
