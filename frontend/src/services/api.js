import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

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
    list: async () => {
        const response = await apiClient.get('/quotations');
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

export default apiClient;
