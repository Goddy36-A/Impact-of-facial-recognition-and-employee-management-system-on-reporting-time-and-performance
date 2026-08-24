// FaceForce Pro — User Accounts Page (admin only)

const ROLE_LABELS = {
  admin:      { label:'Admin',      cls:'tag-coral'  },
  hr:         { label:'HR',         cls:'tag-mint'   },
  finance:    { label:'Finance',    cls:'tag-amber'  },
  supervisor: { label:'Supervisor', cls:'tag-peri'   },
  employee:   { label:'Employee',   cls:'tag-muted'  },
  kiosk:      { label:'Kiosk',      cls:'tag-muted'  },
  pending:    { label:'Pending',    cls:'tag-amber'  },
};

function renderUsers() {
  document.getElementById('page-content').innerHTML = `
    <div class="page-topbar">
      <div>
        <div class="page-title">User Accounts</div>
        <div class="page-subtitle">Manage system access and roles</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-ghost" onclick="loadUsersTable()" aria-label="Refresh">↻ Refresh</button>
        <button class="btn btn-primary" onclick="openCreateUserModal()">⊕ Create Account</button>
      </div>
    </div>

    <!-- Pending approval banner — shown when pending accounts exist -->
    <div id="pendingBanner" style="display:none" class="alert alert-warn" style="margin-bottom:16px">
      <span>⚠</span>
      <span id="pendingBannerMsg"></span>
      <button class="btn btn-ghost" style="margin-left:auto;padding:4px 10px;font-size:11px"
              onclick="filterUsers('pending')">Review</button>
    </div>

    <!-- Filter toolbar -->
    <div class="toolbar" style="margin-bottom:16px">
      <div class="search-box">
        <span class="search-icon" aria-hidden="true">⌕</span>
        <input type="search" id="userSearch" placeholder="Search username or name…"
               oninput="filterUsersLocal()" aria-label="Search users"/>
      </div>
      <div class="toolbar-spacer"></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${['all','admin','hr','finance','supervisor','employee','kiosk','pending'].map(r =>
          `<button class="btn btn-ghost role-filter-btn" data-role="${r}"
                   onclick="filterUsers('${r}')"
                   style="${r==='all'?'background:var(--citron-glow);border-color:var(--citron-dim);color:var(--citron)':''}"
                   >${r==='all'?'All':ROLE_LABELS[r]?.label||r}</button>`
        ).join('')}
      </div>
    </div>

    <div class="card">
      <div class="table-scroll">
        <table class="data-table" role="grid" aria-label="User accounts">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Department</th>
              <th>Employee Link</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Created</th>
              <th style="text-align:right">Actions</th>
            </tr>
          </thead>
          <tbody id="userTableBody">${loadingRows(8,6)}</tbody>
        </table>
      </div>
    </div>`;

  loadUsersTable();
}

let _allUsers = [];
let _activeRoleFilter = 'all';

async function loadUsersTable() {
  const tbody = document.getElementById('userTableBody');
  if(!tbody) return;
  try {
    _allUsers = await API.users.list();
    renderUserRows(_allUsers);
    _checkPending(_allUsers);
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="8">
      <div class="empty-state"><div class="empty-icon">⚠</div>
      <span>${e.message}</span>
      <button class="btn btn-ghost" style="margin-top:12px" onclick="loadUsersTable()">Retry</button>
      </div></td></tr>`;
  }
}

function _checkPending(users) {
  const pending = users.filter(u => u.role === 'pending' && !u.is_active);
  const banner  = document.getElementById('pendingBanner');
  const msg     = document.getElementById('pendingBannerMsg');
  if(banner && msg) {
    if(pending.length) {
      msg.textContent = `${pending.length} account request${pending.length>1?'s':''} awaiting approval.`;
      banner.style.display = 'flex';
      // Update sidebar badge too
      const badge = document.getElementById('pendingBadge');
      if(badge) badge.textContent = pending.length;
    } else {
      banner.style.display = 'none';
    }
  }
}

function filterUsers(role) {
  _activeRoleFilter = role;
  // Update filter button highlight
  document.querySelectorAll('.role-filter-btn').forEach(btn => {
    const active = btn.dataset.role === role;
    btn.style.background     = active ? 'var(--citron-glow)' : '';
    btn.style.borderColor    = active ? 'var(--citron-dim)'  : '';
    btn.style.color          = active ? 'var(--citron)'      : '';
  });
  filterUsersLocal();
}

function filterUsersLocal() {
  const q = (document.getElementById('userSearch')?.value || '').toLowerCase();
  let users = _allUsers;
  if(_activeRoleFilter !== 'all') {
    users = users.filter(u => u.role === _activeRoleFilter);
  }
  if(q) {
    users = users.filter(u =>
      (u.username||'').toLowerCase().includes(q) ||
      (u.full_name||'').toLowerCase().includes(q)
    );
  }
  renderUserRows(users);
}

function renderUserRows(users) {
  const tbody = document.getElementById('userTableBody');
  if(!tbody) return;
  if(!users.length) {
    tbody.innerHTML = `<tr><td colspan="8">
      <div class="empty-state"><div class="empty-icon">⊞</div>No accounts found</div>
    </td></tr>`;
    return;
  }

  const selfId = typeof currentUser === 'function' ? currentUser()?.id : null;

  tbody.innerHTML = users.map(u => {
    const rl     = ROLE_LABELS[u.role] || { label: u.role, cls:'tag-muted' };
    const isSelf = u.id === selfId;
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar" style="background:var(--obsidian3)" aria-hidden="true">
            ${(u.full_name||u.username||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
          </div>
          <div>
            <div style="font-weight:600">${u.full_name||'—'}
              ${isSelf?'<span class="tag tag-citron" style="font-size:9px;padding:1px 5px;margin-left:4px">YOU</span>':''}
            </div>
            <div style="font-size:11px;color:var(--text-3);font-family:var(--font-mono)">@${u.username}</div>
          </div>
        </div>
      </td>
      <td><span class="tag ${rl.cls}">${rl.label}</span></td>
      <td>${u.department_name||'<span style="color:var(--text-3)">—</span>'}</td>
      <td>${u.employee_name||'<span style="color:var(--text-3)">—</span>'}</td>
      <td>
        ${u.is_active
          ? '<span class="tag tag-mint">Active</span>'
          : u.role==='pending'
            ? '<span class="tag tag-amber">Pending</span>'
            : '<span class="tag tag-coral">Inactive</span>'}
      </td>
      <td style="font-size:12px;color:var(--text-2)">${u.last_login ? fmtDate(u.last_login) : '<span style="color:var(--text-3)">Never</span>'}</td>
      <td style="font-size:12px;color:var(--text-2)">${fmtDate(u.created_at)}</td>
      <td style="text-align:right">
        <div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">
          ${u.role==='pending' && !u.is_active
            ? `<button class="btn btn-ghost" style="font-size:11px;padding:4px 10px"
                       onclick="approveUser(${u.id},'${u.username}')">✓ Approve</button>`
            : ''}
          <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px"
                  onclick="openEditUserModal(${u.id})" ${isSelf?'disabled title="Use Account menu to edit yourself"':''}>
            Edit
          </button>
          <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px;color:var(--coral)"
                  onclick="deleteUser(${u.id},'${u.username}')" ${isSelf?'disabled title="Cannot delete your own account"':''}>
            Delete
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ── CREATE USER MODAL ─────────────────────────────────────────
async function openCreateUserModal() {
  let depts = [], emps = [];
  try { [depts, emps] = await Promise.all([API.departments.list(), API.employees.list({per_page:200})]); }
  catch(e) {}
  const deptOptions = (depts.departments||depts||[]).map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
  const empOptions  = (emps.employees||[]).map(e=>`<option value="${e.id}">${e.first_name} ${e.last_name} (${e.employee_no})</option>`).join('');

  openModal(`
    <div class="modal-header">
      <span class="modal-title">Create Account</span>
      <button class="modal-close" onclick="closeModal()" aria-label="Close">✕</button>
    </div>
    <form class="modal-body" style="padding:20px 24px;display:flex;flex-direction:column;gap:14px"
          onsubmit="return submitCreateUser(event)">
      <div id="cuError" class="login-error" style="display:none" role="alert"></div>
      <div class="grid-2">
        <div class="form-group" style="margin:0">
          <label class="form-label" for="cuFullName">Full Name</label>
          <input class="form-control" id="cuFullName" placeholder="e.g. Alice Nakato" required autocomplete="name">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label" for="cuUsername">Username</label>
          <input class="form-control" id="cuUsername" placeholder="e.g. alice_n" required autocomplete="off">
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group" style="margin:0">
          <label class="form-label" for="cuPassword">Password</label>
          <input class="form-control" id="cuPassword" type="password" minlength="6"
                 placeholder="Min 6 characters" required autocomplete="new-password">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label" for="cuRole">Role</label>
          <select class="form-control" id="cuRole" onchange="onRoleChange()" required>
            ${Object.entries(ROLE_LABELS).filter(([k])=>k!=='pending').map(([k,v])=>
              `<option value="${k}">${v.label}</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="cuDeptRow" class="form-group" style="margin:0;display:none">
        <label class="form-label" for="cuDept">Department <span style="color:var(--text-3)">(required for supervisor)</span></label>
        <select class="form-control" id="cuDept">
          <option value="">— Select department —</option>
          ${deptOptions}
        </select>
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label" for="cuEmployee">Link to Employee <span style="color:var(--text-3)">(optional)</span></label>
        <select class="form-control" id="cuEmployee">
          <option value="">— None —</option>
          ${empOptions}
        </select>
        <div class="help-text">Links this login account to an employee record for self-service access.</div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" id="cuSubmitBtn" class="btn btn-primary">Create Account</button>
      </div>
    </form>`);
}

function onRoleChange() {
  const role    = document.getElementById('cuRole')?.value;
  const deptRow = document.getElementById('cuDeptRow');
  if(deptRow) deptRow.style.display = role === 'supervisor' ? 'block' : 'none';
}

async function submitCreateUser(event) {
  event.preventDefault();
  const btn = document.getElementById('cuSubmitBtn');
  const err = document.getElementById('cuError');
  err.style.display = 'none';
  btn.disabled = true; btn.textContent = 'Creating…';

  const role    = document.getElementById('cuRole').value;
  const deptVal = document.getElementById('cuDept')?.value;
  const empVal  = document.getElementById('cuEmployee')?.value;

  try {
    await API.users.create({
      full_name:     document.getElementById('cuFullName').value.trim(),
      username:      document.getElementById('cuUsername').value.trim(),
      password:      document.getElementById('cuPassword').value,
      role,
      department_id: deptVal  || null,
      employee_id:   empVal   || null,
    });
    closeModal();
    toast('Account created successfully', 'success');
    loadUsersTable();
  } catch(e) {
    err.textContent = e.message;
    err.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Create Account';
  }
  return false;
}

// ── EDIT USER MODAL ───────────────────────────────────────────
async function openEditUserModal(uid) {
  let user, depts = [], emps = [];
  try {
    [user, depts, emps] = await Promise.all([
      API.users.get(uid),
      API.departments.list(),
      API.employees.list({per_page:200}),
    ]);
  } catch(e) { toast(e.message,'error'); return; }

  const deptOptions = (depts.departments||depts||[]).map(d=>
    `<option value="${d.id}" ${d.id==user.department_id?'selected':''}>${d.name}</option>`).join('');
  const empOptions  = (emps.employees||[]).map(e=>
    `<option value="${e.id}" ${e.id==user.employee_id?'selected':''}>${e.first_name} ${e.last_name} (${e.employee_no})</option>`).join('');

  openModal(`
    <div class="modal-header">
      <span class="modal-title">Edit — @${user.username}</span>
      <button class="modal-close" onclick="closeModal()" aria-label="Close">✕</button>
    </div>
    <form class="modal-body" style="padding:20px 24px;display:flex;flex-direction:column;gap:14px"
          onsubmit="return submitEditUser(event,${uid})">
      <div id="euError" class="login-error" style="display:none" role="alert"></div>
      <div class="grid-2">
        <div class="form-group" style="margin:0">
          <label class="form-label" for="euFullName">Full Name</label>
          <input class="form-control" id="euFullName" value="${user.full_name||''}" required>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label" for="euRole">Role</label>
          <select class="form-control" id="euRole" onchange="onEditRoleChange()">
            ${Object.entries(ROLE_LABELS).filter(([k])=>k!=='pending').map(([k,v])=>
              `<option value="${k}" ${k===user.role?'selected':''}>${v.label}</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="euDeptRow" class="form-group" style="margin:0;display:${user.role==='supervisor'?'block':'none'}">
        <label class="form-label" for="euDept">Department</label>
        <select class="form-control" id="euDept">
          <option value="">— None —</option>
          ${deptOptions}
        </select>
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label" for="euEmployee">Linked Employee</label>
        <select class="form-control" id="euEmployee">
          <option value="">— None —</option>
          ${empOptions}
        </select>
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label" for="euStatus">Account Status</label>
        <select class="form-control" id="euStatus">
          <option value="1" ${user.is_active?'selected':''}>Active</option>
          <option value="0" ${!user.is_active?'selected':''}>Inactive / Suspended</option>
        </select>
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label" for="euPassword">New Password <span style="color:var(--text-3)">(leave blank to keep current)</span></label>
        <input class="form-control" id="euPassword" type="password" minlength="6" autocomplete="new-password" placeholder="Enter to change…">
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" id="euSubmitBtn" class="btn btn-primary">Save Changes</button>
      </div>
    </form>`);
}

function onEditRoleChange() {
  const role    = document.getElementById('euRole')?.value;
  const deptRow = document.getElementById('euDeptRow');
  if(deptRow) deptRow.style.display = role === 'supervisor' ? 'block' : 'none';
}

async function submitEditUser(event, uid) {
  event.preventDefault();
  const btn = document.getElementById('euSubmitBtn');
  const err = document.getElementById('euError');
  err.style.display = 'none';
  btn.disabled = true; btn.textContent = 'Saving…';

  const payload = {
    full_name:     document.getElementById('euFullName').value.trim(),
    role:          document.getElementById('euRole').value,
    department_id: document.getElementById('euDept')?.value || null,
    employee_id:   document.getElementById('euEmployee')?.value || null,
    is_active:     parseInt(document.getElementById('euStatus').value),
  };
  const newPw = document.getElementById('euPassword').value;
  if(newPw) payload.password = newPw;

  try {
    await API.users.update(uid, payload);
    closeModal();
    toast('Account updated', 'success');
    loadUsersTable();
  } catch(e) {
    err.textContent = e.message;
    err.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Save Changes';
  }
  return false;
}

// ── APPROVE PENDING ───────────────────────────────────────────
async function approveUser(uid, username) {
  try {
    await API.users.update(uid, { role: 'employee', is_active: 1 });
    toast(`@${username} approved as Employee — you can edit their role now.`, 'success');
    loadUsersTable();
  } catch(e) { toast(e.message,'error'); }
}

// ── DELETE ────────────────────────────────────────────────────
async function deleteUser(uid, username) {
  const ok = await confirmDialog(`Delete account <strong>@${username}</strong>? This cannot be undone.`, true);
  if(!ok) return;
  try {
    await API.users.delete(uid);
    toast(`@${username} deleted`, 'info');
    loadUsersTable();
  } catch(e) { toast(e.message,'error'); }
}
