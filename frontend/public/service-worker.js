const CACHE_VERSION = 'v2';
const STATIC_CACHE = `linher-move-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `linher-move-runtime-${CACHE_VERSION}`;

const CORE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.webmanifest',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/icon-maskable-192.png',
    '/icons/icon-maskable-512.png',
    '/icons/apple-touch-icon.png',
    '/icons/favicon-32.png',
    '/icons/favicon-16.png'
];

const OPTIONAL_ASSETS = [
    '/media/connectivity/offline.gif',
    '/media/connectivity/online.gif',
    '/icons/media/connectivity/offline.gif',
    '/icons/media/connectivity/online.gif'
];

const STATIC_EXTENSIONS = /\.(?:js|css|png|jpg|jpeg|webp|svg|gif|ico|woff2?|ttf|map)$/i;

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

    // Keep API traffic fully network-driven to avoid stale transactional data.
    if (requestUrl.pathname.startsWith('/api/')) {
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request, '/index.html'));
        return;
    }

    const isConnectivityMedia = requestUrl.pathname.startsWith('/media/connectivity/')
        || requestUrl.pathname.startsWith('/icons/media/connectivity/');

    // Connectivity GIFs must be refreshed from network first so replacements are reflected quickly.
    if (isConnectivityMedia) {
        event.respondWith(networkFirst(request));
        return;
    }

    const shouldUseStaticStrategy = requestUrl.pathname.startsWith('/assets/')
        || requestUrl.pathname === '/manifest.webmanifest'
        || requestUrl.pathname.startsWith('/icons/')
        || requestUrl.pathname.startsWith('/media/')
        || STATIC_EXTENSIONS.test(requestUrl.pathname);

    if (shouldUseStaticStrategy) {
        event.respondWith(staleWhileRevalidate(request));
    }
});
