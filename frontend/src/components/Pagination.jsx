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
            padding: '15px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--color-border)',
            backgroundColor: 'rgba(255,255,255,0.01)',
            flexWrap: 'wrap',
            gap: '15px'
        }}>
            {/* Limit Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Mostrar:
                </span>
                <div style={{ width: '120px', height: '32px' }}>
                    <CustomSelect
                        icon={LayoutList}
                        value={limit}
                        onChange={(e) => onLimitChange(parseInt(e.target.value))}
                        options={limits}
                        style={{ fontSize: '12px' }}
                    />
                </div>
            </div>

            {/* Pagination Controls */}
            {showNavigation ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        Página <strong>{current_page}</strong> de <strong>{pages}</strong>
                        <span style={{ margin: '0 8px', opacity: 0.3 }}>|</span>
                        Total: <strong>{total}</strong> registros
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={() => onPageChange(current_page - 1)}
                            disabled={current_page === 1}
                            style={{
                                background: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                color: 'white',
                                borderRadius: '6px',
                                padding: '6px',
                                cursor: 'pointer',
                                opacity: current_page === 1 ? 0.3 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => current_page !== 1 && (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                            onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <button
                            onClick={() => onPageChange(current_page + 1)}
                            disabled={current_page === pages}
                            style={{
                                background: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                color: 'white',
                                borderRadius: '6px',
                                padding: '6px',
                                cursor: 'pointer',
                                opacity: current_page === pages ? 0.3 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => current_page !== pages && (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                            onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            ) : (
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    Total: <strong>{total}</strong> registros
                </span>
            )}
        </div>
    );
};

export default Pagination;
