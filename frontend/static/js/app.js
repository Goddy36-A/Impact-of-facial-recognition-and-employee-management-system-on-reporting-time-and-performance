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

let _currentPage = null;

function navigate(pageName) {
  const [page] = pageName.split('?');
  if(_currentPage === page) return;
  _currentPage = page;

  setActiveNav(page);

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

  console.log('%cFaceForce Pro v2.0 — Loaded', 'color:#e2ff00;font-weight:bold;font-size:14px');
}

document.addEventListener('DOMContentLoaded', init);
