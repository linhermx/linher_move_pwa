import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

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
    const generatedId = useId();
    const triggerId = id || `custom-select-${generatedId}`;
    const listboxId = `${triggerId}-listbox`;

    const selectedOption = options.find(opt => opt.value === value) || null;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = () => {
        if (!isOpen) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            // Expected height max 250px or less if fewer options
            const expectedHeight = Math.min(options.length * 40 + 20, 250);
            setOpenUpward(spaceBelow < expectedHeight && rect.top > expectedHeight);
        }
        setIsOpen(!isOpen);
    };

    const handleSelect = (val) => {
        onChange({ target: { value: val } });
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className="custom-select">
            <button
                type="button"
                id={triggerId}
                name={name}
                onClick={handleToggle}
                className="custom-select__trigger"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={listboxId}
                aria-label={ariaLabel}
                aria-labelledby={labelledBy}
                aria-describedby={describedBy}
            >
                {Icon && <Icon size={16} className="text-muted" />}
                <span className="custom-select__value">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown
                    size={14}
                    className="text-muted"
                    style={{
                        transition: 'transform 0.2s',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                />
            </button>

            {isOpen && (
                <div
                    id={listboxId}
                    role="listbox"
                    className="dropdown-menu custom-scrollbar"
                    style={{
                        top: openUpward ? 'auto' : 'calc(100% + 8px)',
                        bottom: openUpward ? 'calc(100% + 8px)' : 'auto'
                    }}
                >
                    {options.map((opt) => (
                        <button
                            type="button"
                            key={opt.value}
                            onClick={() => handleSelect(opt.value)}
                            role="option"
                            aria-selected={value === opt.value}
                            className={`dropdown-item ${value === opt.value ? 'active' : ''}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomSelect;
