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
};

// Human-readable page names for mobile topbar
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
};

let _currentPage = null;

// navTo() is the public entry point used by nav items.
// It closes the mobile sidebar before navigating, giving immediate
// visual feedback that the tap was registered before the new page loads.
function navTo(pageName) {
  // Close mobile sidebar/backdrop
  if(typeof toggleSidebar === 'function') toggleSidebar(false);
  navigate(pageName);
}

function navigate(pageName) {
  const [page] = pageName.split('?');
  if(_currentPage === page) return;
  _currentPage = page;

  setActiveNav(page);
  _updateMobileChrome(page);

  const renderer = PAGES[page];
  if(renderer) {
    document.getElementById('page-content').innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:50vh"><div class="spinner" style="width:32px;height:32px;border-width:2px"></div></div>';
    try { renderer(); }
    catch(e) { console.error('Page render error:', e); toast('Page load error: '+e.message,'error'); }
  } else {
    document.getElementById('page-content').innerHTML =
      `<div class="empty-state" style="margin-top:80px"><div class="empty-icon">?</div>Page not found: ${page}</div>`;
  }

  window.history.pushState({page}, '', `#${pageName}`);
}

// Update mobile topbar page name and bottom nav active state
function _updateMobileChrome(page) {
  // Topbar subtitle
  const namEl = document.getElementById('mobilePageName');
  if(namEl) namEl.textContent = PAGE_NAMES[page] || '';

  // Sidebar aria-expanded on hamburger
  const hbtn = document.getElementById('hamburgerBtn');
  if(hbtn) hbtn.setAttribute('aria-expanded', 'false');

  // Bottom nav active item
  document.querySelectorAll('.bottom-nav-item').forEach(btn => {
    const active = btn.dataset.page === page;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  // Sidebar nav aria-current
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    if(el.dataset.page === page) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
}

function init() {
  startClock();

  // Route from hash
  const hash = window.location.hash.slice(1) || 'dashboard';
  navigate(hash);

  window.addEventListener('popstate', e => {
    if(e.state?.page) navigate(e.state.page);
  });

  // Keyboard shortcut: / to focus search
  document.addEventListener('keydown', e => {
    if(e.key==='/' && document.activeElement.tagName!=='INPUT' && document.activeElement.tagName!=='SELECT') {
      e.preventDefault();
      const s = document.getElementById('empSearch')||document.getElementById('attSearch');
      if(s) s.focus();
    }
    if(e.key==='Escape') closeModal();
  });

  console.log('%cFaceForce Pro — Loaded', 'color:#e2ff00;font-weight:bold;font-size:14px');
}

// NOTE: init() is deliberately NOT auto-run on DOMContentLoaded here.
// auth.js owns that decision - it checks session status first and only calls
// init() once a valid, authenticated session is confirmed (either an existing
// one on page load, or a fresh one right after a successful login). Auto-running
// init() unconditionally here would let the SPA start fetching protected data
// and rendering pages before the user has actually logged in.
