import React, { useState, useEffect, useRef } from 'react';
import MapComponent from '../components/MapComponent';
import { mapsService, vehicleService, serviceService, settingsService, quotationService } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import { useNotification } from '../context/NotificationContext';
import { MapPin, Trash2, Plus, Loader2, Calculator, Truck, Package, ChevronRight, ChevronDown, Info, Clock, Check, Printer, X, Link as LinkIcon } from 'lucide-react';
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
    const [isFabOpen, setIsFabOpen] = useState(false);
    const [searchLoading, setSearchLoading] = useState(null); // idx of searching input
    const searchTimeoutRef = useRef(null);
    const [showMapsUrl, setShowMapsUrl] = useState(false);

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
    const [numTrips, setNumTrips] = useState(1);
    const [expandedSections, setExpandedSections] = useState(['ruta', 'logistica', 'servicios']);

    const toggleSection = (section) => {
        setExpandedSections(prev =>
            prev.includes(section)
                ? prev.filter(s => s !== section)
                : [...prev, section]
        );
    };

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
    }, [summary, selectedVehicle, selectedServices, globalSettings, numTolls, costPerToll, numTrips]);

    const handleCalculate = () => {
        if (summary.distance <= 0) return;

        const serviceInfo = selectedServices.reduce((acc, sId) => {
            const service = services.find(s => s.id === sId);
            if (service) {
                acc.costs += parseFloat(service.cost || 0);
                acc.time += parseInt(service.time_minutes || 0);
            }
            return acc;
        }, { costs: 0, time: 0 });

        const calculationInputs = {
            distance: summary.distance,
            time: summary.duration,
            num_legs: parseInt(numTrips || 1),
            num_tolls: parseInt(numTolls || 0),
            cost_per_toll: parseFloat(costPerToll || 0),
            unit_mpg: selectedVehicle ? selectedVehicle.rendimiento_real : 1,
            gas_price: globalSettings.gasoline_price || 24.50,
            maneuver_factor: globalSettings.maneuver_factor || 1.2,
            traffic_factor: globalSettings.traffic_factor || 1.5,
            service_costs: serviceInfo.costs,
            service_time: serviceInfo.time,
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
        setPoints(newPoints);

        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (!text || text.trim().length <= 3) {
            setSuggestions([]);
            setSearchLoading(null);
            return;
        }

        // Check for coordinates (e.g. 19.4326, -99.1332)
        const coordRegex = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
        if (coordRegex.test(text.trim())) {
            const [lat, lng] = text.split(',').map(s => parseFloat(s.trim()));
            setSearchLoading(idx);

            // 1. Guardamos la precisión de inmediato para habilitar el cálculo pero mostramos status
            setPoints(currentPoints => {
                const updated = [...currentPoints];
                updated[idx] = { ...updated[idx], lat, lng, address: 'Obteniendo dirección...' };
                return updated;
            });

            // 2. Buscamos el nombre de forma asíncrona pero prioritaria
            mapsService.reverseGeocode(lat, lng).then(result => {
                setPoints(currentPoints => {
                    const updated = [...currentPoints];
                    // 3. REEMPLAZO: Aquí es donde las coordenadas o el "Obteniendo..." se convierten en el nombre real
                    updated[idx] = { ...updated[idx], address: result.label || text.trim() };
                    return updated;
                });
            }).catch(err => {
                console.warn('Background reverse geocode failed:', err);
                // Si falla, dejamos las coordenadas como último recurso
                setPoints(currentPoints => {
                    const updated = [...currentPoints];
                    if (updated[idx].address === 'Obteniendo dirección...') {
                        updated[idx].address = text.trim();
                    }
                    return updated;
                });
            }).finally(() => {
                setSearchLoading(null);
            });
            return;
        }

        // Debounce text search
        setSearchLoading(idx);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                setActiveSearchIdx(idx);
                const results = await mapsService.autocomplete(text);
                setSuggestions(results);
            } catch (err) {
                console.error('Autocomplete error:', err);
            } finally {
                setSearchLoading(null);
            }
        }, 400);
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
            const locations = validPoints.map(p => [
                parseFloat(p.lng || 0),
                parseFloat(p.lat || 0)
            ]).filter(loc => !isNaN(loc[0]) && !isNaN(loc[1]));

            if (locations.length < 2) {
                setLoading(false);
                return;
            }

            console.log('Calculating route with locations:', locations);
            const data = await mapsService.getRoute(locations);

            // PRIORITIZE DATA: Update summary immediately to trigger CalculationMotor
            if (data.features && data.features[0].properties.summary) {
                const { distance, duration } = data.features[0].properties.summary;
                setSummary({
                    distance: (distance / 1000).toFixed(1),
                    duration: Math.round(duration / 60)
                });
                showNotification('Ruta calculada exitosamente', 'success');
            }

            // RELEASE MAIN BUTTON: Stop showing global spinner now that numbers are ready
            setLoading(false);

            // ASYNC DRAW: Draw route line in the next tick to avoid blocking price rendering
            setTimeout(() => {
                setRouteData(data);
            }, 50);

        } catch (err) {
            console.error('Routing error:', err);
            const errorMsg = err.response?.data?.message || 'Error al calcular la ruta. Verifica las ubicaciones.';
            showNotification(errorMsg, 'error');
            setAlertConfig({
                isOpen: true,
                title: 'Error de Ruta',
                message: errorMsg
            });
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

    const handleSave = async (status = 'pendiente') => {
        if (!breakdown || !selectedVehicle) {
            showNotification('Calcula la ruta y selecciona un vehículo primero', 'info');
            return;
        }

        setLoading(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const quotationData = {
                user_id: user ? user.id : 1,
                vehicle_id: selectedVehicle ? selectedVehicle.id : null,
                origin_address: points[0].address,
                origin_lat: points[0].lat,
                origin_lng: points[0].lng,
                destination_address: points[points.length - 1].address,
                destination_lat: points[points.length - 1].lat,
                destination_lng: points[points.length - 1].lng,
                google_maps_link: mapsUrl,
                num_legs: parseInt(numTrips || 1),
                num_tolls: breakdown.num_tolls,
                cost_per_toll: breakdown.cost_per_toll,
                gas_price_applied: breakdown.gas_price,
                factor_maniobra_applied: breakdown.maneuver_factor,
                factor_trafico_applied: breakdown.traffic_factor,
                distance_total: breakdown.distancia_total,
                time_total: breakdown.tiempo_total_min,
                time_traffic_min: breakdown.tiempo_con_trafico_min,
                time_services_min: breakdown.tiempo_con_servicios_min,
                gas_liters: breakdown.gasolina_litros,
                toll_cost: breakdown.toll_cost,
                stops: points.length > 2 ? points.slice(1, -1).map(p => ({
                    address: p.address,
                    lat: p.lat,
                    lng: p.lng
                })) : [],
                services: selectedServices.map(id => {
                    const s = services.find(x => x.id === id);
                    return { id: s.id, cost: s.cost, time_minutes: s.time_minutes };
                }),
                status: status,
                ...breakdown
            };

            const response = await quotationService.create(quotationData);
            showNotification(`Cotización ${response.folio} guardada como ${status}`, 'success');
            setIsFabOpen(false);
            // Optionally redirect or clear
        } catch (err) {
            console.error('Error saving quote:', err);
            showNotification('Error al guardar la cotización', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', gap: 'var(--spacing-lg)', height: 'calc(100vh - 80px)', overflow: 'hidden' }}>
            {/* Sidebar with Fixed Distribution */}
            <div style={{ width: '400px', display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: 'var(--spacing-md)' }}>
                {/* Scrollable Body area for Accordions - Unified Scrolling */}
                <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', paddingRight: '4px' }}>

                    {/* Ruta Section */}
                    <div className="card" style={{ padding: '0' }}>
                        <div
                            onClick={() => toggleSection('ruta')}
                            style={{
                                padding: '15px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                backgroundColor: expandedSections.includes('ruta') ? 'rgba(255,255,255,0.03)' : 'transparent',
                                borderBottom: expandedSections.includes('ruta') ? '1px solid var(--color-border)' : 'none'
                            }}
                        >
                            <h2 style={{ fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MapPin size={18} className="text-primary" /> Ruta
                            </h2>
                            {expandedSections.includes('ruta') ? <ChevronDown size={18} className="text-muted" /> : <ChevronRight size={18} className="text-muted" />}
                        </div>

                        {expandedSections.includes('ruta') && (
                            <div style={{ padding: '15px' }}>
                                {/* Unified Scroll - No nested scroll here */}
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
                                            <div className="form-field-group">
                                                {searchLoading === idx ? (
                                                    <Loader2 size={16} className="animate-spin text-primary" />
                                                ) : (
                                                    <MapPin size={16} className={idx === 0 ? 'text-primary' : (idx === points.length - 1 ? 'text-primary' : 'text-muted')} />
                                                )}
                                                <input
                                                    type="text"
                                                    value={p.address}
                                                    onChange={(e) => handleSearch(idx, e.target.value)}
                                                    placeholder={`Buscar ${p.label}...`}
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
                                                    zIndex: 5000,
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
                                                <div style={{ marginTop: 'var(--spacing-sm)' }}>
                                                    {!showMapsUrl ? (
                                                        <button
                                                            onClick={() => setShowMapsUrl(true)}
                                                            style={{
                                                                background: 'transparent',
                                                                border: 'none',
                                                                color: 'var(--color-primary)',
                                                                fontSize: '11px',
                                                                fontWeight: 'bold',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                cursor: 'pointer',
                                                                padding: '4px 0',
                                                                opacity: (p.lat && p.lng) ? 1 : 0.5,
                                                                pointerEvents: (p.lat && p.lng) ? 'auto' : 'none',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            <LinkIcon size={12} />
                                                            {mapsUrl ? '+ Ver link de Google Maps (Destino)' : '+ Añadir link de Google Maps (Destino)'}
                                                        </button>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', animation: 'fadeIn 0.3s ease-in-out' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <label style={{ fontSize: '10px', fontWeight: 'bold' }} className="text-muted">LINK DE GOOGLE MAPS (DESTINO)</label>
                                                                <button
                                                                    onClick={() => setShowMapsUrl(false)}
                                                                    style={{ background: 'transparent', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                            <div className="form-field-group" style={{
                                                                borderStyle: 'dashed',
                                                                border: '1px dashed var(--color-primary)',
                                                                backgroundColor: 'rgba(255, 72, 72, 0.05)',
                                                                transition: 'all 0.3s'
                                                            }}>
                                                                <input
                                                                    type="text"
                                                                    value={mapsUrl}
                                                                    onChange={(e) => setMapsUrl(e.target.value)}
                                                                    placeholder="Pega el link de Maps aquí..."
                                                                    autoFocus
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={addStop}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', background: 'transparent', border: '1px solid var(--color-primary)', padding: '8px', borderRadius: 'var(--radius-md)', marginTop: '12px', cursor: 'pointer', fontSize: '12px', width: '100%', justifyContent: 'center' }}>
                                    <Plus size={16} />
                                    Agregar parada
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Logística Section */}
                    <div className="card" style={{ padding: '0' }}>
                        <div
                            onClick={() => toggleSection('logistica')}
                            style={{
                                padding: '15px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                backgroundColor: expandedSections.includes('logistica') ? 'rgba(255,255,255,0.03)' : 'transparent',
                                borderBottom: expandedSections.includes('logistica') ? '1px solid var(--color-border)' : 'none'
                            }}
                        >
                            <h2 style={{ fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Truck size={18} className="text-primary" /> Logística
                            </h2>
                            {expandedSections.includes('logistica') ? <ChevronDown size={18} className="text-muted" /> : <ChevronRight size={18} className="text-muted" />}
                        </div>

                        {expandedSections.includes('logistica') && (
                            <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                <div>
                                    <label className="text-muted" style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '6px' }}>VEHÍCULO</label>
                                    <select
                                        className="form-field"
                                        onChange={(e) => setSelectedVehicle(vehicles.find(v => v.id === parseInt(e.target.value)))}
                                        value={selectedVehicle?.id || ''}
                                    >
                                        <option value="">Seleccionar vehículo...</option>
                                        {vehicles.map(v => (
                                            <option key={v.id} value={v.id}>{v.name} ({v.plate})</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label className="text-muted" style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>NÚMERO DE TRAYECTOS (RECORRIDO)</label>
                                        <input
                                            className="form-field"
                                            type="number"
                                            value={numTrips || ''}
                                            onChange={(e) => setNumTrips(e.target.value)}
                                            placeholder="1"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-muted" style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>NÚM. CASETAS (IDA)</label>
                                        <input
                                            className="form-field"
                                            type="number"
                                            value={numTolls || ''}
                                            onChange={(e) => setNumTolls(e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-muted" style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>COSTO C/U ($)</label>
                                        <input
                                            className="form-field"
                                            type="number"
                                            value={costPerToll || ''}
                                            onChange={(e) => setCostPerToll(e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Services Section */}
                    <div className="card" style={{ padding: '0' }}>
                        <div
                            onClick={() => toggleSection('servicios')}
                            style={{
                                padding: '15px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                backgroundColor: expandedSections.includes('servicios') ? 'rgba(255,255,255,0.03)' : 'transparent',
                                borderBottom: expandedSections.includes('servicios') ? '1px solid var(--color-border)' : 'none'
                            }}
                        >
                            <h2 style={{ fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Package size={18} className="text-primary" /> Servicios Adicionales
                            </h2>
                            {expandedSections.includes('servicios') ? <ChevronDown size={18} className="text-muted" /> : <ChevronRight size={18} className="text-muted" />}
                        </div>

                        {expandedSections.includes('servicios') && (
                            <div style={{ padding: '15px' }}>
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
                        )}
                    </div>
                    {/* Removed fixed spacer to avoid unnecessary scrollbar */}
                </div>

                {/* Fixed Footer Area for Main Button */}
                <div style={{ paddingTop: '5px' }}>
                    <button
                        onClick={calculateRoute}
                        disabled={loading || searchLoading !== null}
                        style={{
                            backgroundColor: (loading || searchLoading !== null) ? 'var(--color-text-dim)' : 'var(--color-primary)',
                            color: 'white',
                            border: 'none',
                            padding: '16px',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '10px',
                            fontWeight: 'bold',
                            fontSize: '16px',
                            cursor: (loading || searchLoading !== null) ? 'default' : 'pointer',
                            width: '100%',
                            boxShadow: '0 4px 12px rgba(255, 72, 72, 0.2)'
                        }}>
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Calculator size={20} />}
                        Calcular Cotización
                    </button>
                </div>
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
                        <div style={{ backgroundColor: 'var(--color-surface)', padding: '15px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xl)', animation: 'fade-in 0.3s', maxHeight: '550px', overflowY: 'auto' }}>
                            <h3 style={{ fontSize: '14px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)' }}>
                                <Calculator size={16} /> DESGLOSE DETALLADO
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {/* Distances & Times */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '5px' }}>
                                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '4px' }}>
                                        <p className="text-muted" style={{ fontSize: '9px', textTransform: 'uppercase' }}>Dist. Total</p>
                                        <p style={{ fontSize: '14px', fontWeight: 'bold' }}>{breakdown.distancia_total} km</p>
                                    </div>
                                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '4px' }}>
                                        <p className="text-muted" style={{ fontSize: '9px', textTransform: 'uppercase' }}>Tiempo Total</p>
                                        <p style={{ fontSize: '14px', fontWeight: 'bold' }}>{CalculationMotor.formatMinutes(breakdown.tiempo_total_min)}</p>
                                    </div>
                                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '4px' }}>
                                        <p className="text-muted" style={{ fontSize: '9px', textTransform: 'uppercase' }}>C/ Tráfico</p>
                                        <p style={{ fontSize: '14px', fontWeight: 'bold' }}>{CalculationMotor.formatMinutes(breakdown.tiempo_con_trafico_min)}</p>
                                    </div>
                                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '4px' }}>
                                        <p className="text-muted" style={{ fontSize: '9px', textTransform: 'uppercase' }}>C/ Servicios</p>
                                        <p style={{ fontSize: '14px', fontWeight: 'bold' }}>{breakdown.time_formatted}</p>
                                    </div>
                                </div>

                                {/* Logistics Breakdown */}
                                <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span className="text-muted">Gasolina ({breakdown.gasolina_litros}L)</span>
                                    <span>${breakdown.gas_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span className="text-muted">Casetas ({breakdown.num_tolls})</span>
                                    <span>${breakdown.toll_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', color: 'var(--color-primary)' }}>
                                    <span style={{ fontWeight: 'bold' }}>Costo Logístico (Flete)</span>
                                    <span style={{ fontWeight: 'bold' }}>${breakdown.logistics_cost_rounded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <p style={{ fontSize: '9px', color: 'var(--color-text-dim)', textAlign: 'right', marginTop: '-5px' }}>
                                    Bruto: ${breakdown.logistics_cost_raw.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>

                                <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '5px 0' }} />

                                {/* Viáticos & Services */}
                                {breakdown.lodging_cost > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                        <span className="text-muted">Viáticos Hospedaje</span>
                                        <span>${breakdown.lodging_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <span className="text-muted">Viáticos Alimentos</span>
                                    <span>${breakdown.meal_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>

                                {services.filter(s => selectedServices.includes(s.id)).map(s => (
                                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                        <span className="text-muted">{s.name}</span>
                                        <span>${parseFloat(s.cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                ))}

                                <div style={{ height: '2px', backgroundColor: 'var(--color-border)', margin: '10px 0' }} />

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <span className="text-muted">Subtotal</span>
                                    <span style={{ fontWeight: 'bold' }}>${breakdown.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <span className="text-muted">IVA (16%)</span>
                                    <span style={{ fontWeight: 'bold' }}>${breakdown.iva.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>

                                <div style={{
                                    backgroundColor: 'rgba(255, 72, 72, 0.05)',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    marginTop: '10px',
                                    border: '1px solid rgba(255, 72, 72, 0.2)',
                                    textAlign: 'right'
                                }}>
                                    <p className="text-muted" style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '2px' }}>TOTAL NETO</p>
                                    <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--color-primary)', margin: 0 }}>
                                        ${breakdown.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                            <p style={{ fontSize: '10px', color: 'var(--color-text-dim)', textAlign: 'center', marginTop: '15px', fontStyle: 'italic' }}>
                                * Precios aproximados sujetos a cambios en ruta.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Action Button & Menu */}
            {breakdown && (
                <div className="fab-container">
                    <div className={`fab-menu ${isFabOpen ? 'active' : ''}`}>
                        <div className="fab-item">
                            <span className="fab-item-label">Imprimir Cotización</span>
                            <button className="fab-item-btn" onClick={() => window.print()}>
                                <Printer size={20} />
                            </button>
                        </div>
                        <div className="fab-item">
                            <span className="fab-item-label">Guardar y Aprobar</span>
                            <button className="fab-item-btn" onClick={() => handleSave('aprobada')}>
                                <Check size={20} color="#28A745" />
                            </button>
                        </div>
                        <div className="fab-item">
                            <span className="fab-item-label">Guardar como Pendiente</span>
                            <button className="fab-item-btn" onClick={() => handleSave('pendiente')}>
                                <Clock size={20} color="#FFD700" />
                            </button>
                        </div>
                    </div>
                    <button
                        className={`fab-main ${isFabOpen ? 'active' : 'fab-pulse'}`}
                        onClick={() => setIsFabOpen(!isFabOpen)}
                    >
                        {isFabOpen ? <X size={28} /> : <Plus size={28} />}
                    </button>
                </div>
            )}
        </div>
    );
};

export default NewQuote;
