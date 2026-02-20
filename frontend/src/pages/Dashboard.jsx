import React, { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

const Dashboard = () => {
    const [stats, setStats] = useState({
        total: 24,
        pending: 8,
        in_process: 4,
        completed: 12
    });

    const cards = [
        { title: 'Total Cotizaciones', value: stats.total, icon: <FileText size={24} />, color: '#FFFFFF', bg: 'rgba(255,255,255,0.05)' },
        { title: 'Pendientes', value: stats.pending, icon: <Clock size={24} />, color: '#FFD700', bg: 'rgba(255, 215, 0, 0.1)' },
        { title: 'En Proceso', value: stats.in_process, icon: <TrendingUp size={24} />, color: '#007BFF', bg: 'rgba(0, 123, 255, 0.1)' },
        { title: 'Completadas', value: stats.completed, icon: <CheckCircle size={24} />, color: '#28A745', bg: 'rgba(40, 167, 69, 0.1)' },
    ];

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h1 style={{ fontSize: '24px' }}>Panel de Control</h1>
                <p className="text-muted">Resumen general de operaciones logísticas</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
                {cards.map((card, idx) => (
                    <div key={idx} className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ backgroundColor: card.bg, color: card.color, padding: '15px', borderRadius: 'var(--radius-md)' }}>
                            {card.icon}
                        </div>
                        <div>
                            <p className="text-muted" style={{ fontSize: '12px', fontWeight: 'bold' }}>{card.title.toUpperCase()}</p>
                            <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{card.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-lg)' }}>
                <div className="card">
                    <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Actividad Reciente</h3>
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-sm)' }}>
                        <p className="text-muted" style={{ textAlign: 'center', padding: '40px' }}>Próximamente: Lista de actividad de cotizaciones</p>
                    </div>
                </div>
                <div className="card">
                    <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Estado de Flota</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="text-muted">Disponibles</span>
                            <span style={{ fontWeight: 'bold', color: '#28A745' }}>12</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="text-muted">En Ruta</span>
                            <span style={{ fontWeight: 'bold', color: '#007BFF' }}>8</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="text-muted">Mantenimiento</span>
                            <span style={{ fontWeight: 'bold', color: '#FF4848' }}>2</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
