const CACHE_VERSION = 'v3';
const STATIC_CACHE = `linher-move-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `linher-move-runtime-${CACHE_VERSION}`;
const STATIC_EXTENSIONS = /\.(?:js|css|png|jpg|jpeg|webp|svg|gif|ico|woff2?|ttf|map)$/i;

const APP_SCOPE_URL = new URL(self.registration.scope);
const APP_SCOPE_PATH = APP_SCOPE_URL.pathname;
const APP_BASE_PATH = APP_SCOPE_PATH === '/' ? '' : APP_SCOPE_PATH.replace(/\/$/, '');

const buildScopedPath = (path = '') => {
    const normalizedPath = String(path || '').replace(/^\/+/, '');

    if (!APP_BASE_PATH) {
        return normalizedPath ? `/${normalizedPath}` : '/';
    }

    return normalizedPath ? `${APP_BASE_PATH}/${normalizedPath}` : `${APP_BASE_PATH}/`;
};

const isWithinAppScope = (pathname) => {
    if (!APP_BASE_PATH) {
        return true;
    }

    return pathname === APP_BASE_PATH || pathname.startsWith(`${APP_BASE_PATH}/`);
};

const CORE_ASSETS = [
    buildScopedPath(''),
    buildScopedPath('index.html'),
    buildScopedPath('manifest.webmanifest'),
    buildScopedPath('icons/icon-192.png'),
    buildScopedPath('icons/icon-512.png'),
    buildScopedPath('icons/icon-maskable-192.png'),
    buildScopedPath('icons/icon-maskable-512.png'),
    buildScopedPath('icons/apple-touch-icon.png'),
    buildScopedPath('icons/favicon-32.png'),
    buildScopedPath('icons/favicon-16.png')
];

const OPTIONAL_ASSETS = [
    buildScopedPath('media/connectivity/offline.gif'),
    buildScopedPath('media/connectivity/online.gif'),
    buildScopedPath('icons/media/connectivity/offline.gif'),
    buildScopedPath('icons/media/connectivity/online.gif')
];

const cacheResponse = async (cacheName, request, response) => {
    if (!response || response.status !== 200 || response.type === 'opaque') {
        return response;
    }

    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    return response;
};

const networkFirst = async (request, fallbackUrl = null) => {
    try {
        const response = await fetch(request);
        await cacheResponse(RUNTIME_CACHE, request, response);
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }

        if (fallbackUrl) {
            const fallback = await caches.match(fallbackUrl);
            if (fallback) {
                return fallback;
            }
        }

        throw new Error('Network and cache unavailable');
    }
};

const staleWhileRevalidate = async (request) => {
    const cached = await caches.match(request);

    const networkPromise = fetch(request)
        .then((response) => cacheResponse(RUNTIME_CACHE, request, response))
        .catch(() => null);

    if (cached) {
        return cached;
    }

    const networkResponse = await networkPromise;
    if (networkResponse) {
        return networkResponse;
    }

    throw new Error('Unable to resolve request');
};

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(async (cache) => {
                await cache.addAll(CORE_ASSETS);
                await Promise.allSettled(
                    OPTIONAL_ASSETS.map((assetPath) => cache.add(assetPath))
                );
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheKeys) => Promise.all(
                cacheKeys
                    .filter((cacheKey) => cacheKey.startsWith('linher-move-') && !cacheKey.endsWith(CACHE_VERSION))
                    .map((cacheKey) => caches.delete(cacheKey))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') {
        return;
    }

    const requestUrl = new URL(request.url);
    if (requestUrl.origin !== self.location.origin) {
        return;
    }

    if (!isWithinAppScope(requestUrl.pathname)) {
        return;
    }

    // Keep API traffic fully network-driven to avoid stale transactional data.
    if (requestUrl.pathname.startsWith('/api/')) {
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request, buildScopedPath('index.html')));
        return;
    }

    const isConnectivityMedia = requestUrl.pathname.startsWith(buildScopedPath('media/connectivity/'))
        || requestUrl.pathname.startsWith(buildScopedPath('icons/media/connectivity/'));

    // Connectivity GIFs must be refreshed from network first so replacements are reflected quickly.
    if (isConnectivityMedia) {
        event.respondWith(networkFirst(request));
        return;
    }

    const shouldUseStaticStrategy = requestUrl.pathname.startsWith(buildScopedPath('assets/'))
        || requestUrl.pathname === buildScopedPath('manifest.webmanifest')
        || requestUrl.pathname.startsWith(buildScopedPath('icons/'))
        || requestUrl.pathname.startsWith(buildScopedPath('media/'))
        || STATIC_EXTENSIONS.test(requestUrl.pathname);

    if (shouldUseStaticStrategy) {
        event.respondWith(staleWhileRevalidate(request));
    }
});
