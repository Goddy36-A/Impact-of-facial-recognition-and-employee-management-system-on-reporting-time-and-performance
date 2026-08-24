// FaceForce Pro — API Client
const API_BASE = '/api';

const API = {
  async _req(method, path, body=null, params=null) {
    let url = API_BASE + path;
    if (params) url += '?' + new URLSearchParams(params);
    const opts = {
      method,
      credentials: 'include', // send the session cookie set by /api/auth/login
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);

    if (res.status === 401 && path !== '/auth/me' && path !== '/auth/login') {
      // Session expired or was never established - bounce to the login screen
      // rather than letting every page independently handle this.
      if (typeof window.showLoginScreen === 'function') window.showLoginScreen();
      throw new Error('Session expired. Please log in again.');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  get:    (path, params)  => API._req('GET',    path, null, params),
  post:   (path, body)    => API._req('POST',   path, body),
  put:    (path, body)    => API._req('PUT',     path, body),
  delete: (path)          => API._req('DELETE',  path),

  // Convenience
  auth: {
    login:  (username, password) => API.post('/auth/login', {username, password}),
    logout: ()   => API.post('/auth/logout'),
    me:     ()   => API.get('/auth/me'),
    changePassword: (current_password, new_password) =>
      API.post('/auth/change-password', {current_password, new_password}),
  },
  employees: {
    list:    (p) => API.get('/employees/', p),
    get:     (id)=> API.get(`/employees/${id}`),
    create:  (d) => API.post('/employees/', d),
    update:  (id,d) => API.put(`/employees/${id}`, d),
    delete:  (id)=> API.delete(`/employees/${id}`),
    stats:   ()  => API.get('/employees/stats/summary'),
  },
  attendance: {
    list:    (p) => API.get('/attendance/', p),
    checkin: (d) => API.post('/attendance/checkin', d),
    update:  (id,d) => API.put(`/attendance/${id}`, d),
    delete:  (id)=> API.delete(`/attendance/${id}`),
    history: (id)=> API.get(`/attendance/history/${id}`),
    exportUrl: (date) => `/api/attendance/export?date=${date}`,
  },
  recognition: {
    register:    (d) => API.post('/recognition/register', d),
    identify:    (d) => API.post('/recognition/identify', d),
    status:      ()  => API.get('/recognition/status'),
    unregistered:()  => API.get('/recognition/unregistered'),
  },
  departments: {
    list:   ()      => API.get('/departments/'),
    create: (d)     => API.post('/departments/', d),
    update: (id,d)  => API.put(`/departments/${id}`, d),
    delete: (id)    => API.delete(`/departments/${id}`),
  },
  shifts: {
    list:   ()     => API.get('/shifts/'),
    create: (d)    => API.post('/shifts/', d),
    assign: (d)    => API.post('/shifts/assign', d),
  },
  payroll: {
    list:    (p)   => API.get('/payroll/', p),
    process: (d)   => API.post('/payroll/process', d),
    summary: (p)   => API.get('/payroll/summary', {period: p}),
  },
  reports: {
    attendance: (days) => API.get('/reports/attendance-summary', {days}),
    absentees:  ()     => API.get('/reports/top-absentees'),
    overtime:   ()     => API.get('/reports/overtime'),
    payrollTrend: ()   => API.get('/reports/payroll-trend'),
  },
  users: {
    list:           ()       => API.get('/users/'),
    get:            (id)     => API.get(`/users/${id}`),
    create:         (d)      => API.post('/users/', d),
    update:         (id, d)  => API.put(`/users/${id}`, d),
    delete:         (id)     => API.delete(`/users/${id}`),
    register:       (d)      => API.post('/users/register', d),  // public
    myProfile:      ()       => API.get('/users/me/profile'),
    pendingCount:   ()       => API.get('/users/pending/count'),
  },
};
