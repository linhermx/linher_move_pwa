import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const CustomSelect = ({ options, value, onChange, placeholder = 'Seleccionar...', icon: Icon }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [openUpward, setOpenUpward] = useState(false);
    const containerRef = useRef(null);

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
        <div ref={containerRef} style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
            <div
                onClick={handleToggle}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    backgroundColor: 'transparent',
                    color: 'white',
                    fontSize: '13px',
                    cursor: 'pointer',
                    width: '100%',
                    height: '100%',
                    minHeight: '20px'
                }}
            >
                {Icon && <Icon size={16} className="text-muted" />}
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
            </div>

            {isOpen && (
                <div
                    className="dropdown-menu custom-scrollbar"
                    style={{
                        [openUpward ? 'bottom' : 'top']: 'calc(100% + 8px)',
                    }}
                >
                    {options.map((opt) => (
                        <div
                            key={opt.value}
                            onClick={() => handleSelect(opt.value)}
                            className={`dropdown-item ${value === opt.value ? 'active' : ''}`}
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomSelect;
