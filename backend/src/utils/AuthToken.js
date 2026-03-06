import jwt from 'jsonwebtoken';

const DEFAULT_SECRET = 'linher-move-dev-secret-change-me';
const SHORT_SESSION_EXPIRES_IN = '8h';
const REMEMBER_SESSION_EXPIRES_IN = '7d';

const toBoolean = (value) => (
    value === true
    || value === 'true'
    || value === 1
    || value === '1'
);

const getSecret = () => process.env.JWT_SECRET || DEFAULT_SECRET;

export const resolveSessionExpiry = (rememberMe = false) => (
    toBoolean(rememberMe) ? REMEMBER_SESSION_EXPIRES_IN : SHORT_SESSION_EXPIRES_IN
);

export const signAuthToken = ({ userId, roleName }, rememberMe = false) => {
    const expiresIn = resolveSessionExpiry(rememberMe);
    const token = jwt.sign(
        {
            sub: userId,
            role: String(roleName || '').toLowerCase()
        },
        getSecret(),
        { expiresIn }
    );

    const decoded = jwt.decode(token);
    const expiresAt = decoded?.exp
        ? new Date(decoded.exp * 1000).toISOString()
        : null;

    return {
        token,
        expires_at: expiresAt
    };
};

export const verifyAuthToken = (token) => jwt.verify(token, getSecret());
