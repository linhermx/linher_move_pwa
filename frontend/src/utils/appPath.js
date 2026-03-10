const normalizeBaseUrl = (baseUrl) => {
    const rawBaseUrl = String(baseUrl || '').trim();
    const withLeadingSlash = rawBaseUrl.startsWith('/') ? rawBaseUrl : `/${rawBaseUrl}`;
    const collapsedSlashes = withLeadingSlash.replace(/\/{2,}/g, '/');
    const ensuredTrailingSlash = collapsedSlashes.endsWith('/') ? collapsedSlashes : `${collapsedSlashes}/`;
    return ensuredTrailingSlash === '//' ? '/' : ensuredTrailingSlash;
};

const normalizePathname = (pathname) => {
    const rawPathname = String(pathname || '').trim();

    if (!rawPathname) {
        return '/';
    }

    const withLeadingSlash = rawPathname.startsWith('/') ? rawPathname : `/${rawPathname}`;
    const collapsedSlashes = withLeadingSlash.replace(/\/{2,}/g, '/');

    if (collapsedSlashes === '/') {
        return '/';
    }

    return collapsedSlashes.replace(/\/+$/, '');
};

const normalizeRoutePath = (routePath) => {
    if (!routePath || routePath === '/') {
        return '/';
    }

    return normalizePathname(routePath);
};

export const APP_BASE_URL = normalizeBaseUrl(import.meta.env.BASE_URL || '/');
export const APP_BASE_PATH = APP_BASE_URL === '/' ? '' : APP_BASE_URL.replace(/\/$/, '');

export const buildAppPath = (routePath = '/') => {
    const normalizedRoute = normalizeRoutePath(routePath);

    if (!APP_BASE_PATH) {
        return normalizedRoute;
    }

    if (normalizedRoute === '/') {
        return `${APP_BASE_PATH}/`;
    }

    return `${APP_BASE_PATH}${normalizedRoute}`;
};

export const buildBaseRelativePath = (assetPath = '') => {
    const normalizedAssetPath = String(assetPath || '').replace(/^\/+/, '');
    return normalizedAssetPath ? `${APP_BASE_URL}${normalizedAssetPath}` : APP_BASE_URL;
};

export const isCurrentAppRoute = (pathname, routePath = '/') => {
    const normalizedPathname = normalizePathname(pathname);
    const normalizedRoutePath = normalizeRoutePath(routePath);
    const normalizedBaseAwarePath = normalizePathname(buildAppPath(routePath));

    return normalizedPathname === normalizedRoutePath
        || normalizedPathname === normalizedBaseAwarePath;
};
