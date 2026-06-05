// FaceForce Pro — UI Utilities

// ─── CLOCK ────────────────────────────────────────────────────
function startClock() {
  const el = document.getElementById('sidebarClock');
  const tick = () => { if(el) el.textContent = new Date().toTimeString().slice(0,8); };
  tick(); setInterval(tick, 1000);
}

// ─── TOAST ────────────────────────────────────────────────────
function toast(msg, type='info', duration=3500) {
  const container = document.getElementById('toastContainer');
  const icons = { success:'✓', error:'✗', warning:'!', info:'ℹ' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ'}</span><span class="toast-msg">${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'all 0.3s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(100%)';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ─── MODAL ────────────────────────────────────────────────────
function openModal(html) {
  const backdrop = document.getElementById('modalBackdrop');
  const box = document.getElementById('modalBox');
  box.innerHTML = html;
  backdrop.style.display = 'flex';
  backdrop.onclick = (e) => { if(e.target===backdrop) closeModal(); };
}

function closeModal() {
  document.getElementById('modalBackdrop').style.display = 'none';
  document.getElementById('modalBox').innerHTML = '';
}

// ─── FORMAT HELPERS ────────────────────────────────────────────
function fmt(n, decimals=0) {
  if(n==null) return '—';
  return Number(n).toLocaleString('en-UG', {maximumFractionDigits: decimals});
}

function fmtCurrency(n, currency='UGX') {
  if(n==null) return '—';
  return currency + ' ' + fmt(n);
}

function fmtDate(iso) {
  if(!iso) return '—';
  return new Date(iso).toLocaleDateString('en-UG', {day:'2-digit',month:'short',year:'numeric'});
}

function fmtTime(iso) {
  if(!iso) return '—';
  const t = iso.includes('T') ? iso.split('T')[1] : iso;
  return t.slice(0,5);
}

function fmtDuration(checkIn, checkOut) {
  if(!checkIn || !checkOut) return checkIn ? 'Active' : '—';
  const ms = new Date(checkOut) - new Date(checkIn);
  const h = Math.floor(ms/3600000);
  const m = Math.floor((ms%3600000)/60000);
  return `${h}h ${m}m`;
}

function initials(name) {
  return (name||'').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
}

function statusTag(status) {
  const map = {
    active:   'tag-mint',
    inactive: 'tag-coral',
    present:  'tag-mint',
    absent:   'tag-coral',
    draft:    'tag-muted',
    processed:'tag-mint',
    male:     'tag-peri',
    female:   'tag-amber',
  };
  return `<span class="tag ${map[status]||'tag-muted'}">${status||'—'}</span>`;
}

function avatar(name, photo, size='') {
  const cls = `avatar${size?' avatar-'+size:''}`;
  if(photo) return `<div class="${cls}"><img src="${photo}"/></div>`;
  return `<div class="${cls}">${initials(name)}</div>`;
}

function deptColor(color) {
  return color || '#7b8fff';
}

// ─── PAGINATION ───────────────────────────────────────────────
function paginate(total, page, perPage, onPage) {
  const pages = Math.ceil(total/perPage);
  if(pages<=1) return '';
  let html = '<div class="pagination">';
  for(let i=1;i<=pages;i++) {
    html += `<button class="page-btn${i===page?' active':''}" onclick="${onPage}(${i})">${i}</button>`;
  }
  html += '</div>';
  return html;
}

// ─── NAVIGATION ACTIVE STATE ──────────────────────────────────
function setActiveNav(page) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
}

// ─── PROGRESS BAR ─────────────────────────────────────────────
function progressBar(pct, color='var(--citron)') {
  return `<div class="bar-chart-track"><div class="bar-chart-fill" style="width:${pct}%;background:${color}"></div></div>`;
}

// ─── LOADING STATE ────────────────────────────────────────────
function loadingRows(cols=5, rows=5) {
  return Array(rows).fill(`<tr>${Array(cols).fill('<td><div class="skeleton" style="height:14px;width:80%"></div></td>').join('')}</tr>`).join('');
}

// Pagination styles inline
const paginationStyle = document.createElement('style');
paginationStyle.textContent = `
.pagination { display:flex; gap:4px; padding:12px 14px; border-top:1px solid var(--border); }
.page-btn { background:var(--obsidian3); border:1px solid var(--border); color:var(--text-2); padding:4px 10px; border-radius:6px; cursor:pointer; font-family:var(--font-mono); font-size:11px; }
.page-btn.active { background:var(--citron); color:#000; border-color:var(--citron); font-weight:700; }
.page-btn:hover:not(.active) { border-color:var(--border2); color:var(--text); }
`;
document.head.appendChild(paginationStyle);
