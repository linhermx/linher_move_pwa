import React, { useRef } from 'react';
import { X } from 'lucide-react';
import useModalAccessibility from '../hooks/useModalAccessibility';

const ModalShell = ({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    footer,
    size = 'md',
    shellClassName = '',
    bodyClassName = '',
    labelledBy,
    describedBy,
    initialFocusRef = null
}) => {
    const dialogRef = useRef(null);

    useModalAccessibility({
        isOpen,
        onClose,
        dialogRef,
        initialFocusRef
    });

    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <section
                className={`modal-shell modal-shell--${size} ${shellClassName}`.trim()}
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                aria-describedby={describedBy}
                tabIndex={-1}
                ref={dialogRef}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="modal-header">
                    <div>
                        {title ? <h2 id={labelledBy} className="modal-title">{title}</h2> : null}
                        {subtitle ? <p id={describedBy} className="modal-subtitle">{subtitle}</p> : null}
                    </div>
                    <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar modal">
                        <X size={18} />
                    </button>
                </div>
                <div className={`modal-body stack-md ${bodyClassName}`.trim()}>
                    {children}
                    {footer ? <div className="modal-actions">{footer}</div> : null}
                </div>
            </section>
        </div>
    );
};

export default ModalShell;
