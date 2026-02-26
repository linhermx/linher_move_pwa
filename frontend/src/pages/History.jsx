import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Eye, FileText, Calendar, RotateCcw, MoreVertical } from 'lucide-react';
import { quotationService } from '../services/api';
import { PDFService } from '../services/PDFService';
import { formatDate } from '../utils/formatters';
import CustomSelect from '../components/CustomSelect';
import CustomMenu from '../components/CustomMenu';

const History = () => {
    const navigate = useNavigate();
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [period, setPeriod] = useState(''); // '', 'today', 'week', 'month', 'year', 'custom'
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const fetchQuotes = async () => {
        setLoading(true);
        try {
            const params = {};
            if (search) params.folio = search;
            if (statusFilter) params.status = statusFilter;

            let finalFrom = dateFrom;
            let finalTo = dateTo;

            if (period && period !== 'custom') {
                const now = new Date();
                const start = new Date();

                if (period === 'today') {
                } else if (period === 'week') {
                    const day = now.getDay() || 7;
                    if (day !== 1) start.setDate(now.getDate() - (day - 1));
                } else if (period === 'month') {
                    start.setDate(1);
                } else if (period === 'year') {
                    start.setMonth(0, 1);
                }

                finalFrom = start.toISOString().split('T')[0];
                finalTo = now.toISOString().split('T')[0];
            }

            if (finalFrom) params.date_from = finalFrom;
            if (finalTo) params.date_to = finalTo;

            const data = await quotationService.list(params);
            setQuotes(data);
        } catch (err) {
            console.error('Error fetching quotes:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchQuotes();
        }, 300);
        return () => clearTimeout(timer);
    }, [search, statusFilter, period, dateFrom, dateTo]);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'completada': return { bg: 'rgba(40, 167, 69, 0.1)', color: '#28A745', text: 'Completada' };
            case 'pendiente': return { bg: 'rgba(255, 215, 0, 0.1)', color: '#FFD700', text: 'Pendiente' };
            case 'en_proceso': return { bg: 'rgba(0, 123, 255, 0.1)', color: '#007BFF', text: 'En Proceso' };
            case 'cancelada': return { bg: 'rgba(108, 117, 125, 0.1)', color: '#6C757D', text: 'Cancelada' };
            default: return { bg: 'transparent', color: 'white', text: status };
        }
    };

    const clearFilters = () => {
        setSearch('');
        setStatusFilter('');
        setPeriod('');
        setDateFrom('');
        setDateTo('');
    };

    return (
        <div className="fade-in">
            {/* Header */}
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h1 style={{ fontSize: '24px' }}>Historial de Cotizaciones</h1>
                <p className="text-muted">Consulta y gestiona todos los registros previos</p>
            </div>

            {/* Filters Bar */}
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)', padding: '15px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>

                    {/* Search */}
                    <div style={{ flex: '2', minWidth: '220px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: 'var(--color-bg)', padding: '10px 15px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                            <Search size={18} className="text-muted" />
                            <input
                                type="text"
                                placeholder="Buscar por folio..."
                                style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', fontSize: '14px' }}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Period Selector */}
                    <div style={{ flex: '1', minWidth: '150px', display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--color-bg)', padding: '0 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', height: '42px' }}>
                        <CustomSelect
                            icon={Calendar}
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
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

                    {/* Custom Range (Inline) */}
                    {period === 'custom' && (
                        <div className="fade-in" style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--color-bg)', padding: '0 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', height: '42px' }}>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                style={{ backgroundColor: 'transparent', border: 'none', color: 'white', fontSize: '12px', outline: 'none', width: '110px' }}
                            />
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>-</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                style={{ backgroundColor: 'transparent', border: 'none', color: 'white', fontSize: '12px', outline: 'none', width: '110px' }}
                            />
                        </div>
                    )}

                    {/* Status */}
                    <div style={{ flex: '1', minWidth: '150px', display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--color-bg)', padding: '0 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', height: '42px' }}>
                        <CustomSelect
                            icon={Filter}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            options={[
                                { value: '', label: 'Todos los estatus' },
                                { value: 'pendiente', label: 'Pendiente' },
                                { value: 'en_proceso', label: 'En Proceso' },
                                { value: 'completada', label: 'Completada' },
                                { value: 'cancelada', label: 'Cancelada' }
                            ]}
                        />
                    </div>

                    {/* Clear Button */}
                    {(search || statusFilter || period || dateFrom || dateTo) && (
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
                            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>LIMPIAR</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: '200px', position: 'relative' }}>
                {loading && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
                        <div className="spinner" style={{ width: '30px', height: '30px', border: '3px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    </div>
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                            <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 'bold' }}>FOLIO</th>
                            <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 'bold' }}>FECHA</th>
                            <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 'bold' }}>RUTA</th>
                            <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 'bold' }}>TOTAL</th>
                            <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 'bold' }}>ESTATUS</th>
                            <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 'bold', textAlign: 'right' }}>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quotes.length === 0 && !loading ? (
                            <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center' }} className="text-muted">No se encontraron cotizaciones.</td></tr>
                        ) : (
                            quotes.map(q => {
                                const status = getStatusStyle(q.status);
                                return (
                                    <tr key={q.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '16px', fontWeight: 'bold', color: 'var(--color-primary)', fontSize: '14px' }}>{q.folio}</td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                                <Calendar size={14} className="text-muted" />
                                                {formatDate(q.created_at)}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <p style={{ fontSize: '13px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.origin_address.split(',')[0]} &rarr;</p>
                                            <p style={{ fontSize: '13px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.destination_address.split(',')[0]}</p>
                                        </td>
                                        <td style={{ padding: '16px', fontWeight: 'bold', fontSize: '14px' }}>${Number(q.total).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '12px', backgroundColor: status.bg, color: status.color, textTransform: 'uppercase', fontWeight: 'bold' }}>{status.text}</span>
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'right' }}>
                                            <CustomMenu
                                                options={[
                                                    {
                                                        label: 'Ver Detalles',
                                                        icon: <Eye />,
                                                        onClick: () => navigate(`/history/${q.id}`)
                                                    },
                                                    {
                                                        label: 'Generar PDF',
                                                        icon: <FileText />,
                                                        onClick: () => PDFService.generateQuotationPDF(q)
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
            </div>
        </div>
    );
};

export default History;
