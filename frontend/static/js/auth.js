// FaceForce Pro — Auth gate, role-aware nav, mobile sidebar

// ── SESSION STATE ─────────────────────────────────────────────
// Stored in memory (not localStorage) — cleared on tab close.
let _currentUser = null;

function currentUser()  { return _currentUser; }
function hasRole(...roles) {
  if(!_currentUser) return false;
  if(_currentUser.role === 'admin') return true;   // admin passes every check
  return roles.includes(_currentUser.role);
}

// ── ROLE CONFIG ───────────────────────────────────────────────
// Defines which nav items each role can see and which page they
// land on after login. Kiosk gets a completely different UI.
const ROLE_CONFIG = {
  admin:      { landing:'dashboard', nav: ['dashboard','recognition','register','employees','departments','shifts','attendance','payroll','reports','users'] },
  hr:         { landing:'dashboard', nav: ['dashboard','recognition','register','employees','departments','shifts','attendance','reports'] },
  finance:    { landing:'payroll',   nav: ['dashboard','payroll','reports'] },
  supervisor: { landing:'attendance',nav: ['dashboard','attendance','reports'] },
  employee:   { landing:'self',      nav: ['self'] },
  kiosk:      { landing:'recognition', nav: [] },  // fullscreen — no sidebar
  pending:    { landing:null,        nav: [] },
};

const NAV_ITEMS = [
  { page:'dashboard',   icon:'◈', label:'Dashboard',     section:'CORE' },
  { page:'recognition', icon:'◎', label:'Face Scan',     section:'CORE', badge:'LIVE' },
  { page:'register',    icon:'⊕', label:'Register Face', section:'CORE' },
  { page:'employees',   icon:'▤', label:'Employees',     section:'WORKFORCE', count:'navEmpCount' },
  { page:'departments', icon:'◫', label:'Departments',   section:'WORKFORCE' },
  { page:'shifts',      icon:'⧖', label:'Shifts',        section:'WORKFORCE' },
  { page:'attendance',  icon:'▦', label:'Attendance',    section:'OPERATIONS' },
  { page:'payroll',     icon:'◉', label:'Payroll',       section:'OPERATIONS' },
  { page:'reports',     icon:'◧', label:'Reports',       section:'OPERATIONS' },
  { page:'users',       icon:'⊞', label:'User Accounts', section:'ADMIN', badge:'pendingCount' },
];

const BOTTOM_NAV_ITEMS = [
  { page:'dashboard',   icon:'◈', label:'Home'    },
  { page:'recognition', icon:'◎', label:'Scan'    },
  { page:'employees',   icon:'▤', label:'Staff'   },
  { page:'attendance',  icon:'▦', label:'Attend.' },
  { page:'reports',     icon:'◧', label:'Reports' },
];

// ── BUILD ROLE-AWARE NAV ──────────────────────────────────────
function _buildNav(user) {
  const cfg      = ROLE_CONFIG[user.role] || ROLE_CONFIG.employee;
  const allowed  = new Set(cfg.nav);
  const sidebarNav = document.getElementById('sidebarNavContainer');
  if(!sidebarNav) return;

  let html = '';
  let lastSection = '';
  NAV_ITEMS.filter(n => allowed.has(n.page)).forEach(n => {
    if(n.section !== lastSection) {
      html += `<div class="sidebar-section-label">${n.section}</div><nav class="sidebar-nav">`;
      lastSection = n.section;
    }
    const badge = n.badge === 'LIVE'
      ? `<span class="nav-live" aria-label="Live feature">LIVE</span>`
      : n.badge === 'pendingCount'
        ? `<span class="nav-count" id="pendingBadge" aria-live="polite"></span>`
        : n.count
          ? `<span class="nav-count" id="${n.count}" aria-live="polite">—</span>`
          : '';
    html += `<a class="nav-item" data-page="${n.page}" onclick="navTo('${n.page}')"
               role="button" tabindex="0" aria-label="${n.label}">
              <span class="nav-icon" aria-hidden="true">${n.icon}</span>
              <span>${n.label}</span>${badge}
            </a>`;
    if(lastSection && NAV_ITEMS.filter(x=>x.section===n.section && allowed.has(x.page)).slice(-1)[0].page === n.page) {
      html += '</nav>';
    }
  });
  sidebarNav.innerHTML = html;

  // Build bottom nav — only show pages this role can access
  const bottomNav = document.getElementById('bottomNavInner');
  if(bottomNav) {
    bottomNav.innerHTML = BOTTOM_NAV_ITEMS
      .filter(n => allowed.has(n.page))
      .map(n => `
        <button class="bottom-nav-item" data-page="${n.page}" onclick="navTo('${n.page}')"
                aria-label="${n.label}">
          <span class="bottom-nav-icon" aria-hidden="true">${n.icon}</span>
          <span>${n.label}</span>
        </button>`).join('');
  }
}

// ── SHOW APP SHELL ────────────────────────────────────────────
function showAppShell(user) {
  _currentUser = user;

  // Kiosk gets a fullscreen face-scan-only experience — no shell chrome
  if(user.role === 'kiosk') {
    document.getElementById('loginScreen').style.display  = 'none';
    document.getElementById('app-shell').style.display    = 'grid';
    document.getElementById('sidebar').style.display      = 'none';
    const mobileTopbar = document.getElementById('mobileTopbar');
    if(mobileTopbar) mobileTopbar.style.display = 'none';
    const bottomNav = document.getElementById('bottomNav');
    if(bottomNav) bottomNav.style.display = 'none';
    document.getElementById('sidebarNavContainer').innerHTML = '';
    document.getElementById('userName').textContent   = 'Kiosk';
    document.getElementById('userRole').textContent   = 'Kiosk';
    document.getElementById('userAvatar').textContent = 'K';
    return;
  }

  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app-shell').style.display   = 'grid';

  const displayName = user.full_name || user.username;
  document.getElementById('userName').textContent   = displayName;
  document.getElementById('userRole').textContent   =
    user.role.charAt(0).toUpperCase() + user.role.slice(1);
  document.getElementById('userAvatar').textContent =
    displayName.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();

  _buildNav(user);

  // Refresh pending badge for admins
  if(user.role === 'admin') _refreshPendingBadge();
}

function _refreshPendingBadge() {
  API.users.pendingCount().then(r => {
    const el = document.getElementById('pendingBadge');
    if(el) el.textContent = r.count > 0 ? r.count : '';
  }).catch(()=>{});
}

// ── SHOW LOGIN SCREEN ─────────────────────────────────────────
function showLoginScreen() {
  _currentUser = null;
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('app-shell').style.display   = 'none';
  const err = document.getElementById('loginError');
  if(err) err.style.display = 'none';
  const pw = document.getElementById('loginPassword');
  if(pw) pw.value = '';
  // Focus username after a short delay so animation completes
  setTimeout(() => document.getElementById('loginUsername')?.focus(), 120);
}

// ── LOGIN HANDLER ─────────────────────────────────────────────
async function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errBox   = document.getElementById('loginError');
  const btn      = document.getElementById('loginSubmitBtn');

  errBox.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  try {
    const result = await API.auth.login(username, password);
    showAppShell(result);
    if(typeof init === 'function') init(result);
  } catch(e) {
    errBox.textContent  = e.message || 'Invalid credentials';
    errBox.style.display = 'block';
    errBox.setAttribute('role', 'alert');
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginPassword').focus();
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
  return false;
}

// ── LOGOUT ────────────────────────────────────────────────────
async function handleLogout() {
  try { await API.auth.logout(); } catch(e) { /* clear client state regardless */ }
  showLoginScreen();
}

// ── HELPERS ───────────────────────────────────────────────────
function togglePw() {
  const f = document.getElementById('loginPassword');
  f.type = f.type === 'password' ? 'text' : 'password';
}

function toggleSidebar(open) {
  const sidebar  = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if(!sidebar) return;
  sidebar.classList.toggle('sidebar-open', open);
  if(backdrop) backdrop.classList.toggle('sidebar-backdrop-visible', open);
  const hbtn = document.getElementById('hamburgerBtn');
  if(hbtn) hbtn.setAttribute('aria-expanded', String(!!open));
}

// ── ACCOUNT MODAL ─────────────────────────────────────────────
function openAccountMenu(event) {
  if(event) event.stopPropagation();
  const user = _currentUser || {};
  openModal(`
    <div class="modal-header">
      <span class="modal-title">My Account</span>
      <button class="modal-close" onclick="closeModal()" aria-label="Close">✕</button>
    </div>
    <div class="modal-body" style="padding:16px 24px">
      <div style="background:var(--surface);border-radius:10px;padding:14px;margin-bottom:16px">
        <div style="font-family:var(--font-serif);font-size:18px">${user.full_name || user.username}</div>
        <div style="font-size:11px;color:var(--text-3);font-family:var(--font-mono);margin-top:2px">
          @${user.username} · <span style="color:var(--citron)">${(user.role||'').toUpperCase()}</span>
        </div>
      </div>
      ${hasRole('employee') ? `
        <button class="btn btn-ghost" style="width:100%;justify-content:flex-start;margin-bottom:8px" onclick="closeModal();navTo('self')">
          ◈ My Dashboard
        </button>` : ''}
      <button class="btn btn-ghost" style="width:100%;justify-content:flex-start;margin-bottom:8px" onclick="openChangePasswordForm()">
        🔑 Change Password
      </button>
      <button class="btn btn-danger" style="width:100%;justify-content:flex-start" onclick="handleLogout()">
        ↪ Sign Out
      </button>
    </div>`);
}

function openChangePasswordForm() {
  openModal(`
    <div class="modal-header">
      <span class="modal-title">Change Password</span>
      <button class="modal-close" onclick="closeModal()" aria-label="Close">✕</button>
    </div>
    <form class="modal-body" style="padding:20px 24px" onsubmit="return submitChangePassword(event)">
      <div id="cpError" class="login-error" style="display:none" role="alert"></div>
      <div class="form-group">
        <label class="form-label" for="cpCurrent">Current password</label>
        <input class="form-control" id="cpCurrent" type="password" autocomplete="current-password" required>
      </div>
      <div class="form-group">
        <label class="form-label" for="cpNew">New password <span style="color:var(--text-3)">(min 6 chars)</span></label>
        <input class="form-control" id="cpNew" type="password" autocomplete="new-password" minlength="6" required>
      </div>
      <div class="form-group">
        <label class="form-label" for="cpConfirm">Confirm new password</label>
        <input class="form-control" id="cpConfirm" type="password" autocomplete="new-password" minlength="6" required>
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%;margin-top:8px">Update Password</button>
    </form>`);
}

async function submitChangePassword(event) {
  event.preventDefault();
  const current = document.getElementById('cpCurrent').value;
  const next    = document.getElementById('cpNew').value;
  const confirm = document.getElementById('cpConfirm').value;
  const err     = document.getElementById('cpError');
  err.style.display = 'none';
  if(next !== confirm) { err.textContent='Passwords do not match.'; err.style.display='block'; return false; }
  try {
    await API.auth.changePassword(current, next);
    closeModal();
    toast('Password updated successfully', 'success');
  } catch(e) {
    err.textContent = e.message || 'Could not update password.';
    err.style.display = 'block';
  }
  return false;
}

// ── CREATE ACCOUNT (public register flow) ─────────────────────
function openCreateAccountModal() {
  openModal(`
    <div class="modal-header">
      <span class="modal-title">Request Account</span>
      <button class="modal-close" onclick="closeModal()" aria-label="Close">✕</button>
    </div>
    <form class="modal-body" style="padding:20px 24px" onsubmit="return submitRegister(event)">
      <p style="font-size:13px;color:var(--text-2);margin-bottom:18px;line-height:1.6">
        Submit your details and an administrator will activate your account.
        If no admin account exists yet, yours will be created as admin.
      </p>
      <div id="regError" class="login-error" style="display:none" role="alert"></div>
      <div id="regSuccess" style="display:none;padding:12px;background:rgba(0,255,179,0.06);border:1px solid rgba(0,255,179,0.2);border-radius:8px;color:var(--mint);font-size:13px;margin-bottom:12px"></div>
      <div class="form-group">
        <label class="form-label" for="regFullName">Full name</label>
        <input class="form-control" id="regFullName" placeholder="e.g. Brian Omondi" required autocomplete="name">
      </div>
      <div class="form-group">
        <label class="form-label" for="regUsername">Username</label>
        <input class="form-control" id="regUsername" placeholder="e.g. brian_o" required autocomplete="username">
      </div>
      <div class="form-group">
        <label class="form-label" for="regPassword">Password <span style="color:var(--text-3)">(min 6 chars)</span></label>
        <input class="form-control" id="regPassword" type="password" minlength="6" required autocomplete="new-password">
      </div>
      <button type="submit" id="regSubmitBtn" class="btn btn-primary" style="width:100%;margin-top:8px">Submit Request</button>
    </form>`);
}

async function submitRegister(event) {
  event.preventDefault();
  const btn      = document.getElementById('regSubmitBtn');
  const errEl    = document.getElementById('regError');
  const successEl= document.getElementById('regSuccess');
  errEl.style.display = 'none';
  btn.disabled = true; btn.textContent = 'Submitting…';

  try {
    const res = await API.users.register({
      full_name: document.getElementById('regFullName').value.trim(),
      username:  document.getElementById('regUsername').value.trim(),
      password:  document.getElementById('regPassword').value,
    });
    successEl.textContent = res.message;
    successEl.style.display = 'block';
    btn.style.display = 'none';
    // If auto_login, close modal and attempt login
    if(res.auto_login) {
      setTimeout(() => { closeModal(); }, 1800);
    }
  } catch(e) {
    errEl.textContent = e.message || 'Registration failed';
    errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Submit Request';
  }
  return false;
}

// ── BOOT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const me = await API.auth.me();
    if(me.authenticated) {
      showAppShell(me);
      if(typeof init === 'function') init(me);
      return;
    }
  } catch(e) { /* 401 is expected for a logged-out visitor */ }
  showLoginScreen();
});
