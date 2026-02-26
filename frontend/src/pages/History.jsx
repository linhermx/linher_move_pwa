import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Eye, FileText, Calendar } from 'lucide-react';
import { quotationService } from '../services/api';
import { PDFService } from '../services/PDFService';

const History = () => {
    const navigate = useNavigate();
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const fetchQuotes = async () => {
        setLoading(true);
        try {
            const params = {};
            if (search) params.folio = search;
            if (statusFilter) params.status = statusFilter;

            const data = await quotationService.list(params);
            setQuotes(data);
        } catch (err) {
            console.error('Error fetching quotes:', err);
            // Optional: Show notification error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchQuotes();
        }, 300); // Small debounce

        return () => clearTimeout(timer);
    }, [search, statusFilter]);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'completada': return { bg: 'rgba(40, 167, 69, 0.1)', color: '#28A745', text: 'Completada' };
            case 'pendiente': return { bg: 'rgba(255, 215, 0, 0.1)', color: '#FFD700', text: 'Pendiente' };
            case 'en_proceso': return { bg: 'rgba(0, 123, 255, 0.1)', color: '#007BFF', text: 'En Proceso' };
            case 'cancelada': return { bg: 'rgba(108, 117, 125, 0.1)', color: '#6C757D', text: 'Cancelada' };
            default: return { bg: 'transparent', color: 'white', text: status };
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
                <div>
                    <h1 style={{ fontSize: '24px' }}>Historial de Cotizaciones</h1>
                    <p className="text-muted">Consulta y gestiona todos los registros previos</p>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                <div style={{ flexGrow: 1, display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: 'var(--color-bg)', padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <Search size={18} className="text-muted" />
                    <input
                        type="text"
                        placeholder="Buscar por folio..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <Filter size={18} className="text-muted" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            color: 'white',
                            padding: '10px 15px',
                            borderRadius: 'var(--radius-md)',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="">Todos los estatus</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="en_proceso">En Proceso</option>
                        <option value="completada">Completada</option>
                        <option value="cancelada">Cancelada</option>
                    </select>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: '200px', position: 'relative' }}>
                {loading && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 10
                    }}>
                        <div className="spinner" style={{ width: '30px', height: '30px', border: '3px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    </div>
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                            <th style={{ padding: '16px' }}>FOLIO</th>
                            <th style={{ padding: '16px' }}>FECHA</th>
                            <th style={{ padding: '16px' }}>RUTA</th>
                            <th style={{ padding: '16px' }}>TOTAL</th>
                            <th style={{ padding: '16px' }}>ESTATUS</th>
                            <th style={{ padding: '16px' }}>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quotes.length === 0 && !loading ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '40px', textAlign: 'center' }} className="text-muted">
                                    No se encontraron cotizaciones.
                                </td>
                            </tr>
                        ) : (
                            quotes.map(q => {
                                const status = getStatusStyle(q.status);
                                return (
                                    <tr key={q.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '16px', fontWeight: 'bold', color: 'var(--color-primary)' }}>{q.folio}</td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Calendar size={14} className="text-muted" />
                                                {new Date(q.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <p style={{ fontSize: '14px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={q.origin_address}>
                                                {q.origin_address.split(',')[0]} &rarr;
                                            </p>
                                            <p style={{ fontSize: '14px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={q.destination_address}>
                                                {q.destination_address.split(',')[0]}
                                            </p>
                                        </td>
                                        <td style={{ padding: '16px', fontWeight: 'bold' }}>${Number(q.total).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{
                                                fontSize: '11px',
                                                padding: '4px 10px',
                                                borderRadius: '12px',
                                                backgroundColor: status.bg,
                                                color: status.color,
                                                textTransform: 'uppercase',
                                                fontWeight: 'bold'
                                            }}>
                                                {status.text}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <Eye
                                                    size={18}
                                                    className="text-muted"
                                                    cursor="pointer"
                                                    onClick={() => navigate(`/history/${q.id}`)}
                                                    onMouseOver={(e) => e.target.style.color = 'var(--color-primary)'}
                                                    onMouseOut={(e) => e.target.style.color = 'var(--color-text-muted)'}
                                                />
                                                <FileText
                                                    size={18}
                                                    className="text-muted"
                                                    cursor="pointer"
                                                    title="Generar PDF"
                                                    onClick={() => PDFService.generateQuotationPDF(q)}
                                                    onMouseOver={(e) => e.target.style.color = 'var(--color-primary)'}
                                                    onMouseOut={(e) => e.target.style.color = 'var(--color-text-muted)'}
                                                />
                                            </div>
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
