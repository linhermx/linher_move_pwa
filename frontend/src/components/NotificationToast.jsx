import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const NotificationToast = ({ message, type, onClose }) => {
    const icons = {
        success: <CheckCircle size={20} color="#28A745" />,
        error: <AlertCircle size={20} color="#FF4848" />,
        info: <Info size={20} color="#007BFF" />
    };

    const borderColors = {
        success: 'rgba(40, 167, 69, 0.4)',
        error: 'rgba(255, 72, 72, 0.4)',
        info: 'rgba(0, 123, 255, 0.4)'
    };

    return (
        <div style={{
            minWidth: '300px',
            backgroundColor: 'rgba(26, 26, 26, 0.9)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${borderColors[type]}`,
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            animation: 'toast-in 0.3s ease-out',
            color: 'white',
            position: 'relative'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icons[type]}
            </div>
            <div style={{ flexGrow: 1, fontSize: '14px' }}>
                {message}
            </div>
            <button
                onClick={onClose}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-dim)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <X size={16} />
            </button>

            <style>{`
                @keyframes toast-in {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default NotificationToast;
