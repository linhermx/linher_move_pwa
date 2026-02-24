import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'danger', showCancel = true, isLoading = false }) => {
    if (!isOpen) return null;

    const accentColor = type === 'danger' ? 'var(--color-primary)' : 'var(--color-info)';

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
            backdropFilter: 'blur(4px)'
        }}>
            <div className="card" style={{
                width: '100%',
                maxWidth: '400px',
                padding: 'var(--spacing-xl)',
                position: 'relative',
                animation: 'modal-appear 0.2s ease-out',
                textAlign: 'center'
            }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: `rgba(${type === 'danger' ? '255, 72, 72' : '0, 123, 255'}, 0.1)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto var(--spacing-lg)',
                    color: accentColor
                }}>
                    <AlertTriangle size={32} />
                </div>

                <h2 style={{ marginBottom: '12px', fontSize: '20px' }}>{title}</h2>
                <p className="text-muted" style={{ marginBottom: 'var(--spacing-xl)', fontSize: '14px', lineHeight: '1.5' }}>
                    {message}
                </p>

                <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                    {showCancel && (
                        <button
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: 'transparent',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (!isLoading && onConfirm) onConfirm();
                        }}
                        disabled={isLoading}
                        style={{
                            flex: 1,
                            padding: '12px',
                            backgroundColor: isLoading ? 'var(--color-text-dim)' : accentColor,
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            color: 'white',
                            fontWeight: 'bold',
                            cursor: isLoading ? 'default' : 'pointer',
                            opacity: isLoading ? 0.7 : 1
                        }}
                    >
                        {isLoading ? 'Guardando...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
