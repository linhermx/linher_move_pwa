import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const SHORT_REFRESH_TOKEN_EXPIRES_IN = '8h';
const REMEMBER_REFRESH_TOKEN_EXPIRES_IN = '7d';
const MIN_SECRET_LENGTH = 24;
const BLOCKED_SECRETS = new Set([
    'change-this-secret',
    'change-this-refresh-secret',
    'change-this-refresh-secret-too',
    'linher-move-dev-secret-change-me'
]);

let authSecretsCache = null;

const toBoolean = (value) => (
    value === true
    || value === 'true'
    || value === 1
    || value === '1'
);

const readSecret = (key) => String(process.env[key] || '').trim();

const assertSecret = (key) => {
    const value = readSecret(key);
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }

    if (value.length < MIN_SECRET_LENGTH || BLOCKED_SECRETS.has(value)) {
        throw new Error(`${key} is insecure. Configure a strong secret with at least ${MIN_SECRET_LENGTH} characters.`);
    }

    return value;
};

const decodeTokenExpiry = (token) => {
    const decoded = jwt.decode(token);
    return decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : null;
};

const getAuthSecrets = () => {
    if (!authSecretsCache) {
        authSecretsCache = {
            accessSecret: assertSecret('JWT_SECRET'),
            refreshSecret: assertSecret('JWT_REFRESH_SECRET')
        };
    }

    return authSecretsCache;
};

export const validateAuthConfig = () => {
    getAuthSecrets();
    return true;
};

export const resolveRefreshTokenExpiry = (rememberMe = false) => (
    toBoolean(rememberMe) ? REMEMBER_REFRESH_TOKEN_EXPIRES_IN : SHORT_REFRESH_TOKEN_EXPIRES_IN
);

export const signAuthTokens = ({ userId, roleName }, rememberMe = false) => {
    const { accessSecret, refreshSecret } = getAuthSecrets();
    const tokenId = randomUUID();
    const normalizedRole = String(roleName || '').toLowerCase();
    const remember = toBoolean(rememberMe);

    const accessToken = jwt.sign(
        {
            sub: userId,
            id: userId,
            role: normalizedRole,
            jti: tokenId
        },
        accessSecret,
        { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
        {
            sub: userId,
            id: userId,
            jti: tokenId,
            remember_me: remember
        },
        refreshSecret,
        { expiresIn: resolveRefreshTokenExpiry(remember) }
    );

    return {
        accessToken,
        refreshToken,
        access_expires_at: decodeTokenExpiry(accessToken),
        refresh_expires_at: decodeTokenExpiry(refreshToken)
    };
};

export const signAuthToken = ({ userId, roleName }, rememberMe = false) => {
    const { accessToken, access_expires_at: expiresAt } = signAuthTokens({ userId, roleName }, rememberMe);
    return {
        token: accessToken,
        expires_at: expiresAt
    };
};

export const verifyAccessToken = (token) => {
    const { accessSecret } = getAuthSecrets();
    return jwt.verify(token, accessSecret);
};

export const verifyRefreshToken = (token) => {
    const { refreshSecret } = getAuthSecrets();
    return jwt.verify(token, refreshSecret);
};

export const verifyAuthToken = (token) => verifyAccessToken(token);
