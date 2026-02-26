import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

const CustomMenu = ({ options, icon: Icon = MoreVertical }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [openUpward, setOpenUpward] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = (e) => {
        e.stopPropagation();
        if (!isOpen) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const menuHeight = options.length * 40 + 20;
            setOpenUpward(spaceBelow < menuHeight && rect.top > menuHeight);
        }
        setIsOpen(!isOpen);
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
            <button
                onClick={handleToggle}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
                <Icon size={18} />
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    [openUpward ? 'bottom' : 'top']: '100%',
                    right: 0,
                    backgroundColor: '#161616',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    zIndex: 9999,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                    padding: '6px',
                    minWidth: '160px',
                    animation: 'fade-in 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    [openUpward ? 'marginBottom' : 'marginTop']: '8px'
                }}>
                    {options.map((option, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                option.onClick();
                                setIsOpen(false);
                            }}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 12px',
                                background: 'none',
                                border: 'none',
                                color: option.variant === 'danger' ? '#FF4848' : 'white',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '13px',
                                borderRadius: 'var(--radius-sm)',
                                transition: 'all 0.1s',
                                fontWeight: option.variant === 'danger' ? '500' : 'normal'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = option.variant === 'danger'
                                    ? 'rgba(255, 72, 72, 0.1)'
                                    : 'rgba(255,255,255,0.05)';
                            }}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            {option.icon && React.cloneElement(option.icon, { size: 16 })}
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomMenu;
