import api from './api';

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
        // Since it's a file download, we use a direct window.open or hidden link with token if needed
        // For local development with current auth, direct URL works if server allows
        const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/backups/download/${id}`;
        window.open(url, '_blank');
    },

    delete: async (id) => {
        const response = await api.delete(`/backups/${id}`);
        return response.data;
    }
};
