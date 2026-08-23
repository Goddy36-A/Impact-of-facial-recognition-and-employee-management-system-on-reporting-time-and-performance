// FaceForce Pro — UI Utilities  (v2 — HCI overhaul)

// ─── CLOCK ────────────────────────────────────────────────────
function startClock() {
  const el = document.getElementById('sidebarClock');
  const tick = () => { if(el) el.textContent = new Date().toTimeString().slice(0,8); };
  tick(); setInterval(tick, 1000);
}

// ─── TOAST ────────────────────────────────────────────────────
// Toasts are now dismissible and announce themselves to screen readers.
function toast(msg, type='info', duration=3800) {
  let container = document.getElementById('toastContainer');
  if(!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', 'Notifications');
    document.body.appendChild(container);
  }

  const icons = { success:'✓', error:'✗', warning:'!', info:'ℹ' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
  el.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icons[type]||'ℹ'}</span>
    <span class="toast-msg">${msg}</span>
    <button class="toast-close" onclick="this.parentElement.remove()" aria-label="Dismiss notification">×</button>`;
  container.appendChild(el);

  // Auto-dismiss
  const timer = setTimeout(() => _dismissToast(el), duration);
  el.querySelector('.toast-close').addEventListener('click', () => clearTimeout(timer));
}

function _dismissToast(el) {
  if(!el || !el.isConnected) return;
  el.style.transition = 'opacity 0.3s, transform 0.3s';
  el.style.opacity = '0';
  el.style.transform = 'translateX(110%)';
  setTimeout(() => el.remove(), 310);
}

// ─── MODAL ────────────────────────────────────────────────────
// Stores the element that had focus before the modal opened, so we can
// restore it when the modal closes (WCAG 2.4.3 Focus Order).
let _modalPreviousFocus = null;

function openModal(html) {
  const backdrop = document.getElementById('modalBackdrop');
  const box      = document.getElementById('modalBox');
  if(!backdrop || !box) return;

  _modalPreviousFocus = document.activeElement;

  box.innerHTML = html;
  backdrop.style.display = 'flex';
  backdrop.setAttribute('aria-hidden', 'false');

  // Make modal box accessible
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');

  // Find and set the dialog label from its .modal-title if present
  const titleEl = box.querySelector('.modal-title');
  if(titleEl) {
    if(!titleEl.id) titleEl.id = 'modal-title-' + Date.now();
    box.setAttribute('aria-labelledby', titleEl.id);
  }

  // Fix any raw "x" close buttons — give them a proper label
  box.querySelectorAll('.modal-close').forEach(btn => {
    if(!btn.getAttribute('aria-label')) btn.setAttribute('aria-label', 'Close dialog');
    btn.textContent = '✕';
  });

  // Focus the first interactive element inside the modal
  requestAnimationFrame(() => {
    const first = box.querySelector('input, select, textarea, button:not([disabled])');
    if(first) first.focus();
    else box.setAttribute('tabindex', '-1'), box.focus();
  });

  // Close on backdrop click
  backdrop.onclick = (e) => { if(e.target === backdrop) closeModal(); };

  // Trap Tab focus inside the modal
  backdrop.addEventListener('keydown', _modalKeyHandler);
}

function closeModal() {
  const backdrop = document.getElementById('modalBackdrop');
  const box      = document.getElementById('modalBox');
  if(!backdrop) return;

  backdrop.style.display = 'none';
  backdrop.setAttribute('aria-hidden', 'true');
  backdrop.removeEventListener('keydown', _modalKeyHandler);
  if(box) box.innerHTML = '';

  // Restore focus to the element that triggered the modal
  if(_modalPreviousFocus && typeof _modalPreviousFocus.focus === 'function') {
    _modalPreviousFocus.focus();
    _modalPreviousFocus = null;
  }
}

function _modalKeyHandler(e) {
  const box = document.getElementById('modalBox');
  if(!box) return;

  // Escape closes
  if(e.key === 'Escape') { e.preventDefault(); closeModal(); return; }

  // Tab wraps within the modal (focus trap)
  if(e.key === 'Tab') {
    const focusable = Array.from(box.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ));
    if(!focusable.length) { e.preventDefault(); return; }
    const first = focusable[0], last = focusable[focusable.length - 1];
    if(e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

// ─── FORMAT HELPERS ────────────────────────────────────────────
function fmt(n, decimals=0) {
  if(n == null) return '—';
  return Number(n).toLocaleString('en-UG', { maximumFractionDigits: decimals });
}

function fmtCurrency(n, currency='UGX') {
  if(n == null) return '—';
  return currency + ' ' + fmt(n);
}

function fmtDate(iso) {
  if(!iso) return '—';
  return new Date(iso).toLocaleDateString('en-UG', { day:'2-digit', month:'short', year:'numeric' });
}

function fmtTime(iso) {
  if(!iso) return '—';
  const t = iso.includes('T') ? iso.split('T')[1] : iso;
  return t.slice(0, 5);
}

function fmtDuration(checkIn, checkOut) {
  if(!checkIn || !checkOut) return checkIn ? '<span class="tag tag-mint">Active</span>' : '—';
  const ms = new Date(checkOut) - new Date(checkIn);
  const h  = Math.floor(ms / 3600000);
  const m  = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function initials(name) {
  return (name || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function statusTag(status) {
  const map = {
    active:    'tag-mint',
    inactive:  'tag-coral',
    present:   'tag-mint',
    absent:    'tag-coral',
    late:      'tag-amber',
    draft:     'tag-muted',
    processed: 'tag-mint',
    male:      'tag-peri',
    female:    'tag-amber',
  };
  return `<span class="tag ${map[status] || 'tag-muted'}">${status || '—'}</span>`;
}

function avatar(name, photo, size='') {
  const cls = `avatar${size ? ' avatar-' + size : ''}`;
  if(photo) return `<div class="${cls}"><img src="${photo}" alt="${name} photo"/></div>`;
  return `<div class="${cls}" aria-label="${name}" role="img">${initials(name)}</div>`;
}

function deptColor(color) { return color || '#7b8fff'; }

// ─── CONFIRM DIALOG (replaces bare window.confirm) ────────────
// Returns a Promise<boolean> so callers can await it.
// Uses our modal so it inherits the focus trap and Escape handling.
function confirmDialog(message, danger=false) {
  return new Promise(resolve => {
    openModal(`
      <div class="modal-header">
        <span class="modal-title">${danger ? '⚠ Confirm Delete' : 'Confirm'}</span>
        <button class="modal-close" onclick="closeModal()" aria-label="Close dialog">✕</button>
      </div>
      <div class="modal-body" style="padding:20px 24px">
        <p style="color:var(--text-2);line-height:1.6">${message}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="confirmNo">Cancel</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirmYes">${danger ? 'Delete' : 'Confirm'}</button>
      </div>`);
    document.getElementById('confirmYes').onclick = () => { closeModal(); resolve(true);  };
    document.getElementById('confirmNo' ).onclick = () => { closeModal(); resolve(false); };
  });
}

// ─── PAGINATION ───────────────────────────────────────────────
function paginate(total, page, perPage, onPage) {
  const pages = Math.ceil(total / perPage);
  if(pages <= 1) return '';
  let html = '<nav class="pagination" aria-label="Pagination">';
  // Prev
  html += `<button class="page-btn" ${page===1?'disabled':''} onclick="${onPage}(${page-1})" aria-label="Previous page">‹</button>`;
  // Page numbers — show at most 7 around current page
  for(let i = 1; i <= pages; i++) {
    if(pages > 9 && Math.abs(i - page) > 3 && i !== 1 && i !== pages) {
      if(i === page - 4 || i === page + 4) html += `<span class="page-ellipsis">…</span>`;
      continue;
    }
    html += `<button class="page-btn${i===page?' active':''}" onclick="${onPage}(${i})" aria-label="Page ${i}" ${i===page?'aria-current="page"':''}>${i}</button>`;
  }
  // Next
  html += `<button class="page-btn" ${page===pages?'disabled':''} onclick="${onPage}(${page+1})" aria-label="Next page">›</button>`;
  html += '</nav>';
  return html;
}

// ─── NAVIGATION ACTIVE STATE ──────────────────────────────────
function setActiveNav(page) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
}

// ─── PROGRESS BAR ─────────────────────────────────────────────
function progressBar(pct, color='var(--citron)', label='') {
  const clamped = Math.min(100, Math.max(0, pct));
  return `<div class="bar-chart-track" role="progressbar" aria-valuenow="${clamped}" aria-valuemin="0" aria-valuemax="100" aria-label="${label || pct+'%'}">
    <div class="bar-chart-fill" style="width:${clamped}%;background:${color}"></div>
  </div>`;
}

// ─── LOADING SKELETON ROWS ────────────────────────────────────
function loadingRows(cols=5, rows=5) {
  return Array(rows).fill(
    `<tr aria-hidden="true">${Array(cols).fill('<td><div class="skeleton" style="height:14px;width:80%"></div></td>').join('')}</tr>`
  ).join('');
}

// ─── EMPTY STATE HELPER ───────────────────────────────────────
function emptyState(icon='○', message='No data found', colspan=6) {
  return `<tr><td colspan="${colspan}">
    <div class="empty-state" role="status">
      <div class="empty-icon" aria-hidden="true">${icon}</div>
      <span>${message}</span>
    </div>
  </td></tr>`;
}

// ─── PAGINATION + PAGE-BTN STYLES (injected once) ─────────────
const _paginationStyle = document.createElement('style');
_paginationStyle.textContent = `
.pagination {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 14px;
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
}
.page-btn {
  background: var(--obsidian3);
  border: 1px solid var(--border);
  color: var(--text-2);
  padding: 5px 11px;
  border-radius: 6px;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 11px;
  min-width: 32px;
  min-height: 32px;
  transition: all 0.12s;
}
.page-btn.active {
  background: var(--citron);
  color: #000;
  border-color: var(--citron);
  font-weight: 700;
}
.page-btn:hover:not(.active):not(:disabled) {
  border-color: var(--border2);
  color: var(--text);
}
.page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.page-ellipsis { color: var(--text-3); font-size: 12px; padding: 0 4px; }

/* Toast dismiss button */
.toast-close {
  background: none;
  border: none;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  font-size: 16px;
  padding: 0 0 0 8px;
  margin-left: auto;
  line-height: 1;
  flex-shrink: 0;
}
.toast-close:hover { opacity: 1; }
`;
document.head.appendChild(_paginationStyle);
