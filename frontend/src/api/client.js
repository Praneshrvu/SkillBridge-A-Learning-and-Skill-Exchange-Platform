/**
 * SkillBridge API client.
 * All requests go through /api (proxied to FastAPI backend in dev via vite.config.js).
 */

export const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('skillbridge_token');
}

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(method, path, body = null) {
  const opts = { method, headers: authHeaders() };
  if (body !== null) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try { const err = await res.json(); detail = err.detail || detail; } catch (_) {}
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  put:    (path, body)  => request('PUT',    path, body),
  patch:  (path, body)  => request('PATCH',  path, body),
  delete: (path)        => request('DELETE', path),
};

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login:    (email, password) => api.post('/auth/login', { email, password }),
  register: (data)            => api.post('/auth/register', data),
  me:       ()                => api.get('/auth/me'),
  updateMe: (data)            => api.put('/auth/me', data),
};

// ── Skills ───────────────────────────────────────────────────────────────────
export const skillsApi = {
  masterList: () => api.get('/skills'),
  catalog: (params = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined))
    ).toString();
    return api.get(`/skills/catalog${q ? `?${q}` : ''}`);
  },
  mySkills:     ()     => api.get('/skills/my-skills'),
  addSkill:     (data) => api.post('/skills/my-skills', data),
  deleteSkill:  (id)   => api.delete(`/skills/my-skills/${id}`),
  barterMatches: ()    => api.get('/skills/match'),
};

// ── Questions ────────────────────────────────────────────────────────────────
export const questionsApi = {
  list: (params = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ''))
    ).toString();
    return api.get(`/questions${q ? `?${q}` : ''}`);
  },
  contribute: (data) => api.post('/questions', data),
  vote:       (id)   => api.post(`/questions/${id}/vote`, {}),
};

// ── Company Mentors ──────────────────────────────────────────────────────────
export const mentorsApi = {
  list: (params = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ''))
    ).toString();
    return api.get(`/company-mentors${q ? `?${q}` : ''}`);
  },
  questions: () => api.get('/company-mentors/questions'),
  ask:   (data)             => api.post('/company-mentors/ask', data),
  reply: (id, mentor_response) =>
    api.post(`/company-mentors/questions/${id}/reply`, { mentor_response }),
};

// ── Exchanges ────────────────────────────────────────────────────────────────
export const exchangesApi = {
  list:         ()               => api.get('/exchanges'),
  create:       (data)           => api.post('/exchanges', data),
  updateStatus: (id, status)     => api.patch(`/exchanges/${id}/status`, { status }),
  payment:      (id, action)     => api.post(`/exchanges/${id}/payment`, { action, payment_method: 'WALLET_ESCROW' }),
  review:       (id, rating, comment) => api.post(`/exchanges/${id}/review`, { rating, comment }),
};

// ── Chat ─────────────────────────────────────────────────────────────────────
export const chatApi = {
  conversations:    ()                         => api.get('/chat/conversations'),
  thread:           (userId)                   => api.get(`/chat/conversations/${userId}`),
  send:             (receiver_id, content)     => api.post('/chat/messages', { receiver_id, content }),
  directory:        ()                         => api.get('/chat/users-directory'),
  communityChannels: ()                        => api.get('/chat/community/channels'),
  communityMessages: (channel, limit = 60)     => api.get(`/chat/community/messages?channel=${channel}&limit=${limit}`),
  sendCommunity:    (channel, content)         => api.post('/chat/community/messages', { channel, content }),
};
