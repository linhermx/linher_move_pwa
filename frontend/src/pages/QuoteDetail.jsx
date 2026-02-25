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
    Download
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

    const handleAdjustmentChange = (field, value) => {
        const newValue = parseFloat(value) || 0;
        const newAdjustments = { ...manualAdjustments, [field]: newValue };
        setManualAdjustments(newAdjustments);

        // Recalculate based on new manual inputs
        if (quote) {
            // We use the same breakdown but override the manual parts
            const subtotal = (quote.logistics_cost_rounded || 0) +
                (quote.service_costs || 0) +
                newAdjustments.lodging_cost +
                newAdjustments.meal_cost;
            const iva = subtotal * 0.16;
            const total = Math.ceil(subtotal + iva);

            setCurrentBreakdown({
                ...currentBreakdown,
                lodging_cost: newAdjustments.lodging_cost,
                meal_cost: newAdjustments.meal_cost,
                subtotal,
                iva,
                total
            });
        }
    };

    const handleSaveUpdates = async () => {
        setSaving(true);
        try {
            await quotationService.update(id, {
                lodging_cost: currentBreakdown.lodging_cost,
                meal_cost: currentBreakdown.meal_cost,
                subtotal: currentBreakdown.subtotal,
                iva: currentBreakdown.iva,
                total: currentBreakdown.total
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

    return (
        <div style={{ paddingBottom: '40px' }}>
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
                                    onClick={() => handleStatusChange(s)}
                                    title={info.text}
                                    style={{
                                        border: 'none',
                                        background: isActive ? info.color : 'transparent',
                                        color: isActive ? 'black' : 'var(--color-text-muted)',
                                        padding: '8px 14px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 'var(--spacing-lg)' }}>
                {/* Left Column: Map and Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                    {/* Map */}
                    <div className="card" style={{ height: '450px', padding: 0, position: 'relative', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                        <MapComponent
                            points={[
                                { address: quote.origin_address, lat: quote.origin_lat, lng: quote.origin_lng },
                                ... (quote.stops || []).map(s => ({ address: s.address, lat: s.lat, lng: s.lng })),
                                { address: quote.destination_address, lat: quote.destination_lat, lng: quote.destination_lng }
                            ]}
                            routeData={routeData}
                            readOnly={true}
                        />
                    </div>

                    {/* Route Detailed Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div className="card">
                            <h3 style={{ fontSize: '14px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MapPin size={16} className="text-primary" /> Detalles de la Ruta
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <p className="text-muted" style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '2px' }}>ORIGEN</p>
                                    <p style={{ fontSize: '13px', margin: 0 }}>{quote.origin_address}</p>
                                </div>
                                <div style={{ height: '1px', backgroundColor: 'var(--color-border)' }} />
                                <div>
                                    <p className="text-muted" style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '2px' }}>DESTINO</p>
                                    <p style={{ fontSize: '13px', margin: 0 }}>{quote.destination_address}</p>
                                </div>

                                {quote.stops && quote.stops.length > 0 && (
                                    <>
                                        <div style={{ height: '1px', backgroundColor: 'var(--color-border)' }} />
                                        <div>
                                            <p className="text-muted" style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '6px' }}>PARADAS ({quote.stops.length})</p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {quote.stops.map((s, i) => (
                                                    <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '12px', alignItems: 'center' }}>
                                                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />
                                                        {s.address}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="card">
                            <h3 style={{ fontSize: '14px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calculator size={16} className="text-primary" /> Servicios Extra
                            </h3>
                            {quote.services && quote.services.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {quote.services.map((srv, idx) => (
                                        <div key={idx} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            backgroundColor: 'rgba(255,255,255,0.03)',
                                            padding: '10px',
                                            borderRadius: '8px'
                                        }}>
                                            <span style={{ fontSize: '13px' }}>{srv.service_name}</span>
                                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                                                ${parseFloat(srv.cost).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted" style={{ fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>Sin servicios adicionales</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Breakdown & Adjustments */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                    {/* Detailed Breakdown Mirroring Calculator */}
                    <div className="card" style={{ position: 'relative' }}>
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
                                <p style={{ fontWeight: 'bold', fontSize: '15px', margin: 0 }}>{quote.distance_total} km</p>
                            </div>
                            <div style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                <p className="text-muted" style={{ fontSize: '9px', marginBottom: '2px' }}>TIEMPO TOTAL</p>
                                <p style={{ fontWeight: 'bold', fontSize: '15px', margin: 0 }}>{CalculationMotor.formatMinutes(quote.time_total)}</p>
                            </div>
                            <div style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                <p className="text-muted" style={{ fontSize: '9px', marginBottom: '2px' }}>C/ TRÁFICO</p>
                                <p style={{ fontWeight: 'bold', fontSize: '15px', margin: 0 }}>{CalculationMotor.formatMinutes(quote.time_traffic_min || quote.time_total * 1.15)}</p>
                            </div>
                            <div style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                <p className="text-muted" style={{ fontSize: '9px', marginBottom: '2px' }}>C/ SERVICIOS</p>
                                <p style={{ fontWeight: 'bold', fontSize: '15px', margin: 0 }}>{CalculationMotor.formatMinutes(quote.time_services_min || quote.time_total + (quote.service_time || 0))}</p>
                            </div>
                        </div>

                        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                <span className="text-muted">Gasolina ({quote.gas_liters || 0}L)</span>
                                <span>${(quote.gas_cost || 0).toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                <span className="text-muted">Casetas (Total)</span>
                                <span>${(quote.toll_cost || 0).toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Costo Logístico (Flete)</span>
                                <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>${(quote.logistics_cost_rounded || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '15px 0' }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                <span className="text-muted">Viáticos Alimentos</span>
                                <span className={currentBreakdown.meal_cost !== quote.meal_cost ? 'text-primary' : ''}>
                                    ${currentBreakdown.meal_cost.toLocaleString()}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                <span className="text-muted">Interconexión / Extras</span>
                                <span>${(quote.service_costs || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '15px 0' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                            <span className="text-muted">Subtotal</span>
                            <span>${currentBreakdown.subtotal.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                            <span className="text-muted">IVA (16%)</span>
                            <span>${currentBreakdown.iva.toLocaleString()}</span>
                        </div>

                        <div style={{
                            backgroundColor: 'rgba(255, 72, 72, 0.08)',
                            padding: '18px',
                            borderRadius: '12px',
                            marginTop: '15px',
                            border: '1px solid rgba(255, 72, 72, 0.3)',
                            textAlign: 'right'
                        }}>
                            <p className="text-muted" style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '2px', color: 'rgba(255,255,255,0.6)' }}>TOTAL NETO</p>
                            <p style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-primary)', margin: 0 }}>
                                ${currentBreakdown.total.toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* Review Adjustments */}
                    <div className="card" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ fontSize: '14px', marginBottom: '15px', color: 'white' }}>Ajustes de Revisión</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label className="text-muted" style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>VIÁTICOS HOSPEDAJE ($)</label>
                                <input
                                    className="form-field"
                                    type="number"
                                    value={manualAdjustments.lodging_cost}
                                    onChange={(e) => handleAdjustmentChange('lodging_cost', e.target.value)}
                                    style={{ borderRadius: '8px' }}
                                />
                            </div>
                            <div>
                                <label className="text-muted" style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>VIÁTICOS COMIDAS ($)</label>
                                <input
                                    className="form-field"
                                    type="number"
                                    value={manualAdjustments.meal_cost}
                                    onChange={(e) => handleAdjustmentChange('meal_cost', e.target.value)}
                                    style={{ borderRadius: '8px' }}
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
