import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export const API_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export const authService = {

  login: async (email: string, password: string) => {
    const res = await api.post('/api/auth/login', { email, password });
    if (res.data.token) {
      await AsyncStorage.setItem('token', res.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  register: async (email: string, password: string) => {
    const res = await api.post('/api/auth/register', { email, password });
    if (res.data.token) {
      await AsyncStorage.setItem('token', res.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
  },

  getToken: async () => {
    return await AsyncStorage.getItem('token');
  },

  getUser: async () => {
    const user = await AsyncStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: async () => {
    const token = await AsyncStorage.getItem('token');
    return !!token;
  },
};

export const fileService = {

  getNodes: async (parentId: string | null = null) => {
    const params = parentId ? { parent_id: parentId } : {};
    const res = await api.get('/api/nodes', { params });
    return res.data.nodes;
  },

  createFolder: async (name: string, parentId: string | null = null) => {
    const res = await api.post('/api/nodes/folder', { name, parent_id: parentId });
    return res.data;
  },

  renameNode: async (nodeId: string, name: string) => {
    const res = await api.put('/api/nodes/' + nodeId + '/rename', { name });
    return res.data.node;
  },

  deleteNode: async (nodeId: string) => {
    await api.delete('/api/nodes/' + nodeId);
  },

  uploadFile: async (
    uri: string,
    name: string,
    mimeType: string,
    parentId: string | null = null,
    onProgress?: (pct: number) => void
  ) => {
    const formData = new FormData();
    formData.append('file', { uri, name, type: mimeType } as any);
    if (parentId) formData.append('parent_id', parentId);

    const res = await api.post('/api/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });
    return res.data;
  },

  downloadUrl: (nodeId: string, token: string) => {
    return API_URL + '/api/files/' + nodeId + '/download?token=' + token;
  },

  previewUrl: (nodeId: string, token: string) => {
    return API_URL + '/api/files/' + nodeId + '/preview?token=' + token;
  },
};

export const trashService = {

  getTrash: async () => {
    const res = await api.get('/api/trash');
    return res.data.trash || [];
  },

  restore: async (nodeId: string) => {
    await api.put('/api/trash/' + nodeId + '/restore', {});
  },

  deletePermanent: async (nodeId: string) => {
    await api.delete('/api/trash/' + nodeId + '/permanent');
  },
};

export const storageService = {

  getUsage: async () => {
    const res = await api.get('/api/storage/usage');
    return res.data;
  },

  getRecent: async () => {
    const res = await api.get('/api/storage/recent');
    return res.data.files || [];
  },
};

export default api;