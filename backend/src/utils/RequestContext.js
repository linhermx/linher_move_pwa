import crypto from 'crypto';

const SENSITIVE_KEYS = new Set([
    'password',
    'confirm_password',
    'access_token',
    'refresh_token',
    'token',
    'authorization',
    'cookie',
    'client_secret'
]);

const MAX_STRING_LENGTH = 500;
const MAX_DEPTH = 5;

export const createRequestId = () => {
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return crypto.randomBytes(16).toString('hex');
};

export const getOperatorIdFromRequest = (req) => {
    const bodyOperatorId = req?.body?.operator_id;
    const queryOperatorId = req?.query?.operator_id;

    return bodyOperatorId || queryOperatorId || null;
};

export const requestContextMiddleware = (req, res, next) => {
    req.requestId = createRequestId();
    req.operatorId = getOperatorIdFromRequest(req);
    res.setHeader('x-request-id', req.requestId);
    next();
};

export const sanitizeForLog = (value, depth = 0) => {
    if (depth > MAX_DEPTH) {
        return '[truncated]';
    }

    if (value === null || value === undefined) {
        return value;
    }

    if (typeof value === 'string') {
        return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}...` : value;
    }

    if (typeof value !== 'object') {
        return value;
    }

    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message,
            stack: sanitizeForLog(value.stack, depth + 1)
        };
    }

    if (Array.isArray(value)) {
        return value.slice(0, 20).map((item) => sanitizeForLog(item, depth + 1));
    }

    return Object.entries(value).reduce((acc, [key, nestedValue]) => {
        if (SENSITIVE_KEYS.has(key.toLowerCase())) {
            acc[key] = '[redacted]';
            return acc;
        }

        acc[key] = sanitizeForLog(nestedValue, depth + 1);
        return acc;
    }, {});
};

export const buildRequestContext = (req, extra = {}) => ({
    request_id: req?.requestId || null,
    operator_id: getOperatorIdFromRequest(req),
    method: req?.method || null,
    url: req?.originalUrl || req?.url || null,
    ip: req?.ip || null,
    user_agent: req?.headers?.['user-agent'] || null,
    ...sanitizeForLog(extra)
});

export const logHandledError = async ({
    logger,
    req,
    action,
    error,
    source = 'server',
    severity = 'error',
    details = {}
}) => {
    if (!logger) {
        return;
    }

    try {
        await logger.error(
            getOperatorIdFromRequest(req),
            action,
            {
                ...buildRequestContext(req, details),
                error: sanitizeForLog(error)
            },
            req?.ip || null,
            { severity, source }
        );
    } catch (loggingError) {
        console.error('Failed to persist handled error log:', loggingError);
    }
};

export const logRuntimeError = async ({
    logger,
    action,
    error,
    details = {},
    source = 'runtime',
    severity = 'critical'
}) => {
    if (!logger) {
        return;
    }

    try {
        await logger.error(
            null,
            action,
            {
                ...sanitizeForLog(details),
                error: sanitizeForLog(error)
            },
            null,
            { severity, source }
        );
    } catch (loggingError) {
        console.error('Failed to persist runtime error log:', loggingError);
    }
};
