import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import MapComponent from '../components/MapComponent';
import { mapsService, vehicleService, serviceService, settingsService, quotationService } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import CustomSelect from '../components/CustomSelect';
import { MapPin, Trash2, Plus, Loader2, Calculator, Truck, Package, ChevronRight, ChevronDown, Clock, X, Link as LinkIcon, PencilLine, Route } from 'lucide-react';
import { CalculationMotor } from '../utils/CalculationMotor';

const DEFAULT_EXPANDED_SECTIONS = ['ruta', 'logistica', 'servicios'];
const COMPACT_WORKSPACE_QUERY = '(max-width: 1024px)';
const EMPTY_ROUTE_VALIDATION_ERRORS = {
    origin: false,
    destination: false,
    vehicle: false,
    numTrips: false
};

const createInitialPoints = (settings = {}) => {
    if (settings.default_origin_address && settings.default_origin_lat && settings.default_origin_lng) {
        return [
            {
                id: 'origin',
                label: 'Origen',
                address: settings.default_origin_address,
                lat: parseFloat(settings.default_origin_lat),
                lng: parseFloat(settings.default_origin_lng)
            },
            { id: 'destination', label: 'Destino', address: '', lat: null, lng: null }
        ];
    }

    return [
        { id: 'origin', label: 'Origen', address: '', lat: null, lng: null },
        { id: 'destination', label: 'Destino', address: '', lat: null, lng: null }
    ];
};

const buildRouteSignature = (points = []) => JSON.stringify(
    points.map(({ id, address, lat, lng }) => ({
        id,
        address: (address || '').trim(),
        lat: lat === null || lat === undefined ? null : Number(lat),
        lng: lng === null || lng === undefined ? null : Number(lng)
    }))
);

const hasPointCoordinates = (point) => (
    Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng))
);

const validateRequiredRouteFields = ({ points, selectedVehicle, numTrips }) => {
    const origin = points.find((point) => point.id === 'origin');
    const destination = points.find((point) => point.id === 'destination');
    const parsedTrips = Number(numTrips);
    const errors = {
        origin: !hasPointCoordinates(origin),
        destination: !hasPointCoordinates(destination),
        vehicle: !selectedVehicle,
        numTrips: !Number.isInteger(parsedTrips) || parsedTrips <= 0
    };
    const missingFields = [];

    if (errors.origin) {
        missingFields.push('Origen');
    }
    if (errors.destination) {
        missingFields.push('Destino');
    }
    if (errors.vehicle) {
        missingFields.push('Vehículo');
    }
    if (errors.numTrips) {
        missingFields.push('Número de trayectos');
    }

    return { errors, missingFields };
};

const NewQuote = () => {
    const navigate = useNavigate();
    const [points, setPoints] = useState(() => createInitialPoints());
    const [routeData, setRouteData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeSearchIdx, setActiveSearchIdx] = useState(null);
    const { showNotification } = useNotification();
    const [suggestions, setSuggestions] = useState([]);
    const [summary, setSummary] = useState({ distance: 0, duration: 0 });
    const [_alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '' });
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
    const [numTrips, setNumTrips] = useState(2);
    const [expandedSections, setExpandedSections] = useState(DEFAULT_EXPANDED_SECTIONS);
    const [isFabOpen, setIsFabOpen] = useState(false);
    const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('form');
    const [isCompactLayout, setIsCompactLayout] = useState(() => window.matchMedia(COMPACT_WORKSPACE_QUERY).matches);
    const [lastCalculatedRouteSignature, setLastCalculatedRouteSignature] = useState(null);
    const [routeValidationErrors, setRouteValidationErrors] = useState(EMPTY_ROUTE_VALIDATION_ERRORS);
    const fabRef = useRef(null);
    const panelBodyRef = useRef(null);
    const [hasPanelOverflow, setHasPanelOverflow] = useState(false);

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
                    vehicleService.listCatalog(),
                    serviceService.listCatalog(),
                    settingsService.getPublic()
                ]);

                setVehicles(vData);
                setServices(sData);

                setGlobalSettings(settsData);

                setPoints(createInitialPoints(settsData));
            } catch (err) {
                console.error('Error fetching metadata:', err);
                showNotification('Error al cargar datos necesarios', 'error');
            }
        };
        fetchMetadata();
    }, [showNotification]);

    useEffect(() => {
        if (!isFabOpen) {
            return undefined;
        }

        const handlePointerDown = (event) => {
            if (fabRef.current && !fabRef.current.contains(event.target)) {
                setIsFabOpen(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsFabOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isFabOpen]);

    useEffect(() => {
        if (!breakdown) {
            setIsFabOpen(false);
        }
    }, [breakdown]);

    useEffect(() => {
        const mediaQuery = window.matchMedia(COMPACT_WORKSPACE_QUERY);
        const handleChange = (event) => {
            setIsCompactLayout(event.matches);
        };

        setIsCompactLayout(mediaQuery.matches);
        mediaQuery.addEventListener('change', handleChange);

        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, []);

    useEffect(() => {
        if (isCompactLayout) {
            setIsFabOpen(false);
        }
    }, [activeWorkspaceTab, isCompactLayout]);

    useEffect(() => {
        const panelBody = panelBodyRef.current;
        if (!panelBody) {
            return undefined;
        }

        const updateOverflow = () => {
            setHasPanelOverflow(panelBody.scrollHeight > panelBody.clientHeight + 1);
        };

        updateOverflow();

        const handleResize = () => {
            window.requestAnimationFrame(updateOverflow);
        };

        window.addEventListener('resize', handleResize);

        if (typeof ResizeObserver === 'undefined') {
            return () => {
                window.removeEventListener('resize', handleResize);
            };
        }

        const observer = new ResizeObserver(() => {
            window.requestAnimationFrame(updateOverflow);
        });

        observer.observe(panelBody);

        return () => {
            window.removeEventListener('resize', handleResize);
            observer.disconnect();
        };
    }, [
        activeWorkspaceTab,
        breakdown,
        expandedSections,
        isCompactLayout,
        mapsUrl,
        points,
        searchLoading,
        selectedServices,
        services.length,
        showMapsUrl,
        suggestions.length
    ]);

    const handleCalculate = useCallback(() => {
        const parsedTrips = Number(numTrips);
        if (summary.distance <= 0 || !selectedVehicle || !Number.isInteger(parsedTrips) || parsedTrips <= 0) {
            setBreakdown(null);
            return;
        }

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
    }, [costPerToll, globalSettings, numTolls, numTrips, selectedServices, selectedVehicle, services, summary.distance, summary.duration]);

    // Real-time calculation when route, vehicle or services change
    useEffect(() => {
        if (summary.distance > 0) {
            handleCalculate();
        }
    }, [summary.distance, handleCalculate]);

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
        const pointKey = points[idx]?.id === 'origin' || points[idx]?.id === 'destination' ? points[idx].id : null;

        if (pointKey) {
            setRouteValidationErrors((currentErrors) => ({ ...currentErrors, [pointKey]: false }));
        }

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
        if (newPoints[idx]?.id === 'origin' || newPoints[idx]?.id === 'destination') {
            setRouteValidationErrors((currentErrors) => ({ ...currentErrors, [newPoints[idx].id]: false }));
        }

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

            // Preserve the exact coordinates immediately so calculation can continue while the label resolves.
            setPoints(currentPoints => {
                const updated = [...currentPoints];
                updated[idx] = { ...updated[idx], lat, lng, address: 'Obteniendo dirección...' };
                return updated;
            });

            // Resolve the human-readable label asynchronously without blocking the flow.
            mapsService.reverseGeocode(lat, lng).then(result => {
                setPoints(currentPoints => {
                    const updated = [...currentPoints];
                    // Replace the temporary value with the resolved address once it returns.
                    updated[idx] = { ...updated[idx], address: result.label || text.trim() };
                    return updated;
                });
            }).catch(err => {
                console.warn('Background reverse geocode failed:', err);
                // If reverse geocoding fails, keep the coordinates as the final fallback.
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
        if (newPoints[pointIdx]?.id === 'origin' || newPoints[pointIdx]?.id === 'destination') {
            setRouteValidationErrors((currentErrors) => ({ ...currentErrors, [newPoints[pointIdx].id]: false }));
        }
        setSuggestions([]);
        setActiveSearchIdx(null);
    };

    const calculateRoute = async () => {
        const { errors, missingFields } = validateRequiredRouteFields({
            points,
            selectedVehicle,
            numTrips
        });

        if (missingFields.length > 0) {
            setRouteValidationErrors(errors);
            setExpandedSections((currentSections) => {
                const nextSections = [...currentSections];
                if ((errors.origin || errors.destination) && !nextSections.includes('ruta')) {
                    nextSections.push('ruta');
                }
                if ((errors.vehicle || errors.numTrips) && !nextSections.includes('logistica')) {
                    nextSections.push('logistica');
                }
                return nextSections;
            });
            if (isCompactLayout) {
                setActiveWorkspaceTab('form');
            }
            showNotification(`Completa los campos obligatorios: ${missingFields.join(', ')}`, 'info');
            return;
        }

        setRouteValidationErrors(EMPTY_ROUTE_VALIDATION_ERRORS);

        const validPoints = points.filter((point) => hasPointCoordinates(point));

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
                setLastCalculatedRouteSignature(buildRouteSignature(points));
                if (isCompactLayout) {
                    setActiveWorkspaceTab('map');
                }
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
            const errorMsg = err.response?.data?.message || err.message || 'Error al calcular la ruta. Verifica las ubicaciones.';
            showNotification(errorMsg, 'error');
            setAlertConfig({
                isOpen: true,
                title: 'Error de Ruta',
                message: errorMsg
            });
            setLoading(false);
        }
    };

    const _toggleConfirm = () => {
        if (!breakdown || !selectedVehicle) {
            showNotification('Calcula la ruta y selecciona un vehículo primero', 'info');
            return;
        }
        setAlertConfig({
            isOpen: true,
            title: 'Confirmar cotización',
            message: `¿Deseas guardar la cotización por un total de $${breakdown.total}?`
        });
    };

    const resetQuotation = () => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        setPoints(createInitialPoints(globalSettings));
        setRouteData(null);
        setSummary({ distance: 0, duration: 0 });
        setSelectedVehicle(null);
        setSelectedServices([]);
        setBreakdown(null);
        setMapsUrl('');
        setNumTolls(0);
        setCostPerToll(0);
        setNumTrips(1);
        setShowMapsUrl(false);
        setSuggestions([]);
        setActiveSearchIdx(null);
        setSearchLoading(null);
        setExpandedSections(DEFAULT_EXPANDED_SECTIONS);
        setIsFabOpen(false);
        setActiveWorkspaceTab('form');
        setLastCalculatedRouteSignature(null);
        setRouteValidationErrors(EMPTY_ROUTE_VALIDATION_ERRORS);
    };

    const handleSave = async (status = 'pendiente') => {
        if (!breakdown || !selectedVehicle) {
            showNotification('Calcula la ruta y selecciona un vehículo primero', 'info');
            return;
        }

        setIsFabOpen(false);
        setLoading(true);
        try {
            const rawU = localStorage.getItem('user') || sessionStorage.getItem('user');
            const user = JSON.parse(rawU);
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
            setTimeout(() => navigate('/history'), 1500);
        } catch (err) {
            console.error('Error saving quote:', err);
            showNotification('Error al guardar la cotización', 'error');
        } finally {
            setLoading(false);
        }
    };

    const hasCalculatedRoute = Boolean(routeData && summary.distance > 0);
    const hasRouteInputsChanged = Boolean(
        hasCalculatedRoute
        && lastCalculatedRouteSignature
        && lastCalculatedRouteSignature !== buildRouteSignature(points)
    );
    const canReturnToCalculatedRoute = isCompactLayout && hasCalculatedRoute && activeWorkspaceTab === 'form' && !hasRouteInputsChanged;
    const shouldShowRouteChangeHint = isCompactLayout && hasCalculatedRoute && activeWorkspaceTab === 'form' && hasRouteInputsChanged;
    const shouldRenderFormSection = !isCompactLayout || activeWorkspaceTab === 'form' || !hasCalculatedRoute;
    const shouldRenderMapSection = !isCompactLayout || (activeWorkspaceTab === 'map' && hasCalculatedRoute);
    const showCompactMapResults = isCompactLayout && shouldRenderMapSection && hasCalculatedRoute;

    const summaryCard = (
        <div className={`workspace-summary-card ${showCompactMapResults ? 'workspace-summary-card--compact' : ''}`.trim()}>
            {showCompactMapResults ? (
                <div className="workspace-summary-card__header">
                    <span className="workspace-summary-card__eyebrow">Ruta calculada</span>
                    <button
                        type="button"
                        className="workspace-inline-action workspace-inline-action--compact workspace-summary-card__edit"
                        onClick={() => setActiveWorkspaceTab('form')}
                    >
                        <PencilLine size={14} />
                        Editar datos
                    </button>
                </div>
            ) : null}
            <div className="workspace-summary-card__stats">
                <div className="workspace-summary-card__stat">
                    <p className="summary-stat__label">DISTANCIA</p>
                    <p className="summary-stat__value">{(parseFloat(summary.distance) || 0).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="summary-stat__unit">km</span></p>
                </div>
                <div className="workspace-summary-card__stat">
                    <p className="summary-stat__label">TIEMPO EST.</p>
                    <p className="summary-stat__value">{CalculationMotor.formatMinutes(summary.duration)}</p>
                </div>
            </div>
        </div>
    );

    const breakdownCard = breakdown ? (
        <div className="workspace-breakdown-card">
            <h3 className="cost-breakdown__title">
                <Calculator size={16} /> DESGLOSE DETALLADO
            </h3>

            <div className="cost-breakdown__stack">
                <div className="cost-breakdown__metrics">
                    <div className="cost-breakdown__metric">
                        <p className="cost-breakdown__metric-label">Dist. Total</p>
                        <p className="cost-breakdown__metric-value">{(breakdown.distancia_total || 0).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km</p>
                    </div>
                    <div className="cost-breakdown__metric">
                        <p className="cost-breakdown__metric-label">Tiempo Total</p>
                        <p className="cost-breakdown__metric-value">{CalculationMotor.formatMinutes(breakdown.tiempo_total_min)}</p>
                    </div>
                    <div className="cost-breakdown__metric">
                        <p className="cost-breakdown__metric-label">C/ tráfico</p>
                        <p className="cost-breakdown__metric-value">{CalculationMotor.formatMinutes(breakdown.tiempo_con_trafico_min)}</p>
                    </div>
                    <div className="cost-breakdown__metric">
                        <p className="cost-breakdown__metric-label">C/ Servicios</p>
                        <p className="cost-breakdown__metric-value">{breakdown.time_formatted}</p>
                    </div>
                </div>

                <div className="cost-breakdown__row">
                    <span className="text-muted">Gasolina ({(breakdown.gasolina_litros || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}L)</span>
                    <span>${breakdown.gas_cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="cost-breakdown__row">
                    <span className="text-muted">Casetas ({breakdown.num_tolls})</span>
                    <span>${breakdown.toll_cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="cost-breakdown__row cost-breakdown__row--accent">
                    <span className="cost-breakdown__row-label--strong">Costo logístico (flete)</span>
                    <span className="cost-breakdown__row-value--strong">${breakdown.logistics_cost_rounded.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <p className="cost-breakdown__note">
                    Bruto: ${breakdown.logistics_cost_raw.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>

                <div className="cost-breakdown__divider" />

                {breakdown.lodging_cost > 0 && (
                    <div className="cost-breakdown__row">
                        <span className="text-muted">Viáticos hospedaje</span>
                        <span>${breakdown.lodging_cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                )}
                <div className="cost-breakdown__row">
                    <span className="text-muted">Viáticos alimentos</span>
                    <span>${breakdown.meal_cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                {services.filter(s => selectedServices.includes(s.id)).map(s => (
                    <div key={s.id} className="cost-breakdown__row">
                        <span className="text-muted">{s.name}</span>
                        <span>${parseFloat(s.cost).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                ))}

                <div className="cost-breakdown__divider cost-breakdown__divider--strong" />

                <div className="cost-breakdown__row">
                    <span className="text-muted">Subtotal</span>
                    <span className="cost-breakdown__row-value">${breakdown.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="cost-breakdown__row">
                    <span className="text-muted">IVA (16%)</span>
                    <span className="cost-breakdown__row-value">${breakdown.iva.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                <div className="cost-breakdown__total">
                    <p className="cost-breakdown__total-label">TOTAL NETO</p>
                    <p className="cost-breakdown__total-value">
                        ${breakdown.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
            </div>
            <p className="cost-breakdown__footnote">
                * Precios aproximados sujetos a cambios en ruta.
            </p>
        </div>
    ) : null;

    return (
        <div className="page-shell page-shell--workspace fade-in workspace-shell">
            {shouldRenderFormSection ? (
                <section className="workspace-shell__panel">
                    <div
                        ref={panelBodyRef}
                        className={`workspace-shell__panel-body ${hasPanelOverflow ? 'workspace-shell__panel-body--scrollable custom-scrollbar' : ''}`.trim()}
                    >

                        {/* Ruta Section */}
                        <div className="card accordion-card">
                            <div
                                onClick={() => toggleSection('ruta')}
                                className={`accordion-header ${expandedSections.includes('ruta') ? 'expanded' : ''}`}
                            >
                                <h2>
                                    <MapPin size={18} className="text-primary" /> Ruta
                                </h2>
                                {expandedSections.includes('ruta') ? <ChevronDown size={18} className="text-muted" /> : <ChevronRight size={18} className="text-muted" />}
                            </div>

                            {expandedSections.includes('ruta') && (
                                <div className="accordion-content">
                                    {/* Unified Scroll - No nested scroll here */}
                                    <div className="workspace-route-points">
                                        {points.map((p, idx) => (
                                            <div key={p.id} className="workspace-route-point">
                                                {(() => {
                                                    const routeFieldKey = p.id === 'origin' || p.id === 'destination' ? p.id : null;
                                                    const hasRouteFieldError = routeFieldKey ? routeValidationErrors[routeFieldKey] : false;

                                                    return (
                                                        <>
                                                            <div className="workspace-route-point__header">
                                                                <label className="form-label" htmlFor={`quote-point-${p.id}`}>
                                                                    {p.label}
                                                                </label>
                                                                {p.id !== 'origin' && p.id !== 'destination' && (
                                                                    <Trash2 size={14} className="text-primary" onClick={() => removeStop(p.id)} cursor="pointer" />
                                                                )}
                                                            </div>
                                                            <div className={`form-field-group ${hasRouteFieldError ? 'form-field-group--error' : ''}`.trim()}>
                                                                {searchLoading === idx ? (
                                                                    <Loader2 size={16} className="animate-spin text-primary" />
                                                                ) : (
                                                                    <MapPin size={16} className={idx === 0 ? 'text-primary' : (idx === points.length - 1 ? 'text-primary' : 'text-muted')} />
                                                                )}
                                                                <input
                                                                    id={`quote-point-${p.id}`}
                                                                    name={`quote_point_${p.id}`}
                                                                    type="text"
                                                                    value={p.address}
                                                                    onChange={(e) => handleSearch(idx, e.target.value)}
                                                                    placeholder={`Buscar ${p.label}...`}
                                                                    autoComplete="street-address"
                                                                    aria-invalid={hasRouteFieldError}
                                                                />
                                                            </div>
                                                            {hasRouteFieldError ? (
                                                                <p className="form-feedback form-feedback--error">
                                                                    {p.id === 'origin' ? 'Selecciona un origen válido.' : 'Selecciona un destino válido.'}
                                                                </p>
                                                            ) : null}
                                                        </>
                                                    );
                                                })()}

                                                {activeSearchIdx === idx && suggestions.length > 0 && (
                                                    <div className="search-suggestions">
                                                        {suggestions.map((s, sIdx) => (
                                                            <button
                                                                key={sIdx}
                                                                type="button"
                                                                onClick={() => selectSuggestion(idx, s)}
                                                                className="search-suggestions__item"
                                                            >
                                                                {s.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                {idx === points.length - 1 && (
                                                    <div className="workspace-maps-link">
                                                        {!showMapsUrl ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowMapsUrl(true)}
                                                                className="workspace-maps-toggle"
                                                                disabled={!p.lat || !p.lng}
                                                            >
                                                                <LinkIcon size={12} />
                                                                {mapsUrl ? '+ Ver link de Google Maps (Destino)' : '+ Añadir link de Google Maps (Destino)'}
                                                            </button>
                                                        ) : (
                                                            <div className="workspace-maps-link__body">
                                                                <div className="workspace-maps-link__header">
                                                                    <label className="form-label" htmlFor="quote-maps-url">LINK DE GOOGLE MAPS (DESTINO)</label>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setShowMapsUrl(false)}
                                                                        className="workspace-inline-button"
                                                                    >
                                                                        <X size={12} />
                                                                    </button>
                                                                </div>
                                                                <div className="form-field-group workspace-field-group--dashed">
                                                                    <input
                                                                        id="quote-maps-url"
                                                                        name="google_maps_link"
                                                                        type="text"
                                                                        value={mapsUrl}
                                                                        onChange={(e) => setMapsUrl(e.target.value)}
                                                                        placeholder="Pega el link de Maps aquí..."
                                                                        autoFocus
                                                                        autoComplete="url"
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
                                        type="button"
                                        onClick={addStop}
                                        className="btn btn-secondary workspace-add-stop">
                                        <Plus size={16} />
                                        Agregar parada
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Logistics Section */}
                        <div className="card accordion-card">
                            <div
                                onClick={() => toggleSection('logistica')}
                                className={`accordion-header ${expandedSections.includes('logistica') ? 'expanded' : ''}`}
                            >
                                <h2>
                                    <Truck size={18} className="text-primary" /> Logística
                                </h2>
                                {expandedSections.includes('logistica') ? <ChevronDown size={18} className="text-muted" /> : <ChevronRight size={18} className="text-muted" />}
                            </div>

                            {expandedSections.includes('logistica') && (
                                <div className="accordion-content">
                                    <div>
                                        <label className="form-label" htmlFor="quote-vehicle">VEHÍCULO</label>
                                        <div className={`form-select-container ${routeValidationErrors.vehicle ? 'form-select-container--error' : ''}`.trim()}>
                                            <CustomSelect
                                                id="quote-vehicle"
                                                name="vehicle_id"
                                                placeholder="Seleccionar vehículo..."
                                                value={selectedVehicle?.id || ''}
                                                onChange={(e) => {
                                                    const vehicle = vehicles.find(v => v.id === parseInt(e.target.value));
                                                    setSelectedVehicle(vehicle);
                                                    setRouteValidationErrors((currentErrors) => ({ ...currentErrors, vehicle: false }));
                                                }}
                                                options={vehicles.map(v => ({ value: v.id, label: `${v.name} (${v.plate})` }))}
                                            />
                                        </div>
                                        {routeValidationErrors.vehicle ? (
                                            <p className="form-feedback form-feedback--error">Selecciona un vehículo.</p>
                                        ) : null}
                                    </div>

                                    <div className="workspace-form-split">
                                        <div className="workspace-form-split__full">
                                            <label className="form-label" htmlFor="quote-num-trips">NÚMERO DE TRAYECTOS (RECORRIDO)</label>
                                            <input
                                                id="quote-num-trips"
                                                name="num_trips"
                                                className={`form-field ${routeValidationErrors.numTrips ? 'form-field--error' : ''}`.trim()}
                                                type="number"
                                                value={numTrips || ''}
                                                onChange={(e) => {
                                                    setNumTrips(e.target.value);
                                                    setRouteValidationErrors((currentErrors) => ({ ...currentErrors, numTrips: false }));
                                                }}
                                                placeholder="1"
                                                autoComplete="off"
                                                min="1"
                                                step="1"
                                                inputMode="numeric"
                                                aria-invalid={routeValidationErrors.numTrips}
                                            />
                                            {routeValidationErrors.numTrips ? (
                                                <p className="form-feedback form-feedback--error">Ingresa un número de trayectos mayor a 0.</p>
                                            ) : null}
                                        </div>
                                        <div>
                                            <label className="form-label" htmlFor="quote-num-tolls">NÚM. CASETAS (IDA)</label>
                                            <input
                                                id="quote-num-tolls"
                                                name="num_tolls"
                                                className="form-field"
                                                type="number"
                                                value={numTolls || ''}
                                                onChange={(e) => setNumTolls(e.target.value)}
                                                placeholder="0"
                                                autoComplete="off"
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label" htmlFor="quote-cost-per-toll">COSTO C/U ($)</label>
                                            <input
                                                id="quote-cost-per-toll"
                                                name="cost_per_toll"
                                                className="form-field"
                                                type="number"
                                                value={costPerToll || ''}
                                                onChange={(e) => setCostPerToll(e.target.value)}
                                                placeholder="0.00"
                                                autoComplete="off"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Services Section */}
                        <div className="card accordion-card">
                            <div
                                onClick={() => toggleSection('servicios')}
                                className={`accordion-header ${expandedSections.includes('servicios') ? 'expanded' : ''}`}
                            >
                                <h2>
                                    <Package size={18} className="text-primary" /> Servicios Adicionales
                                </h2>
                                {expandedSections.includes('servicios') ? <ChevronDown size={18} className="text-muted" /> : <ChevronRight size={18} className="text-muted" />}
                            </div>

                            {expandedSections.includes('servicios') && (
                                <div className="accordion-content">
                                    <div className="workspace-services-list">
                                        {services.map(s => (
                                            <div
                                                key={s.id}
                                                onClick={() => toggleService(s.id)}
                                                className={`workspace-service-option ${selectedServices.includes(s.id) ? 'workspace-service-option--selected' : ''}`.trim()}
                                            >
                                                <span className="workspace-service-option__name">{s.name}</span>
                                                <span className="workspace-service-option__price">${parseFloat(s.cost || 0).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Removed fixed spacer to avoid unnecessary scrollbar */}
                    </div>

                    {/* Fixed Footer Area for Main Button */}
                    <div className="workspace-sticky-action">
                        {canReturnToCalculatedRoute ? (
                            <button
                                type="button"
                                className="workspace-inline-action workspace-inline-action--subtle workspace-inline-action--center workspace-sticky-action__return"
                                onClick={() => setActiveWorkspaceTab('map')}
                            >
                                <Route size={14} />
                                Ver ruta calculada
                            </button>
                        ) : null}
                        {shouldShowRouteChangeHint ? (
                            <p className="workspace-sticky-action__hint">
                                La ruta cambió. Recalcula para actualizar el mapa.
                            </p>
                        ) : null}
                        <button
                            onClick={calculateRoute}
                            disabled={loading || searchLoading !== null}
                            className="btn btn-primary workspace-calc-button">
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Calculator size={20} />}
                            Calcular cotización
                        </button>
                    </div>
                </section>
            ) : null}

            {shouldRenderMapSection ? (
                <section className="workspace-shell__map">
                    <div className="workspace-shell__map-stage">
                        <div className="workspace-shell__map-canvas">
                            <MapComponent
                                points={points}
                                routeData={routeData}
                                onMarkerDrag={updatePoint}
                                pointsFitPadding={isCompactLayout ? [18, 18] : [40, 40]}
                                routeFitPadding={isCompactLayout ? [22, 22] : [50, 50]}
                            />
                        </div>

                        {!showCompactMapResults && hasCalculatedRoute ? (
                            <div className={`workspace-shell__overlay ${isCompactLayout ? 'workspace-shell__overlay--mobile' : ''}`.trim()}>
                                {summaryCard}
                                {breakdownCard}
                            </div>
                        ) : null}
                    </div>

                    {showCompactMapResults ? (
                        <div className="workspace-mobile-results-stack fade-in-up">
                            {summaryCard}
                            {breakdownCard}
                            {breakdown ? (
                                <div className="workspace-mobile-results-actions">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={resetQuotation}
                                    >
                                        <Plus size={18} />
                                        Nueva cotización
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => handleSave('pendiente')}
                                    >
                                        <Clock size={18} />
                                        Guardar como pendiente
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    {breakdown && !showCompactMapResults ? (
                        <div className="fab-container" ref={fabRef}>
                            <div className="fab-speed-dial">
                                {isFabOpen ? (
                                    <div className="fab-speed-dial__actions fade-in-up" id="quote-speed-dial-menu" role="menu" aria-label="Acciones de cotización">
                                        <div className="fab-item" role="none">
                                            <span className="fab-item-label">Nueva cotización</span>
                                            <button
                                                type="button"
                                                className="fab-action-button"
                                                onClick={resetQuotation}
                                                title="Nueva cotización"
                                                role="menuitem"
                                            >
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                        <div className="fab-item" role="none">
                                            <span className="fab-item-label">Guardar como pendiente</span>
                                            <button
                                                type="button"
                                                className="fab-action-button fab-action-button--primary"
                                                onClick={() => handleSave('pendiente')}
                                                title="Guardar como pendiente"
                                                role="menuitem"
                                            >
                                                <Clock size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ) : null}

                                <button
                                    type="button"
                                    className={`fab-main ${isFabOpen ? '' : 'fab-pulse'}`.trim()}
                                    onClick={() => setIsFabOpen((currentState) => !currentState)}
                                    title={isFabOpen ? 'Cerrar acciones de cotización' : 'Abrir acciones de cotización'}
                                    aria-expanded={isFabOpen}
                                    aria-haspopup="menu"
                                    aria-controls="quote-speed-dial-menu"
                                >
                                    {isFabOpen ? <X size={26} /> : <Plus size={28} />}
                                </button>
                            </div>
                        </div>
                    ) : null}
                </section>
            ) : null}
        </div>
    );
};

export default NewQuote;

