const USER_KEY = 'user';
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const LEGACY_TOKEN_KEY = 'auth_token';
const LEGACY_EXPIRES_AT_KEY = 'auth_expires_at';

const getValueFromAnyStorage = (key) => (
    localStorage.getItem(key)
    || sessionStorage.getItem(key)
    || null
);

const getStorageForExistingKey = (key) => {
    if (localStorage.getItem(key) !== null) return localStorage;
    if (sessionStorage.getItem(key) !== null) return sessionStorage;
    return null;
};

const migrateLegacyTokenIfNeeded = () => {
    const existingAccessToken = getValueFromAnyStorage(ACCESS_TOKEN_KEY);
    if (existingAccessToken) {
        return existingAccessToken;
    }

    const legacyToken = getValueFromAnyStorage(LEGACY_TOKEN_KEY);
    if (!legacyToken) {
        return null;
    }

    const sourceStorage = getStorageForExistingKey(LEGACY_TOKEN_KEY) || sessionStorage;
    sourceStorage.setItem(ACCESS_TOKEN_KEY, legacyToken);
    sourceStorage.removeItem(LEGACY_TOKEN_KEY);
    sourceStorage.removeItem(LEGACY_EXPIRES_AT_KEY);
    return legacyToken;
};

export const getSessionUser = () => {
    try {
        const userRaw = getValueFromAnyStorage(USER_KEY);
        return userRaw ? JSON.parse(userRaw) : null;
    } catch {
        return null;
    }
};

export const getSessionAccessToken = () => (
    getValueFromAnyStorage(ACCESS_TOKEN_KEY)
    || migrateLegacyTokenIfNeeded()
    || null
);

export const getSessionRefreshToken = () => getValueFromAnyStorage(REFRESH_TOKEN_KEY);

export const getSessionToken = () => getSessionAccessToken();

export const getSessionExpiration = () => null;

export const clearSession = () => {
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    sessionStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_EXPIRES_AT_KEY);
    sessionStorage.removeItem(LEGACY_EXPIRES_AT_KEY);
};

export const persistSession = ({ user, accessToken, refreshToken, rememberMe = false }) => {
    const selectedStorage = rememberMe ? localStorage : sessionStorage;
    const alternateStorage = rememberMe ? sessionStorage : localStorage;

    alternateStorage.removeItem(USER_KEY);
    alternateStorage.removeItem(ACCESS_TOKEN_KEY);
    alternateStorage.removeItem(REFRESH_TOKEN_KEY);
    alternateStorage.removeItem(LEGACY_TOKEN_KEY);
    alternateStorage.removeItem(LEGACY_EXPIRES_AT_KEY);

    selectedStorage.setItem(USER_KEY, JSON.stringify(user));
    selectedStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    selectedStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    selectedStorage.removeItem(LEGACY_TOKEN_KEY);
    selectedStorage.removeItem(LEGACY_EXPIRES_AT_KEY);
};

export const isAdminUser = (user) => (
    String(user?.role_name || '').toLowerCase() === 'admin'
    || Number(user?.role_id) === 1
);

export const hasPermission = (user, permissionSlug) => {
    if (!permissionSlug) {
        return true;
    }

    if (!user) {
        return false;
    }

    if (isAdminUser(user)) {
        return true;
    }

    const permissions = Array.isArray(user.permissions) ? user.permissions : [];
    return permissions.includes(permissionSlug);
};
