import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const apiClient = axios.create({
    baseURL: API_BASE_URL
});

// Interceptor — auto-inject operator_id; reads from localStorage or sessionStorage
apiClient.interceptors.request.use(config => {
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;

    if (user && user.id && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
        if (config.data instanceof FormData) {
            if (!config.data.has('operator_id')) config.data.append('operator_id', user.id);
        } else {
            if (typeof config.data === 'object' && config.data !== null) {
                config.data.operator_id = user.id;
            } else if (!config.data) {
                config.data = { operator_id: user.id };
            }
        }
    }
    return config;
}, error => Promise.reject(error));


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
    update: async (data) => {
        const response = await apiClient.post('/settings', data);
        return response.data;
    }
};

export const authService = {
    login: async (email, password) => {
        const { data } = await apiClient.post('/auth/login', { email, password });
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
    stats: async (userId, role, dateFrom = null, dateTo = null) => {
        const params = { user_id: userId, role };
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        const response = await apiClient.get('/dashboard', { params });
        return response.data;
    }
};

export default apiClient;

