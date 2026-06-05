async function renderShifts() {
  document.getElementById('page-content').innerHTML = `
    <div class="page-topbar">
      <div class="page-title-block"><h1 class="page-title">Shifts</h1><p class="page-subtitle">Manage work schedules</p></div>
      <div class="page-actions"><button class="btn btn-primary" onclick="openShiftModal()">+ Add Shift</button></div>
    </div>
    <div class="page-body">
      <div id="shiftGrid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px"></div>
    </div>`;
  loadShiftGrid();
}

async function loadShiftGrid() {
  try {
    const shifts = await API.shifts.list();
    const el = document.getElementById('shiftGrid');
    if(!shifts.length) { el.innerHTML='<div class="empty-state" style="grid-column:1/-1">No shifts configured</div>'; return; }
    el.innerHTML = shifts.map(s=>`
      <div class="card">
        <div style="height:3px;background:${s.color||'var(--citron)'}"></div>
        <div class="card-body">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div style="font-weight:700;font-size:15px">${s.name}</div>
            <span class="tag tag-muted">${s.assigned_count||0} assigned</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;font-size:12px">
            <div style="display:flex;justify-content:space-between"><span style="color:var(--text-3);font-family:var(--font-mono)">Hours</span><span style="font-family:var(--font-mono);color:var(--citron)">${s.start_time} — ${s.end_time}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--text-3);font-family:var(--font-mono)">Days</span><span>${s.days}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--text-3);font-family:var(--font-mono)">Department</span><span>${s.department_name||'All'}</span></div>
          </div>
        </div>
      </div>`).join('');
  } catch(e) { toast('Failed to load shifts','error'); }
}

function openShiftModal() {
  openModal(`
    <div class="modal-header"><span class="modal-title">Add Shift</span><button class="modal-close" onclick="closeModal()">x</button></div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">Shift Name *</label><input class="form-control" id="sName" placeholder="Morning Shift"/></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Start Time *</label><input class="form-control" id="sStart" type="time" value="08:00"/></div>
        <div class="form-group"><label class="form-label">End Time *</label><input class="form-control" id="sEnd" type="time" value="17:00"/></div>
      </div>
      <div class="form-group"><label class="form-label">Days</label><input class="form-control" id="sDays" value="Mon,Tue,Wed,Thu,Fri" placeholder="Mon,Tue,Wed,Thu,Fri"/></div>
      <div class="form-group"><label class="form-label">Color</label><input class="form-control" id="sColor" type="color" value="#00e5ff" style="height:42px;padding:4px"/></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveShift()">Save Shift</button>
    </div>`);
}

async function saveShift() {
  const data = { name:document.getElementById('sName').value.trim(), start_time:document.getElementById('sStart').value, end_time:document.getElementById('sEnd').value, days:document.getElementById('sDays').value, color:document.getElementById('sColor').value };
  if(!data.name) { toast('Name required','error'); return; }
  try { await API.shifts.create(data); toast('Shift created','success'); closeModal(); loadShiftGrid(); }
  catch(e) { toast('Error: '+e.message,'error'); }
}
