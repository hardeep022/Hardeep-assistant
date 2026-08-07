const API_BASE = 'http://127.0.0.1:8599/api';

/**
 * Get stored auth token.
 */
function getToken() {
  return localStorage.getItem('nova_token');
}

/**
 * Make an authenticated API request.
 */
async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) return null;

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || `Request failed with status ${response.status}`);
  }

  return data;
}

// ── Auth API ──

export async function apiRegister(username, displayName, password, language = 'en') {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username,
      display_name: displayName,
      password,
      language,
    }),
  });
}

export async function apiLogin(username, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

// ── Chat API ──

export async function apiSendMessage(message, conversationId = null, mode = 'general') {
  return request('/chat/message', {
    method: 'POST',
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
      mode,
    }),
  });
}

// ── Tasks API ──

export async function apiGetTasks(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.due) params.set('due', filters.due);
  const query = params.toString();
  return request(`/tasks${query ? '?' + query : ''}`);
}

export async function apiCreateTask(task) {
  return request('/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  });
}

export async function apiUpdateTask(taskId, updates) {
  return request(`/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function apiCompleteTask(taskId) {
  return request(`/tasks/${taskId}/complete`, { method: 'PATCH' });
}

export async function apiDeleteTask(taskId) {
  return request(`/tasks/${taskId}`, { method: 'DELETE' });
}

// ── Conversations API ──

export async function apiGetConversations(page = 1, search = '') {
  const params = new URLSearchParams({ page, limit: 20 });
  if (search) params.set('search', search);
  return request(`/conversations?${params}`);
}

export async function apiGetConversation(id) {
  return request(`/conversations/${id}`);
}

export async function apiDeleteConversation(id) {
  return request(`/conversations/${id}`, { method: 'DELETE' });
}

// ── Health ──

export async function apiHealthCheck() {
  return request('/health');
}
