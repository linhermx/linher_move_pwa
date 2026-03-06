import { UserModel } from '../models/UserModel.js';
import { verifyAuthToken } from '../utils/AuthToken.js';

const NON_DELEGABLE_PERMISSIONS = new Set(['manage_users', 'manage_backups']);

const parseBearerToken = (headerValue = '') => {
    const [scheme, token] = String(headerValue).trim().split(/\s+/);
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
        return null;
    }

    return token;
};

const isAdminUser = (user) => (
    String(user?.role_name || '').toLowerCase() === 'admin'
    || Number(user?.role_id) === 1
);

export const AuthMiddleware = (db) => {
    const userModel = new UserModel(db);

    const requireAuth = async (req, res, next) => {
        try {
            const token = parseBearerToken(req.headers.authorization);
            if (!token) {
                return res.status(401).json({ message: 'Autenticación requerida' });
            }

            const payload = verifyAuthToken(token);
            const userId = payload?.sub;
            if (!userId) {
                return res.status(401).json({ message: 'Token inválido' });
            }

            const user = await userModel.getByIdWithPermissions(userId);
            if (!user || user.status !== 'active') {
                return res.status(401).json({ message: 'Sesión inválida o usuario inactivo' });
            }

            req.authUser = user;
            return next();
        } catch (error) {
            return res.status(401).json({ message: 'Sesión expirada o inválida' });
        }
    };

    const requireRole = (roleName) => (req, res, next) => {
        const expected = String(roleName || '').toLowerCase();
        const currentRole = String(req.authUser?.role_name || '').toLowerCase();

        if (currentRole !== expected) {
            return res.status(403).json({ message: 'No autorizado para esta acción' });
        }

        return next();
    };

    const requirePermission = (permissionSlug) => (req, res, next) => {
        const user = req.authUser;
        if (!user) {
            return res.status(401).json({ message: 'Autenticación requerida' });
        }

        if (isAdminUser(user)) {
            return next();
        }

        const hasPermission = Array.isArray(user.permissions) && user.permissions.includes(permissionSlug);
        if (!hasPermission) {
            return res.status(403).json({ message: 'No autorizado para esta acción' });
        }

        return next();
    };

    const requireAnyPermission = (permissionSlugs = []) => (req, res, next) => {
        const user = req.authUser;
        if (!user) {
            return res.status(401).json({ message: 'Autenticación requerida' });
        }

        if (isAdminUser(user)) {
            return next();
        }

        const userPermissions = Array.isArray(user.permissions) ? user.permissions : [];
        const hasAnyPermission = permissionSlugs.some((permissionSlug) => userPermissions.includes(permissionSlug));

        if (!hasAnyPermission) {
            return res.status(403).json({ message: 'No autorizado para esta acción' });
        }

        return next();
    };

    const filterNonDelegablePermissions = (targetUser, permissionSlugs = []) => {
        const requested = Array.isArray(permissionSlugs) ? permissionSlugs : [];
        if (!targetUser || isAdminUser(targetUser)) {
            return { allowedPermissions: requested, ignoredPermissions: [] };
        }

        const allowedPermissions = requested.filter((permissionSlug) => !NON_DELEGABLE_PERMISSIONS.has(permissionSlug));
        const ignoredPermissions = requested.filter((permissionSlug) => NON_DELEGABLE_PERMISSIONS.has(permissionSlug));

        return { allowedPermissions, ignoredPermissions };
    };

    return {
        isAdminUser,
        requireAuth,
        requireRole,
        requirePermission,
        requireAnyPermission,
        filterNonDelegablePermissions
    };
};

export const NON_DELEGABLE_PERMISSION_SLUGS = Array.from(NON_DELEGABLE_PERMISSIONS);
