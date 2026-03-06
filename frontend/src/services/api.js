import axios from 'axios';
import { reportClientError } from './clientLogger';
import { API_BASE_URL } from '../utils/url';

const apiClient = axios.create({
    baseURL: API_BASE_URL
});

const SESSION_USER_KEY = 'user';
const SESSION_TOKEN_KEY = 'auth_token';
const SESSION_EXPIRES_AT_KEY = 'auth_expires_at';

const getPreferredStorage = () => (
    localStorage.getItem(SESSION_USER_KEY) ? localStorage : sessionStorage
);

const getCurrentUser = () => {
    const raw = localStorage.getItem(SESSION_USER_KEY) || sessionStorage.getItem(SESSION_USER_KEY);
    return raw ? JSON.parse(raw) : null;
};

const getCurrentToken = () => {
    const storage = getPreferredStorage();
    return storage.getItem(SESSION_TOKEN_KEY)
        || localStorage.getItem(SESSION_TOKEN_KEY)
        || sessionStorage.getItem(SESSION_TOKEN_KEY)
        || null;
};

const clearSession = () => {
    localStorage.removeItem(SESSION_USER_KEY);
    sessionStorage.removeItem(SESSION_USER_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(SESSION_EXPIRES_AT_KEY);
    sessionStorage.removeItem(SESSION_EXPIRES_AT_KEY);
};

apiClient.interceptors.request.use((config) => {
    const user = getCurrentUser();
    const token = getCurrentToken();

    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }

    if (user && user.id && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
        if (config.data instanceof FormData) {
            if (!config.data.has('operator_id')) {
                config.data.append('operator_id', user.id);
            }
        } else if (typeof config.data === 'object' && config.data !== null) {
            config.data.operator_id = user.id;
        } else if (!config.data) {
            config.data = { operator_id: user.id };
        }
    }

    return config;
}, (error) => Promise.reject(error));

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const requestUrl = error.config?.url || '';

        if (error.response?.status === 401 && !requestUrl.includes('/auth/login')) {
            clearSession();
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }

        if (!requestUrl.includes('/logs/error')) {
            reportClientError({
                action: 'API_RESPONSE_ERROR',
                message: error.response?.data?.message || error.message,
                severity: error.response?.status >= 500 ? 'error' : 'warning',
                details: {
                    method: error.config?.method,
                    url: requestUrl,
                    status: error.response?.status || null
                }
            });
        }

        return Promise.reject(error);
    }
);

export const mapsService = {
    autocomplete: async (text) => {
        const response = await apiClient.get('/maps/autocomplete', {
            params: { text }
        });
        return response.data;
    },
    getRoute: async (locations) => {
        const response = await apiClient.post('/maps/route', { locations });
        return response.data;
    },
    reverseGeocode: async (lat, lng) => {
        const response = await apiClient.get('/maps/reverse', {
            params: { lat, lng }
        });
        return response.data;
    }
};

export const quotationService = {
    create: async (data) => {
        const response = await apiClient.post('/quotations', data);
        return response.data;
    },
    list: async (params) => {
        const response = await apiClient.get('/quotations', { params });
        return response.data;
    },
    get: async (id) => {
        const response = await apiClient.get(`/quotations/${id}`);
        return response.data;
    },
    update: async (id, data) => {
        const response = await apiClient.put(`/quotations/${id}`, data);
        return response.data;
    }
};

export const vehicleService = {
    list: async () => {
        const response = await apiClient.get('/vehicles');
        return response.data;
    },
    listCatalog: async () => {
        const response = await apiClient.get('/vehicles/catalog');
        return response.data;
    },
    create: async (data) => {
        const response = await apiClient.post('/vehicles', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await apiClient.put(`/vehicles/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await apiClient.delete(`/vehicles/${id}`);
        return response.data;
    }
};

export const serviceService = {
    list: async () => {
        const response = await apiClient.get('/services');
        return response.data;
    },
    listCatalog: async () => {
        const response = await apiClient.get('/services/catalog');
        return response.data;
    },
    create: async (data) => {
        const response = await apiClient.post('/services', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await apiClient.put(`/services/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await apiClient.delete(`/services/${id}`);
        return response.data;
    }
};

export const settingsService = {
    get: async () => {
        const response = await apiClient.get('/settings');
        return response.data;
    },
    getPublic: async () => {
        const response = await apiClient.get('/settings/public');
        return response.data;
    },
    update: async (data) => {
        const response = await apiClient.post('/settings', data);
        return response.data;
    }
};

export const authService = {
    login: async (email, password, rememberMe = false) => {
        const { data } = await apiClient.post('/auth/login', { email, password, remember_me: rememberMe });
        return data;
    },
    forgotPassword: async (email) => {
        const { data } = await apiClient.post('/auth/forgot-password', { email });
        return data;
    }
};

export const userService = {
    list: async (params) => {
        const response = await apiClient.get('/users', { params });
        return response.data;
    },
    listRoles: async () => {
        const response = await apiClient.get('/users/roles');
        return response.data;
    },
    listPermissions: async () => {
        const response = await apiClient.get('/users/permissions');
        return response.data;
    },
    get: async (id) => {
        const response = await apiClient.get(`/users/${id}`);
        return response.data;
    },
    create: async (data) => {
        const response = await apiClient.post('/users', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await apiClient.put(`/users/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await apiClient.delete(`/users/${id}`);
        return response.data;
    },
    offboard: async (id, data) => {
        const response = await apiClient.post(`/users/${id}/offboard`, data);
        return response.data;
    },
    updatePermissions: async (id, permissions) => {
        const response = await apiClient.post(`/users/${id}/permissions`, { permissions });
        return response.data;
    }
};

export const logService = {
    list: async (params) => {
        const response = await apiClient.get('/logs', { params });
        return response.data;
    }
};

export const dashboardService = {
    stats: async (dateFrom = null, dateTo = null) => {
        const params = {};
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        const response = await apiClient.get('/dashboard', { params });
        return response.data;
    }
};

export const dropboxService = {
    getStatus: async () => {
        const response = await apiClient.get('/backups/dropbox/status');
        return response.data;
    },
    getAuthUrl: async () => {
        const user = getCurrentUser();
        const response = await apiClient.get('/backups/dropbox/url', {
            params: { operator_id: user?.id || null }
        });
        return response.data;
    },
    disconnect: async () => {
        const response = await apiClient.post('/backups/dropbox/disconnect');
        return response.data;
    }
};

export const reportService = {
    operational: async (params = {}) => {
        const response = await apiClient.get('/reports/operational', { params });
        return response.data;
    },
    operators: async (params = {}) => {
        const response = await apiClient.get('/reports/operators', { params });
        return response.data;
    },
    financial: async (params = {}) => {
        const response = await apiClient.get('/reports/financial', { params });
        return response.data;
    },
    exportCsv: async (reportType, params = {}) => {
        const response = await apiClient.get('/reports/export', {
            params: { report: reportType, format: 'csv', ...params },
            responseType: 'blob'
        });
        return response;
    }
};

export default apiClient;
