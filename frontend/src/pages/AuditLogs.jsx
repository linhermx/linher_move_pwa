import React, { useState, useEffect } from 'react';
import { logService, userService } from '../services/api';
import {
    Search,
    Filter,
    Calendar,
    User,
    History,
    Info,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    ShieldCheck,
    RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate, formatTime, formatDateTime } from '../utils/formatters';
import CustomSelect from '../components/CustomSelect';
import Pagination from '../components/Pagination';

const AuditLogs = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, pages: 1, total: 0, limit: 10 });
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [selectedLog, setSelectedLog] = useState(null);

    // Filters
    const [filters, setFilters] = useState({
        search: '',
        log_type: '',
        user_id: '',
        date_from: '',
        date_to: '',
        limit: 10,
        offset: 0
    });

    useEffect(() => {
        fetchUsers();
        fetchLogs();
    }, [filters.offset, filters.log_type, filters.user_id, filters.date_from, filters.date_to, filters.limit]);

    const fetchUsers = async () => {
        try {
            const res = await userService.list({ limit: 1000 });
            setUsers(res.data || []);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

    const fetchLogs = async () => {
        setLoading(true);
        try { // Added missing try block
            const res = await logService.list(filters);
            setLogs(res.data || []);
            setPagination(res.pagination || { current_page: 1, pages: 1, total: 0, limit: 10 });
        } catch (err) {
            console.error('Error fetching logs:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            setFilters(prev => ({ ...prev, offset: 0 }));
            fetchLogs();
        }
    };

    const changePage = (newPage) => {
        const newOffset = (newPage - 1) * filters.limit;
        setFilters(prev => ({ ...prev, offset: newOffset }));
    };

    const getTypeStyle = (type) => {
        switch (type) {
            case 'auth': return { bg: 'rgba(168, 85, 247, 0.1)', color: '#A855F7' };
            case 'business': return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' };
            case 'config': return { bg: 'rgba(249, 115, 22, 0.1)', color: '#F97316' };
            case 'system': return { bg: 'rgba(107, 114, 128, 0.1)', color: '#9CA3AF' };
            default: return { bg: 'rgba(255, 255, 255, 0.05)', color: 'white' };
        }
    };

    const formatJSON = (json) => {
        try {
            const obj = typeof json === 'string' ? JSON.parse(json) : json;
            return JSON.stringify(obj, null, 2);
        } catch (e) {
            return json;
        }
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            log_type: '',
            user_id: '',
            date_from: '',
            date_to: '',
            limit: 50,
            offset: 0
        });
    };

    return (
        <div className="fade-in" style={{ paddingBottom: '40px' }}>
            {/* Header */}
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h1 style={{ fontSize: '24px' }}>Auditoría del Sistema</h1>
                <p className="text-muted">Registro detallado de acciones y seguridad</p>
            </div>

            {/* Filters Bar */}
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)', padding: '15px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>

                    {/* Search */}
                    <div style={{ flex: '2', minWidth: '250px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: 'var(--color-bg)', padding: '10px 15px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                            <Search size={18} className="text-muted" />
                            <input
                                type="text"
                                placeholder="Buscar por acción o descripción..."
                                style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', fontSize: '14px' }}
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                onKeyDown={handleSearch}
                            />
                        </div>
                    </div>

                    {/* Filters Group */}
                    <div style={{ display: 'flex', flex: '3', gap: '12px', flexWrap: 'wrap' }}>
                        {/* Type */}
                        <div style={{ flex: 1, minWidth: '140px', display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--color-bg)', padding: '0 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', height: '42px' }}>
                            <CustomSelect
                                icon={Filter}
                                value={filters.log_type}
                                onChange={(e) => setFilters(prev => ({ ...prev, log_type: e.target.value, offset: 0 }))}
                                options={[
                                    { value: '', label: 'Todos los tipos' },
                                    { value: 'auth', label: 'Seguridad' },
                                    { value: 'business', label: 'Negocio' },
                                    { value: 'config', label: 'Ajustes' },
                                    { value: 'system', label: 'Sistema' }
                                ]}
                            />
                        </div>

                        {/* User */}
                        <div style={{ flex: 1, minWidth: '140px', display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--color-bg)', padding: '0 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', height: '42px' }}>
                            <CustomSelect
                                icon={User}
                                value={filters.user_id}
                                onChange={(e) => setFilters(prev => ({ ...prev, user_id: e.target.value, offset: 0 }))}
                                options={[
                                    { value: '', label: 'Cualquier usuario' },
                                    ...users.map(u => ({ value: u.id, label: u.name }))
                                ]}
                            />
                        </div>

                        {/* Dates */}
                        <div style={{ flex: 1.5, minWidth: '220px', display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--color-bg)', padding: '0 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', height: '42px' }}>
                            <Calendar size={16} className="text-muted" />
                            <input
                                type="date"
                                style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '12px', outline: 'none', width: '45%' }}
                                value={filters.date_from}
                                onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value, offset: 0 }))}
                            />
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>-</span>
                            <input
                                type="date"
                                style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '12px', outline: 'none', width: '45%' }}
                                value={filters.date_to}
                                onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value, offset: 0 }))}
                            />
                        </div>
                    </div>

                    {/* Clear Link */}
                    {(filters.search || filters.log_type || filters.user_id || filters.date_from || filters.date_to) && (
                        <button
                            onClick={clearFilters}
                            title="Restablecer filtros"
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-primary)',
                                padding: '8px 12px',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s',
                                height: '42px'
                            }}
                            onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                        >
                            <RotateCcw size={14} />
                            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>LIMPIAR</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Logs Table */}
            <div className="card" style={{ padding: 0, overflow: 'visible' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>FECHA / HORA</th>
                                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>TIPO</th>
                                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>USUARIO</th>
                                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>ACCIÓN</th>
                                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'right' }}>DETALLES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center' }}>Cargando...</td></tr>
                            ) : logs.length > 0 ? (
                                (logs || []).map((log) => {
                                    const style = getTypeStyle(log.log_type);
                                    return (
                                        <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: '16px' }}>
                                                <div style={{ fontSize: '14px' }}>{formatDate(log.created_at)}</div>
                                                <div className="text-muted" style={{ fontSize: '12px' }}>{formatTime(log.created_at)}</div>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <span style={{
                                                    fontSize: '10px',
                                                    padding: '4px 8px',
                                                    borderRadius: '10px',
                                                    backgroundColor: style.bg,
                                                    color: style.color,
                                                    fontWeight: 'bold',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {log.log_type}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '50%',
                                                        backgroundColor: 'rgba(255,255,255,0.05)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        overflow: 'hidden',
                                                        border: '1px solid var(--color-border)'
                                                    }}>
                                                        {log.photo_path ? (
                                                            <img
                                                                src={`http://localhost:3000/${log.photo_path}`}
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                alt={log.user_name}
                                                            />
                                                        ) : (
                                                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                                                                {log.user_name ? log.user_name.charAt(0) : 'S'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span style={{ fontSize: '14px' }}>{log.user_name || 'Sistema'}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px', fontWeight: 'bold', fontSize: '14px' }}>{log.action}</td>
                                            <td style={{ padding: '16px', textAlign: 'right' }}>
                                                <Info
                                                    size={20}
                                                    className="text-muted"
                                                    cursor="pointer"
                                                    onMouseOver={(e) => e.target.style.color = 'var(--color-primary)'}
                                                    onMouseOut={(e) => e.target.style.color = 'var(--color-text-muted)'}
                                                    onClick={() => setSelectedLog(log)}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center' }} className="text-muted">
                                        No se encontraron registros de auditoría.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <Pagination
                    pagination={pagination}
                    onPageChange={changePage}
                    onLimitChange={(newLimit) => setFilters(prev => ({ ...prev, limit: newLimit, offset: 0 }))}
                />
            </div>

            {/* Modal de Detalles */}
            {selectedLog && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(5px)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 2000,
                    padding: '20px'
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '600px', position: 'relative', animation: 'fade-in 0.3s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)', borderBottom: '1px solid var(--color-border)', paddingBottom: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <ShieldCheck className="text-primary" size={24} />
                                <h2 style={{ fontSize: '20px' }}>Detalles de la Acción</h2>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}
                            >
                                &times;
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                            <div>
                                <label className="form-label">Evento</label>
                                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{selectedLog.action}</div>
                            </div>
                            <div>
                                <label className="form-label">Fecha y Hora</label>
                                <div style={{ fontSize: '14px' }}>{formatDateTime(selectedLog.created_at)}</div>
                            </div>
                        </div>

                        <div>
                            <label className="form-label">Carga Útil (JSON)</label>
                            <pre style={{
                                backgroundColor: '#111',
                                padding: '15px',
                                borderRadius: '8px',
                                border: '1px solid var(--color-border)',
                                color: '#00FF00',
                                fontSize: '12px',
                                overflowX: 'auto',
                                maxHeight: '300px'
                            }}>
                                {formatJSON(selectedLog.details)}
                            </pre>
                        </div>

                        <div style={{ marginTop: '25px', textAlign: 'right' }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => setSelectedLog(null)}
                                style={{ marginLeft: 'auto' }}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLogs;
