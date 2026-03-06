import React, { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';

const VIEWPORT_PADDING = 16;

const CustomMenu = ({ options, icon }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [openUpward, setOpenUpward] = useState(false);
    const containerRef = useRef(null);
    const menuRef = useRef(null);
    const MenuIcon = icon || MoreVertical;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
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
            const tableScrollContainer = container.closest('.table-scroll');
            const lowerBoundary = tableScrollContainer
                ? Math.min(window.innerHeight - VIEWPORT_PADDING, tableScrollContainer.getBoundingClientRect().bottom - VIEWPORT_PADDING)
                : window.innerHeight - VIEWPORT_PADDING;
            const upperBoundary = tableScrollContainer
                ? Math.max(VIEWPORT_PADDING, tableScrollContainer.getBoundingClientRect().top + VIEWPORT_PADDING)
                : VIEWPORT_PADDING;
            const availableWidth = Math.max(180, window.innerWidth - (VIEWPORT_PADDING * 2));
            const menuWidth = Math.min(Math.max(menu.offsetWidth, 180), availableWidth);
            const menuHeight = menu.offsetHeight;
            const spaceBelow = lowerBoundary - triggerRect.bottom;
            const spaceAbove = triggerRect.top - upperBoundary;
            const shouldOpenUpward = spaceBelow < menuHeight && spaceAbove > spaceBelow;
            const availableVerticalSpace = shouldOpenUpward ? spaceAbove : spaceBelow;
            const maxHeight = Math.max(120, Math.floor(availableVerticalSpace));

            let left = triggerRect.width - menuWidth;
            let viewportLeft = triggerRect.left + left;
            let viewportRight = viewportLeft + menuWidth;

            if (viewportLeft < VIEWPORT_PADDING) {
                left += VIEWPORT_PADDING - viewportLeft;
                viewportLeft = VIEWPORT_PADDING;
                viewportRight = viewportLeft + menuWidth;
            }

            if (viewportRight > window.innerWidth - VIEWPORT_PADDING) {
                left -= viewportRight - (window.innerWidth - VIEWPORT_PADDING);
            }

            setOpenUpward(shouldOpenUpward);
            menu.style.setProperty('--custom-menu-left', `${left}px`);
            menu.style.setProperty('--custom-menu-max-height', `${maxHeight}px`);
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

            {isOpen ? (
                <div
                    ref={menuRef}
                    className={`custom-menu__panel custom-scrollbar ${openUpward ? 'custom-menu__panel--upward' : ''}`.trim()}
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
                </div>
            ) : null}
        </div>
    );
};

export default CustomMenu;
