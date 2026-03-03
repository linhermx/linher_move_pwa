import React from 'react';
import { ChevronLeft, ChevronRight, LayoutList } from 'lucide-react';
import CustomSelect from './CustomSelect';

const Pagination = ({ pagination, onPageChange, onLimitChange }) => {
    if (!pagination || pagination.total === 0) {
        return null;
    }

    const { total, limit, pages, current_page: currentPage } = pagination;
    const showNavigation = pages > 1;
    const limits = [
        { value: 10, label: '10 filas' },
        { value: 20, label: '20 filas' },
        { value: 50, label: '50 filas' },
        { value: 100, label: '100 filas' }
    ];

    return (
        <div className="pagination fade-in-up">
            <div className="pagination__summary">
                <span className="pagination__badge">Mostrar</span>
                <div className="form-select-container pagination__limit">
                    <CustomSelect
                        icon={LayoutList}
                        value={limit}
                        onChange={(event) => onLimitChange(parseInt(event.target.value, 10))}
                        options={limits}
                    />
                </div>
            </div>

            <div className="pagination__status">
                {showNavigation ? (
                    <div className="pagination__status-main">
                        <div className="pagination__meta">
                            <span className="text-muted">
                                Pag. <strong>{currentPage}</strong> / {pages}
                            </span>
                        </div>
                        <div className="pagination__nav">
                            <button
                                type="button"
                                className="pagination__button"
                                onClick={() => onPageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                aria-label="Pagina anterior"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                type="button"
                                className="pagination__button"
                                onClick={() => onPageChange(currentPage + 1)}
                                disabled={currentPage === pages}
                                aria-label="Pagina siguiente"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                ) : null}

                <div className="pagination__total">
                    <span className="text-muted">
                        Total: <strong>{total}</strong> registros
                    </span>
                </div>
            </div>
        </div>
    );
};

export default Pagination;
