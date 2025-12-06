import axios from 'axios';
import type {
  Sheet,
  CreateSheetInput,
  UpdateSheetInput,
  CreateColumnInput,
  CreateRowInput,
  UpdateCellInput,
  RowComment,
  CreateCommentInput,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Sheet API
export const sheetApi = {
  getAll: async (): Promise<Sheet[]> => {
    const { data } = await api.get('/api/v1/sheets');
    return data.data.sheets;
  },

  getById: async (id: string): Promise<Sheet> => {
    const { data } = await api.get(`/api/v1/sheets/${id}`);
    return data.data.sheet;
  },

  create: async (input: CreateSheetInput): Promise<Sheet> => {
    const { data } = await api.post('/api/v1/sheets', input);
    return data.data.sheet;
  },

  update: async (id: string, input: UpdateSheetInput): Promise<Sheet> => {
    const { data } = await api.put(`/api/v1/sheets/${id}`, input);
    return data.data.sheet;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/sheets/${id}`);
  },

  toggleFavorite: async (id: string): Promise<Sheet> => {
    const { data } = await api.put(`/api/v1/sheets/${id}/favorite`);
    return data.data.sheet;
  },

  createColumn: async (sheetId: string, input: CreateColumnInput) => {
    const { data } = await api.post(`/api/v1/sheets/${sheetId}/columns`, input);
    return data.data.column;
  },

  updateColumn: async (sheetId: string, columnId: string, input: { width?: number; name?: string }) => {
    const { data } = await api.put(`/api/v1/sheets/${sheetId}/columns/${columnId}`, input);
    return data.data.column;
  },

  deleteColumn: async (sheetId: string, columnId: string): Promise<void> => {
    await api.delete(`/api/v1/sheets/${sheetId}/columns/${columnId}`);
  },

  createRow: async (sheetId: string, input: CreateRowInput) => {
    const { data } = await api.post(`/api/v1/sheets/${sheetId}/rows`, input);
    return data.data.row;
  },

  updateRow: async (sheetId: string, rowId: string, input: { height?: number; name?: string }) => {
    const { data } = await api.put(`/api/v1/sheets/${sheetId}/rows/${rowId}`, input);
    return data.data.row;
  },

  deleteRow: async (sheetId: string, rowId: string): Promise<void> => {
    await api.delete(`/api/v1/sheets/${sheetId}/rows/${rowId}`);
  },

  updateCell: async (sheetId: string, cellId: string, input: UpdateCellInput) => {
    const { data } = await api.put(`/api/v1/sheets/${sheetId}/cells/${cellId}`, input);
    return data.data.cell;
  },

  // Share operations
  shareSheet: async (sheetId: string, email: string, permission: 'VIEWER' | 'EDITOR') => {
    const { data } = await api.post(`/api/v1/sheets/${sheetId}/share`, { email, permission });
    return data.data;
  },

  getSheetShares: async (sheetId: string) => {
    const { data } = await api.get(`/api/v1/sheets/${sheetId}/shares`);
    return data.data;
  },

  removeShare: async (shareId: string) => {
    const { data } = await api.delete(`/api/v1/shares/${shareId}`);
    return data;
  },

  // Comment operations
  getRowComments: async (sheetId: string, rowId: string): Promise<RowComment[]> => {
    const { data} = await api.get(`/api/v1/sheets/${sheetId}/rows/${rowId}/comments`);
    return data.data.comments;
  },

  createRowComment: async (
    sheetId: string,
    rowId: string,
    input: CreateCommentInput
  ): Promise<RowComment> => {
    const { data } = await api.post(`/api/v1/sheets/${sheetId}/rows/${rowId}/comments`, input);
    return data.data.comment;
  },

  // Share token operations
  generateShareLink: async (sheetId: string): Promise<{ shareToken: string }> => {
    const { data } = await api.post(`/api/v1/sheets/${sheetId}/share-link`);
    return data.data;
  },

  getSheetByToken: async (token: string) => {
    const { data } = await api.get(`/api/v1/sheets/shared/${token}`);
    return data.data.sheet;
  },
};

// Auth API
export const authApi = {
  getMe: async () => {
    const { data } = await api.get('/api/v1/auth/me');
    return data.data;
  },

  getUsers: async (search?: string) => {
    const { data } = await api.get('/api/v1/auth/users', {
      params: { search },
    });
    return data.data;
  },

  updateProfile: async (profile: { name?: string; email?: string }) => {
    const { data } = await api.put('/api/v1/auth/profile', profile);
    return data.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const { data } = await api.post('/api/v1/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return data.data;
  },

  getStats: async () => {
    const { data } = await api.get('/api/v1/auth/stats');
    return data.data;
  },
};

// Notification API
export const notificationApi = {
  getAll: async (unreadOnly?: boolean) => {
    const { data } = await api.get('/api/v1/notifications', {
      params: { unreadOnly },
    });
    return data.data.notifications;
  },

  getUnreadCount: async () => {
    const { data } = await api.get('/api/v1/notifications/unread-count');
    return data.data.count;
  },

  markAsRead: async (notificationId: string) => {
    const { data } = await api.post(`/api/v1/notifications/${notificationId}/read`);
    return data;
  },

  markAllAsRead: async () => {
    const { data } = await api.post('/api/v1/notifications/mark-all-read');
    return data;
  },
};

export default api;
