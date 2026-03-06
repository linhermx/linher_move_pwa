const USER_KEY = 'user';
const TOKEN_KEY = 'auth_token';
const EXPIRES_AT_KEY = 'auth_expires_at';

const getAvailableStorage = () => (
    localStorage.getItem(USER_KEY) ? localStorage : sessionStorage
);

export const getSessionUser = () => {
    try {
        const userRaw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
        return userRaw ? JSON.parse(userRaw) : null;
    } catch {
        return null;
    }
};

export const getSessionToken = () => {
    const preferredStorage = getAvailableStorage();
    return preferredStorage.getItem(TOKEN_KEY)
        || localStorage.getItem(TOKEN_KEY)
        || sessionStorage.getItem(TOKEN_KEY)
        || null;
};

export const getSessionExpiration = () => {
    const preferredStorage = getAvailableStorage();
    return preferredStorage.getItem(EXPIRES_AT_KEY)
        || localStorage.getItem(EXPIRES_AT_KEY)
        || sessionStorage.getItem(EXPIRES_AT_KEY)
        || null;
};

export const clearSession = () => {
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
    sessionStorage.removeItem(EXPIRES_AT_KEY);
};

export const persistSession = ({ user, token, expiresAt, rememberMe = false }) => {
    const selectedStorage = rememberMe ? localStorage : sessionStorage;
    const alternateStorage = rememberMe ? sessionStorage : localStorage;

    alternateStorage.removeItem(USER_KEY);
    alternateStorage.removeItem(TOKEN_KEY);
    alternateStorage.removeItem(EXPIRES_AT_KEY);

    selectedStorage.setItem(USER_KEY, JSON.stringify(user));
    selectedStorage.setItem(TOKEN_KEY, token);
    if (expiresAt) {
        selectedStorage.setItem(EXPIRES_AT_KEY, expiresAt);
    } else {
        selectedStorage.removeItem(EXPIRES_AT_KEY);
    }
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
