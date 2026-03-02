import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, Filter, Info, RotateCcw, Search, ShieldCheck, User } from 'lucide-react';
import { logService, userService } from '../services/api';
import CustomSelect from '../components/CustomSelect';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import StatusBadge from '../components/StatusBadge';
import ModalShell from '../components/ModalShell';
import Alert from '../components/Alert';
import { formatDateTime } from '../utils/formatters';

const LOG_TYPE_OPTIONS = [
    { value: '', label: 'Todos los tipos' },
    { value: 'auth', label: 'Seguridad' },
    { value: 'business', label: 'Negocio' },
    { value: 'config', label: 'Ajustes' },
    { value: 'system', label: 'Sistema' },
    { value: 'error', label: 'Errores' }
];

const SEVERITY_OPTIONS = [
    { value: '', label: 'Todas las severidades' },
    { value: 'info', label: 'Info' },
    { value: 'warning', label: 'Warning' },
    { value: 'error', label: 'Error' },
    { value: 'critical', label: 'Critical' }
];

const SOURCE_OPTIONS = [
    { value: '', label: 'Cualquier origen' },
    { value: 'frontend', label: 'Frontend' },
    { value: 'server', label: 'Servidor' },
    { value: 'integration', label: 'Integracion' },
    { value: 'backup', label: 'Backups' },
    { value: 'auth', label: 'Autenticacion' },
    { value: 'settings', label: 'Ajustes' },
    { value: 'runtime', label: 'Runtime' },
    { value: 'cron', label: 'Cron' }
];

const INITIAL_FILTERS = {
    search: '',
    log_type: '',
    severity: '',
    source: '',
    user_id: '',
    date_from: '',
    date_to: '',
    limit: 10,
    offset: 0
};

const getSeverityVariant = (severity) => {
    switch (severity) {
        case 'critical':
        case 'error':
            return 'danger';
        case 'warning':
            return 'warning';
        case 'info':
            return 'info';
        default:
            return 'neutral';
    }
};

const getTypeVariant = (type) => {
    switch (type) {
        case 'auth':
            return 'warning';
        case 'business':
            return 'info';
        case 'error':
            return 'danger';
        default:
            return 'neutral';
    }
};

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, pages: 1, total: 0, limit: 10 });
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState(null);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState(INITIAL_FILTERS);

    const loadLogs = useCallback(async (activeFilters) => {
        setLoading(true);
        try {
            const response = await logService.list(activeFilters);
            setLogs(response.data || []);
            setPagination(response.pagination || { current_page: 1, pages: 1, total: 0, limit: activeFilters.limit });
            setError('');
        } catch {
            setError('No se pudieron cargar los registros de auditoria.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const response = await userService.list({ limit: 1000 });
                setUsers(response.data || []);
            } catch {
                setError('No se pudieron cargar los usuarios para filtrar.');
            }
        };

        loadUsers();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadLogs(filters);
        }, 300);

        return () => clearTimeout(timer);
    }, [filters, loadLogs]);

    const clearFilters = () => {
        setFilters(INITIAL_FILTERS);
    };

    const formatJSON = (payload) => {
        try {
            const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
            return JSON.stringify(parsed, null, 2);
        } catch {
            return String(payload || '');
        }
    };

    const userOptions = [
        { value: '', label: 'Cualquier usuario' },
        ...users.map((currentUser) => ({ value: currentUser.id, label: currentUser.name }))
    ];

    const hasActiveFilters = Boolean(
        filters.search ||
        filters.log_type ||
        filters.severity ||
        filters.source ||
        filters.user_id ||
        filters.date_from ||
        filters.date_to
    );

    return (
        <div className="page-shell fade-in stack-lg">
            <PageHeader
                title="Auditoría del sistema"
                subtitle="Consulta actividad operativa, eventos de seguridad y errores registrados por backend y frontend."
            />

            {error ? <Alert type="error">{error}</Alert> : null}

            <section className="card" aria-label="Filtros de auditoria">
                <div className="filter-toolbar filter-toolbar--audit">
                    <div className="filter-toolbar__item filter-toolbar__item--search">
                        <div className="form-field-group">
                            <label className="sr-only" htmlFor="audit-search">Buscar registros de auditoría</label>
                            <Search size={18} className="text-muted" />
                            <input
                                id="audit-search"
                                name="audit_search"
                                type="text"
                                value={filters.search}
                                placeholder="Buscar por accion, origen o usuario..."
                                onChange={(event) => setFilters((currentFilters) => ({
                                    ...currentFilters,
                                    search: event.target.value,
                                    offset: 0
                                }))}
                            />
                        </div>
                    </div>

                    <div className="filter-toolbar__item">
                        <div className="form-select-container">
                            <CustomSelect
                                id="audit-log-type"
                                name="log_type"
                                ariaLabel="Filtrar auditoría por tipo"
                                icon={Filter}
                                value={filters.log_type}
                                onChange={(event) => setFilters((currentFilters) => ({
                                    ...currentFilters,
                                    log_type: event.target.value,
                                    offset: 0
                                }))}
                                options={LOG_TYPE_OPTIONS}
                            />
                        </div>
                    </div>

                    <div className="filter-toolbar__item">
                        <div className="form-select-container">
                            <CustomSelect
                                id="audit-severity"
                                name="severity"
                                ariaLabel="Filtrar auditoría por severidad"
                                icon={Info}
                                value={filters.severity}
                                onChange={(event) => setFilters((currentFilters) => ({
                                    ...currentFilters,
                                    severity: event.target.value,
                                    offset: 0
                                }))}
                                options={SEVERITY_OPTIONS}
                            />
                        </div>
                    </div>

                    <div className="filter-toolbar__item">
                        <div className="form-select-container">
                            <CustomSelect
                                id="audit-source"
                                name="source"
                                ariaLabel="Filtrar auditoría por origen"
                                icon={ShieldCheck}
                                value={filters.source}
                                onChange={(event) => setFilters((currentFilters) => ({
                                    ...currentFilters,
                                    source: event.target.value,
                                    offset: 0
                                }))}
                                options={SOURCE_OPTIONS}
                            />
                        </div>
                    </div>

                    <div className="filter-toolbar__item">
                        <div className="form-select-container">
                            <CustomSelect
                                id="audit-user"
                                name="user_id"
                                ariaLabel="Filtrar auditoría por usuario"
                                icon={User}
                                value={filters.user_id}
                                onChange={(event) => setFilters((currentFilters) => ({
                                    ...currentFilters,
                                    user_id: event.target.value,
                                    offset: 0
                                }))}
                                options={userOptions}
                            />
                        </div>
                    </div>

                    <div className="filter-toolbar__item filter-toolbar__item--date">
                        <div className="form-field-group filter-toolbar__date-range">
                            <label className="sr-only" htmlFor="audit-date-from">Fecha desde</label>
                            <Calendar size={16} className="text-muted" />
                            <input
                                id="audit-date-from"
                                name="date_from"
                                type="date"
                                value={filters.date_from}
                                onChange={(event) => setFilters((currentFilters) => ({
                                    ...currentFilters,
                                    date_from: event.target.value,
                                    offset: 0
                                }))}
                                aria-label="Fecha desde"
                            />
                            <span className="text-muted">-</span>
                            <label className="sr-only" htmlFor="audit-date-to">Fecha hasta</label>
                            <input
                                id="audit-date-to"
                                name="date_to"
                                type="date"
                                value={filters.date_to}
                                onChange={(event) => setFilters((currentFilters) => ({
                                    ...currentFilters,
                                    date_to: event.target.value,
                                    offset: 0
                                }))}
                                aria-label="Fecha hasta"
                            />
                        </div>
                    </div>

                    {hasActiveFilters ? (
                        <div className="filter-toolbar__actions">
                        <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                            <RotateCcw size={14} />
                            Limpiar
                        </button>
                        </div>
                    ) : null}
                </div>
            </section>

            <section className="card card--flush table-shell" aria-labelledby="audit-table-title">
                <div className="card-header">
                    <div>
                        <div className="card-header__title" id="audit-table-title">
                            <ShieldCheck size={18} className="text-primary" />
                            <span>Registros</span>
                        </div>
                        <p className="card-header__subtitle">{pagination.total} eventos encontrados.</p>
                    </div>
                </div>

                <div className="table-scroll">
                    <table className="table">
                        <caption className="sr-only">Tabla de auditoria</caption>
                        <thead>
                            <tr>
                                <th scope="col">FECHA / HORA</th>
                                <th scope="col">TIPO</th>
                                <th scope="col">SEVERIDAD</th>
                                <th scope="col">ORIGEN</th>
                                <th scope="col">USUARIO</th>
                                <th scope="col">ACCION</th>
                                <th scope="col" align="right">DETALLES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="table__empty">Cargando registros...</td>
                                </tr>
                            ) : !logs.length ? (
                                <tr>
                                    <td colSpan="7" className="table__empty">No se encontraron registros de auditoria.</td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id}>
                                        <td>{formatDateTime(log.created_at)}</td>
                                        <td>
                                            <StatusBadge variant={getTypeVariant(log.log_type)}>{log.log_type}</StatusBadge>
                                        </td>
                                        <td>
                                            <StatusBadge variant={getSeverityVariant(log.severity)}>{log.severity || 'info'}</StatusBadge>
                                        </td>
                                        <td>{log.source || 'server'}</td>
                                        <td>{log.user_name || 'Sistema'}</td>
                                        <td>{log.action}</td>
                                        <td className="table__cell--actions">
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={() => setSelectedLog(log)}
                                            >
                                                <Info size={16} />
                                                Ver detalle
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    pagination={pagination}
                    onPageChange={(newPage) => setFilters((currentFilters) => ({
                        ...currentFilters,
                        offset: (newPage - 1) * currentFilters.limit
                    }))}
                    onLimitChange={(newLimit) => setFilters((currentFilters) => ({
                        ...currentFilters,
                        limit: newLimit,
                        offset: 0
                    }))}
                />
            </section>

            <ModalShell
                isOpen={Boolean(selectedLog)}
                onClose={() => setSelectedLog(null)}
                title="Detalle del evento"
                subtitle="Contexto tecnico del registro seleccionado."
                size="lg"
                labelledBy="audit-detail-title"
                describedBy="audit-detail-description"
                footer={(
                    <button type="button" className="btn btn-primary" onClick={() => setSelectedLog(null)}>
                        Cerrar
                    </button>
                )}
            >
                {selectedLog ? (
                    <div className="stack-md">
                        <div className="form-grid form-grid--two">
                            <div className="stack-xs">
                                <span className="form-label">EVENTO</span>
                                <strong>{selectedLog.action}</strong>
                            </div>
                            <div className="stack-xs">
                                <span className="form-label">FECHA Y HORA</span>
                                <span>{formatDateTime(selectedLog.created_at)}</span>
                            </div>
                            <div className="stack-xs">
                                <span className="form-label">TIPO</span>
                                <StatusBadge variant={getTypeVariant(selectedLog.log_type)}>{selectedLog.log_type}</StatusBadge>
                            </div>
                            <div className="stack-xs">
                                <span className="form-label">SEVERIDAD</span>
                                <StatusBadge variant={getSeverityVariant(selectedLog.severity)}>{selectedLog.severity || 'info'}</StatusBadge>
                            </div>
                            <div className="stack-xs">
                                <span className="form-label">ORIGEN</span>
                                <span>{selectedLog.source || 'server'}</span>
                            </div>
                            <div className="stack-xs">
                                <span className="form-label">USUARIO</span>
                                <span>{selectedLog.user_name || 'Sistema'}</span>
                            </div>
                        </div>

                        <div className="stack-xs">
                            <span className="form-label">PAYLOAD</span>
                            <pre className="code-block">{formatJSON(selectedLog.details)}</pre>
                        </div>
                    </div>
                ) : null}
            </ModalShell>
        </div>
    );
};

export default AuditLogs;
