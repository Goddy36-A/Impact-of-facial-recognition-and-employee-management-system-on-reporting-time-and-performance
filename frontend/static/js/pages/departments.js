async function renderDepartments() {
  document.getElementById('page-content').innerHTML = `
    <div class="page-topbar">
      <div class="page-title-block"><h1 class="page-title">Departments</h1><p class="page-subtitle">Manage organizational units</p></div>
      <div class="page-actions"><button class="btn btn-primary" onclick="openDeptModal()">+ Add Department</button></div>
    </div>
    <div class="page-body">
      <div id="deptGrid" class="dept-grid">${loadingRows(1,3).replace(/<\/tr>/g,'')}</div>
    </div>`;
  loadDeptGrid();
}

async function loadDeptGrid() {
  try {
    const depts = await API.departments.list();
    const el = document.getElementById('deptGrid');
    if(!depts.length) { el.innerHTML='<div class="empty-state" style="grid-column:1/-1">No departments</div>'; return; }
    el.innerHTML = depts.map(d=>`
      <div class="card">
        <div style="height:4px;background:${d.color||'var(--citron)'}"></div>
        <div class="card-body">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
            <div>
              <div style="font-family:var(--font-serif);font-size:18px">${d.name}</div>
              <div style="font-size:11px;color:var(--text-3);font-family:var(--font-mono)">${d.code}</div>
            </div>
            <span style="font-family:var(--font-serif);font-size:28px;color:${d.color||'var(--citron)'}">${d.employee_count||0}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:12px">
            ${[['Manager',d.manager||'—'],['Budget',fmtCurrency(d.budget,'UGX')]].map(([l,v])=>`
              <div style="display:flex;justify-content:space-between;font-size:12px">
                <span style="color:var(--text-3);font-family:var(--font-mono)">${l}</span>
                <span style="color:var(--text-2)">${v}</span>
              </div>`).join('')}
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="openDeptModal(${d.id},'${d.name}','${d.code}','${d.manager||''}',${d.budget},'${d.color||'#00e5ff'}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteDept(${d.id},'${d.name}')">Delete</button>
          </div>
        </div>
      </div>`).join('');
  } catch(e) { toast('Failed to load departments','error'); }
}

function openDeptModal(id=null,name='',code='',manager='',budget=0,color='#00e5ff') {
  openModal(`
    <div class="modal-header">
      <span class="modal-title">${id?'Edit Department':'Add Department'}</span>
      <button class="modal-close" onclick="closeModal()">x</button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group"><label class="form-label">Name *</label><input class="form-control" id="dName" value="${name}"/></div>
        <div class="form-group"><label class="form-label">Code *</label><input class="form-control" id="dCode" value="${code}" placeholder="ENG"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Manager</label><input class="form-control" id="dMgr" value="${manager}"/></div>
        <div class="form-group"><label class="form-label">Budget (UGX)</label><input class="form-control" id="dBudget" type="number" value="${budget}"/></div>
      </div>
      <div class="form-group"><label class="form-label">Color</label><input class="form-control" id="dColor" type="color" value="${color}" style="height:42px;padding:4px"/></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveDept(${id||'null'})">Save</button>
    </div>`);
}

async function saveDept(id) {
  const data = { name:document.getElementById('dName').value.trim(), code:document.getElementById('dCode').value.trim(), manager:document.getElementById('dMgr').value.trim(), budget:parseFloat(document.getElementById('dBudget').value)||0, color:document.getElementById('dColor').value };
  if(!data.name||!data.code) { toast('Name and Code required','error'); return; }
  try {
    if(id) await API.departments.update(id,data); else await API.departments.create(data);
    toast(id?'Updated':'Created','success'); closeModal(); loadDeptGrid();
  } catch(e) { toast('Error: '+e.message,'error'); }
}

async function deleteDept(id, name) {
  const ok = await confirmDialog(`Delete <strong>${name}</strong>? This cannot be undone.`, true);
  if(!ok) return;
  try { await API.departments.delete(id); toast('Department deleted','info'); loadDeptGrid(); }
  catch(e) { toast('Error: '+e.message,'error'); }
}
