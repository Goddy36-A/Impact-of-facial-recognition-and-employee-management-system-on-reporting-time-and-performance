// FaceForce Pro — Auth gate & mobile sidebar toggle

function showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('app-shell').style.display = 'none';
  const err = document.getElementById('loginError');
  if (err) err.style.display = 'none';
  const pwField = document.getElementById('loginPassword');
  if (pwField) pwField.value = '';
}

function showAppShell(user) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app-shell').style.display = 'grid';

  document.getElementById('userName').textContent = user.username;
  document.getElementById('userRole').textContent =
    user.role.charAt(0).toUpperCase() + user.role.slice(1);
  document.getElementById('userAvatar').textContent = user.username.charAt(0).toUpperCase();
}

async function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errBox = document.getElementById('loginError');
  const btn = document.getElementById('loginSubmitBtn');

  errBox.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  try {
    const result = await API.auth.login(username, password);
    showAppShell(result);
    if (typeof init === 'function') init();
  } catch (e) {
    errBox.textContent = e.message || 'Invalid credentials';
    errBox.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
  return false;
}

async function handleLogout() {
  try { await API.auth.logout(); } catch (e) { /* ignore - clearing client state regardless */ }
  showLoginScreen();
}

function togglePw() {
  const field = document.getElementById('loginPassword');
  field.type = field.type === 'password' ? 'text' : 'password';
}

function toggleSidebar(open) {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!sidebar) return;
  sidebar.classList.toggle('sidebar-open', open);
  if (backdrop) backdrop.classList.toggle('sidebar-backdrop-visible', open);
}

function openAccountMenu(event) {
  event.stopPropagation();
  openModal(`
    <div class="modal-header">
      <span class="modal-title">Account</span>
      <button class="modal-close" onclick="closeModal()">x</button>
    </div>
    <div class="modal-body">
      <button class="btn" style="width:100%;justify-content:flex-start;margin-bottom:10px" onclick="openChangePasswordForm()">
        🔑 Change password
      </button>
      <button class="btn" style="width:100%;justify-content:flex-start" onclick="handleLogout()">
        ↪ Log out
      </button>
    </div>
  `);
}

function openChangePasswordForm() {
  openModal(`
    <div class="modal-header">
      <span class="modal-title">Change Password</span>
      <button class="modal-close" onclick="closeModal()">x</button>
    </div>
    <form class="modal-body" onsubmit="return submitChangePassword(event)">
      <div id="cpError" class="login-error" style="display:none"></div>
      <div class="form-group">
        <label>Current password</label>
        <input class="form-control" id="cpCurrent" type="password" autocomplete="current-password" required>
      </div>
      <div class="form-group">
        <label>New password (min 8 characters)</label>
        <input class="form-control" id="cpNew" type="password" autocomplete="new-password" minlength="8" required>
      </div>
      <div class="form-group">
        <label>Confirm new password</label>
        <input class="form-control" id="cpConfirm" type="password" autocomplete="new-password" minlength="8" required>
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%">Update password</button>
    </form>
  `);
}

async function submitChangePassword(event) {
  event.preventDefault();
  const current = document.getElementById('cpCurrent').value;
  const next = document.getElementById('cpNew').value;
  const confirm = document.getElementById('cpConfirm').value;
  const err = document.getElementById('cpError');
  err.style.display = 'none';

  if (next !== confirm) {
    err.textContent = 'New passwords do not match.';
    err.style.display = 'block';
    return false;
  }
  try {
    await API.auth.changePassword(current, next);
    closeModal();
    if (typeof toast === 'function') toast('Password updated', 'success');
  } catch (e) {
    err.textContent = e.message || 'Could not update password.';
    err.style.display = 'block';
  }
  return false;
}

// On load: ask the backend if we already have a valid session (e.g. page refresh)
// before deciding whether to show the login screen or the app itself.
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const me = await API.auth.me();
    if (me.authenticated) {
      showAppShell(me);
      if (typeof init === 'function') init();
      return;
    }
  } catch (e) {
    // 401 is expected here for a logged-out visitor - fall through to login screen
  }
  showLoginScreen();
});
