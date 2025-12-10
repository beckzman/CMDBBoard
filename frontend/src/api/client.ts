/**
 * API client for backend communication.
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('access_token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: async (username: string, password: string) => {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        const response = await api.post('/api/auth/login', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    getCurrentUser: async () => {
        const response = await api.get('/api/auth/me');
        return response.data;
    },
};

// CI API
export const ciAPI = {
    list: async (params?: {
        page?: number;
        page_size?: number;
        ci_type?: string;
        status?: string;
        search?: string;
        sort_by?: string;
        sort_desc?: boolean;
    }) => {
        const response = await api.get('/api/ci', { params });
        return response.data;
    },

    get: async (id: number) => {
        const response = await api.get(`/api/ci/${id}`);
        return response.data;
    },

    create: async (data: any) => {
        const response = await api.post('/api/ci', data);
        return response.data;
    },

    update: async (id: number, data: any) => {
        const response = await api.put(`/api/ci/${id}`, data);
        return response.data;
    },

    delete: async (id: number) => {
        await api.delete(`/api/ci/${id}`);
    },
};

// Dashboard API
export const dashboardAPI = {
    getStats: async () => {
        const response = await api.get('/api/dashboard/stats');
        return response.data;
    },

    getRecent: async (limit = 10) => {
        const response = await api.get('/api/dashboard/recent', { params: { limit } });
        return response.data;
    },
};

// Import API
export const importAPI = {
    uploadCSV: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/api/import/csv', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    getHistory: async (limit = 50) => {
        const response = await api.get('/api/import/history', { params: { limit } });
        return response.data;
    },

    getStatus: async (id: number) => {
        const response = await api.get(`/api/import/${id}`);
        return response.data;
    },

    listSources: async () => {
        const response = await api.get('/api/import/sources');
        return response.data;
    },

    createSource: async (data: any) => {
        const response = await api.post('/api/import/sources', data);
        return response.data;
    },

    runSource: async (id: number) => {
        const response = await api.post(`/api/import/sources/${id}/run`);
        return response.data;
    },

    testConnection: async (data: { source_type: string; config: string }) => {
        const response = await api.post('/api/import/test-connection', data);
        return response.data;
    },
};

// Export API
export const exportAPI = {
    exportCSV: async (params?: { ci_type?: string; status?: string }) => {
        const response = await api.get('/api/export/csv', {
            params,
            responseType: 'blob',
        });
        return response.data;
    },

    exportExcel: async (params?: { ci_type?: string; status?: string }) => {
        const response = await api.get('/api/export/excel', {
            params,
            responseType: 'blob',
        });
        return response.data;
    },

    exportJSON: async (params?: { ci_type?: string; status?: string }) => {
        const response = await api.get('/api/export/json', {
            params,
            responseType: 'blob',
        });
        return response.data;
    },
};

// Health API
export const healthAPI = {
    checkHost: async (id: number) => {
        const response = await api.post(`/api/ci/${id}/check-health`);
        return response.data;
    },
};

// Domain API
export const domainAPI = {
    list: async (active_only: boolean = true) => {
        const response = await api.get('/api/domains', { params: { active_only } });
        return response.data;
    },

    create: async (name: string, description?: string) => {
        const response = await api.post('/api/domains', { name, description });
        return response.data;
    },

    delete: async (id: number) => {
        await api.delete(`/api/domains/${id}`);
    }
};

// User API
export const userAPI = {
    list: async () => {
        const response = await api.get('/api/users');
        return response.data;
    },

    create: async (data: { username: string; email: string; full_name?: string; password: string }) => {
        const response = await api.post('/api/auth/register', data);
        return response.data;
    },

    update: async (id: number, data: { full_name?: string; role?: string; is_active?: boolean }) => {
        const response = await api.put(`/api/users/${id}`, data);
        return response.data;
    },

    delete: async (id: number) => {
        await api.delete(`/api/users/${id}`);
    },

    resetPassword: async (id: number, newPassword: string) => {
        const response = await api.post(`/api/users/${id}/reset-password`, null, {
            params: { new_password: newPassword }
        });
        return response.data;
    }
};


