/**
 * API client for backend communication.
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface DashboardStats {
    total_cis: number;
    active_cis: number;
    inactive_cis: number;
    cis_by_type: Record<string, number>;
    cis_by_status: Record<string, number>;
    cis_by_department: Record<string, number>;
    cis_by_location: Record<string, number>;
    costs_by_cost_center: Record<string, number>;
    cis_by_os_db_system: Record<string, number>;
    cis_by_sla: Record<string, number>;
    ci_growth: Record<string, number>;
    recent_imports: number;
}

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
        department?: string[];
        location?: string[];
        os_db_system?: string[];
        cost_center?: string[];
        sla?: string[];
        environment?: string[];
        domain?: string[];
    }) => {
        const response = await api.get('/api/ci', {
            params: params,
            paramsSerializer: {
                indexes: null // Use 'key=val&key=val' format for arrays instead of 'key[]=val' depending on backend requirement, FastAPI typically handles repeated keys well. defaults are usually fine but explicit is safer if needed. default axios is brackets 'key[]'. FastAPI default needs 'key' repeated without brackets to map to List unless using specific aliases. 
                // Let's test standard axios behavior first. FastAPI `Query` usually expects `key=val&key=val2`
            }
        });
        return response.data;
    },

    getDistinctValues: async (field: string) => {
        const response = await api.get(`/api/ci/attributes/${field}/distinct`);
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

    uploadSourceFile: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/api/import/upload-source-file', formData, {
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

    getSchema: async (data: { source_type: string; config: string }) => {
        const response = await api.post('/api/import/schema', data);
        return response.data;
    },

    getCategories: async (data: { source_type: string; config: string }) => {
        const response = await api.post('/api/import/categories', data);
        return response.data;
    },

    previewData: async (data: { source_type: string; config: string }) => {
        const response = await api.post('/api/import/preview', data);
        return response.data;
    },

    deleteSource: async (id: number) => {
        await api.delete(`/api/import/sources/${id}`);
    },

    updateSource: async (id: number, data: any) => {
        const response = await api.put(`/api/import/sources/${id}`, data);
        return response.data;
    }
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
    },

    resolve: async (limit: number = 50) => {
        const response = await api.post('/api/domains/resolve', null, { params: { limit } });
        return response.data;
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

// Relationship API
export const relationshipAPI = {
    getByCI: async (ciId: number) => {
        const response = await api.get(`/api/relationships/ci/${ciId}`);
        return response.data;
    },

    listAll: async () => {
        const response = await api.get('/api/relationships');
        return response.data;
    },

    create: async (data: { source_ci_id: number; target_ci_id: number; relationship_type: string; description?: string }) => {
        const response = await api.post('/api/relationships', data);
        return response.data;
    },

    delete: async (id: number) => {
        await api.delete(`/api/relationships/${id}`);
    }
};

// Cost Rules API
export const costRuleAPI = {
    list: async () => {
        const response = await api.get('/api/cost-rules');
        return response.data;
    },

    create: async (data: any) => {
        const response = await api.post('/api/cost-rules', data);
        return response.data;
    },

    update: async (id: number, data: any) => {
        const response = await api.put(`/api/cost-rules/${id}`, data);
        return response.data;
    },

    delete: async (id: number) => {
        await api.delete(`/api/cost-rules/${id}`);
    }
};


