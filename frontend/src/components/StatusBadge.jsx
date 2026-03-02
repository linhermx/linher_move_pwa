import React from 'react';

const variantMap = {
    success: 'status-badge--success',
    error: 'status-badge--danger',
    warning: 'status-badge--warning',
    info: 'status-badge--info',
    neutral: 'status-badge--neutral'
};

const StatusBadge = ({ children, variant = 'neutral', showDot = false }) => (
    <span className={`status-badge ${variantMap[variant] || variantMap.neutral}`}>
        {showDot ? <span className="status-badge__dot" aria-hidden="true" /> : null}
        {children}
    </span>
);

export default StatusBadge;
