import React, { useState } from 'react';
import MapComponent from '../components/MapComponent';
import { MapPin, Navigation, Plus, Trash2, Calculator } from 'lucide-react';

const NewQuote = () => {
    const [points, setPoints] = useState([
        { id: 'origin', label: 'Origen', address: '', lat: null, lng: null },
        { id: 'destination', label: 'Destino', address: '', lat: null, lng: null }
    ]);
    const [routeData, setRouteData] = useState(null);

    const addStop = () => {
        if (points.length >= 7) return; // Limit: Origin + Destination + 5 stops
        const newPoints = [...points];
        const destination = newPoints.pop();
        newPoints.push({ id: `stop-${Date.now()}`, label: `Parada ${newPoints.length}`, address: '', lat: null, lng: null });
        newPoints.push(destination);
        setPoints(newPoints);
    };

    const removeStop = (id) => {
        setPoints(points.filter(p => p.id !== id));
    };

    const updatePoint = (idx, lat, lng) => {
        const newPoints = [...points];
        newPoints[idx] = { ...newPoints[idx], lat, lng };
        setPoints(newPoints);
        // TODO: Reverse geocoding to update address
    };

    return (
        <div style={{ display: 'flex', gap: 'var(--spacing-lg)', height: 'calc(100vh - 100px)' }}>
            {/* Sidebar Inputs */}
            <div style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                <div className="card" style={{ flexGrow: 1, overflowY: 'auto' }}>
                    <h2 style={{ fontSize: '18px', marginBottom: 'var(--spacing-lg)' }}>Ruta</h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        {points.map((p, idx) => (
                            <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label style={{ fontSize: '10px', fontWeight: 'bold' }} className="text-muted">
                                        {p.label.toUpperCase()}
                                    </label>
                                    {p.id !== 'origin' && p.id !== 'destination' && (
                                        <Trash2 size={14} className="text-primary" onClick={() => removeStop(p.id)} cursor="pointer" />
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '8px' }}>
                                    <MapPin size={16} className={idx === 0 ? 'text-primary' : (idx === points.length - 1 ? 'text-primary' : 'text-muted')} />
                                    <input
                                        type="text"
                                        placeholder={`Buscar ${p.label}...`}
                                        style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', fontSize: '14px' }}
                                    />
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={addStop}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', background: 'transparent', border: '1px solid var(--color-primary)', padding: '8px', borderRadius: 'var(--radius-md)', alignSelf: 'flex-start', cursor: 'pointer', fontSize: '12px' }}>
                            <Plus size={16} />
                            Agregar parada
                        </button>
                    </div>
                </div>

                <button style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    padding: '15px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '10px',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    cursor: 'pointer'
                }}>
                    <Calculator size={20} />
                    Calcular Cotización
                </button>
            </div>

            {/* Map Area */}
            <div style={{ flexGrow: 1, position: 'relative' }}>
                <MapComponent points={points} routeData={routeData} onMarkerDrag={updatePoint} />

                {/* Floating Tools */}
                <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'var(--color-surface)', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }}>
                        <p className="text-muted" style={{ fontSize: '10px' }}>DISTANCIA</p>
                        <p style={{ fontWeight: 'bold' }}>0 km</p>
                    </div>
                    <div style={{ backgroundColor: 'var(--color-surface)', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }}>
                        <p className="text-muted" style={{ fontSize: '10px' }}>TIEMPO EST.</p>
                        <p style={{ fontWeight: 'bold' }}>0 min</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewQuote;
