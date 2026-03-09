import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

const VIEWPORT_PADDING = 16;
const MENU_GAP = 8;

const CustomMenu = ({ options, icon }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const menuRef = useRef(null);
    const MenuIcon = icon || MoreVertical;

    useEffect(() => {
        const handleClickOutside = (event) => {
            const container = containerRef.current;
            const menu = menuRef.current;

            if (!container) {
                return;
            }

            if (container.contains(event.target) || menu?.contains(event.target)) {
                return;
            }

            setIsOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const updateMenuPosition = () => {
            const container = containerRef.current;
            const menu = menuRef.current;

            if (!container || !menu) {
                return;
            }

            const triggerRect = container.getBoundingClientRect();
            const availableWidth = Math.max(180, window.innerWidth - (VIEWPORT_PADDING * 2));
            const menuWidth = Math.min(Math.max(menu.offsetWidth, 180), availableWidth);
            const menuHeight = menu.offsetHeight;
            const spaceBelow = (window.innerHeight - VIEWPORT_PADDING) - triggerRect.bottom;
            const spaceAbove = triggerRect.top - VIEWPORT_PADDING;
            const shouldOpenUpward = spaceBelow < menuHeight && spaceAbove > spaceBelow;
            const availableVerticalSpace = shouldOpenUpward ? spaceAbove : spaceBelow;
            const maxHeight = Math.max(120, Math.floor(availableVerticalSpace));

            let left = triggerRect.right - menuWidth;
            const maxLeft = window.innerWidth - VIEWPORT_PADDING - menuWidth;

            if (left < VIEWPORT_PADDING) {
                left = VIEWPORT_PADDING;
            }

            if (left > maxLeft) {
                left = maxLeft;
            }

            const renderedMenuHeight = Math.min(menuHeight, maxHeight);
            let top = shouldOpenUpward
                ? triggerRect.top - renderedMenuHeight - MENU_GAP
                : triggerRect.bottom + MENU_GAP;
            const minTop = VIEWPORT_PADDING;
            const maxTop = window.innerHeight - VIEWPORT_PADDING - renderedMenuHeight;

            if (top < minTop) {
                top = minTop;
            }

            if (top > maxTop) {
                top = Math.max(minTop, maxTop);
            }

            menu.style.left = `${Math.round(left)}px`;
            menu.style.top = `${Math.round(top)}px`;
            menu.style.maxHeight = `${maxHeight}px`;
            menu.style.visibility = 'visible';
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        updateMenuPosition();
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', updateMenuPosition);
        window.addEventListener('scroll', updateMenuPosition, true);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', updateMenuPosition);
            window.removeEventListener('scroll', updateMenuPosition, true);
        };
    }, [isOpen]);

    const menuPanel = isOpen ? createPortal(
        <div
            ref={menuRef}
            className="custom-menu__panel custom-scrollbar"
            role="menu"
        >
            {options.map((option, index) => (
                <button
                    key={index}
                    type="button"
                    className={`custom-menu__item ${option.variant === 'danger' ? 'custom-menu__item--danger' : ''}`.trim()}
                    role="menuitem"
                    onClick={() => {
                        option.onClick();
                        setIsOpen(false);
                    }}
                >
                    {option.icon ? React.cloneElement(option.icon, { size: 16 }) : null}
                    <span>{option.label}</span>
                </button>
            ))}
        </div>,
        document.body
    ) : null;

    return (
        <div ref={containerRef} className="custom-menu">
            <button
                type="button"
                className="custom-menu__trigger"
                aria-expanded={isOpen}
                aria-haspopup="menu"
                onClick={(event) => {
                    event.stopPropagation();
                    setIsOpen((currentState) => !currentState);
                }}
            >
                <MenuIcon size={18} />
            </button>
            {menuPanel}
        </div>
    );
};

export default CustomMenu;
