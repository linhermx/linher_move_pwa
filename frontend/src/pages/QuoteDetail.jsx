import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quotationService, vehicleService, settingsService, serviceService } from '../services/api';
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

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [quoteData, vData, settsData, sData] = await Promise.all([
                    quotationService.get(id),
                    vehicleService.list(),
                    settingsService.get(),
                    serviceService.list()
                ]);

                setQuote(quoteData);
                setVehicles(vData);
                setGlobalSettings(settsData);
                setServices(sData);
                setManualAdjustments({
                    lodging_cost: quoteData.lodging_cost || 0,
                    meal_cost: quoteData.meal_cost || 0
                });
                setCurrentBreakdown(quoteData);
            } catch (err) {
                console.error('Error fetching quote detail:', err);
                showNotification('Error al cargar la cotización', 'error');
                navigate('/history');
            } finally {
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
                            <span style={{
                                fontSize: '11px',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                backgroundColor: `${statusInfo.color}20`,
                                color: statusInfo.color,
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}>
                                {statusInfo.icon} {statusInfo.text.toUpperCase()}
                            </span>
                        </div>
                        <p className="text-muted">Creada el {new Date(quote.created_at).toLocaleDateString()}</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {/* Status Selector */}
                    <div style={{
                        display: 'flex',
                        backgroundColor: 'var(--color-bg)',
                        padding: '4px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        marginRight: '10px'
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
                                        color: isActive ? 'white' : 'var(--color-text-muted)',
                                        padding: '6px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {isActive && info.icon}
                                    {isActive ? info.text.toUpperCase() : s.charAt(0).toUpperCase()}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={handleSaveUpdates}
                        disabled={saving}
                        style={{
                            backgroundColor: 'white',
                            color: 'var(--color-bg)',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: 'bold',
                            cursor: saving ? 'default' : 'pointer',
                            opacity: saving ? 0.7 : 1
                        }}
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Guardar Ajustes
                    </button>

                    <button
                        onClick={() => PDFService.generateQuotationPDF(quote)}
                        style={{
                            backgroundColor: 'var(--color-surface)',
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 'var(--spacing-lg)' }}>
                {/* Left Column: Map and Route Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                    {/* Map */}
                    <div className="card" style={{ height: '400px', padding: 0, position: 'relative', overflow: 'hidden' }}>
                        <MapComponent
                            points={[
                                { address: quote.origin_address, lat: 0, lng: 0 },
                                ... (quote.stops || []).map(s => ({ address: s.address, lat: 0, lng: 0 })),
                                { address: quote.destination_address, lat: 0, lng: 0 }
                            ]}
                            readOnly={true}
                        />
                    </div>

                    {/* Route Info */}
                    <div className="card">
                        <h3 style={{ fontSize: '16px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MapPin size={18} className="text-primary" /> Detalles de la Ruta
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <p className="text-muted" style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>ORIGEN</p>
                                    <p style={{ fontSize: '14px' }}>{quote.origin_address}</p>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p className="text-muted" style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>DESTINO</p>
                                    <p style={{ fontSize: '14px' }}>{quote.destination_address}</p>
                                </div>
                            </div>

                            {quote.stops && quote.stops.length > 0 && (
                                <div>
                                    <p className="text-muted" style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '8px' }}>PARADAS INTERMEDIAS</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        {quote.stops.map((stop, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '4px' }}>
                                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                                                    {idx + 1}
                                                </div>
                                                {stop.address}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '10px' }}>
                                <div style={{ backgroundColor: 'var(--color-bg)', padding: '10px', borderRadius: '8px' }}>
                                    <p className="text-muted" style={{ fontSize: '9px' }}>DISTANCIA</p>
                                    <p style={{ fontWeight: 'bold' }}>{quote.distance_total} km</p>
                                </div>
                                <div style={{ backgroundColor: 'var(--color-bg)', padding: '10px', borderRadius: '8px' }}>
                                    <p className="text-muted" style={{ fontSize: '9px' }}>TIEMPO</p>
                                    <p style={{ fontWeight: 'bold' }}>{CalculationMotor.formatMinutes(quote.time_total)}</p>
                                </div>
                                <div style={{ backgroundColor: 'var(--color-bg)', padding: '10px', borderRadius: '8px' }}>
                                    <p className="text-muted" style={{ fontSize: '9px' }}>TRAYECTOS</p>
                                    <p style={{ fontWeight: 'bold' }}>{quote.num_trayectos || 1}</p>
                                </div>
                                <div style={{ backgroundColor: 'var(--color-bg)', padding: '10px', borderRadius: '8px' }}>
                                    <p className="text-muted" style={{ fontSize: '9px' }}>CASETAS</p>
                                    <p style={{ fontWeight: 'bold' }}>{quote.num_casetas || 0} (${quote.toll_cost?.toLocaleString()})</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Extra Services List */}
                    {quote.services && quote.services.length > 0 && (
                        <div className="card">
                            <h3 style={{ fontSize: '16px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calculator size={18} className="text-primary" /> Servicios Extra Detallados
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {quote.services.map((srv, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        backgroundColor: 'rgba(255,255,255,0.02)',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--color-border)'
                                    }}>
                                        <div>
                                            <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>{srv.service_name}</p>
                                            <p className="text-muted" style={{ fontSize: '11px', margin: 0 }}>{srv.time_minutes} min aprox.</p>
                                        </div>
                                        <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: 'var(--color-primary)' }}>
                                            ${parseFloat(srv.cost).toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Breakdown and Adjustments */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                    {/* Adjustments Card */}
                    <div className="card" style={{ border: '1px solid var(--color-primary)', backgroundColor: 'rgba(255, 72, 72, 0.02)' }}>
                        <h3 style={{ fontSize: '16px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calculator size={18} className="text-primary" /> Ajustes de Revisión
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label className="text-muted" style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>VIÁTICOS HOSPEDAJE ($)</label>
                                <input
                                    className="form-field"
                                    type="number"
                                    value={manualAdjustments.lodging_cost}
                                    onChange={(e) => handleAdjustmentChange('lodging_cost', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-muted" style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>VIÁTICOS COMIDAS ($)</label>
                                <input
                                    className="form-field"
                                    type="number"
                                    value={manualAdjustments.meal_cost}
                                    onChange={(e) => handleAdjustmentChange('meal_cost', e.target.value)}
                                />
                            </div>
                            <p style={{ fontSize: '11px', fontStyle: 'italic', marginTop: '5px' }} className="text-muted">
                                * Los cambios se reflejarán en el total inferior de forma inmediata.
                            </p>
                        </div>
                    </div>

                    {/* Breakdown Card */}
                    <div className="card">
                        <h3 style={{ fontSize: '14px', marginBottom: '15px' }} className="text-muted">DESGLOSE DE COSTOS</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                <span className="text-muted">Flete (Logístico)</span>
                                <span>${(quote.logistics_cost_rounded || 0).toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                <span className="text-muted">Servicios Extras</span>
                                <span>${(quote.service_costs || 0).toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                <span className="text-muted">Hospedaje</span>
                                <span className={currentBreakdown.lodging_cost !== quote.lodging_cost ? 'text-primary' : ''}>
                                    ${currentBreakdown.lodging_cost.toLocaleString()}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                <span className="text-muted">Comidas</span>
                                <span className={currentBreakdown.meal_cost !== quote.meal_cost ? 'text-primary' : ''}>
                                    ${currentBreakdown.meal_cost.toLocaleString()}
                                </span>
                            </div>

                            <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '5px 0' }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                <span className="text-muted">Subtotal</span>
                                <span>${currentBreakdown.subtotal.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                <span className="text-muted">IVA (16%)</span>
                                <span>${currentBreakdown.iva.toLocaleString()}</span>
                            </div>

                            <div style={{
                                backgroundColor: 'rgba(255, 72, 72, 0.05)',
                                padding: '15px',
                                borderRadius: '8px',
                                marginTop: '10px',
                                border: '1px solid rgba(255, 72, 72, 0.2)',
                                textAlign: 'right'
                            }}>
                                <p className="text-muted" style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '2px' }}>TOTAL NETO</p>
                                <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--color-primary)', margin: 0 }}>
                                    ${currentBreakdown.total.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuoteDetail;
