import React from 'react';
import { AlertCircle, RefreshCw, FolderOpen, Loader2 } from 'lucide-react';

const StatusView = ({
    type = 'loading', // 'loading', 'error', 'empty'
    message,
    onRetry,
    iconSize = 48,
    fullHeight = false
}) => {
    const containerClassName = `status-view fade-in ${fullHeight ? 'status-view--full-height' : 'status-view--inline'}`.trim();

    const renderIcon = () => {
        switch (type) {
            case 'loading':
                return <Loader2 size={iconSize} className="status-view__icon status-view__icon--loading spin" />;
            case 'error':
                return <AlertCircle size={iconSize} className="status-view__icon status-view__icon--error" />;
            case 'empty':
                return <FolderOpen size={iconSize} className="status-view__icon status-view__icon--empty" />;
            default:
                return null;
        }
    };

    const defaultMessages = {
        loading: 'Cargando información...',
        error: 'Ocurrió un error al cargar los datos.',
        empty: 'No se encontraron resultados.'
    };

    return (
        <div className={containerClassName}>
            {renderIcon()}
            <div className="status-view__body">
                <h3 className={`status-view__title ${type === 'error' ? 'status-view__title--error' : ''}`.trim()}>
                    {type === 'error' ? '¡Ups! Algo salió mal' : type === 'empty' ? 'Sin datos' : ''}
                </h3>
                <p className="status-view__message text-muted">
                    {message || defaultMessages[type]}
                </p>
            </div>

            {type === 'error' && onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="btn btn-primary status-view__retry"
                >
                    <RefreshCw size={16} /> Reintentar
                </button>
            )}
        </div>
    );
};

export default StatusView;
