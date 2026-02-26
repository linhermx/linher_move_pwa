import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quotationService, vehicleService, settingsService, serviceService, mapsService } from '../services/api';
import MapComponent from '../components/MapComponent';
import { CalculationMotor } from '../utils/CalculationMotor';
import { useNotification } from '../context/NotificationContext';
import {
    ChevronLeft,
    Calculator,
    MapPin,
    Truck,
    Calendar,
    FileText,
    Save,
    CheckCircle,
    XCircle,
    Loader2,
    Download,
    Fuel
} from 'lucide-react';
import { PDFService } from '../services/PDFService';

const QuoteDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showNotification } = useNotification();

    const [quote, setQuote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [manualAdjustments, setManualAdjustments] = useState({
        lodging_cost: 0,
        meal_cost: 0
    });

    const [currentBreakdown, setCurrentBreakdown] = useState(null);
    const [vehicles, setVehicles] = useState([]);
    const [globalSettings, setGlobalSettings] = useState({});
    const [services, setServices] = useState([]);
    const [routeData, setRouteData] = useState(null);
    const [selectedServiceIds, setSelectedServiceIds] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // PHASE 1: Fetch main quote data first to show UI immediately
                const quoteData = await quotationService.get(id);
                setQuote(quoteData);
                setManualAdjustments({
                    lodging_cost: quoteData.lodging_cost || 0,
                    meal_cost: quoteData.meal_cost || 0
                });
                setSelectedServiceIds((quoteData.services || []).map(s => s.service_id));
                setCurrentBreakdown(quoteData);
                setLoading(false); // RELEASE UI NOW

                // PHASE 2: Background tasks (don't block the UI)
                Promise.all([
                    vehicleService.list(),
                    settingsService.get(),
                    serviceService.list()
                ]).then(([vData, settsData, sData]) => {
                    setVehicles(vData);
                    setGlobalSettings(settsData);
                    setServices(sData);

                    // Sync initial breakdown with full service info once loaded
                    const initialIds = (quoteData.services || []).map(s => s.service_id);
                    recalculateBreakdown({
                        lodging_cost: quoteData.lodging_cost || 0,
                        meal_cost: quoteData.meal_cost || 0
                    }, initialIds, sData);
                }).catch(err => console.warn('Background data fetch failed:', err));

                // BACKGROUND TASK: Fetch route line if coordinates exist
                if (quoteData.origin_lat && quoteData.origin_lng) {
                    const locations = [
                        [parseFloat(quoteData.origin_lng), parseFloat(quoteData.origin_lat)],
                        ...(quoteData.stops || []).map(s => [parseFloat(s.lng), parseFloat(s.lat)]),
                        [parseFloat(quoteData.destination_lng), parseFloat(quoteData.destination_lat)]
                    ].filter(loc => !isNaN(loc[0]) && !isNaN(loc[1]) && loc[0] !== 0 && loc[1] !== 0);

                    if (locations.length >= 2) {
                        mapsService.getRoute(locations)
                            .then(rData => {
                                // ASYNC DRAW: Draw route line in the next tick to avoid blocking price rendering
                                setTimeout(() => {
                                    setRouteData(rData);
                                }, 100);
                            })
                            .catch(rErr => console.error('Error fetching route in background:', rErr));
                    }
                }
            } catch (err) {
                console.error('Error fetching quote detail:', err);
                showNotification('Error al cargar la cotización', 'error');
                navigate('/history');
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const recalculateBreakdown = (adjustments, selectedIds, availableServices = services) => {
        if (!quote) return;

        const selectedServicesData = availableServices.filter(s => selectedIds.includes(s.id));
        const serviceCosts = selectedServicesData.reduce((acc, s) => acc + parseFloat(s.cost || 0), 0);
        const serviceTime = selectedServicesData.reduce((acc, s) => acc + parseInt(s.time_minutes || 0), 0);

        const subtotal = parseFloat(quote.logistics_cost_rounded || 0) +
            parseFloat(serviceCosts || 0) +
            parseFloat(adjustments.lodging_cost || 0) +
            parseFloat(adjustments.meal_cost || 0);
        const iva = subtotal * 0.16;
        const total = Math.ceil(subtotal + iva);

        const timeTraffic = currentBreakdown?.time_traffic_min || quote.time_traffic_min || (quote.time_total * 1.15);

        setCurrentBreakdown({
            ...currentBreakdown,
            service_costs: serviceCosts,
            service_time: serviceTime,
            time_services_min: timeTraffic + serviceTime,
            lodging_cost: adjustments.lodging_cost,
            meal_cost: adjustments.meal_cost,
            subtotal,
            iva,
            total
        });
    };

    const handleAdjustmentChange = (field, value) => {
        const newValue = parseFloat(value) || 0;
        const newAdjustments = { ...manualAdjustments, [field]: newValue };
        setManualAdjustments(newAdjustments);
        recalculateBreakdown(newAdjustments, selectedServiceIds);
    };

    const handleServiceToggle = (serviceId) => {
        const newSelection = selectedServiceIds.includes(serviceId)
            ? selectedServiceIds.filter(id => id !== serviceId)
            : [...selectedServiceIds, serviceId];

        setSelectedServiceIds(newSelection);
        recalculateBreakdown(manualAdjustments, newSelection);
    };

    const handleSaveUpdates = async () => {
        setSaving(true);
        try {
            await quotationService.update(id, {
                lodging_cost: currentBreakdown.lodging_cost,
                meal_cost: currentBreakdown.meal_cost,
                service_costs: currentBreakdown.service_costs,
                subtotal: currentBreakdown.subtotal,
                iva: currentBreakdown.iva,
                total: currentBreakdown.total,
                services: services.filter(s => selectedServiceIds.includes(s.id))
            });
            showNotification('Cotización actualizada correctamente', 'success');
            setQuote({ ...quote, ...currentBreakdown });
        } catch (err) {
            console.error('Error updating quote:', err);
            showNotification('Error al guardar los cambios', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        setSaving(true);
        try {
            await quotationService.update(id, { status: newStatus });
            showNotification(`Estado actualizado a ${newStatus}`, 'success');
            setQuote({ ...quote, status: newStatus });
            setCurrentBreakdown({ ...currentBreakdown, status: newStatus });
        } catch (err) {
            console.error('Error updating status:', err);
            showNotification('Error al actualizar el estado', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Loader2 className="animate-spin" size={48} color="var(--color-primary)" />
            </div>
        );
    }

    const getStatusInfo = (status) => {
        switch (status) {
            case 'completada': return { color: '#28A745', text: 'Completada', icon: <CheckCircle size={16} /> };
            case 'pendiente': return { color: '#FFD700', text: 'Pendiente', icon: <Calculator size={16} /> };
            case 'en_proceso': return { color: '#007BFF', text: 'En Proceso', icon: <Loader2 size={16} /> };
            case 'cancelada': return { color: '#6C757D', text: 'Cancelada', icon: <XCircle size={16} /> };
            default: return { color: 'white', text: status, icon: null };
        }
    };

    const statusInfo = getStatusInfo(quote.status);
    const isLocked = ['completada', 'cancelada'].includes(quote.status);

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button
                        onClick={() => navigate('/history')}
                        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h1 style={{ fontSize: '24px', margin: 0 }}>Cotización {quote.folio}</h1>
                            <div style={{
                                backgroundColor: `${statusInfo.color}20`,
                                color: statusInfo.color,
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                border: `1px solid ${statusInfo.color}40`
                            }}>
                                {statusInfo.icon}
                                {statusInfo.text.toUpperCase()}
                            </div>
                        </div>
                        <p className="text-muted" style={{ margin: '4px 0 0 0' }}>Creada el {new Date(quote.created_at).toLocaleDateString()}</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {/* New Status Selector Design */}
                    <div style={{
                        display: 'flex',
                        backgroundColor: 'var(--color-surface)',
                        padding: '4px',
                        borderRadius: '12px',
                        border: '1px solid var(--color-border)',
                    }}>
                        {['pendiente', 'en_proceso', 'completada', 'cancelada'].map((s) => {
                            const info = getStatusInfo(s);
                            const isActive = quote.status === s;
                            return (
                                <button
                                    key={s}
                                    onClick={() => !isLocked && handleStatusChange(s)}
                                    disabled={isLocked && quote.status !== s}
                                    title={info.text}
                                    style={{
                                        border: 'none',
                                        background: isActive ? info.color : 'transparent',
                                        color: isActive ? 'black' : 'var(--color-text-muted)',
                                        padding: '8px 14px',
                                        borderRadius: '8px',
                                        cursor: isLocked ? 'default' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        opacity: isLocked && !isActive ? 0.3 : 1,
                                    }}
                                >
                                    {isActive ? (
                                        <>
                                            {React.cloneElement(info.icon, { size: 14 })}
                                            {info.text.toUpperCase()}
                                        </>
                                    ) : (
                                        React.cloneElement(info.icon, { size: 16 })
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {!isLocked && (
                        <button
                            onClick={handleSaveUpdates}
                            disabled={saving}
                            className="btn-primary"
                            style={{
                                padding: '10px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: 'bold',
                            }}
                        >
                            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Guardar Ajustes
                        </button>
                    )}

                    <button
                        onClick={() => PDFService.generateQuotationPDF(quote)}
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            color: 'white',
                            border: '1px solid var(--color-border)',
                            padding: '10px 20px',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        <Download size={18} />
                        PDF
                    </button>
                </div>
            </div>

            {/* Main Content Layout */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>

                {/* Top Row: Map & Main Breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 'var(--spacing-md)', alignItems: 'stretch' }}>
                    {/* Map Detail */}
                    <div className="card" style={{ height: '100%', padding: 0, position: 'relative', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                        <MapComponent
                            points={[
                                { address: quote.origin_address, lat: quote.origin_lat, lng: quote.origin_lng },
                                ...(quote.stops || []).map(s => ({ address: s.address, lat: s.lat, lng: s.lng })),
                                { address: quote.destination_address, lat: quote.destination_lat, lng: quote.destination_lng }
                            ]}
                            routeData={routeData}
                            readOnly={true}
                        />
                    </div>

                    {/* Right Column: Vehicle & Breakdown */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        {/* Vehicle Assigned Card */}
                        {(() => {
                            const assignedVehicle = vehicles.find(v => v.id === quote.vehicle_id);
                            if (!assignedVehicle) return null;

                            return (
                                <div className="card" style={{ padding: '10px 15px', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        {/* Vehicle Photo (Smaller) */}
                                        <div style={{
                                            width: '45px',
                                            height: '45px',
                                            borderRadius: '8px',
                                            backgroundColor: 'rgba(255,255,255,0.05)',
                                            border: '1px solid var(--color-border)',
                                            overflow: 'hidden',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            flexShrink: 0
                                        }}>
                                            {assignedVehicle.photo_path ? (
                                                <img src={`http://localhost:3000/${assignedVehicle.photo_path}`} alt={assignedVehicle.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <Truck size={20} className="text-muted" />
                                            )}
                                        </div>

                                        {/* Vehicle Info (Compacted) */}
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: '10px', color: 'var(--color-primary)', fontWeight: 'bold', margin: '0 0 1px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unidad Asignada</p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>{assignedVehicle.name}</h4>
                                                <span style={{
                                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                                    padding: '1px 6px',
                                                    borderRadius: '4px',
                                                    fontSize: '10px',
                                                    fontWeight: 'bold',
                                                    border: '1px solid var(--color-border)',
                                                    color: 'var(--color-text-muted)'
                                                }}>
                                                    {assignedVehicle.plate}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Detailed Breakdown Card */}
                        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            <div style={{
                                position: 'absolute',
                                top: '15px',
                                right: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '10px',
                                color: 'var(--color-primary)',
                                fontWeight: 'bold'
                            }}>
                                <Calculator size={12} /> DESGLOSE DETALLADO
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '25px' }}>
                                <div style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                    <p className="text-muted" style={{ fontSize: '9px', marginBottom: '2px' }}>DIST. TOTAL</p>
                                    <p style={{ fontWeight: 'bold', fontSize: '15px', margin: 0 }}>{Number(currentBreakdown.distance_total || quote.distance_total || 0).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km</p>
                                </div>
                                <div style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                    <p className="text-muted" style={{ fontSize: '9px', marginBottom: '2px' }}>TIEMPO TOTAL</p>
                                    <p style={{ fontWeight: 'bold', fontSize: '15px', margin: 0 }}>{CalculationMotor.formatMinutes(currentBreakdown.time_total || quote.time_total)}</p>
                                </div>
                                <div style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                    <p className="text-muted" style={{ fontSize: '9px', marginBottom: '2px' }}>C/ TRÁFICO</p>
                                    <p style={{ fontWeight: 'bold', fontSize: '15px', margin: 0 }}>{CalculationMotor.formatMinutes(currentBreakdown.time_traffic_min || quote.time_traffic_min || (quote.time_total * 1.15))}</p>
                                </div>
                                <div style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                    <p className="text-muted" style={{ fontSize: '9px', marginBottom: '2px' }}>C/ SERVICIOS</p>
                                    <p style={{ fontWeight: 'bold', fontSize: '15px', margin: 0 }}>{CalculationMotor.formatMinutes(currentBreakdown.time_services_min || quote.time_services_min || (quote.time_total + (quote.service_time || 0)))}</p>
                                </div>
                            </div>

                            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span className="text-muted">Gasolina ({Number(quote.gas_liters || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}L)</span>
                                    <span>${Number(quote.gas_cost || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span className="text-muted">Casetas ({quote.num_casetas || 0})</span>
                                    <span>${Number(quote.toll_cost || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Costo Logístico (Flete)</span>
                                    <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>${Number(quote.logistics_cost_rounded || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '8px 0' }} />
                                {currentBreakdown.lodging_cost > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                        <span className="text-muted">Hospedaje</span>
                                        <span className={currentBreakdown.lodging_cost !== quote.lodging_cost ? 'text-primary' : ''}>
                                            ${Number(currentBreakdown.lodging_cost).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span className="text-muted">Alimentos</span>
                                    <span className={currentBreakdown.meal_cost !== quote.meal_cost ? 'text-primary' : ''}>
                                        ${Number(currentBreakdown.meal_cost).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span className="text-muted">Servicios Extra</span>
                                    <span className={currentBreakdown.service_costs !== quote.service_costs ? 'text-primary' : ''}>
                                        ${Number(currentBreakdown.service_costs || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            <div style={{ marginTop: 'auto', paddingTop: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                                    <span className="text-muted">Subtotal</span>
                                    <span>${Number(currentBreakdown.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '12px' }}>
                                    <span className="text-muted">IVA (16%)</span>
                                    <span>${Number(currentBreakdown.iva).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div style={{
                                    backgroundColor: 'rgba(255, 72, 72, 0.08)',
                                    padding: '15px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255, 72, 72, 0.2)',
                                    textAlign: 'right'
                                }}>
                                    <p className="text-muted" style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '2px', color: 'rgba(255,255,255,0.6)' }}>TOTAL NETO</p>
                                    <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--color-primary)', margin: 0 }}>
                                        ${Number(currentBreakdown.total).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Row: 3 Symmetric Columns */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) 380px', gap: 'var(--spacing-md)', alignItems: 'stretch' }}>
                    {/* Column 1: Route Details */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MapPin size={16} className="text-primary" /> Detalles de la Ruta
                        </h3>
                        <div style={{ position: 'relative', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '25px', flex: 1 }}>
                            <div style={{
                                position: 'absolute',
                                left: '7px',
                                top: '10px',
                                bottom: '10px',
                                width: '2px',
                                background: 'linear-gradient(to bottom, #4CAF50, var(--color-primary), #FF4848)',
                                opacity: 0.3,
                                borderRadius: '1px'
                            }} />

                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '-22px', top: '4px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4CAF50', border: '3px solid rgba(76, 175, 80, 0.2)' }} />
                                <p className="text-muted" style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '2px' }}>ORIGEN</p>
                                <p style={{ fontSize: '13px', fontWeight: '500', margin: 0 }}>{quote.origin_address}</p>
                            </div>

                            {quote.stops?.map((s, i) => (
                                <div key={i} style={{ position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: '-22px', top: '4px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#2196F3', border: '3px solid rgba(33, 150, 243, 0.2)' }} />
                                    <p className="text-muted" style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '2px' }}>PARADA {i + 1}</p>
                                    <p style={{ fontSize: '13px', margin: 0 }}>{s.address}</p>
                                </div>
                            ))}

                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '-22px', top: '4px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#FF4848', border: '3px solid rgba(255, 72, 72, 0.2)' }} />
                                <p className="text-muted" style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '2px' }}>DESTINO</p>
                                <p style={{ fontSize: '13px', fontWeight: '500', margin: 0 }}>{quote.destination_address}</p>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Extra Services */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calculator size={16} className="text-primary" /> Servicios Extra
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                            {services.map((s) => {
                                const isSelected = selectedServiceIds.includes(s.id);
                                return (
                                    <div
                                        key={s.id}
                                        onClick={() => !isLocked && handleServiceToggle(s.id)}
                                        style={{
                                            padding: '12px 10px',
                                            backgroundColor: isSelected ? 'rgba(255, 72, 72, 0.1)' : 'rgba(255,255,255,0.02)',
                                            borderRadius: '10px',
                                            border: `1px solid ${isSelected ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)'}`,
                                            cursor: isLocked ? 'default' : 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            position: 'relative',
                                            opacity: isLocked && !isSelected ? 0.5 : 1
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 'bold', lineHeight: '1.2' }}>{s.name}</span>
                                            {isSelected && <CheckCircle size={10} className="text-primary" />}
                                        </div>
                                        <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 'bold', marginTop: '4px' }}>
                                            ${Number(s.cost).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Column 3: Review Adjustments (aligned with breakdown) */}
                    <div className="card" style={{ border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: '14px', marginBottom: '20px', color: 'white' }}>Ajustes de Revisión</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label className="text-muted" style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>VIÁTICOS HOSPEDAJE ($)</label>
                                <input
                                    className="form-field"
                                    type="number"
                                    value={manualAdjustments.lodging_cost}
                                    onChange={(e) => handleAdjustmentChange('lodging_cost', e.target.value)}
                                    readOnly={isLocked}
                                    style={{
                                        borderRadius: '8px',
                                        backgroundColor: isLocked ? 'rgba(255,255,255,0.02)' : undefined,
                                        borderColor: isLocked ? 'transparent' : undefined,
                                        color: isLocked ? 'var(--color-text-muted)' : 'white'
                                    }}
                                />
                            </div>
                            <div>
                                <label className="text-muted" style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>VIÁTICOS COMIDAS ($)</label>
                                <input
                                    className="form-field"
                                    type="number"
                                    value={manualAdjustments.meal_cost}
                                    onChange={(e) => handleAdjustmentChange('meal_cost', e.target.value)}
                                    readOnly={isLocked}
                                    style={{
                                        borderRadius: '8px',
                                        backgroundColor: isLocked ? 'rgba(255,255,255,0.02)' : undefined,
                                        borderColor: isLocked ? 'transparent' : undefined,
                                        color: isLocked ? 'var(--color-text-muted)' : 'white'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuoteDetail;
