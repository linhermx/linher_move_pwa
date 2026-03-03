const DEFAULT_API_BASE_URL = 'http://localhost:3000/api/v1';

const normalizeBaseUrl = (url) => String(url || '').replace(/\/+$/, '');
const normalizePath = (path) => {
    if (!path) {
        return '';
    }

    return `/${String(path).replace(/^\/+/, '')}`;
};

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL);

const parsedApiUrl = new URL(API_BASE_URL);

export const BACKEND_BASE_URL = normalizeBaseUrl(
    import.meta.env.VITE_BACKEND_URL || `${parsedApiUrl.protocol}//${parsedApiUrl.host}`
);

export const buildApiUrl = (path = '') => `${API_BASE_URL}${normalizePath(path)}`;

export const buildBackendUrl = (path = '') => `${BACKEND_BASE_URL}${normalizePath(path)}`;

export const resolveAssetUrl = (assetPath) => {
    if (!assetPath) {
        return null;
    }

    if (/^https?:\/\//i.test(assetPath)) {
        return assetPath;
    }

    return buildBackendUrl(assetPath);
};
