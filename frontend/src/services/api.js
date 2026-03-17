import axios from 'axios';
import { reportClientError } from './clientLogger';
import { API_BASE_URL } from '../utils/url';
import { buildAppPath, isCurrentAppRoute } from '../utils/appPath';
import { clearSession, getSessionAccessToken, getSessionRefreshToken, getSessionUser } from '../utils/session';

const apiClient = axios.create({
    baseURL: API_BASE_URL
});

const SESSION_USER_KEY = 'user';
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

const getStorageForKey = (key) => {
    if (localStorage.getItem(key) !== null) return localStorage;
    if (sessionStorage.getItem(key) !== null) return sessionStorage;
    return null;
};

const getTokenStorage = () => (
    getStorageForKey(REFRESH_TOKEN_KEY)
    || getStorageForKey(ACCESS_TOKEN_KEY)
    || getStorageForKey(SESSION_USER_KEY)
    || sessionStorage
);

const persistRotatedSession = ({ accessToken, refreshToken, user }) => {
    const selectedStorage = getTokenStorage();
    const alternateStorage = selectedStorage === localStorage ? sessionStorage : localStorage;

    alternateStorage.removeItem(ACCESS_TOKEN_KEY);
    alternateStorage.removeItem(REFRESH_TOKEN_KEY);

    selectedStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    selectedStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

    if (user) {
        selectedStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    }
};

const redirectToLogin = () => {
    clearSession();
    if (!isCurrentAppRoute(window.location.pathname, '/login')) {
        window.location.href = buildAppPath('/login');
    }
};

apiClient.interceptors.request.use((config) => {
    const user = getSessionUser();
    const token = getSessionAccessToken();

    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }

    const requestMethod = String(config.method || 'get').toLowerCase();
    if (user && user.id && ['post', 'put', 'patch', 'delete'].includes(requestMethod)) {
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
    async (error) => {
        const originalRequest = error.config || {};
        const requestUrl = originalRequest.url || '';
        const isRefreshRequest = requestUrl.includes('/auth/refresh');
        const isLoginRequest = requestUrl.includes('/auth/login');

        if (error.response?.status === 401 && !originalRequest._retry && !isRefreshRequest && !isLoginRequest) {
            originalRequest._retry = true;
            try {
                const refreshToken = getSessionRefreshToken();
                if (!refreshToken) {
                    redirectToLogin();
                    return Promise.reject(error);
                }

                const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
                const rotatedData = refreshResponse.data || {};

                if (!rotatedData.accessToken || !rotatedData.refreshToken) {
                    redirectToLogin();
                    return Promise.reject(error);
                }

                persistRotatedSession({
                    accessToken: rotatedData.accessToken,
                    refreshToken: rotatedData.refreshToken,
                    user: rotatedData.user || null
                });

                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers.Authorization = `Bearer ${rotatedData.accessToken}`;
                return apiClient(originalRequest);
            } catch (refreshError) {
                redirectToLogin();
                return Promise.reject(refreshError);
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
    refresh: async (refreshToken) => {
        const { data } = await apiClient.post('/auth/refresh', { refreshToken });
        return data;
    },
    logout: async (refreshToken) => {
        const { data } = await apiClient.post('/auth/logout', { refreshToken });
        return data;
    },
    me: async () => {
        const { data } = await apiClient.get('/auth/me');
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
        const user = getSessionUser();
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

export const onboardingService = {
    getState: async () => {
        const response = await apiClient.get('/onboarding/state');
        return response.data;
    },
    updateState: async (data) => {
        const response = await apiClient.put('/onboarding/state', data);
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
