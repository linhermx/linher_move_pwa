import { buildApiUrl } from '../utils/url';

const LOG_ENDPOINT = buildApiUrl('/logs/error');
const recentErrors = new Map();

const redactSensitiveKeys = (value, depth = 0) => {
    if (depth > 5) {
        return '[truncated]';
    }

    if (value === null || value === undefined) {
        return value;
    }

    if (typeof value === 'string') {
        return value.length > 500 ? `${value.slice(0, 500)}...` : value;
    }

    if (typeof value !== 'object') {
        return value;
    }

    if (Array.isArray(value)) {
        return value.slice(0, 20).map((item) => redactSensitiveKeys(item, depth + 1));
    }

    return Object.entries(value).reduce((accumulator, [key, nestedValue]) => {
        const normalizedKey = key.toLowerCase();
        if (['password', 'token', 'access_token', 'refresh_token', 'authorization', 'cookie'].includes(normalizedKey)) {
            accumulator[key] = '[redacted]';
            return accumulator;
        }

        accumulator[key] = redactSensitiveKeys(nestedValue, depth + 1);
        return accumulator;
    }, {});
};

const buildFingerprint = (payload) => JSON.stringify([
    payload.action,
    payload.message,
    payload.source,
    payload.location_path
]);

const shouldSend = (fingerprint) => {
    const now = Date.now();
    const lastTimestamp = recentErrors.get(fingerprint);

    if (lastTimestamp && now - lastTimestamp < 5000) {
        return false;
    }

    recentErrors.set(fingerprint, now);
    return true;
};

const postLog = (payload) => {
    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(LOG_ENDPOINT, blob);
        return;
    }

    fetch(LOG_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true
    }).catch(() => {});
};

export const reportClientError = (payload = {}) => {
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
    const normalizedPayload = redactSensitiveKeys({
        action: payload.action || 'FRONTEND_RUNTIME_ERROR',
        severity: payload.severity || 'error',
        source: payload.source || 'frontend',
        message: payload.message || 'Error sin mensaje',
        stack: payload.stack || null,
        component_stack: payload.component_stack || null,
        location_path: window.location.pathname,
        location_search: window.location.search,
        browser: navigator.userAgent,
        details: payload.details || null,
        operator_id: payload.operator_id || user?.id || null
    });

    const fingerprint = buildFingerprint(normalizedPayload);
    if (!shouldSend(fingerprint)) {
        return;
    }

    postLog(normalizedPayload);
};

export const installGlobalErrorLogging = () => {
    window.addEventListener('error', (event) => {
        reportClientError({
            action: 'WINDOW_ERROR',
            message: event.message,
            stack: event.error?.stack,
            details: {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            }
        });
    });

    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        reportClientError({
            action: 'UNHANDLED_REJECTION',
            message: reason?.message || String(reason),
            stack: reason?.stack,
            details: {
                reason: String(reason)
            }
        });
    });
};
