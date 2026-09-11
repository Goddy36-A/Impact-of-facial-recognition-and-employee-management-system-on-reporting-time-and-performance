// FaceForce Pro — Auth & Shell v3

let _currentUser = null;
function currentUser() { return _currentUser; }
function hasRole(...roles) {
  if (!_currentUser) return false;
  if (_currentUser.role === 'admin') return true;
  return roles.includes(_currentUser.role);
}

const ROLE_CONFIG = {
  admin:      { landing:'dashboard', nav:['dashboard','recognition','register','employees','departments','shifts','attendance','payroll','reports','users'] },
  hr:         { landing:'dashboard', nav:['dashboard','recognition','register','employees','departments','shifts','attendance','reports'] },
  finance:    { landing:'payroll',   nav:['dashboard','payroll','reports'] },
  supervisor: { landing:'attendance',nav:['dashboard','attendance','reports'] },
  employee:   { landing:'self',      nav:['self'] },
  kiosk:      { landing:'recognition',nav:[] },
  pending:    { landing:null,        nav:[] },
};

const NAV_ITEMS = [
  {page:'dashboard',   icon:'📊', label:'Dashboard',    section:'OVERVIEW'},
  {page:'recognition', icon:'📷', label:'Face Scan',     section:'OVERVIEW', badge:'LIVE'},
  {page:'register',    icon:'➕', label:'Register Face', section:'OVERVIEW'},
  {page:'employees',   icon:'👥', label:'Employees',     section:'WORKFORCE', count:'navEmpCount'},
  {page:'departments', icon:'🏢', label:'Departments',   section:'WORKFORCE'},
  {page:'shifts',      icon:'🕐', label:'Shifts',        section:'WORKFORCE'},
  {page:'attendance',  icon:'✅', label:'Attendance',    section:'OPERATIONS'},
  {page:'payroll',     icon:'💰', label:'Payroll',       section:'OPERATIONS'},
  {page:'reports',     icon:'📈', label:'Reports',       section:'OPERATIONS'},
  {page:'users',       icon:'🔐', label:'User Accounts', section:'ADMIN', pendingBadge:true},
  {page:'self',        icon:'👤', label:'My Dashboard',  section:'MY ACCOUNT'},
];

const BOTTOM_NAV = {
  admin:      [['dashboard','📊','Home'],['recognition','📷','Scan'],['employees','👥','Staff'],['attendance','✅','Attend.'],['reports','📈','Reports']],
  hr:         [['dashboard','📊','Home'],['employees','👥','Staff'],['attendance','✅','Attend.'],['recognition','📷','Scan'],['reports','📈','Reports']],
  finance:    [['dashboard','📊','Home'],['payroll','💰','Payroll'],['reports','📈','Reports']],
  supervisor: [['dashboard','📊','Home'],['attendance','✅','Attend.'],['reports','📈','Reports']],
  employee:   [['self','👤','My Info']],
  kiosk:      [],
};

function _buildNav(user) {
  const allowed = new Set((ROLE_CONFIG[user.role]||{}).nav||[]);
  const c = document.getElementById('sidebarNavContainer');
  if (!c) return;
  let html='', sec='';
  NAV_ITEMS.filter(n=>allowed.has(n.page)).forEach(n=>{
    if (n.section!==sec) {
      if (sec) html+='</nav>';
      html+=`<div class="sidebar-section-label">${n.section}</div><nav class="sidebar-nav">`;
      sec=n.section;
    }
    const badge = n.badge==='LIVE' ? `<span class="nav-badge">LIVE</span>`
      : n.pendingBadge ? `<span class="nav-count" id="pendingBadge"></span>`
      : n.count ? `<span class="nav-count" id="${n.count}">—</span>` : '';
    html+=`<a class="nav-item" data-page="${n.page}" onclick="navTo('${n.page}')" role="button" tabindex="0">
      <span class="nav-icon">${n.icon}</span><span class="nav-label">${n.label}</span>${badge}</a>`;
  });
  if (sec) html+='</nav>';
  c.innerHTML = html;

  const bn = document.getElementById('bottomNavInner');
  if (bn) {
    bn.innerHTML = (BOTTOM_NAV[user.role]||[]).map(([p,i,l])=>
      `<button class="bottom-nav-item" data-page="${p}" onclick="navTo('${p}')" aria-label="${l}">
        <span class="bottom-nav-icon">${i}</span><span>${l}</span></button>`).join('');
  }
}

function _populateUser(user) {
  const name = user.full_name || user.username || '?';
  const ini  = name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  const role = user.role.charAt(0).toUpperCase()+user.role.slice(1);
  // sidebar
  const els = {userAvatar:ini, userName:name, userRole:role,
    topbarAvatar:ini, topbarUserName:name, topbarUserRole:role};
  Object.entries(els).forEach(([id,val])=>{ const el=document.getElementById(id); if(el)el.textContent=val; });
}

function showAppShell(user) {
  _currentUser = user;
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app-shell').style.display   = 'grid';

  if (user.role === 'kiosk') {
    ['sidebar','desktopTopbar','mobileTopbar','bottomNav']
      .forEach(id=>{ const el=document.getElementById(id); if(el)el.style.display='none'; });
    document.getElementById('sidebarNavContainer').innerHTML = '';
    return;
  }
  _populateUser(user);
  _buildNav(user);
  if (user.role==='admin') _refreshPendingBadge();
}

function _refreshPendingBadge() {
  API.users.pendingCount().then(r=>{
    const el=document.getElementById('pendingBadge');
    if(el) el.textContent = r.count>0 ? r.count : '';
  }).catch(()=>{});
}

function showLoginScreen() {
  _currentUser = null;
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('app-shell').style.display   = 'none';
  const err=document.getElementById('loginError'); if(err){err.style.display='none';err.textContent='';}
  const pw=document.getElementById('loginPassword'); if(pw) pw.value='';
  setTimeout(()=>document.getElementById('loginUsername')?.focus(), 80);
}

async function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errBox   = document.getElementById('loginError');
  const btn      = document.getElementById('loginSubmitBtn');
  errBox.style.display='none';
  btn.disabled=true; btn.textContent='Signing in…';
  try {
    const r = await API.auth.login(username, password);
    showAppShell(r);
    if (typeof init==='function') init(r);
  } catch(e) {
    errBox.textContent = e.message||'Incorrect username or password. Please try again.';
    errBox.style.display='flex';
    document.getElementById('loginPassword').value='';
    document.getElementById('loginPassword').focus();
  } finally { btn.disabled=false; btn.textContent='Sign In'; }
  return false;
}

async function handleLogout() {
  try { await API.auth.logout(); } catch(e) {}
  showLoginScreen();
}

function toggleSidebar(open) {
  const s=document.getElementById('sidebar'), b=document.getElementById('sidebarBackdrop');
  if(!s) return;
  s.classList.toggle('sidebar-open',open);
  if(b) b.classList.toggle('sidebar-backdrop-visible',open);
  const h=document.getElementById('hamburgerBtn'); if(h) h.setAttribute('aria-expanded',String(!!open));
}

function togglePw() {
  const f=document.getElementById('loginPassword');
  f.type = f.type==='password'?'text':'password';
}

function openChangePasswordForm() {
  openModal(`<div class="modal-header"><span class="modal-title">Change Password</span>
    <button class="modal-close" onclick="closeModal()">✕</button></div>
    <form class="modal-body" onsubmit="return submitChangePassword(event)">
      <div id="cpError" class="field-error" style="display:none" role="alert"></div>
      <div class="form-group"><label class="form-label" for="cpCurrent">Current password</label>
        <input class="form-control" id="cpCurrent" type="password" autocomplete="current-password" required></div>
      <div class="form-group"><label class="form-label" for="cpNew">New password (min 6 characters)</label>
        <input class="form-control" id="cpNew" type="password" minlength="6" required></div>
      <div class="form-group"><label class="form-label" for="cpConfirm">Confirm new password</label>
        <input class="form-control" id="cpConfirm" type="password" required></div>
      <div class="modal-footer" style="padding:12px 0 0;border:none">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Update Password</button></div>
    </form>`);
}

async function submitChangePassword(e) {
  e.preventDefault();
  const cur=document.getElementById('cpCurrent').value, nxt=document.getElementById('cpNew').value,
        con=document.getElementById('cpConfirm').value, err=document.getElementById('cpError');
  err.style.display='none';
  if(nxt!==con){err.textContent='Passwords do not match';err.style.display='flex';return false;}
  try { await API.auth.changePassword(cur,nxt); closeModal(); toast('Password updated','success'); }
  catch(ex){err.textContent=ex.message||'Could not update password';err.style.display='flex';}
  return false;
}

function openCreateAccountModal() {
  openModal(`<div class="modal-header"><span class="modal-title">Request Account Access</span>
    <button class="modal-close" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <p style="font-size:13px;color:var(--text-2);margin-bottom:18px;line-height:1.6">
        Enter your details and an administrator will activate your account.
        If no admin account exists yet, yours will become the first administrator.</p>
      <div id="regError"   class="field-error"  style="display:none"></div>
      <div id="regSuccess" class="alert alert-success" style="display:none"></div>
      <div class="form-group"><label class="form-label" for="regFullName">Full Name</label>
        <input class="form-control" id="regFullName" placeholder="e.g. Alice Nakato" required autocomplete="name"></div>
      <div class="form-group"><label class="form-label" for="regUsername">Username</label>
        <input class="form-control" id="regUsername" placeholder="e.g. alice_n" required autocomplete="username"></div>
      <div class="form-group"><label class="form-label" for="regPassword">Password (min 6 characters)</label>
        <input class="form-control" id="regPassword" type="password" minlength="6" required autocomplete="new-password"></div>
      <div class="modal-footer" style="padding:16px 0 0;border:none">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="regSubmitBtn" onclick="submitRegister()">Submit Request</button></div>
    </div>`);
}

async function submitRegister() {
  const btn=document.getElementById('regSubmitBtn'), err=document.getElementById('regError'),
        ok=document.getElementById('regSuccess');
  err.style.display='none'; btn.disabled=true; btn.textContent='Submitting…';
  try {
    const r = await API.users.register({
      full_name:document.getElementById('regFullName').value.trim(),
      username: document.getElementById('regUsername').value.trim(),
      password: document.getElementById('regPassword').value,
    });
    ok.textContent=r.message; ok.style.display='flex'; btn.style.display='none';
  } catch(e) { err.textContent=e.message||'Registration failed'; err.style.display='flex'; btn.disabled=false; btn.textContent='Submit Request'; }
}

document.addEventListener('DOMContentLoaded', async ()=>{
  try { const me=await API.auth.me(); if(me.authenticated){showAppShell(me);if(typeof init==='function')init(me);return;} } catch(e){}
  showLoginScreen();
});
