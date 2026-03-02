import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const configMap = {
    error: {
        className: 'alert--error',
        icon: <AlertCircle size={20} />
    },
    success: {
        className: 'alert--success',
        icon: <CheckCircle size={20} />
    },
    warning: {
        className: 'alert--warning',
        icon: <AlertTriangle size={20} />
    },
    info: {
        className: 'alert--info',
        icon: <Info size={20} />
    }
};

const Alert = ({ children, type = 'error', icon, className = '' }) => {
    const config = configMap[type] || configMap.error;

    return (
        <div className={`alert fade-in ${config.className} ${className}`.trim()} role="alert">
            <span className="alert__icon">
                {icon || config.icon}
            </span>
            <div>{children}</div>
        </div>
    );
};

export default Alert;
