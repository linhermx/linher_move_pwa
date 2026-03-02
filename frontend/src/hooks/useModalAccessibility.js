import { useEffect } from 'react';

const FOCUSABLE_SELECTOR = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(', ');

const getOpenModalCount = () => Number(document.body.dataset.modalOpenCount || 0);

export const useModalAccessibility = ({ isOpen, onClose, dialogRef, initialFocusRef = null, restoreFocus = true }) => {
    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const nextCount = getOpenModalCount() + 1;

        document.body.dataset.modalOpenCount = String(nextCount);
        document.body.classList.add('modal-open');

        const focusFrame = window.requestAnimationFrame(() => {
            const dialogElement = dialogRef?.current || null;
            const focusTarget =
                initialFocusRef?.current ||
                dialogElement?.querySelector(FOCUSABLE_SELECTOR) ||
                dialogElement;

            focusTarget?.focus?.();
        });

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                onClose?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.cancelAnimationFrame(focusFrame);
            window.removeEventListener('keydown', handleKeyDown);

            const remainingCount = Math.max(getOpenModalCount() - 1, 0);
            if (remainingCount === 0) {
                document.body.classList.remove('modal-open');
                delete document.body.dataset.modalOpenCount;
            } else {
                document.body.dataset.modalOpenCount = String(remainingCount);
            }

            if (restoreFocus && previousActiveElement?.focus) {
                window.requestAnimationFrame(() => previousActiveElement.focus());
            }
        };
    }, [dialogRef, initialFocusRef, isOpen, onClose, restoreFocus]);
};

export default useModalAccessibility;
