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
  ConditionalFormat,
  CreateConditionalFormatInput,
  UpdateConditionalFormatInput,
  Chart,
  CreateChartInput,
  UpdateChartInput,
  DataValidation,
  CreateDataValidationInput,
  UpdateDataValidationInput,
  PivotTable,
  CreatePivotTableInput,
  UpdatePivotTableInput,
  PivotTableComputedData,
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

  // Cell merge operations
  mergeCells: async (
    sheetId: string,
    startRow: number,
    endRow: number,
    startCol: number,
    endCol: number
  ) => {
    const { data } = await api.post(`/api/v1/sheets/${sheetId}/merge`, {
      startRow,
      endRow,
      startCol,
      endCol,
    });
    return data.data.cell;
  },

  unmergeCells: async (sheetId: string, cellId: string) => {
    const { data } = await api.delete(`/api/v1/sheets/${sheetId}/merge/${cellId}`);
    return data.data.cell;
  },

  // Export sheet to CSV
  exportToCsv: async (sheetId: string): Promise<string> => {
    const { data } = await api.get(`/api/v1/sheets/${sheetId}/export`);
    return data;
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

// Conditional Formatting API
export const conditionalFormatApi = {
  getAll: async (sheetId: string): Promise<ConditionalFormat[]> => {
    const { data } = await api.get(`/api/v1/conditional/sheets/${sheetId}/formats`);
    return data.data.formats;
  },

  create: async (sheetId: string, format: CreateConditionalFormatInput): Promise<ConditionalFormat> => {
    const { data } = await api.post(`/api/v1/conditional/sheets/${sheetId}/formats`, format);
    return data.data.format;
  },

  update: async (formatId: string, format: UpdateConditionalFormatInput): Promise<ConditionalFormat> => {
    const { data } = await api.put(`/api/v1/conditional/formats/${formatId}`, format);
    return data.data.format;
  },

  delete: async (formatId: string): Promise<void> => {
    await api.delete(`/api/v1/conditional/formats/${formatId}`);
  },
};

// Chart API
export const chartApi = {
  getAll: async (sheetId: string): Promise<Chart[]> => {
    const { data } = await api.get(`/api/v1/sheets/${sheetId}/charts`);
    return data.data.charts;
  },

  getById: async (chartId: string): Promise<Chart> => {
    const { data } = await api.get(`/api/v1/charts/${chartId}`);
    return data.data.chart;
  },

  create: async (sheetId: string, input: CreateChartInput): Promise<Chart> => {
    const { data } = await api.post(`/api/v1/sheets/${sheetId}/charts`, {
      ...input,
      config: JSON.stringify(input.config),
      position: JSON.stringify(input.position),
    });
    return data.data.chart;
  },

  update: async (chartId: string, input: UpdateChartInput): Promise<Chart> => {
    const payload: Record<string, unknown> = { ...input };
    if (input.config) {
      payload.config = JSON.stringify(input.config);
    }
    if (input.position) {
      payload.position = JSON.stringify(input.position);
    }
    const { data } = await api.put(`/api/v1/charts/${chartId}`, payload);
    return data.data.chart;
  },

  delete: async (chartId: string): Promise<void> => {
    await api.delete(`/api/v1/charts/${chartId}`);
  },
};

// Data Validation API
export const dataValidationApi = {
  getAll: async (sheetId: string): Promise<DataValidation[]> => {
    const { data } = await api.get(`/api/v1/sheets/${sheetId}/validations`);
    return data.data.validations;
  },

  getById: async (validationId: string): Promise<DataValidation> => {
    const { data } = await api.get(`/api/v1/validations/${validationId}`);
    return data.data.validation;
  },

  create: async (sheetId: string, input: CreateDataValidationInput): Promise<DataValidation> => {
    const { data } = await api.post(`/api/v1/sheets/${sheetId}/validations`, {
      ...input,
      criteria: JSON.stringify(input.criteria),
    });
    return data.data.validation;
  },

  update: async (validationId: string, input: UpdateDataValidationInput): Promise<DataValidation> => {
    const payload: Record<string, unknown> = { ...input };
    if (input.criteria) {
      payload.criteria = JSON.stringify(input.criteria);
    }
    const { data } = await api.put(`/api/v1/validations/${validationId}`, payload);
    return data.data.validation;
  },

  delete: async (validationId: string): Promise<void> => {
    await api.delete(`/api/v1/validations/${validationId}`);
  },

  validateCell: async (sheetId: string, cellRef: string, value: unknown): Promise<{ isValid: boolean; errorMessage?: string }> => {
    const { data } = await api.post(`/api/v1/sheets/${sheetId}/validate-cell`, { cellRef, value });
    return data.data;
  },

  getCellValidation: async (sheetId: string, cellRef: string): Promise<DataValidation | null> => {
    const { data } = await api.get(`/api/v1/sheets/${sheetId}/cell-validation/${cellRef}`);
    return data.data.validation;
  },
};

// Pivot Table API
export const pivotTableApi = {
  getAll: async (sheetId: string): Promise<PivotTable[]> => {
    const { data } = await api.get(`/api/v1/sheets/${sheetId}/pivot-tables`);
    return data.data.pivotTables;
  },

  getById: async (pivotTableId: string): Promise<PivotTable> => {
    const { data } = await api.get(`/api/v1/pivot-tables/${pivotTableId}`);
    return data.data.pivotTable;
  },

  create: async (sheetId: string, input: CreatePivotTableInput): Promise<PivotTable> => {
    const { data } = await api.post(`/api/v1/sheets/${sheetId}/pivot-tables`, input);
    return data.data.pivotTable;
  },

  update: async (pivotTableId: string, input: UpdatePivotTableInput): Promise<PivotTable> => {
    const { data } = await api.put(`/api/v1/pivot-tables/${pivotTableId}`, input);
    return data.data.pivotTable;
  },

  delete: async (pivotTableId: string): Promise<void> => {
    await api.delete(`/api/v1/pivot-tables/${pivotTableId}`);
  },

  compute: async (pivotTableId: string): Promise<PivotTableComputedData> => {
    const { data } = await api.get(`/api/v1/pivot-tables/${pivotTableId}/compute`);
    return data.data;
  },

  getColumns: async (sheetId: string): Promise<{ id: string; name: string; type: string }[]> => {
    const { data } = await api.get(`/api/v1/sheets/${sheetId}/pivot-columns`);
    return data.data.columns;
  },
};

export default api;
