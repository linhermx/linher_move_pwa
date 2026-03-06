import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp, Download, Filter, RotateCcw } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import CustomSelect from '../components/CustomSelect';
import Pagination from '../components/Pagination';
import StatusBadge from '../components/StatusBadge';
import TableScrollFade from '../components/TableScrollFade';
import StatusView from '../components/StatusView';
import { reportService } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { getSessionUser, hasPermission } from '../utils/session';
import { formatDate, formatDateTime } from '../utils/formatters';

const REPORT_TYPES = [
    { value: 'operational', label: 'Operativo' },
    { value: 'operators', label: 'Por operador' },
    { value: 'financial', label: 'Financiero' }
];

const STATUS_OPTIONS = [
    { value: '', label: 'Todos los estatus' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'en_proceso', label: 'En proceso' },
    { value: 'completada', label: 'Completada' },
    { value: 'cancelada', label: 'Cancelada' }
];

const QUOTE_TYPE_OPTIONS = [
    { value: '', label: 'Todos los tipos' },
    { value: 'logistics', label: 'Logística' },
    { value: 'services', label: 'Servicios' }
];

const MOBILE_FILTER_QUERY = '(max-width: 768px)';

const formatCurrency = (value) => (
    new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Number(value || 0))
);

const getStatusVariant = (status) => {
    switch (status) {
        case 'completada':
            return 'success';
        case 'pendiente':
            return 'warning';
        case 'en_proceso':
            return 'info';
        case 'cancelada':
            return 'neutral';
        default:
            return 'neutral';
    }
};

const Reports = () => {
    const user = getSessionUser() || {};
    const canExport = hasPermission(user, 'export_reports');
    const { showNotification } = useNotification();

    const [reportType, setReportType] = useState('operational');
    const [filters, setFilters] = useState({
        date_from: '',
        date_to: '',
        status: '',
        quote_type: '',
        operator_id: ''
    });
    const [limit, setLimit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reportData, setReportData] = useState(null);
    const [isMobileFilters, setIsMobileFilters] = useState(() => window.matchMedia(MOBILE_FILTER_QUERY).matches);
    const [areFiltersExpanded, setAreFiltersExpanded] = useState(() => !window.matchMedia(MOBILE_FILTER_QUERY).matches);

    const activeFilterCount = useMemo(() => (
        [filters.date_from, filters.date_to, filters.status, filters.quote_type].filter(Boolean).length
    ), [filters]);

    const loadReport = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const params = {
                ...filters,
                limit,
                offset
            };

            let response;
            if (reportType === 'financial') {
                response = await reportService.financial(params);
            } else if (reportType === 'operators') {
                response = await reportService.operators(params);
            } else {
                response = await reportService.operational(params);
            }

            setReportData(response);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'No se pudo cargar el reporte.');
        } finally {
            setLoading(false);
        }
    }, [filters, limit, offset, reportType]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadReport();
        }, 180);

        return () => clearTimeout(timer);
    }, [loadReport]);

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

    const clearFilters = () => {
        setFilters({
            date_from: '',
            date_to: '',
            status: '',
            quote_type: '',
            operator_id: ''
        });
        setOffset(0);
    };

    const handleExport = async () => {
        try {
            const response = await reportService.exportCsv(reportType, filters);
            const blobUrl = window.URL.createObjectURL(response.data);
            const link = document.createElement('a');
            const disposition = response.headers['content-disposition'] || '';
            const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
            const filename = filenameMatch?.[1] || `reporte-${reportType}.csv`;

            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (requestError) {
            showNotification(requestError.response?.data?.message || 'No se pudo exportar el reporte.', 'error');
        }
    };

    const renderKpis = () => {
        if (!reportData) {
            return null;
        }

        if (reportType === 'operators') {
            const totals = reportData.totals || {};

            return (
                <section className="reports-kpi-grid" aria-label="Indicadores del reporte por operador">
                    <article className="card reports-kpi-card">
                        <strong>Operadores</strong>
                        <p className="reports-kpi-card__value">{totals.total_operators || 0}</p>
                    </article>
                    <article className="card reports-kpi-card">
                        <strong>Cotizaciones</strong>
                        <p className="reports-kpi-card__value">{totals.total_quotes || 0}</p>
                    </article>
                    <article className="card reports-kpi-card">
                        <strong>Completadas</strong>
                        <p className="reports-kpi-card__value">{totals.total_completed || 0}</p>
                    </article>
                    <article className="card reports-kpi-card">
                        <strong>Ingresos</strong>
                        <p className="reports-kpi-card__value">{formatCurrency(totals.total_revenue || 0)}</p>
                    </article>
                </section>
            );
        }

        const kpis = reportData.kpis || {};

        if (reportType === 'financial') {
            return (
                <section className="reports-kpi-grid" aria-label="Indicadores del reporte financiero">
                    <article className="card reports-kpi-card">
                        <strong>Cotizaciones</strong>
                        <p className="reports-kpi-card__value">{kpis.total_quotes || 0}</p>
                    </article>
                    <article className="card reports-kpi-card">
                        <strong>Ingresos</strong>
                        <p className="reports-kpi-card__value">{formatCurrency(kpis.revenue || 0)}</p>
                    </article>
                    <article className="card reports-kpi-card">
                        <strong>Ticket promedio</strong>
                        <p className="reports-kpi-card__value">{formatCurrency(kpis.avg_ticket || 0)}</p>
                    </article>
                    <article className="card reports-kpi-card">
                        <strong>IVA</strong>
                        <p className="reports-kpi-card__value">{formatCurrency(kpis.iva || 0)}</p>
                    </article>
                </section>
            );
        }

        return (
            <section className="reports-kpi-grid" aria-label="Indicadores del reporte operativo">
                <article className="card reports-kpi-card">
                    <strong>Total</strong>
                    <p className="reports-kpi-card__value">{kpis.total_quotes || 0}</p>
                </article>
                <article className="card reports-kpi-card">
                    <strong>Completadas</strong>
                    <p className="reports-kpi-card__value">{kpis.completed_quotes || 0}</p>
                </article>
                <article className="card reports-kpi-card">
                    <strong>Pendientes</strong>
                    <p className="reports-kpi-card__value">{kpis.pending_quotes || 0}</p>
                </article>
                <article className="card reports-kpi-card">
                    <strong>Ingresos completados</strong>
                    <p className="reports-kpi-card__value">{formatCurrency(kpis.revenue || 0)}</p>
                </article>
            </section>
        );
    };

    const renderOperationalRows = () => (
        (reportData?.data || []).map((row, index) => (
            <tr key={`operational-${row.id ?? 'na'}-${row.folio ?? 'folio'}-${index}`}>
                <td className="table__cell--folio"><strong className="text-primary">{row.folio}</strong></td>
                <td className="table__cell--datetime">{formatDateTime(row.created_at)}</td>
                <td>{row.operator_name || 'Sin operador'}</td>
                <td className="table__cell--type"><StatusBadge variant={row.quote_type === 'services' ? 'info' : 'neutral'}>{row.quote_type === 'services' ? 'Servicios' : 'Logística'}</StatusBadge></td>
                <td><StatusBadge variant={getStatusVariant(row.status)}>{row.status}</StatusBadge></td>
                <td className="table__cell--currency">{formatCurrency(row.total)}</td>
            </tr>
        ))
    );

    const renderFinancialRows = () => (
        (reportData?.data || []).map((row, index) => (
            <tr key={`financial-${row.id ?? 'na'}-${row.folio ?? 'folio'}-${index}`}>
                <td className="table__cell--folio"><strong className="text-primary">{row.folio}</strong></td>
                <td className="table__cell--date">{formatDate(row.created_at)}</td>
                <td>{row.operator_name || 'Sin operador'}</td>
                <td className="table__cell--currency">{formatCurrency(row.subtotal)}</td>
                <td className="table__cell--currency">{formatCurrency(row.iva)}</td>
                <td className="table__cell--currency">{formatCurrency(row.total)}</td>
                <td className="table__cell--type"><StatusBadge variant={row.quote_type === 'services' ? 'info' : 'neutral'}>{row.quote_type === 'services' ? 'Servicios' : 'Logística'}</StatusBadge></td>
            </tr>
        ))
    );

    const renderOperatorRows = () => (
        (reportData?.data || []).map((row, index) => (
            <tr key={`operator-${row.operator_id ?? 'na'}-${index}`}>
                <td><strong>{row.operator_name}</strong></td>
                <td className="table__cell--currency">{row.total_quotes}</td>
                <td className="table__cell--currency">{row.completed_quotes}</td>
                <td className="table__cell--currency">{Number(row.success_rate || 0).toFixed(1)}%</td>
                <td className="table__cell--currency">{formatCurrency(row.revenue)}</td>
            </tr>
        ))
    );

    const pagination = reportData?.pagination || { total: 0, limit, pages: 1, current_page: 1 };
    const shouldShowAdvancedFilters = !isMobileFilters || areFiltersExpanded;
    const reportTableClassName = reportType === 'financial'
        ? 'table--reports-financial'
        : reportType === 'operators'
            ? 'table--reports-operators'
            : 'table--reports-operational';

    return (
        <div className="page-shell fade-in stack-lg">
            <PageHeader
                title="Reportes"
                subtitle="Consulta indicadores operativos y financieros con filtros dinámicos."
                actions={canExport ? (
                    <button type="button" className="btn btn-primary" onClick={handleExport}>
                        <Download size={16} />
                        Exportar CSV
                    </button>
                ) : null}
            />

            <section className="card stack-md" aria-label="Tipo de reporte">
                <div className="reports-tabs" role="tablist" aria-label="Tipos de reportes disponibles">
                    {REPORT_TYPES.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            role="tab"
                            aria-selected={reportType === option.value}
                            className={`btn reports-tabs__button ${reportType === option.value ? 'btn-primary' : 'btn-secondary'}`.trim()}
                            onClick={() => {
                                setReportType(option.value);
                                setOffset(0);
                            }}
                        >
                            <BarChart3 size={14} />
                            {option.label}
                        </button>
                    ))}
                </div>
            </section>

            <section className="card stack-md" aria-label="Filtros de reportes">
                <div className="filter-toolbar filter-toolbar--adaptive filter-toolbar--reports">
                    <div className="filter-toolbar__item filter-toolbar__item--date">
                        <div className="form-field-group filter-toolbar__date-range">
                            <label className="sr-only" htmlFor="reports-date-from">Fecha desde</label>
                            <input
                                id="reports-date-from"
                                name="date_from"
                                type="date"
                                value={filters.date_from}
                                onChange={(event) => {
                                    setFilters((currentFilters) => ({ ...currentFilters, date_from: event.target.value }));
                                    setOffset(0);
                                }}
                                autoComplete="off"
                            />
                            <span>-</span>
                            <label className="sr-only" htmlFor="reports-date-to">Fecha hasta</label>
                            <input
                                id="reports-date-to"
                                name="date_to"
                                type="date"
                                value={filters.date_to}
                                onChange={(event) => {
                                    setFilters((currentFilters) => ({ ...currentFilters, date_to: event.target.value }));
                                    setOffset(0);
                                }}
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
                                aria-controls="reports-advanced-filters"
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
                        id="reports-advanced-filters"
                        className={`filter-toolbar__advanced ${shouldShowAdvancedFilters ? '' : 'filter-toolbar__advanced--hidden'}`.trim()}
                    >
                        <div className="filter-toolbar__item">
                            <div className="form-field-group">
                                <Filter size={18} className="text-muted" />
                                <CustomSelect
                                    id="reports-status"
                                    name="status"
                                    value={filters.status}
                                    onChange={(event) => {
                                        setFilters((currentFilters) => ({ ...currentFilters, status: event.target.value }));
                                        setOffset(0);
                                    }}
                                    options={STATUS_OPTIONS}
                                    ariaLabel="Filtrar reportes por estatus"
                                />
                            </div>
                        </div>

                        <div className="filter-toolbar__item">
                            <div className="form-field-group">
                                <Filter size={18} className="text-muted" />
                                <CustomSelect
                                    id="reports-type"
                                    name="quote_type"
                                    value={filters.quote_type}
                                    onChange={(event) => {
                                        setFilters((currentFilters) => ({ ...currentFilters, quote_type: event.target.value }));
                                        setOffset(0);
                                    }}
                                    options={QUOTE_TYPE_OPTIONS}
                                    ariaLabel="Filtrar reportes por tipo de cotización"
                                />
                            </div>
                        </div>

                        {activeFilterCount ? (
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

            {loading ? <StatusView type="loading" message="Cargando reporte..." /> : null}
            {error ? <StatusView type="error" message={error} onRetry={loadReport} /> : null}

            {!loading && !error ? (
                <>
                    {renderKpis()}

                    <section className="card card--flush table-shell" aria-label="Detalle del reporte">
                        <TableScrollFade>
                            <table className={`table ${reportTableClassName}`.trim()}>
                                <caption className="sr-only">Tabla de resultados del reporte</caption>
                                <thead>
                                    <tr>
                                        {reportType === 'operators' ? (
                                            <>
                                                <th scope="col">OPERADOR</th>
                                                <th scope="col" className="table__head--currency">TOTAL</th>
                                                <th scope="col" className="table__head--currency">COMPLETADAS</th>
                                                <th scope="col" className="table__head--currency">ÉXITO</th>
                                                <th scope="col" className="table__head--currency">INGRESOS</th>
                                            </>
                                        ) : null}
                                        {reportType === 'operational' ? (
                                            <>
                                                <th scope="col" className="table__head--folio">FOLIO</th>
                                                <th scope="col" className="table__head--datetime">FECHA</th>
                                                <th scope="col">OPERADOR</th>
                                                <th scope="col" className="table__head--type">TIPO</th>
                                                <th scope="col">ESTATUS</th>
                                                <th scope="col" className="table__head--currency">TOTAL</th>
                                            </>
                                        ) : null}
                                        {reportType === 'financial' ? (
                                            <>
                                                <th scope="col" className="table__head--folio">FOLIO</th>
                                                <th scope="col" className="table__head--date">FECHA</th>
                                                <th scope="col">OPERADOR</th>
                                                <th scope="col" className="table__head--currency">SUBTOTAL</th>
                                                <th scope="col" className="table__head--currency">IVA</th>
                                                <th scope="col" className="table__head--currency">TOTAL</th>
                                                <th scope="col" className="table__head--type">TIPO</th>
                                            </>
                                        ) : null}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(reportData?.data || []).length === 0 ? (
                                        <tr>
                                            <td colSpan={reportType === 'financial' ? 7 : reportType === 'operational' ? 6 : 5} className="table__empty">
                                                No se encontraron registros.
                                            </td>
                                        </tr>
                                    ) : null}
                                    {reportType === 'operational' ? renderOperationalRows() : null}
                                    {reportType === 'financial' ? renderFinancialRows() : null}
                                    {reportType === 'operators' ? renderOperatorRows() : null}
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
                </>
            ) : null}
        </div>
    );
};

export default Reports;
