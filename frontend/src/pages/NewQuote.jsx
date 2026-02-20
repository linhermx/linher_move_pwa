import React, { useState, useEffect } from 'react';
import MapComponent from '../components/MapComponent';
import { MapPin, Navigation, Plus, Trash2, Calculator, Loader2 } from 'lucide-react';
import { mapsService } from '../services/api';

const NewQuote = () => {
    const [points, setPoints] = useState([
        { id: 'origin', label: 'Origen', address: '', lat: null, lng: null },
        { id: 'destination', label: 'Destino', address: '', lat: null, lng: null }
    ]);
    const [routeData, setRouteData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeSearchIdx, setActiveSearchIdx] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [summary, setSummary] = useState({ distance: 0, duration: 0 });

    const addStop = () => {
        if (points.length >= 7) return;
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
    };

    const handleSearch = async (idx, text) => {
        const newPoints = [...points];
        newPoints[idx].address = text;
        setPoints(newPoints);

        if (text.length > 3) {
            setActiveSearchIdx(idx);
            try {
                const results = await mapsService.autocomplete(text);
                setSuggestions(results);
            } catch (err) {
                console.error('Autocomplete error:', err);
            }
        } else {
            setSuggestions([]);
        }
    };

    const selectSuggestion = (pointIdx, suggestion) => {
        const newPoints = [...points];
        newPoints[pointIdx] = {
            ...newPoints[pointIdx],
            address: suggestion.label,
            lat: suggestion.lat,
            lng: suggestion.lng
        };
        setPoints(newPoints);
        setSuggestions([]);
        setActiveSearchIdx(null);
    };

    const calculateRoute = async () => {
        const validPoints = points.filter(p => p.lat && p.lng);
        if (validPoints.length < 2) {
            alert('Por favor selecciona al menos origen y destino.');
            return;
        }

        setLoading(true);
        try {
            const locations = validPoints.map(p => [p.lng, p.lat]);
            const data = await mapsService.getRoute(locations);
            setRouteData(data);

            // Extract summary
            if (data.features && data.features[0].properties.summary) {
                const { distance, duration } = data.features[0].properties.summary;
                setSummary({
                    distance: (distance / 1000).toFixed(1),
                    duration: Math.round(duration / 60)
                });
            }
        } catch (err) {
            console.error('Routing error:', err);
            alert('Error al calcular la ruta.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', gap: 'var(--spacing-lg)', height: 'calc(100vh - 100px)' }}>
            <div style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                <div className="card" style={{ flexGrow: 1, overflowY: 'visible', position: 'relative' }}>
                    <h2 style={{ fontSize: '18px', marginBottom: 'var(--spacing-lg)' }}>Ruta</h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        {points.map((p, idx) => (
                            <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
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
                                        value={p.address}
                                        onChange={(e) => handleSearch(idx, e.target.value)}
                                        placeholder={`Buscar ${p.label}...`}
                                        style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', fontSize: '14px' }}
                                    />
                                </div>

                                {activeSearchIdx === idx && suggestions.length > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        backgroundColor: 'var(--color-surface)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-sm)',
                                        zIndex: 2000,
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        boxShadow: 'var(--shadow-lg)'
                                    }}>
                                        {suggestions.map((s, sIdx) => (
                                            <div
                                                key={sIdx}
                                                onClick={() => selectSuggestion(idx, s)}
                                                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', fontSize: '12px' }}
                                                onMouseOver={(e) => e.target.style.backgroundColor = 'var(--color-surface-hover)'}
                                                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                                            >
                                                {s.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
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

                <button
                    onClick={calculateRoute}
                    disabled={loading}
                    style={{
                        backgroundColor: loading ? 'var(--color-text-dim)' : 'var(--color-primary)',
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
                        cursor: loading ? 'default' : 'pointer'
                    }}>
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Calculator size={20} />}
                    Calcular Cotización
                </button>
            </div>

            <div style={{ flexGrow: 1, position: 'relative' }}>
                <MapComponent points={points} routeData={routeData} onMarkerDrag={updatePoint} />

                <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'var(--color-surface)', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }}>
                        <p className="text-muted" style={{ fontSize: '10px' }}>DISTANCIA</p>
                        <p style={{ fontWeight: 'bold' }}>{summary.distance} km</p>
                    </div>
                    <div style={{ backgroundColor: 'var(--color-surface)', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }}>
                        <p className="text-muted" style={{ fontSize: '10px' }}>TIEMPO EST.</p>
                        <p style={{ fontWeight: 'bold' }}>{summary.duration} min</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewQuote;
