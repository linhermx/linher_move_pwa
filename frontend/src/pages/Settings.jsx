import React, { useState, useEffect } from 'react';
import { Save, Info, MapPin } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { settingsService, mapsService } from '../services/api';
import MapComponent from '../components/MapComponent';

const Settings = () => {
    const [settings, setSettings] = useState({
        gasoline_price: '',
        maneuver_factor: '',
        traffic_factor: '',
        base_efficiency: '',
        lodging_tier1_cost: '',
        lodging_tier2_cost: '',
        lodging_tier3_cost: '',
        meal_tier1_cost: '',
        meal_tier2_cost: '',
        meal_tier3_cost: '',
        lodging_tier1_hours: '',
        lodging_tier2_hours: '',
        lodging_tier3_hours: '',
        meal_tier1_hours: '',
        meal_tier2_hours: '',
        default_origin_address: '',
        default_origin_lat: '',
        default_origin_lng: ''
    });
    const { showNotification } = useNotification();
    const [suggestions, setSuggestions] = useState([]);
    const [activeSearchIdx, setActiveSearchIdx] = useState(null);

    const mapPoints = [
        {
            id: 'origin',
            label: 'Origen Defecto',
            address: settings.default_origin_address,
            lat: parseFloat(settings.default_origin_lat) || 19.0414,
            lng: parseFloat(settings.default_origin_lng) || -98.2063
        }
    ];

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await settingsService.get();
                if (data && Object.keys(data).length > 0) {
                    setSettings(prev => ({ ...prev, ...data }));
                }
            } catch (err) {
                console.error('Error fetching settings:', err);
            }
        };
        fetchSettings();
    }, []);

    const handleChange = (e) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        try {
            await settingsService.update(settings);
            showNotification('Configuración guardada exitosamente', 'success');
        } catch (err) {
            console.error('Error saving settings:', err);
            showNotification('Error al guardar la configuración', 'error');
        }
    };

    const handleAddressSearch = async (text) => {
        setSettings({ ...settings, default_origin_address: text });
        if (text.length > 3) {
            setActiveSearchIdx(0);
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

    const selectSuggestion = (suggestion) => {
        setSettings({
            ...settings,
            default_origin_address: suggestion.label,
            default_origin_lat: suggestion.lat.toString(),
            default_origin_lng: suggestion.lng.toString()
        });
        setSuggestions([]);
        setActiveSearchIdx(null);
    };

    const handleMarkerDrag = async (idx, lat, lng) => {
        const roundedLat = parseFloat(lat.toFixed(6));
        const roundedLng = parseFloat(lng.toFixed(6));

        setSettings(prev => ({
            ...prev,
            default_origin_address: 'Buscando dirección...',
            default_origin_lat: roundedLat.toString(),
            default_origin_lng: roundedLng.toString()
        }));

        try {
            const result = await mapsService.reverseGeocode(roundedLat, roundedLng);
            setSettings(prev => ({ ...prev, default_origin_address: result.label }));
        } catch (err) {
            console.error('Reverse geocode error:', err);
            setSettings(prev => ({
                ...prev,
                default_origin_address: `${roundedLat}, ${roundedLng}`
            }));
        }
    };

    return (
        <div style={{ maxWidth: '900px', paddingBottom: 'var(--spacing-xxl)' }} className="fade-in">
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Parámetros Globales</h1>
                <p className="text-muted">Configura los valores base y reglas de negocio para las cotizaciones</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--spacing-lg)' }}>
                {/* SECCIÓN 1: UBICACIÓN POR DEFECTO */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--spacing-lg)', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                        <div style={{ color: 'var(--color-primary)' }}><MapPin size={20} /></div>
                        <h3 style={{ fontSize: '18px' }}>Ubicación de Origen Predefinida</h3>
                    </div>
                    <p className="text-muted" style={{ fontSize: '12px', marginBottom: 'var(--spacing-md)' }}>Define el punto de partida que aparecerá automáticamente en cada nueva cotización. Arrastra el marcador en el mapa para mayor precisión.</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)', minHeight: '350px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            <div style={{ position: 'relative' }}>
                                <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>BUSCAR DIRECCIÓN</label>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '8px' }}>
                                    <input
                                        type="text"
                                        value={settings.default_origin_address}
                                        onChange={(e) => handleAddressSearch(e.target.value)}
                                        style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', fontSize: '14px' }}
                                        placeholder="Ej: Puebla, Pue., México"
                                    />
                                </div>
                                {activeSearchIdx !== null && suggestions.length > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        backgroundColor: 'var(--color-surface)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-sm)',
                                        zIndex: 2000,
                                        maxHeight: '150px',
                                        overflowY: 'auto'
                                    }}>
                                        {suggestions.map((s, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => selectSuggestion(s)}
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

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                <div>
                                    <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>LATITUD</label>
                                    <input
                                        type="text"
                                        name="default_origin_lat"
                                        value={settings.default_origin_lat}
                                        onChange={handleChange}
                                        style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'white' }}
                                    />
                                </div>
                                <div>
                                    <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>LONGITUD</label>
                                    <input
                                        type="text"
                                        name="default_origin_lng"
                                        value={settings.default_origin_lng}
                                        onChange={handleChange}
                                        style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'white' }}
                                    />
                                </div>
                            </div>

                            <p className="text-muted" style={{ fontSize: '11px', marginTop: 'auto', padding: '10px', backgroundColor: 'rgba(255, 72, 72, 0.05)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-primary)' }}>
                                Tip: Busca la dirección principal y luego ajusta el marcador rojo en el mapa para fijar el predio exacto de carga.
                            </p>
                        </div>

                        <div style={{ height: '300px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                            <MapComponent
                                points={mapPoints}
                                onMarkerDrag={handleMarkerDrag}
                            />
                        </div>
                    </div>
                </div>

                {/* SECCIÓN 2: COMBUSTIBLE Y EFICIENCIA */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--spacing-lg)', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                        <div style={{ color: 'var(--color-primary)' }}><Info size={20} /></div>
                        <h3 style={{ fontSize: '18px' }}>Combustible y Eficiencia</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>PRECIO GASOLINA ($/L)</label>
                            <input
                                type="number" name="gasoline_price" value={settings.gasoline_price} onChange={handleChange}
                                style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'white' }}
                                placeholder="24.50"
                            />
                        </div>
                        <div>
                            <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>FACTOR EFICIENCIA BASE</label>
                            <input
                                type="number" step="0.1" name="base_efficiency" value={settings.base_efficiency} onChange={handleChange}
                                style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'white' }}
                                placeholder="1.0"
                            />
                        </div>
                    </div>
                </div>

                {/* SECCIÓN 3: AJUSTES DE RUTA */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--spacing-lg)', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                        <div style={{ color: 'var(--color-primary)' }}><Info size={20} /></div>
                        <h3 style={{ fontSize: '18px' }}>Ajustes de Ruta</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>FACTOR MANIOBRA (MULTIPLICADOR)</label>
                            <input
                                type="number" step="0.1" name="maneuver_factor" value={settings.maneuver_factor} onChange={handleChange}
                                style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'white' }}
                                placeholder="1.2"
                            />
                        </div>
                        <div>
                            <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>FACTOR TRÁFICO (TIEMPO)</label>
                            <input
                                type="number" step="0.1" name="traffic_factor" value={settings.traffic_factor} onChange={handleChange}
                                style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'white' }}
                                placeholder="1.5"
                            />
                        </div>
                    </div>
                </div>

                {/* SECCIÓN 4: HOSPEDAJE */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--spacing-lg)', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                        <div style={{ color: 'var(--color-primary)' }}><Info size={20} /></div>
                        <h3 style={{ fontSize: '18px' }}>Costos de Hospedaje</h3>
                    </div>
                    <p className="text-muted" style={{ fontSize: '12px', marginBottom: 'var(--spacing-md)' }}>Define las horas de trayecto de ida y el costo por noche según la duración.</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--spacing-md)' }}>
                        {[1, 2, 3].map(tier => (
                            <div key={`lodging-tier-${tier}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)' }}>
                                <div>
                                    <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontSize: '11px' }}>UMBRAL NIVEL {tier} (HORAS IDA)</label>
                                    <input
                                        type="number" name={`lodging_tier${tier}_hours`} value={settings[`lodging_tier${tier}_hours`]} onChange={handleChange}
                                        style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'white' }}
                                        placeholder={`${tier === 1 ? '6' : tier === 2 ? '11' : '17'}`}
                                    />
                                </div>
                                <div>
                                    <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontSize: '11px' }}>COSTO ASIGNADO ($)</label>
                                    <input
                                        type="number" name={`lodging_tier${tier}_cost`} value={settings[`lodging_tier${tier}_cost`]} onChange={handleChange}
                                        style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'white' }}
                                        placeholder={`${tier === 1 ? '1500' : tier === 2 ? '2400' : '3600'}`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SECCIÓN 5: ALIMENTOS */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--spacing-lg)', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                        <div style={{ color: 'var(--color-primary)' }}><Info size={20} /></div>
                        <h3 style={{ fontSize: '18px' }}>Costos de Alimentos / Viáticos</h3>
                    </div>
                    <p className="text-muted" style={{ fontSize: '12px', marginBottom: 'var(--spacing-md)' }}>Configura los viáticos según la jornada laboral total o si hay pernocta.</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--spacing-md)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)' }}>
                            <div>
                                <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontSize: '11px' }}>UMBRAL NIVEL 1 - JORNADA (HORAS)</label>
                                <input
                                    type="number" name="meal_tier1_hours" value={settings.meal_tier1_hours} onChange={handleChange}
                                    style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'white' }}
                                    placeholder="8"
                                />
                            </div>
                            <div>
                                <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontSize: '11px' }}>COSTO ASIGNADO ($)</label>
                                <input
                                    type="number" name="meal_tier1_cost" value={settings.meal_tier1_cost} onChange={handleChange}
                                    style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'white' }}
                                    placeholder="200"
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)' }}>
                            <div>
                                <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontSize: '11px' }}>UMBRAL NIVEL 2 - VIAJE LARGO (HORAS TOTAL)</label>
                                <input
                                    type="number" name="meal_tier2_hours" value={settings.meal_tier2_hours} onChange={handleChange}
                                    style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'white' }}
                                    placeholder="12"
                                />
                            </div>
                            <div>
                                <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontSize: '11px' }}>COSTO ASIGNADO ($)</label>
                                <input
                                    type="number" name="meal_tier2_cost" value={settings.meal_tier2_cost} onChange={handleChange}
                                    style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'white' }}
                                    placeholder="300"
                                />
                            </div>
                        </div>

                        <div style={{ padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)' }}>
                            <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontSize: '11px' }}>COSTO ASIGNADO CUANDO APLICA HOSPEDAJE ($)</label>
                            <input
                                type="number" name="meal_tier3_cost" value={settings.meal_tier3_cost} onChange={handleChange}
                                style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-sm)', color: 'white' }}
                                placeholder="500"
                            />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--spacing-md)' }}>
                    <button
                        onClick={handleSave}
                        className="button-primary"
                        style={{ padding: '12px 30px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
                    >
                        <Save size={20} />
                        Guardar Configuración
                    </button>
                </div>
            </div>
        </div >
    );
};

export default Settings;
