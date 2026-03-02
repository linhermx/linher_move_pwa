import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

const iconMap = {
    success: <CheckCircle size={20} className="text-success" />,
    error: <AlertCircle size={20} className="text-primary" />,
    info: <Info size={20} className="text-info" />
};

const NotificationToast = ({ message, type = 'info', onClose }) => (
    <div className={`toast fade-in-up toast--${type}`} role="status">
        <span className="toast__icon">{iconMap[type] || iconMap.info}</span>
        <div className="toast__message">{message}</div>
        <button type="button" className="toast__close" onClick={onClose} aria-label="Cerrar notificación">
            <X size={16} />
        </button>
    </div>
);

export default NotificationToast;
