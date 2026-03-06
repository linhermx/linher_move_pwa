import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const VIEWPORT_PADDING = 16;

const CustomSelect = ({
    options,
    value,
    onChange,
    placeholder = 'Seleccionar...',
    icon: Icon,
    id,
    name,
    ariaLabel,
    labelledBy,
    describedBy
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [openUpward, setOpenUpward] = useState(false);
    const containerRef = useRef(null);
    const dropdownRef = useRef(null);
    const generatedId = useId();
    const triggerId = id || `custom-select-${generatedId}`;
    const listboxId = `${triggerId}-listbox`;

    const selectedOption = options.find((opt) => opt.value === value) || null;

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

        const updateDropdownPosition = () => {
            const container = containerRef.current;
            const dropdown = dropdownRef.current;

            if (!container || !dropdown) {
                return;
            }

            const triggerRect = container.getBoundingClientRect();
            const dropdownHeight = dropdown.offsetHeight;
            const spaceBelow = window.innerHeight - triggerRect.bottom - VIEWPORT_PADDING;
            const spaceAbove = triggerRect.top - VIEWPORT_PADDING;
            const shouldOpenUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
            const maxWidth = Math.max(triggerRect.width, Math.min(dropdown.offsetWidth, window.innerWidth - (VIEWPORT_PADDING * 2)));

            let left = 0;
            const overflowRight = triggerRect.left + maxWidth - (window.innerWidth - VIEWPORT_PADDING);
            const overflowLeft = triggerRect.left - VIEWPORT_PADDING;

            if (overflowRight > 0) {
                left -= overflowRight;
            }

            if (overflowLeft + left < 0) {
                left += Math.abs(overflowLeft + left);
            }

            setOpenUpward(shouldOpenUpward);
            dropdown.style.setProperty('--custom-select-left', `${left}px`);
            dropdown.style.setProperty('--custom-select-max-width', `${Math.round(maxWidth)}px`);
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        updateDropdownPosition();
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', updateDropdownPosition);
        window.addEventListener('scroll', updateDropdownPosition, true);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', updateDropdownPosition);
            window.removeEventListener('scroll', updateDropdownPosition, true);
        };
    }, [isOpen]);

    const handleSelect = (selectedValue) => {
        onChange({ target: { value: selectedValue } });
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className="custom-select">
            <button
                type="button"
                id={triggerId}
                name={name}
                onClick={() => setIsOpen((currentState) => !currentState)}
                className="custom-select__trigger"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={listboxId}
                aria-label={ariaLabel}
                aria-labelledby={labelledBy}
                aria-describedby={describedBy}
            >
                {Icon ? <Icon size={16} className="text-muted" /> : null}
                <span className="custom-select__value">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown
                    size={14}
                    className={`custom-select__chevron text-muted ${isOpen ? 'custom-select__chevron--open' : ''}`.trim()}
                />
            </button>

            {isOpen ? (
                <div
                    ref={dropdownRef}
                    id={listboxId}
                    role="listbox"
                    className={`dropdown-menu custom-scrollbar ${openUpward ? 'dropdown-menu--upward' : ''}`.trim()}
                >
                    {options.map((opt) => (
                        <button
                            type="button"
                            key={opt.value}
                            onClick={() => handleSelect(opt.value)}
                            role="option"
                            aria-selected={value === opt.value}
                            className={`dropdown-item ${value === opt.value ? 'active' : ''}`.trim()}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
};

export default CustomSelect;
