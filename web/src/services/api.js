import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  register: async (email, password) => {
    const response = await api.post('/auth/register', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  }
};

export const fileService = {
  getNodes: async (parentId = null) => {
    const params = parentId ? { parent_id: parentId } : {};
    const response = await api.get('/nodes', { params });
    return response.data.nodes;
  },

  getPath: async (nodeId) => {
    const response = await api.get(`/nodes/${nodeId}/path`);
    return response.data.path;
  },

  createFolder: async (name, parentId = null) => {
    const response = await api.post('/folders', { name, parent_id: parentId });
    return response.data.folder;
  },

  uploadFile: async (file, parentId = null, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    if (parentId) {
      formData.append('parent_id', parentId);
    }

    const response = await api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    });
    return response.data.file;
  },

  renameNode: async (nodeId, name) => {
    const response = await api.put(`/nodes/${nodeId}`, { name });
    return response.data.node;
  },

  moveNode: async (nodeId, parentId) => {
    const response = await api.put(`/nodes/${nodeId}/move`, { parent_id: parentId });
    return response.data.node;
  },

  deleteNode: async (nodeId) => {
    await api.delete(`/nodes/${nodeId}`);
  },

  downloadFile: (nodeId) => {
    return `${API_URL}/files/${nodeId}/download`;
  }
};

export default api;
