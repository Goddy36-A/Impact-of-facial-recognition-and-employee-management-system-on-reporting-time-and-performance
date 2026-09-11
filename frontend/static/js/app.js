// FaceForce Pro — App Router & Init

const PAGES = {
  dashboard:   renderDashboard,
  recognition: renderRecognition,
  register:    renderRegister,
  employees:   renderEmployees,
  departments: renderDepartments,
  shifts:      renderShifts,
  attendance:  renderAttendance,
  payroll:     renderPayroll,
  reports:     renderReports,
  users:       renderUsers,       // admin only
  self:        renderSelfService, // employee self-service
};

const PAGE_NAMES = {
  dashboard:   'Dashboard',
  recognition: 'Face Scan',
  register:    'Register Face',
  employees:   'Employees',
  departments: 'Departments',
  shifts:      'Shifts',
  attendance:  'Attendance',
  payroll:     'Payroll',
  reports:     'Reports',
  users:       'User Accounts',
  self:        'My Dashboard',
};

// Pages that each role is permitted to visit. Admin bypasses all checks.
const ROLE_PAGES = {
  hr:         new Set(['dashboard','recognition','register','employees','departments','shifts','attendance','reports']),
  finance:    new Set(['dashboard','payroll','reports']),
  supervisor: new Set(['dashboard','attendance','reports']),
  employee:   new Set(['self']),
  kiosk:      new Set(['recognition']),
};

let _currentPage = null;

// navTo() — public entry point: closes mobile sidebar first
function navTo(pageName) {
  if(typeof toggleSidebar === 'function') toggleSidebar(false);
  navigate(pageName);
}

function navigate(pageName) {
  const [page] = pageName.split('?');

  // Role gate: non-admin users are blocked from pages outside their set
  const user = typeof currentUser === 'function' ? currentUser() : null;
  if(user && user.role !== 'admin') {
    const allowed = ROLE_PAGES[user.role];
    if(allowed && !allowed.has(page)) {
      toast('You do not have permission to view that page.', 'warning');
      return;
    }
  }

  if(_currentPage === page) return;
  _currentPage = page;

  setActiveNav(page);
  _updateMobileChrome(page);

  const content = document.getElementById('page-content');
  content.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:center;height:50vh">' +
    '<div class="spinner" style="width:32px;height:32px;border-width:2px"></div></div>';

  const renderer = PAGES[page];
  if(renderer) {
    try { renderer(); }
    catch(e) {
      console.error('Page render error:', e);
      content.innerHTML = `<div class="empty-state" style="margin-top:80px">
        <div class="empty-icon">⚠</div>
        <p>Could not load this page.</p>
        <p style="font-size:11px;color:var(--text-3)">${e.message}</p>
        <button class="btn btn-ghost" style="margin-top:16px" onclick="navigate('${page}')">Retry</button>
      </div>`;
    }
  } else {
    content.innerHTML =
      `<div class="empty-state" style="margin-top:80px"><div class="empty-icon">?</div>Page not found: ${page}</div>`;
  }

  window.history.pushState({page}, '', `#${pageName}`);
}

function _updateMobileChrome(page) {
  // Mobile topbar page name
  const namEl = document.getElementById('mobilePageName');
  if(namEl) namEl.textContent = PAGE_NAMES[page] || '';

  // Desktop topbar page title
  const titleEl = document.getElementById('topbarPageTitle');
  if(titleEl) titleEl.textContent = PAGE_NAMES[page] || 'FaceForce Pro';

  // Hamburger aria-expanded
  const hbtn = document.getElementById('hamburgerBtn');
  if(hbtn) hbtn.setAttribute('aria-expanded', 'false');

  // Bottom nav active state
  document.querySelectorAll('.bottom-nav-item').forEach(btn => {
    const active = btn.dataset.page === page;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  // Sidebar nav aria-current
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
    if(el.dataset.page === page) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
}

function init(user) {
  startClock();

  // Kiosk goes straight to recognition — no hash routing
  if(user && user.role === 'kiosk') {
    navigate('recognition');
    return;
  }

  // Employee self-service goes straight to their dashboard
  if(user && user.role === 'employee') {
    navigate('self');
    return;
  }

  // All other roles: route from hash or role landing page
  const cfg     = (typeof ROLE_CONFIG !== 'undefined' && ROLE_CONFIG[user?.role]) || {};
  const landing = cfg.landing || 'dashboard';
  const hash    = window.location.hash.slice(1) || landing;
  navigate(hash);

  window.addEventListener('popstate', e => {
    if(e.state?.page) navigate(e.state.page);
  });

  // / shortcut focuses nearest search box
  document.addEventListener('keydown', e => {
    if(e.key === '/' && !['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      const s = document.querySelector('#empSearch, #attSearch, #userSearch');
      if(s) s.focus();
    }
    if(e.key === 'Escape') closeModal();
  });

  console.log('%cFaceForce Pro v2 — Role: ' + (user?.role || 'unknown'),
    'color:#e2ff00;font-weight:bold;font-size:13px');
}
