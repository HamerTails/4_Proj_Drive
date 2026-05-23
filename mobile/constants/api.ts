import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

// Priorité :
//   1. EXPO_PUBLIC_API_URL (env var, pour dev local pointant LAN/local)
//   2. PRODUCTION URL par défaut (utilisé par l'APK build et Expo Go sans config)
//
// Pour dev local pointant un backend local, créer mobile/.env.local avec :
//   EXPO_PUBLIC_API_URL=http://192.168.X.X:3000
// Puis relancer Expo avec `npx expo start --clear`.
const PRODUCTION_API_URL = 'https://api.supfile.hackthehydra.com';

function getApiUrl(): string {
  const fromEnv = (process.env as any).EXPO_PUBLIC_API_URL as string | undefined;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv.replace(/\/api\/?$/, '');
  }
  return PRODUCTION_API_URL;
}

export const API_URL = getApiUrl();

// Log unique au boot pour debug
if (typeof console !== 'undefined') {
  console.log('[SUPFile] API_URL =', API_URL, '(platform:', Platform.OS, ')');
}

export const MOBILE_URL = Platform.OS === 'web'
  ? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081')
  : `http://${Constants.expoConfig?.hostUri?.split(':')[0] || 'localhost'}:8081`;

/**
 * URL de retour OAuth — accessible par le browser/WebBrowser qui declenche le login Google.
 * - Web (Chrome) : origin actuel + /login (ex: http://localhost:8081/login)
 * - Native (Expo Go / standalone) : scheme deep link `mobile://login` declare dans app.json
 *   (Linking.createURL produit le bon scheme selon l'env : exp:// en Expo Go, mobile:// en prod)
 */
export function getOAuthReturnUrl(): string {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') return window.location.origin + '/login';
    return 'http://localhost:8081/login';
  }
  return Linking.createURL('login');
}

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
    if (error.response?.status === 401 || error.response?.status === 403) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      // Sur web : rediriger vers la page d'accueil
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = '/';
      }
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

  moveNode: async (nodeId: string, parentId: string | null) => {
    const res = await api.put('/api/nodes/' + nodeId + '/move', { parent_id: parentId });
    return res.data.node;
  },

  uploadFile: async (
    uri: string,
    name: string,
    mimeType: string,
    parentId: string | null = null,
    onProgress?: (pct: number) => void
  ) => {
    const formData = new FormData();

    // Sur web (expo web), uri est un blob: URL → il faut récupérer le Blob réel
    // Sur native, on passe l'objet { uri, name, type } directement
    if (uri.startsWith('blob:') || uri.startsWith('data:')) {
      const res  = await fetch(uri);
      const blob = await res.blob();
      const file = new File([blob], name, { type: mimeType });
      formData.append('file', file);
    } else {
      formData.append('file', { uri, name, type: mimeType } as any);
    }

    if (parentId) formData.append('parent_id', parentId);

    const response = await api.post('/api/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });
    return response.data;
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

export const userService = {

  getMe: async () => {
    const res = await api.get('/api/users/me');
    // L'API renvoie { user: {...} } - on aplatit pour le client
    return res.data.user || res.data;
  },

  updatePassword: async (password: string, currentPassword: string) => {
    const res = await api.put('/api/users/password', { password, currentPassword });
    return res.data;
  },

  updateEmail: async (email: string, password: string) => {
    const res = await api.put('/api/users/email', { email, password });
    return res.data;
  },

  updatePreferences: async (theme: string) => {
    const res = await api.put('/api/users/preferences', { theme });
    return res.data;
  },

  uploadAvatar: async (uri: string, filename?: string, mimeType: string = 'image/jpeg') => {
    const form = new FormData();
    // RN FormData accepte un objet { uri, name, type }
    form.append('avatar', { uri, name: filename || 'avatar.jpg', type: mimeType } as any);
    const res = await api.post('/api/users/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  getAvatarUrl: (userId: number | string) => `${API_URL}/api/users/avatar/${userId}`,
};

export const shareService = {

  createPublicLink: async (nodeId: string, password?: string, expiresAt?: string) => {
    const body: any = { node_id: nodeId };
    if (password)  body.password   = password;
    if (expiresAt) body.expires_at = expiresAt;
    const res = await api.post('/api/shares', body);
    return res.data;
  },

  getSharedWithMe: async () => {
    const res = await api.get('/api/shares/internal');
    return res.data.shared || [];
  },

  createInternalShare: async (nodeId: string, email: string) => {
    const res = await api.post('/api/shares/internal', { node_id: nodeId, email });
    return res.data;
  },
};

export const searchService = {

  search: async (q: string, type?: string, date?: string) => {
    const params: any = { q };
    if (type) params.type = type;
    if (date) params.date = date;
    const res = await api.get('/api/search', { params });
    return res.data.results || [];
  },
};

export default api;