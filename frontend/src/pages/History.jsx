import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronDown, ChevronUp, Eye, FileText, Filter, RotateCcw, Search } from 'lucide-react';
import { quotationService } from '../services/api';
import { PDFService } from '../services/PDFService';
import { formatDate } from '../utils/formatters';
import CustomMenu from '../components/CustomMenu';
import CustomSelect from '../components/CustomSelect';
import Pagination from '../components/Pagination';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import TableScrollFade from '../components/TableScrollFade';

const MOBILE_FILTER_QUERY = '(max-width: 768px)';

const History = () => {
    const navigate = useNavigate();
    const [quotes, setQuotes] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, pages: 1, total: 0, limit: 10 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [period, setPeriod] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [limit, setLimit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [isMobileFilters, setIsMobileFilters] = useState(() => window.matchMedia(MOBILE_FILTER_QUERY).matches);
    const [areFiltersExpanded, setAreFiltersExpanded] = useState(() => !window.matchMedia(MOBILE_FILTER_QUERY).matches);

    const fetchQuotes = async () => {
        setLoading(true);

        try {
            const params = {};

            if (search) {
                params.folio = search;
            }

            if (statusFilter) {
                params.status = statusFilter;
            }

            let finalFrom = dateFrom;
            let finalTo = dateTo;

            if (period && period !== 'custom') {
                const now = new Date();
                const start = new Date();

                if (period === 'week') {
                    const day = now.getDay() || 7;

                    if (day !== 1) {
                        start.setDate(now.getDate() - (day - 1));
                    }
                } else if (period === 'month') {
                    start.setDate(1);
                } else if (period === 'year') {
                    start.setMonth(0, 1);
                }

                finalFrom = start.toISOString().split('T')[0];
                finalTo = now.toISOString().split('T')[0];
            }

            if (finalFrom) {
                params.date_from = finalFrom;
            }

            if (finalTo) {
                params.date_to = finalTo;
            }

            params.limit = limit;
            params.offset = offset;

            const response = await quotationService.list(params);
            setQuotes(response.data);
            setPagination(response.pagination);
        } catch (error) {
            console.error('Error fetching quotes:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchQuotes();
        }, 300);

        return () => clearTimeout(timer);
    }, [search, statusFilter, period, dateFrom, dateTo, limit, offset]);

    useEffect(() => {
        const mediaQuery = window.matchMedia(MOBILE_FILTER_QUERY);
        const handleChange = (event) => {
            setIsMobileFilters(event.matches);
            setAreFiltersExpanded((currentState) => (event.matches ? currentState : true));
        };

        setIsMobileFilters(mediaQuery.matches);
        setAreFiltersExpanded((currentState) => (mediaQuery.matches ? currentState : true));

        mediaQuery.addEventListener('change', handleChange);

        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, []);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'completada':
                return { variant: 'success', text: 'Completada' };
            case 'pendiente':
                return { variant: 'warning', text: 'Pendiente' };
            case 'en_proceso':
                return { variant: 'info', text: 'En Proceso' };
            case 'cancelada':
                return { variant: 'neutral', text: 'Cancelada' };
            default:
                return { variant: 'neutral', text: status };
        }
    };

    const clearFilters = () => {
        setSearch('');
        setStatusFilter('');
        setPeriod('');
        setDateFrom('');
        setDateTo('');
        setLimit(10);
        setOffset(0);
    };

    const activeFilterCount = [search, statusFilter, period, dateFrom, dateTo].filter(Boolean).length;
    const shouldShowAdvancedFilters = !isMobileFilters || areFiltersExpanded;

    return (
        <div className="page-shell fade-in stack-lg">
            <PageHeader
                title="Historial de cotizaciones"
                subtitle="Consulta y gestiona todos los registros previos."
            />

            <section className="card stack-md" aria-label="Filtros de historial">
                <div className="filter-toolbar filter-toolbar--adaptive">
                    <div className="filter-toolbar__item filter-toolbar__item--search">
                        <div className="form-field-group">
                            <label className="sr-only" htmlFor="history-search">Buscar cotizaciones por folio</label>
                            <Search size={18} className="text-muted" />
                            <input
                                id="history-search"
                                name="history_search"
                                type="text"
                                value={search}
                                placeholder="Buscar por folio..."
                                onChange={(event) => setSearch(event.target.value)}
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    {isMobileFilters ? (
                        <div className="filter-toolbar__mobile-toggle">
                            <button
                                type="button"
                                className="filter-toolbar__mobile-toggle-button"
                                onClick={() => setAreFiltersExpanded((currentState) => !currentState)}
                                aria-expanded={areFiltersExpanded}
                                aria-controls="history-advanced-filters"
                            >
                                <span className="cluster-sm">
                                    <Filter size={16} />
                                    <span>{areFiltersExpanded ? 'Ocultar filtros' : 'Ver filtros'}</span>
                                </span>
                                <span className="filter-toolbar__mobile-meta">
                                    <span className="filter-toolbar__mobile-count">
                                        {activeFilterCount ? `${activeFilterCount} activos` : 'Opcionales'}
                                    </span>
                                    {areFiltersExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </span>
                            </button>
                        </div>
                    ) : null}

                    <div
                        id="history-advanced-filters"
                        className={`filter-toolbar__advanced ${shouldShowAdvancedFilters ? '' : 'filter-toolbar__advanced--hidden'}`.trim()}
                    >
                        <div className="filter-toolbar__item">
                            <div className="form-field-group">
                                <Calendar size={18} className="text-muted" />
                                <CustomSelect
                                    id="history-period"
                                    name="period"
                                    ariaLabel="Filtrar historial por periodo"
                                    value={period}
                                    onChange={(event) => setPeriod(event.target.value)}
                                    options={[
                                        { value: '', label: 'Cualquier fecha' },
                                        { value: 'today', label: 'Hoy' },
                                        { value: 'week', label: 'Esta semana' },
                                        { value: 'month', label: 'Este mes' },
                                        { value: 'year', label: 'Este año' },
                                        { value: 'custom', label: 'Personalizado...' }
                                    ]}
                                />
                            </div>
                        </div>

                        {period === 'custom' ? (
                            <div className="filter-toolbar__item filter-toolbar__item--date fade-in">
                                <div className="form-field-group filter-toolbar__date-range">
                                    <label className="sr-only" htmlFor="history-date-from">Fecha desde</label>
                                    <input
                                        id="history-date-from"
                                        name="date_from"
                                        type="date"
                                        value={dateFrom}
                                        onChange={(event) => setDateFrom(event.target.value)}
                                        autoComplete="off"
                                    />
                                    <span>-</span>
                                    <label className="sr-only" htmlFor="history-date-to">Fecha hasta</label>
                                    <input
                                        id="history-date-to"
                                        name="date_to"
                                        type="date"
                                        value={dateTo}
                                        onChange={(event) => setDateTo(event.target.value)}
                                        autoComplete="off"
                                    />
                                </div>
                            </div>
                        ) : null}

                        <div className="filter-toolbar__item">
                            <div className="form-field-group">
                                <Filter size={18} className="text-muted" />
                                <CustomSelect
                                    id="history-status"
                                    name="status"
                                    ariaLabel="Filtrar historial por estatus"
                                    value={statusFilter}
                                    onChange={(event) => setStatusFilter(event.target.value)}
                                    options={[
                                        { value: '', label: 'Todos los estatus' },
                                        { value: 'pendiente', label: 'Pendiente' },
                                        { value: 'en_proceso', label: 'En Proceso' },
                                        { value: 'completada', label: 'Completada' },
                                        { value: 'cancelada', label: 'Cancelada' }
                                    ]}
                                />
                            </div>
                        </div>

                        {(search || statusFilter || period || dateFrom || dateTo) ? (
                            <div className="filter-toolbar__actions">
                                <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                                    <RotateCcw size={16} />
                                    Limpiar filtros
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </section>

            <section className="card card--flush table-shell history-table-shell" aria-labelledby="history-table-title">
                <div className="card-header">
                    <div>
                        <div className="card-header__title" id="history-table-title">
                            <FileText size={18} className="text-primary" />
                            <span>Cotizaciones registradas</span>
                        </div>
                        <p className="card-header__subtitle">{pagination.total} registros encontrados.</p>
                    </div>
                </div>

                {loading ? (
                    <div className="table-loading-overlay" aria-hidden="true">
                        <div className="spinner" />
                    </div>
                ) : null}

                <TableScrollFade>
                    <table className="table table--history">
                        <caption className="sr-only">Tabla de historial de cotizaciones</caption>
                        <thead>
                            <tr>
                                <th scope="col">FOLIO</th>
                                <th scope="col" className="table__head--date">FECHA</th>
                                <th scope="col">RUTA</th>
                                <th scope="col">TOTAL</th>
                                <th scope="col">ESTATUS</th>
                                <th scope="col" align="right">ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="table__empty">Cargando cotizaciones...</td>
                                </tr>
                            ) : quotes.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="table__empty">No se encontraron cotizaciones.</td>
                                </tr>
                            ) : (
                                quotes.map((quote) => {
                                    const status = getStatusBadge(quote.status);

                                    return (
                                        <tr key={quote.id}>
                                            <td>
                                                <strong className="text-primary">{quote.folio}</strong>
                                            </td>
                                            <td className="table__cell--date">
                                                <div className="table__date-inline">
                                                    <Calendar size={14} className="text-muted" />
                                                    <span>{formatDate(quote.created_at)}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="stack-xs">
                                                    <span className="table__entity-title">{quote.origin_address.split(',')[0]} {'→'}</span>
                                                    <span className="table__entity-subtitle">{quote.destination_address.split(',')[0]}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <strong>${Number(quote.total).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                            </td>
                                            <td>
                                                <StatusBadge variant={status.variant}>{status.text}</StatusBadge>
                                            </td>
                                            <td className="table__cell--actions">
                                                <CustomMenu
                                                    options={[
                                                        {
                                                            label: 'Ver detalles',
                                                            icon: <Eye />,
                                                            onClick: () => navigate(`/history/${quote.id}`)
                                                        },
                                                        {
                                                            label: 'Generar PDF',
                                                            icon: <FileText />,
                                                            onClick: () => PDFService.generateQuotationPDF(quote)
                                                        }
                                                    ]}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </TableScrollFade>

                <Pagination
                    pagination={pagination}
                    onPageChange={(newPage) => setOffset((newPage - 1) * limit)}
                    onLimitChange={(newLimit) => {
                        setLimit(newLimit);
                        setOffset(0);
                    }}
                />
            </section>
        </div>
    );
};

export default History;
