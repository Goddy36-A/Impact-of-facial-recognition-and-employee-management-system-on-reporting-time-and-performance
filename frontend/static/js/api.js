// FaceForce Pro — API Client
const API_BASE = '/api';

const API = {
  async _req(method, path, body=null, params=null) {
    let url = API_BASE + path;
    if (params) url += '?' + new URLSearchParams(params);
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  get:    (path, params)  => API._req('GET',    path, null, params),
  post:   (path, body)    => API._req('POST',   path, body),
  put:    (path, body)    => API._req('PUT',     path, body),
  delete: (path)          => API._req('DELETE',  path),

  // Convenience
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
  }
};
