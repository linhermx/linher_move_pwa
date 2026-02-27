import React from 'react';
import { ChevronLeft, ChevronRight, LayoutList } from 'lucide-react';
import CustomSelect from './CustomSelect';

const Pagination = ({ pagination, onPageChange, onLimitChange }) => {
    if (!pagination || pagination.total === 0) return null;

    const { total, limit, pages, current_page } = pagination;
    const showNavigation = pages > 1;

    const limits = [
        { value: 10, label: '10 filas' },
        { value: 20, label: '20 filas' },
        { value: 50, label: '50 filas' },
        { value: 100, label: '100 filas' }
    ];

    return (
        <div style={{
            padding: '12px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--color-border)',
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(10px)',
            flexWrap: 'wrap',
            gap: '20px',
            borderBottomLeftRadius: 'var(--radius-md)',
            borderBottomRightRadius: 'var(--radius-md)',
            animation: 'fade-in-up 0.4s ease-out'
        }}>
            {/* Limit Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(255,255,255,0.03)'
                }}>
                    <span style={{
                        fontSize: '10px',
                        color: 'var(--color-text-muted)',
                        fontWeight: '800',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase'
                    }}>
                        Mostrar:
                    </span>
                </div>
                <div style={{ width: '130px', transition: 'transform 0.2s' }} className="menu-item-hover">
                    <CustomSelect
                        icon={LayoutList}
                        value={limit}
                        onChange={(e) => onLimitChange(parseInt(e.target.value))}
                        options={limits}
                    />
                </div>
            </div>

            {/* Pagination Info & Controls */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                backgroundColor: 'rgba(0,0,0,0.2)',
                padding: '6px 16px',
                borderRadius: '50px',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                {showNavigation ? (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>
                                pág <span style={{ color: 'white', fontWeight: 'bold' }}>{current_page}</span> / <span style={{ color: 'var(--color-text-muted)' }}>{pages}</span>
                            </span>

                            <div style={{ height: '14px', width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />

                            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                <strong style={{ color: 'white' }}>{total}</strong> registros
                            </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                                onClick={() => onPageChange(current_page - 1)}
                                disabled={current_page === 1}
                                className="pagination-btn"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    cursor: 'pointer',
                                    opacity: current_page === 1 ? 0.2 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    pointerEvents: current_page === 1 ? 'none' : 'auto'
                                }}
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <button
                                onClick={() => onPageChange(current_page + 1)}
                                disabled={current_page === pages}
                                className="pagination-btn"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    cursor: 'pointer',
                                    opacity: current_page === pages ? 0.2 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    pointerEvents: current_page === pages ? 'none' : 'auto'
                                }}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </>
                ) : (
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>
                        Total: <strong style={{ color: 'white' }}>{total}</strong> registros
                    </span>
                )}
            </div>

            {/* Global Styles for the component */}
            <style>{`
                .pagination-btn:hover {
                    background-color: var(--color-primary) !important;
                    border-color: var(--color-primary) !important;
                    transform: scale(1.1);
                    box-shadow: 0 4px 12px rgba(255, 72, 72, 0.3);
                }
                .pagination-btn:active {
                    transform: scale(0.95);
                }
                .menu-item-hover:hover {
                    transform: translateY(-2px);
                }
            `}</style>
        </div>
    );
};

export default Pagination;
