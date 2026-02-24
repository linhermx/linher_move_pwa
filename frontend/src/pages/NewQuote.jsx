import React, { useState, useEffect } from 'react';
import MapComponent from '../components/MapComponent';
import { mapsService, vehicleService, serviceService, settingsService, quotationService } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import { useNotification } from '../context/NotificationContext';
import { MapPin, Trash2, Plus, Loader2, Calculator, Truck, Package, ChevronRight, Info } from 'lucide-react';
import { CalculationMotor } from '../utils/CalculationMotor';

const NewQuote = () => {
    const [points, setPoints] = useState([
        { id: 'origin', label: 'Origen', address: '', lat: null, lng: null },
        { id: 'destination', label: 'Destino', address: '', lat: null, lng: null }
    ]);
    const [routeData, setRouteData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeSearchIdx, setActiveSearchIdx] = useState(null);
    const { showNotification } = useNotification();
    const [suggestions, setSuggestions] = useState([]);
    const [summary, setSummary] = useState({ distance: 0, duration: 0 });
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '' });

    // New State for Quotation
    const [vehicles, setVehicles] = useState([]);
    const [services, setServices] = useState([]);
    const [globalSettings, setGlobalSettings] = useState({});
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [selectedServices, setSelectedServices] = useState([]);
    const [breakdown, setBreakdown] = useState(null);
    const [mapsUrl, setMapsUrl] = useState('');
    const [numTolls, setNumTolls] = useState(0);
    const [costPerToll, setCostPerToll] = useState(0);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [vData, sData, settsData] = await Promise.all([
                    vehicleService.list(),
                    serviceService.list(),
                    settingsService.get()
                ]);
                setVehicles(vData);
                setServices(sData);
                setGlobalSettings(settsData);

                // Set default origin if available
                if (settsData.default_origin_address && settsData.default_origin_lat && settsData.default_origin_lng) {
                    setPoints(prev => {
                        const newPoints = [...prev];
                        newPoints[0] = {
                            ...newPoints[0],
                            address: settsData.default_origin_address,
                            lat: parseFloat(settsData.default_origin_lat),
                            lng: parseFloat(settsData.default_origin_lng)
                        };
                        return newPoints;
                    });
                }
            } catch (err) {
                console.error('Error fetching metadata:', err);
                showNotification('Error al cargar datos necesarios', 'error');
            }
        };
        fetchMetadata();
    }, []);

    // Real-time calculation when route, vehicle or services change
    useEffect(() => {
        if (summary.distance > 0) {
            handleCalculate();
        }
    }, [summary, selectedVehicle, selectedServices, globalSettings, numTolls, costPerToll]);

    const handleCalculate = () => {
        if (summary.distance <= 0) return;

        const serviceCosts = selectedServices.reduce((acc, sId) => {
            const service = services.find(s => s.id === sId);
            return acc + (service ? parseFloat(service.cost) : 0);
        }, 0);

        const calculationInputs = {
            distance: summary.distance,
            time: summary.duration,
            num_legs: 1, // Default to one way for now
            num_tolls: parseInt(numTolls || 0),
            cost_per_toll: parseFloat(costPerToll || 0),
            unit_mpg: selectedVehicle ? selectedVehicle.rendimiento_real : 1,
            gas_price: globalSettings.gasoline_price || 24.50,
            maneuver_factor: globalSettings.maneuver_factor || 1.2,
            traffic_factor: globalSettings.traffic_factor || 1.5,
            service_costs: serviceCosts,
            service_time: 0, // Placeholder
            ...globalSettings // Tier thresholds and costs
        };

        const result = CalculationMotor.calculate(calculationInputs);
        setBreakdown(result);
    };

    const toggleService = (serviceId) => {
        setSelectedServices(prev =>
            prev.includes(serviceId)
                ? prev.filter(id => id !== serviceId)
                : [...prev, serviceId]
        );
    };

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

    const updatePoint = async (idx, lat, lng) => {
        const roundedLat = parseFloat(lat.toFixed(6));
        const roundedLng = parseFloat(lng.toFixed(6));

        setPoints(currentPoints => {
            const updated = [...currentPoints];
            updated[idx] = {
                ...updated[idx],
                lat: roundedLat,
                lng: roundedLng,
                address: 'Buscando dirección...'
            };
            return updated;
        });

        try {
            const result = await mapsService.reverseGeocode(roundedLat, roundedLng);
            setPoints(currentPoints => {
                const updated = [...currentPoints];
                updated[idx] = { ...updated[idx], address: result.label };
                return updated;
            });
        } catch (err) {
            console.error('Reverse geocode error:', err);
            setPoints(currentPoints => {
                const updated = [...currentPoints];
                updated[idx] = { ...updated[idx], address: `${roundedLat}, ${roundedLng}` };
                return updated;
            });
        }
    };

    const handleSearch = async (idx, text) => {
        const newPoints = [...points];
        newPoints[idx].address = text;

        // Check for coordinates (e.g. 19.4326, -99.1332)
        const coordRegex = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
        if (coordRegex.test(text.trim())) {
            const [lat, lng] = text.split(',').map(s => parseFloat(s.trim()));
            newPoints[idx].lat = lat;
            newPoints[idx].lng = lng;
            setPoints(newPoints);
            setSuggestions([]);
            setActiveSearchIdx(null);

            // Fetch human-readable address
            try {
                const result = await mapsService.reverseGeocode(lat, lng);
                setPoints(currentPoints => {
                    const updated = [...currentPoints];
                    updated[idx] = { ...updated[idx], address: result.label, lat, lng };
                    return updated;
                });
            } catch (err) {
                console.error('Reverse geocode error:', err);
            }
            return;
        }

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
            setAlertConfig({
                isOpen: true,
                title: 'Información Faltante',
                message: 'Por favor selecciona al menos origen y destino para calcular la ruta.'
            });
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
                showNotification('Ruta calculada exitosamente', 'success');
            }
        } catch (err) {
            console.error('Routing error:', err);
            const errorMsg = err.response?.data?.message || 'Error al calcular la ruta. Verifica las ubicaciones.';
            showNotification(errorMsg, 'error');
            setAlertConfig({
                isOpen: true,
                title: 'Error de Ruta',
                message: errorMsg
            });
        } finally {
            setLoading(false);
        }
    };

    const toggleConfirm = () => {
        if (!breakdown || !selectedVehicle) {
            showNotification('Calcula la ruta y selecciona un vehículo primero', 'info');
            return;
        }
        setAlertConfig({
            isOpen: true,
            title: 'Confirmar Cotización',
            message: `¿Deseas guardar la cotización por un total de $${breakdown.total}?`
        });
    };

    const handleConfirmSave = async () => {
        setLoading(true);
        try {
            const quotationData = {
                user_id: 1, // Mock user ID for now
                vehicle_id: selectedVehicle ? selectedVehicle.id : null,
                origin_address: points[0].address,
                destination_address: points[points.length - 1].address,
                google_maps_link: mapsUrl,
                distance_total: summary.distance,
                time_total: summary.duration,
                stops: points.length > 2 ? points.slice(1, -1).map(p => p.address) : [],
                selected_services: selectedServices,
                gas_price_applied: globalSettings.gasoline_price,
                factor_maniobra_applied: globalSettings.maneuver_factor,
                factor_trafico_applied: globalSettings.traffic_factor,
                ...breakdown
            };

            const response = await quotationService.create(quotationData);
            showNotification(`Cotización ${response.folio} guardada exitosamente`, 'success');
            setAlertConfig({ ...alertConfig, isOpen: false });
        } catch (err) {
            console.error('Error saving quote:', err);
            showNotification('Error al guardar la cotización', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', gap: 'var(--spacing-lg)', height: 'calc(100vh - 80px)' }}>
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
                                {idx === points.length - 1 && (
                                    <div style={{ marginTop: 'var(--spacing-sm)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: 'bold' }} className="text-muted">LINK DE GOOGLE MAPS (DESTINO)</label>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'rgba(255, 72, 72, 0.05)', border: '1px dashed var(--color-primary)', borderRadius: 'var(--radius-sm)', padding: '8px' }}>
                                            <input
                                                type="text"
                                                value={mapsUrl}
                                                onChange={(e) => setMapsUrl(e.target.value)}
                                                placeholder="Pega el link de Maps aquí..."
                                                style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', fontSize: '13px' }}
                                            />
                                        </div>
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

                {/* Vehicle Selection */}
                <div className="card">
                    <h2 style={{ fontSize: '16px', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Truck size={18} className="text-primary" /> Vehículo
                    </h2>
                    <select
                        className="text-white"
                        style={{ width: '100%', padding: '12px', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'white' }}
                        onChange={(e) => setSelectedVehicle(vehicles.find(v => v.id === parseInt(e.target.value)))}
                        value={selectedVehicle?.id || ''}
                    >
                        <option value="">Seleccionar vehículo...</option>
                        {vehicles.map(v => (
                            <option key={v.id} value={v.id}>{v.name} ({v.plate})</option>
                        ))}
                    </select>
                </div>

                {/* Tolls Selection */}
                <div className="card">
                    <h2 style={{ fontSize: '16px', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calculator size={18} className="text-primary" /> Casetas y Peajes
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label className="text-muted" style={{ display: 'block', fontSize: '10px', marginBottom: '4px' }}>NÚM. CASETAS</label>
                            <input
                                type="number"
                                value={numTolls || ''}
                                onChange={(e) => setNumTolls(e.target.value)}
                                placeholder="0"
                                style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px', color: 'white', width: '100%', outline: 'none', fontSize: '14px' }}
                            />
                        </div>
                        <div>
                            <label className="text-muted" style={{ display: 'block', fontSize: '10px', marginBottom: '4px' }}>COSTO C/U ($)</label>
                            <input
                                type="number"
                                value={costPerToll || ''}
                                onChange={(e) => setCostPerToll(e.target.value)}
                                placeholder="0.00"
                                style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px', color: 'white', width: '100%', outline: 'none', fontSize: '14px' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Services Selection */}
                <div className="card" style={{ flexGrow: 1, overflowY: 'auto' }}>
                    <h2 style={{ fontSize: '16px', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Package size={18} className="text-primary" /> Servicios Adicionales
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {services.map(s => (
                            <div
                                key={s.id}
                                onClick={() => toggleService(s.id)}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '10px 12px',
                                    backgroundColor: selectedServices.includes(s.id) ? 'rgba(255, 72, 72, 0.1)' : 'var(--color-bg)',
                                    border: `1px solid ${selectedServices.includes(s.id) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span style={{ fontSize: '13px' }}>{s.name}</span>
                                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>${parseFloat(s.cost || 0).toLocaleString()}</span>
                            </div>
                        ))}
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

                <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 1000, width: '280px' }}>
                    {/* Route Summary */}
                    <div style={{ backgroundColor: 'var(--color-surface)', padding: '15px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <p className="text-muted" style={{ fontSize: '10px', marginBottom: '4px' }}>DISTANCIA</p>
                            <p style={{ fontWeight: 'bold', fontSize: '18px' }}>{summary.distance} <span style={{ fontSize: '12px', fontWeight: 'normal' }}>km</span></p>
                        </div>
                        <div>
                            <p className="text-muted" style={{ fontSize: '10px', marginBottom: '4px' }}>TIEMPO EST.</p>
                            <p style={{ fontWeight: 'bold', fontSize: '18px' }}>{CalculationMotor.formatMinutes(summary.duration)}</p>
                        </div>
                    </div>

                    {/* Cost Breakdown */}
                    {breakdown && (
                        <div style={{ backgroundColor: 'var(--color-surface)', padding: '15px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xl)', animation: 'fade-in 0.3s' }}>
                            <h3 style={{ fontSize: '14px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)' }}>
                                <Calculator size={16} /> DESGLOSE DE COSTOS
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span className="text-muted">Gasolina</span>
                                    <span>${breakdown.gas_cost.toLocaleString()}</span>
                                </div>
                                {breakdown.lodging_cost > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                        <span className="text-muted">Hospedaje (Hotel)</span>
                                        <span>${breakdown.lodging_cost.toLocaleString()}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span className="text-muted">Alimentos/Viáticos</span>
                                    <span>${breakdown.meal_cost.toLocaleString()}</span>
                                </div>
                                {selectedServices.length > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                        <span className="text-muted">Servicios ({selectedServices.length})</span>
                                        <span>${(breakdown.subtotal - (breakdown.logistics_cost_rounded + breakdown.lodging_cost + breakdown.meal_cost)).toLocaleString()}</span>
                                    </div>
                                )}

                                <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '5px 0' }} />

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span className="text-muted">Subtotal</span>
                                    <span style={{ fontWeight: 'bold' }}>${breakdown.subtotal.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span className="text-muted">IVA (16%)</span>
                                    <span>${breakdown.iva.toLocaleString()}</span>
                                </div>

                                <div style={{ backgroundColor: 'rgba(255, 72, 72, 0.1)', padding: '12px', borderRadius: 'var(--radius-sm)', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>TOTAL</span>
                                    <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-primary)' }}>${breakdown.total.toLocaleString()}</span>
                                </div>
                            </div>

                            <p style={{ fontSize: '10px', color: 'var(--color-text-dim)', marginTop: '15px', fontStyle: 'italic' }}>
                                * Precios aproximados sujetos a cambios en ruta.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
                onConfirm={handleConfirmSave}
                title={alertConfig.title}
                message={alertConfig.message}
                confirmText="Guardar Cotización"
                isLoading={loading}
            />
        </div>
    );
};

export default NewQuote;
