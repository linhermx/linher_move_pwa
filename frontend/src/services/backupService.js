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

    download: async (id) => {
        const response = await api.get(`/backups/download/${id}`, {
            responseType: 'blob'
        });
        const blobUrl = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        const disposition = response.headers['content-disposition'] || '';
        const matched = disposition.match(/filename="?([^"]+)"?/i);
        const filename = matched?.[1] || `backup-${id}.zip`;

        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(blobUrl);
    },

    delete: async (id) => {
        const response = await api.delete(`/backups/${id}`);
        return response.data;
    }
};
