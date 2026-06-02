import axios from 'axios';
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001', // Update with your actual API URL
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('aclass_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authApi = {
  getProfile: () => api.get('/users/me'),
  verifyHwid: (hwid: string) => api.post('/auth/verify-hwid', { hwid }),
  heartbeat: (status: 'online' | 'offline' = 'online') => api.post('/auth/heartbeat', { status }),
  login: async (username: string, password: string, hwid: string) => {
    const response = await api.post('/auth/login', { username, password, hwid });
    if (response.data.access_token) {
      localStorage.setItem('aclass_token', response.data.access_token);
      localStorage.setItem('aclass_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('aclass_token');
    localStorage.removeItem('aclass_user');
  },
  getCurrentUser: () => {
    try {
      const user = localStorage.getItem('aclass_user');
      return user ? JSON.parse(user) : null;
    } catch (e) {
      return null;
    }
  }
};

export const userApi = {
  getUsers: () => api.get('/users'),
  resetHwid: (userId: string) => api.post(`/users/${userId}/reset-hwid`),
  updateUser: (userId: string, data: any) => api.patch(`/users/${userId}`, data),
};

export const gameApi = {
  getGames: () => api.get('/games'),
  getGame: (id: string) => api.get(`/games/${id}`),
  createGame: (data: any) => api.post('/games', data),
  updateGame: (id: string, data: any) => api.patch(`/games/${id}`, data),
  deleteGame: (id: string) => api.delete(`/games/${id}`),
};

export const presetApi = {
  getPresets: () => api.get('/presets'),
  getMyPresets: () => api.get('/presets/my'),
  createPreset: (data: any) => api.post('/presets', data),
  adoptPreset: (id: string) => api.post(`/presets/${id}/adopt`),
  forkPreset: (id: string) => api.post(`/presets/${id}/fork`),
  activatePreset: (userPresetId: string) => api.patch(`/presets/my/${userPresetId}/activate`),
  updatePreset: (id: string, data: any) => api.patch(`/presets/${id}`, data),
  deletePreset: (id: string) => api.delete(`/presets/${id}`),
};

export const giftApi = {
  getGifts: () => api.get('/gifts'),
  getGift: (id: number) => api.get(`/gifts/${id}`),
};

export const announcementApi = {
  getAnnouncements: (isAdmin: boolean = false) => api.get(`/announcements${isAdmin ? '?admin=true' : ''}`),
  createAnnouncement: (data: any) => api.post('/announcements', data),
  updateAnnouncement: (id: string, data: any) => api.patch(`/announcements/${id}`, data),
  deleteAnnouncement: (id: string) => api.delete(`/announcements/${id}`),
};

export const uploadApi = {
  uploadSound: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/uploads/sound', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export const interactiveApi = {
  getStoreProducts: () => api.get('/interactive/store-products'),
  getMyProducts: () => api.get('/interactive/my-products'),
  deployProduct: (data: any) => api.post('/interactive/deploy', data),
  updateMapping: (id: string, mappings: any[]) => api.patch(`/interactive/my-products/${id}/map`, { mappings }),
  deleteProduct: (id: string) => api.delete(`/interactive/my-products/${id}`),
  
  // ✅ รวมเป็นอันเดียว — electron ใช้ IPC, browser ใช้ REST
  registerSession: (orderId: string, username: string) => {
    if (window.electron) {
      const token = localStorage.getItem('aclass_token');
      return window.electron.invoke('interactive:register-session', { orderId, username, token });
    }
    return api.post('/interactive/register-session', { orderId, username });
  },
};

export default api;
