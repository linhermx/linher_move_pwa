import api from './api';
import { buildApiUrl } from '../utils/url';

export const backupService = {
    list: async (params = {}) => {
        const response = await api.get('/backups', { params });
        return response.data;
    },

    summary: async () => {
        const response = await api.get('/backups/summary');
        return response.data;
    },

    generate: async (operatorId) => {
        const response = await api.post('/backups/generate', { operator_id: operatorId });
        return response.data;
    },

    download: (id) => {
        window.open(buildApiUrl(`/backups/download/${id}`), '_blank');
    },

    delete: async (id) => {
        const response = await api.delete(`/backups/${id}`);
        return response.data;
    }
};
