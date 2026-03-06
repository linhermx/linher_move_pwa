import React from 'react';
import StatusView from './StatusView';
import { hasPermission } from '../utils/session';

const ProtectedRoute = ({
    user,
    requiredPermission = null,
    requiredRole = null,
    children
}) => {
    const isAuthenticated = Boolean(user);
    const roleName = String(user?.role_name || '').toLowerCase();
    const hasRequiredRole = requiredRole ? roleName === String(requiredRole).toLowerCase() : true;
    const hasRequiredPermission = requiredPermission ? hasPermission(user, requiredPermission) : true;
    const isAuthorized = isAuthenticated && hasRequiredRole && hasRequiredPermission;

    if (isAuthorized) {
        return children;
    }

    const message = !isAuthenticated
        ? 'Tu sesión no es válida. Inicia sesión de nuevo.'
        : requiredRole === 'admin'
            ? 'Este módulo está reservado para administradores.'
            : 'No tienes permisos para acceder a este módulo.';

    return (
        <div className="page-shell">
            <StatusView
                type="error"
                fullHeight
                message={message}
            />
        </div>
    );
};

export default ProtectedRoute;
