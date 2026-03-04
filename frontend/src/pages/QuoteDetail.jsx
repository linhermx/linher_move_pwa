import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Calculator,
    Calendar,
    CheckCircle,
    ChevronLeft,
    Download,
    Loader2,
    MapPin,
    Save,
    Truck,
    XCircle
} from 'lucide-react';
import { mapsService, quotationService, serviceService, settingsService, vehicleService } from '../services/api';
import MapComponent from '../components/MapComponent';
import { CalculationMotor } from '../utils/CalculationMotor';
import { useNotification } from '../context/NotificationContext';
import { PDFService } from '../services/PDFService';
import { formatDate } from '../utils/formatters';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { resolveAssetUrl } from '../utils/url';

const STATUS_OPTIONS = ['pendiente', 'en_proceso', 'completada', 'cancelada'];

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
    const [_globalSettings, setGlobalSettings] = useState({});
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

                    const initialIds = (quoteData.services || []).map(s => s.service_id);

                    // Filter out inactive services (unless they are already part of this quote)
                    setServices(sData.filter(s => s.status !== 'inactive' || initialIds.includes(s.id)));

                    // Sync initial breakdown with full service info once loaded
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

    if (loading) {
        return (
            <div className="quote-detail-loading">
                <Loader2 className="animate-spin" size={48} color="var(--color-primary)" />
            </div>
        );
    }

    const getStatusInfo = (status) => {
        switch (status) {
            case 'completada':
                return { text: 'Completada', icon: <CheckCircle size={16} />, variant: 'success' };
            case 'pendiente':
                return { text: 'Pendiente', icon: <Calculator size={16} />, variant: 'warning' };
            case 'en_proceso':
                return { text: 'En proceso', icon: <Loader2 size={16} />, variant: 'info' };
            case 'cancelada':
                return { text: 'Cancelada', icon: <XCircle size={16} />, variant: 'neutral' };
            default:
                return { text: status, icon: null, variant: 'neutral' };
        }
    };

    const handleStatusChange = async (newStatus) => {
        setSaving(true);
        try {
            await quotationService.update(id, { status: newStatus });
            showNotification(`Estado actualizado a ${getStatusInfo(newStatus).text}`, 'success');
            setQuote({ ...quote, status: newStatus });
            setCurrentBreakdown({ ...currentBreakdown, status: newStatus });
        } catch (err) {
            console.error('Error updating status:', err);
            showNotification('Error al actualizar el estado', 'error');
        } finally {
            setSaving(false);
        }
    };

    const statusInfo = getStatusInfo(quote.status);
    const isLocked = ['completada', 'cancelada'].includes(quote.status);
    const assignedVehicle = vehicles.find((vehicle) => vehicle.id === quote.vehicle_id);

    const renderStatusSwitch = ({ className = '', showAllLabels = false, showHints = false } = {}) => (
        <div
            className={['quote-status-switch', className].filter(Boolean).join(' ')}
            role="group"
            aria-label="Cambiar estado de la cotización"
        >
            {STATUS_OPTIONS.map((status) => {
                const info = getStatusInfo(status);
                const isActive = quote.status === status;

                return (
                    <button
                        key={status}
                        type="button"
                        onClick={() => !isLocked && handleStatusChange(status)}
                        disabled={isLocked && !isActive}
                        title={info.text}
                        aria-label={`Cambiar estado a ${info.text}`}
                        aria-pressed={isActive}
                        className={[
                            'quote-status-switch__button',
                            `quote-status-switch__button--${info.variant}`,
                            isActive ? 'quote-status-switch__button--active' : '',
                            isLocked ? 'quote-status-switch__button--locked' : '',
                            isLocked && !isActive ? 'quote-status-switch__button--muted' : '',
                            showAllLabels ? 'quote-status-switch__button--expanded' : ''
                        ].filter(Boolean).join(' ')}
                    >
                        <span className="quote-status-switch__content">
                            {info.icon ? (
                                <span className="quote-status-switch__icon" aria-hidden="true">
                                    {React.cloneElement(info.icon, { size: showAllLabels ? 16 : 14 })}
                                </span>
                            ) : null}
                            {showAllLabels || isActive ? (
                                <span className="quote-status-switch__copy">
                                    <span className="quote-status-switch__label">{info.text}</span>
                                    {showHints ? (
                                        <span className="quote-status-switch__hint">
                                            {isActive ? 'Estado actual' : isLocked ? 'Sin cambios disponibles' : 'Tocar para cambiar'}
                                        </span>
                                    ) : null}
                                </span>
                            ) : (
                                <span className="sr-only">{info.text}</span>
                            )}
                        </span>
                        {showHints ? (
                            <span
                                className={[
                                    'quote-status-switch__indicator',
                                    isActive ? 'quote-status-switch__indicator--active' : ''
                                ].filter(Boolean).join(' ')}
                            >
                                {isActive ? 'Actual' : isLocked ? 'Fijo' : 'Cambiar'}
                            </span>
                        ) : null}
                    </button>
                );
            })}
        </div>
    );

    const renderActionButtons = (className = '') => (
        <div
            className={[
                'quote-detail-actions',
                className,
                !isLocked ? 'quote-detail-actions--with-save' : ''
            ].filter(Boolean).join(' ')}
        >
            {!isLocked && (
                <button
                    type="button"
                    onClick={handleSaveUpdates}
                    disabled={saving}
                    className="btn btn-primary quote-detail-actions__button"
                >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Guardar ajustes
                </button>
            )}

            <button
                type="button"
                onClick={() => PDFService.generateQuotationPDF(quote)}
                className="btn btn-secondary quote-detail-actions__button"
            >
                <Download size={18} />
                PDF
            </button>
        </div>
    );

    return (
        <div className="page-shell fade-in quote-detail-page">
            <PageHeader
                leading={(
                    <button
                        type="button"
                        onClick={() => navigate('/history')}
                        className="icon-button"
                        aria-label="Volver al historial"
                    >
                        <ChevronLeft size={20} />
                    </button>
                )}
                title={(
                    <span className="quote-detail-header-title">
                        <span className="quote-detail-header-title__label">Cotización</span>
                        <span className="quote-detail-header-title__folio">{quote.folio}</span>
                    </span>
                )}
                titleMeta={(
                    <span className="quote-detail-header-status quote-detail-header-status--desktop">
                        <StatusBadge variant={statusInfo.variant}>{statusInfo.text}</StatusBadge>
                    </span>
                )}
                subtitle={`Creada el ${formatDate(quote.created_at)}`}
                actions={(
                    <div className="quote-detail-header-actions">
                        {renderStatusSwitch({ className: 'quote-status-switch--desktop' })}
                        {renderActionButtons('quote-detail-actions--desktop')}
                    </div>
                )}
            />

            <section className="card quote-detail-mobile-status" aria-labelledby="quote-detail-mobile-status-title">
                <div className="quote-detail-mobile-status__header">
                    <div className="quote-detail-mobile-status__summary">
                        <p id="quote-detail-mobile-status-title" className="quote-detail-mobile-status__eyebrow">
                            Status actual
                        </p>
                        <StatusBadge variant={statusInfo.variant}>{statusInfo.text}</StatusBadge>
                    </div>
                    <p className="quote-detail-mobile-status__meta">
                        <Calendar size={14} aria-hidden="true" />
                        <span>Creada el {formatDate(quote.created_at)}</span>
                    </p>
                </div>
                {renderStatusSwitch({ className: 'quote-status-switch--mobile quote-status-switch--compact', showAllLabels: true })}
            </section>

            <div className="quote-detail-layout">

                {/* Top Row: Map & Main Breakdown */}
                <div className="quote-detail-layout__top">
                    {/* Map Detail */}
                    <div className="card quote-detail-map-card">
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
                    <div className="quote-detail-stack">
                        {/* Vehicle Assigned Card */}
                        {assignedVehicle && (
                            <div className="card quote-detail-layout__vehicle quote-detail-vehicle-card">
                                <div className="quote-detail-vehicle-card__body">
                                    {/* Vehicle Photo (Smaller) */}
                                    <div className="quote-detail-vehicle-card__media">
                                        {assignedVehicle.photo_path ? (
                                            <img src={resolveAssetUrl(assignedVehicle.photo_path)} alt={assignedVehicle.name} />
                                        ) : (
                                            <Truck size={20} className="text-muted" />
                                        )}
                                    </div>

                                    {/* Vehicle Info (Compacted) */}
                                    <div className="quote-detail-vehicle-card__content">
                                        <p className="quote-detail-vehicle-card__eyebrow">Unidad asignada</p>
                                        <div className="quote-detail-vehicle-card__row">
                                            <h4 className="quote-detail-vehicle-card__title">{assignedVehicle.name}</h4>
                                            <span className="quote-detail-vehicle-card__plate">
                                                {assignedVehicle.plate}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Detailed Breakdown Card */}
                        <div className="card quote-detail-layout__breakdown quote-detail-breakdown">
                            <div className="quote-detail-breakdown__badge">
                                <Calculator size={12} /> DESGLOSE DETALLADO
                            </div>

                            <div className="quote-detail-breakdown__content">
                            <div className="quote-detail-breakdown-grid">
                                <div className="cost-breakdown__metric">
                                    <p className="cost-breakdown__metric-label">DIST. TOTAL</p>
                                    <p className="cost-breakdown__metric-value">{Number(currentBreakdown.distance_total || quote.distance_total || 0).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km</p>
                                </div>
                                <div className="cost-breakdown__metric">
                                    <p className="cost-breakdown__metric-label">TIEMPO TOTAL</p>
                                    <p className="cost-breakdown__metric-value">{CalculationMotor.formatMinutes(currentBreakdown.time_total || quote.time_total)}</p>
                                </div>
                                <div className="cost-breakdown__metric">
                                    <p className="cost-breakdown__metric-label">C/ TRÁFICO</p>
                                    <p className="cost-breakdown__metric-value">{CalculationMotor.formatMinutes(currentBreakdown.time_traffic_min || quote.time_traffic_min || (quote.time_total * 1.15))}</p>
                                </div>
                                <div className="cost-breakdown__metric">
                                    <p className="cost-breakdown__metric-label">C/ SERVICIOS</p>
                                    <p className="cost-breakdown__metric-value">{CalculationMotor.formatMinutes(currentBreakdown.time_services_min || quote.time_services_min || (quote.time_total + (quote.service_time || 0)))}</p>
                                </div>
                            </div>

                            <div className="cost-breakdown__stack">
                                <div className="cost-breakdown__row">
                                    <span className="text-muted">Gasolina ({Number(quote.gas_liters || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}L)</span>
                                    <span>${Number(quote.gas_cost || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="cost-breakdown__row">
                                    <span className="text-muted">Casetas ({quote.num_casetas || 0})</span>
                                    <span>${Number(quote.toll_cost || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="cost-breakdown__row cost-breakdown__row--accent">
                                    <span className="cost-breakdown__row-label--strong">Costo logístico (flete)</span>
                                    <span className="cost-breakdown__row-value--strong">${Number(quote.logistics_cost_rounded || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="cost-breakdown__divider" />
                                {currentBreakdown.lodging_cost > 0 && (
                                    <div className="cost-breakdown__row">
                                        <span className="text-muted">Hospedaje</span>
                                        <span className={currentBreakdown.lodging_cost !== quote.lodging_cost ? 'text-primary' : ''}>
                                            ${Number(currentBreakdown.lodging_cost).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}
                                <div className="cost-breakdown__row">
                                    <span className="text-muted">Alimentos</span>
                                    <span className={currentBreakdown.meal_cost !== quote.meal_cost ? 'text-primary' : ''}>
                                        ${Number(currentBreakdown.meal_cost).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="cost-breakdown__row">
                                    <span className="text-muted">Servicios extra</span>
                                    <span className={currentBreakdown.service_costs !== quote.service_costs ? 'text-primary' : ''}>
                                        ${Number(currentBreakdown.service_costs || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            <div className="cost-breakdown__stack cost-breakdown__stack--summary">
                                <div className="cost-breakdown__row">
                                    <span className="text-muted">Subtotal</span>
                                    <span>${Number(currentBreakdown.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="cost-breakdown__row">
                                    <span className="text-muted">IVA (16%)</span>
                                    <span>${Number(currentBreakdown.iva).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="cost-breakdown__total">
                                    <p className="cost-breakdown__total-label">TOTAL NETO</p>
                                    <p className="cost-breakdown__total-value">
                                        ${Number(currentBreakdown.total).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                </div>

                {/* Bottom Row: 3 Symmetric Columns */}
                <div className="quote-detail-layout__bottom">
                    {/* Column 1: Route Details */}
                    <div className="card quote-detail-layout__route quote-detail-section-card">
                        <h3 className="quote-detail-card-title">
                            <MapPin size={16} className="text-primary" /> Detalles de la ruta
                        </h3>
                        <div className="quote-detail-route-timeline">
                            {/* ORIGEN */}
                            <div className="quote-route-stop">
                                <div className="quote-route-stop__line quote-route-stop__line--origin" />
                                <div className="quote-route-stop__marker quote-route-stop__marker--origin" />
                                <p className="quote-route-stop__eyebrow">ORIGEN</p>
                                <p className="quote-route-stop__address quote-route-stop__address--strong">{quote.origin_address}</p>
                            </div>

                            {/* PARADAS */}
                            {quote.stops?.map((s, i) => (
                                <div key={i} className="quote-route-stop">
                                    <div className="quote-route-stop__line quote-route-stop__line--waypoint" />
                                    <div className="quote-route-stop__marker quote-route-stop__marker--waypoint" />
                                    <p className="quote-route-stop__eyebrow">PARADA {i + 1}</p>
                                    <p className="quote-route-stop__address">{s.address}</p>
                                </div>
                            ))}

                            {/* DESTINO */}
                            <div className="quote-route-stop">
                                <div className="quote-route-stop__marker quote-route-stop__marker--destination" />
                                <p className="quote-route-stop__eyebrow">DESTINO</p>
                                <p className="quote-route-stop__address quote-route-stop__address--strong">{quote.destination_address}</p>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Extra Services */}
                    <div className="card quote-detail-layout__services quote-detail-section-card">
                        <h3 className="quote-detail-card-title">
                            <Calculator size={16} className="text-primary" /> Servicios extra
                        </h3>
                        <div className="quote-detail-services-grid">
                            {services.map((s) => {
                                const isSelected = selectedServiceIds.includes(s.id);
                                return (
                                    <div
                                        key={s.id}
                                        onClick={() => !isLocked && handleServiceToggle(s.id)}
                                        className={[
                                            'quote-service-option',
                                            isSelected ? 'quote-service-option--selected' : '',
                                            isLocked ? 'quote-service-option--locked' : '',
                                            isLocked && !isSelected ? 'quote-service-option--dimmed' : ''
                                        ].filter(Boolean).join(' ')}
                                        role={isLocked ? undefined : 'button'}
                                        tabIndex={isLocked ? -1 : 0}
                                        onKeyDown={(event) => {
                                            if (!isLocked && (event.key === 'Enter' || event.key === ' ')) {
                                                event.preventDefault();
                                                handleServiceToggle(s.id);
                                            }
                                        }}
                                    >
                                        <div className="quote-service-option__header">
                                            <span className="quote-service-option__name">{s.name}</span>
                                            {isSelected && <CheckCircle size={10} className="text-primary" />}
                                        </div>
                                        <span className="quote-service-option__price">
                                            ${Number(s.cost).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Column 3: Review Adjustments (aligned with breakdown) */}
                    <div className="card quote-detail-layout__review quote-detail-review-card">
                        <h3 className="quote-detail-review-card__title">Ajustes de revisión</h3>
                        <div className="quote-detail-review-card__fields">
                            <div>
                                <label className="form-label" htmlFor="quote-detail-lodging-cost">VIÁTICOS HOSPEDAJE ($)</label>
                                <input
                                    id="quote-detail-lodging-cost"
                                    name="lodging_cost"
                                    className={`form-field ${isLocked ? 'form-field--readonly' : ''}`.trim()}
                                    type="number"
                                    value={manualAdjustments.lodging_cost}
                                    onChange={(e) => handleAdjustmentChange('lodging_cost', e.target.value)}
                                    readOnly={isLocked}
                                    autoComplete="off"
                                />
                            </div>
                            <div>
                                <label className="form-label" htmlFor="quote-detail-meal-cost">VIÁTICOS COMIDAS ($)</label>
                                <input
                                    id="quote-detail-meal-cost"
                                    name="meal_cost"
                                    className={`form-field ${isLocked ? 'form-field--readonly' : ''}`.trim()}
                                    type="number"
                                    value={manualAdjustments.meal_cost}
                                    onChange={(e) => handleAdjustmentChange('meal_cost', e.target.value)}
                                    readOnly={isLocked}
                                    autoComplete="off"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="workspace-sticky-action quote-detail-mobile-actions-shell">
                {renderActionButtons('quote-detail-actions--mobile')}
            </div>
        </div>
    );
};

export default QuoteDetail;
