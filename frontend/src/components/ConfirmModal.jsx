import React from 'react';
import { AlertTriangle } from 'lucide-react';
import ModalShell from './ModalShell';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'danger', showCancel = true, isLoading = false }) => {
    if (!isOpen) return null;

    const accentClassName = type === 'danger' ? 'status-badge--danger' : 'status-badge--info';
    const labelledBy = 'confirm-modal-title';
    const describedBy = 'confirm-modal-description';

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            size="sm"
            labelledBy={labelledBy}
            describedBy={describedBy}
            footer={(
                <>
                    {showCancel ? (
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            {cancelText}
                        </button>
                    ) : null}
                    <button
                        type="button"
                        onClick={() => {
                            if (!isLoading && onConfirm) onConfirm();
                        }}
                        disabled={isLoading}
                        className="btn btn-primary"
                    >
                        {isLoading ? 'Guardando...' : confirmText}
                    </button>
                </>
            )}
        >
            <div className="stack-md text-center">
                <div className={`modal-icon ${accentClassName}`}>
                    <AlertTriangle size={32} />
                </div>
                <div className="stack-sm">
                    <h2 id={labelledBy} className="modal-title">{title}</h2>
                    <p id={describedBy} className="text-muted">{message}</p>
                </div>
            </div>
        </ModalShell>
    );
};

export default ConfirmModal;
