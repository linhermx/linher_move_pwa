import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const CustomSelect = ({ options, value, onChange, placeholder = 'Seleccionar...', icon: Icon }) => {
    const [isOpen, setIsOpen] = useState(false);
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

    const handleSelect = (val) => {
        onChange({ target: { value: val } });
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
            <div
                onClick={() => setIsOpen(!isOpen)}
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
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    left: 0,
                    right: 0,
                    backgroundColor: '#161616',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    zIndex: 1000,
                    boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                    padding: '6px',
                    animation: 'fade-in 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    minWidth: '200px'
                }}>
                    {options.map((opt) => (
                        <div
                            key={opt.value}
                            onClick={() => handleSelect(opt.value)}
                            style={{
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '13px',
                                cursor: 'pointer',
                                transition: 'all 0.1s',
                                backgroundColor: value === opt.value ? 'rgba(255, 72, 72, 0.1)' : 'transparent',
                                color: value === opt.value ? 'var(--color-primary)' : 'white',
                                marginBottom: '2px',
                                fontWeight: value === opt.value ? 'bold' : 'normal'
                            }}
                            onMouseOver={(e) => {
                                if (value !== opt.value) {
                                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (value !== opt.value) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }
                            }}
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
