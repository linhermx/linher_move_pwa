import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, FileText, Calendar } from 'lucide-react';

const History = () => {
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock data for history
        setQuotes([
            { id: 1, folio: 'LMJR-260219001', date: '2026-02-19', origin: 'Puebla, Pue', destination: 'CDMX', total: 3016, status: 'completada' },
            { id: 2, folio: 'LMJR-260218005', date: '2026-02-18', origin: 'Veracruz, Ver', destination: 'Puebla, Pue', total: 4500, status: 'pendiente' },
            { id: 3, folio: 'LMJR-260218002', date: '2026-02-18', origin: 'Monterrey, NL', destination: 'Queretaro, Qro', total: 12400, status: 'en_proceso' }
        ]);
        setLoading(false);
    }, []);

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
                    <input type="text" placeholder="Buscar por folio u origen..." style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%' }} />
                </div>
                <button style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'white', padding: '10px 15px', borderRadius: 'var(--radius-md)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Filter size={18} />
                    Filtros
                </button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
                        {quotes.map(q => {
                            const status = getStatusStyle(q.status);
                            return (
                                <tr key={q.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '16px', fontWeight: 'bold', color: 'var(--color-primary)' }}>{q.folio}</td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Calendar size={14} className="text-muted" />
                                            {q.date}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <p style={{ fontSize: '14px' }}>{q.origin} &rarr;</p>
                                        <p style={{ fontSize: '14px' }}>{q.destination}</p>
                                    </td>
                                    <td style={{ padding: '16px', fontWeight: 'bold' }}>${q.total.toLocaleString()}</td>
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
                                            <Eye size={18} className="text-muted" cursor="pointer" />
                                            <FileText size={18} className="text-muted" cursor="pointer" />
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default History;
