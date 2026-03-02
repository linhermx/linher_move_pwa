import React from 'react';
import { AlertCircle, RefreshCw, FolderOpen, Loader2 } from 'lucide-react';

const StatusView = ({
    type = 'loading', // 'loading', 'error', 'empty'
    message,
    onRetry,
    iconSize = 48,
    fullHeight = false
}) => {
    const containerStyle = {
        padding: 'var(--spacing-xxl)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 'var(--spacing-md)',
        minHeight: fullHeight ? '60vh' : '200px',
        width: '100%'
    };

    const renderIcon = () => {
        switch (type) {
            case 'loading':
                return <Loader2 size={iconSize} className="spin" style={{ color: 'var(--color-primary)' }} />;
            case 'error':
                return <AlertCircle size={iconSize} style={{ color: 'var(--color-primary)' }} />;
            case 'empty':
                return <FolderOpen size={iconSize} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />;
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
        <div style={containerStyle} className="fade-in">
            {renderIcon()}
            <div>
                <h3 style={{ fontSize: '18px', marginBottom: '8px', color: type === 'error' ? 'var(--color-primary)' : 'inherit' }}>
                    {type === 'error' ? '¡Ups! Algo salió mal' : type === 'empty' ? 'Sin datos' : ''}
                </h3>
                <p className="text-muted" style={{ maxWidth: '300px', margin: '0 auto', fontSize: '14px' }}>
                    {message || defaultMessages[type]}
                </p>
            </div>

            {type === 'error' && onRetry && (
                <button
                    onClick={onRetry}
                    className="button-primary"
                    style={{
                        marginTop: 'var(--spacing-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 20px',
                        fontSize: '14px'
                    }}
                >
                    <RefreshCw size={16} /> Reintentar
                </button>
            )}
        </div>
    );
};

export default StatusView;
