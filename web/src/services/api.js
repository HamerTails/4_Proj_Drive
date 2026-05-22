var API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api';

function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  var token = getToken();
  var h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = 'Bearer ' + token;
  return h;
}

function authHeadersRaw() {
  var token = getToken();
  var h = {};
  if (token) h['Authorization'] = 'Bearer ' + token;
  return h;
}

async function request(method, path, body, options) {
  var url = API_URL + path;
  var opts = {
    method: method,
    headers: authHeaders(),
    ...options,
  };

  if (body && !(body instanceof FormData)) {
    opts.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    opts.headers = authHeadersRaw();
    opts.body = body;
  }

  var res = await fetch(url, opts);

  // 401/403 = session invalide -> logout et redirect login.
  // Sauf sur les endpoints d'auth eux-memes ou un 401/403 = mauvaises credentials,
  // pas une session expiree, et l'erreur doit etre affichee dans le form.
  var isAuthEndpoint = path.startsWith('/auth/login') || path.startsWith('/auth/register');
  if (!isAuthEndpoint && (res.status === 401 || res.status === 403)) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expirée');
  }

  if (!res.ok) {
    var errData = null;
    try { errData = await res.json(); } catch (e) { /* pas de JSON */ }
    var err = new Error(errData?.error || 'Erreur ' + res.status);
    err.response = { status: res.status, data: errData };
    throw err;
  }

  var contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return res;
}

// --- Auth ---

export var authService = {
  register: async function (email, password) {
    var data = await request('POST', '/auth/register', { email: email, password: password });
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },
  login: async function (email, password) {
    var data = await request('POST', '/auth/login', { email: email, password: password });
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },
  logout: function () {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  getCurrentUser: function () {
    var user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  isAuthenticated: function () {
    return !!localStorage.getItem('token');
  },
};

// --- Files ---

export var fileService = {
  getNodes: async function (parentId) {
    var q = parentId ? '?parent_id=' + parentId : '';
    var data = await request('GET', '/nodes' + q);
    return data.nodes;
  },

  getPath: async function (nodeId) {
    var data = await request('GET', '/nodes/breadcrumb?id=' + nodeId);
    return data.path;
  },

  createFolder: async function (name, parentId) {
    return request('POST', '/nodes/folder', { name: name, parent_id: parentId || null });
  },

  uploadFile: async function (file, parentId, onProgress) {
    var fd = new FormData();
    fd.append('file', file);
    if (parentId) fd.append('parent_id', parentId);

    // fetch ne supporte pas onUploadProgress nativement
    // On utilise XMLHttpRequest pour la progression
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', API_URL + '/files/upload');

      var token = getToken();
      if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);

      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      };

      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          var errData = null;
          try { errData = JSON.parse(xhr.responseText); } catch (e) {}
          var err = new Error(errData?.error || 'Erreur upload');
          err.response = { status: xhr.status, data: errData };
          reject(err);
        }
      };

      xhr.onerror = function () {
        reject(new Error('Erreur réseau'));
      };

      xhr.send(fd);
    });
  },

  renameNode: async function (nodeId, name) {
    var data = await request('PUT', '/nodes/' + nodeId + '/rename', { name: name });
    return data.node;
  },

  moveNode: async function (nodeId, parentId) {
    var data = await request('PUT', '/nodes/' + nodeId + '/move', { parent_id: parentId });
    return data.node;
  },

  deleteNode: async function (nodeId) {
    return request('DELETE', '/nodes/' + nodeId);
  },

  downloadFile: function (nodeId) {
    return API_URL + '/files/' + nodeId + '/download?token=' + getToken();
  },

  previewUrl: function (nodeId) {
    return API_URL + '/files/' + nodeId + '/preview?token=' + getToken();
  },

  streamUrl: function (nodeId) {
    return API_URL + '/files/' + nodeId + '/stream?token=' + getToken();
  },

  downloadFolderUrl: function (folderId) {
    return API_URL + '/files/folder/' + folderId + '/download?token=' + getToken();
  },
};

// --- Storage ---

export var storageService = {
  getUsage: async function () {
    return request('GET', '/storage/usage');
  },
  getBreakdown: async function () {
    return request('GET', '/storage/breakdown');
  },
  getRecent: async function (limit) {
    return request('GET', '/storage/recent?limit=' + (limit || 5));
  },
};

// --- Trash ---

export var trashService = {
  list: async function () {
    var data = await request('GET', '/trash');
    return data.trash || [];
  },
  restore: async function (id) {
    return request('PUT', '/trash/' + id + '/restore');
  },
  deletePermanent: async function (id) {
    return request('DELETE', '/trash/' + id + '/permanent');
  },
};

// --- Shares ---

export var shareService = {
  createPublicLink: async function (nodeId, password, expiresAt) {
    var body = { node_id: nodeId };
    if (password) body.password = password;
    if (expiresAt) body.expires_at = expiresAt;
    return request('POST', '/shares', body);
  },
  createInternalShare: async function (nodeId, email) {
    return request('POST', '/shares/internal', { node_id: nodeId, email: email });
  },
  getSharedWithMe: async function () {
    var data = await request('GET', '/shares/internal');
    return data.shared || [];
  },
};

// --- Users ---

export var userService = {
  updateEmail: async function (email, password) {
    return request('PUT', '/users/email', { email: email, password: password });
  },
  updatePassword: async function (password, currentPassword) {
    return request('PUT', '/users/password', { password: password, currentPassword: currentPassword });
  },
  uploadAvatar: async function (file) {
    var fd = new FormData();
    fd.append('avatar', file);
    return request('POST', '/users/avatar', fd);
  },
  deleteAccount: async function () {
    return request('DELETE', '/users/account');
  },
  getMe: async function () {
    return request('GET', '/users/me');
  },
  updatePreferences: async function (theme) {
    return request('PUT', '/users/preferences', { theme: theme });
  },
};

// --- Search (recherche globale recursive sur toutes les nodes user) ---

export var searchService = {
  search: async function (q, type, date) {
    var params = [];
    if (q && q.trim())  params.push('q=' + encodeURIComponent(q.trim()));
    if (type)           params.push('type=' + encodeURIComponent(type));
    if (date)           params.push('date=' + encodeURIComponent(date));
    if (params.length === 0) return { results: [], count: 0 };
    var data = await request('GET', '/search?' + params.join('&'));
    return data;
  },
};

// export par défaut pour compatibilité
export default { request: request };