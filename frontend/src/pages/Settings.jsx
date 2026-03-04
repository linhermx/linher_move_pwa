import React, { useEffect, useState } from 'react';
import { Save, Info, MapPin } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { mapsService, settingsService } from '../services/api';
import MapComponent from '../components/MapComponent';
import PageHeader from '../components/PageHeader';

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
                    setSettings((prev) => ({ ...prev, ...data }));
                }
            } catch (err) {
                console.error('Error fetching settings:', err);
            }
        };

        fetchSettings();
    }, []);

    const handleChange = (event) => {
        setSettings({ ...settings, [event.target.name]: event.target.value });
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
            return;
        }

        setSuggestions([]);
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

        setSettings((prev) => ({
            ...prev,
            default_origin_address: 'Buscando dirección...',
            default_origin_lat: roundedLat.toString(),
            default_origin_lng: roundedLng.toString()
        }));

        try {
            const result = await mapsService.reverseGeocode(roundedLat, roundedLng);
            setSettings((prev) => ({ ...prev, default_origin_address: result.label }));
        } catch (err) {
            console.error('Reverse geocode error:', err);
            setSettings((prev) => ({
                ...prev,
                default_origin_address: `${roundedLat}, ${roundedLng}`
            }));
        }
    };

    return (
        <div className="page-shell fade-in stack-lg settings-page">
            <PageHeader
                title="Parámetros globales"
                subtitle="Configura los valores base y reglas de negocio para las cotizaciones."
                actions={(
                    <button type="button" onClick={handleSave} className="btn btn-primary">
                        <Save size={18} />
                        Guardar configuración
                    </button>
                )}
            />

            <div className="settings-layout">
                <div className="card settings-layout__hero">
                    <div className="settings-section__header">
                        <div className="settings-section__icon"><MapPin size={20} /></div>
                        <h3 className="settings-section__title">Ubicación de origen predefinida</h3>
                    </div>
                    <p className="text-muted settings-section__intro">
                        Define el punto de partida que aparecerá automáticamente en cada nueva cotización. Arrastra el marcador en el mapa para mayor precisión.
                    </p>

                    <div className="settings-layout__hero-body settings-layout__hero-body--tall">
                        <div className="settings-stack">
                            <div className="settings-search">
                                <label className="text-muted settings-search__label" htmlFor="settings-default-origin-address">
                                    BUSCAR DIRECCIÓN
                                </label>
                                <div className="form-field-group">
                                    <input
                                        id="settings-default-origin-address"
                                        name="default_origin_address"
                                        type="text"
                                        value={settings.default_origin_address}
                                        onChange={(event) => handleAddressSearch(event.target.value)}
                                        className="form-input-clean"
                                        placeholder="Ej: Puebla, Pue., México"
                                        autoComplete="street-address"
                                    />
                                </div>

                                {activeSearchIdx !== null && suggestions.length > 0 ? (
                                    <div className="search-suggestions">
                                        {suggestions.map((suggestion, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => selectSuggestion(suggestion)}
                                                className="search-suggestions__item"
                                            >
                                                {suggestion.label}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            <div className="settings-coordinates-grid">
                                <div>
                                    <label className="form-label" htmlFor="settings-default-origin-lat">LATITUD</label>
                                    <input
                                        id="settings-default-origin-lat"
                                        type="text"
                                        name="default_origin_lat"
                                        className="form-field"
                                        value={settings.default_origin_lat}
                                        onChange={handleChange}
                                        autoComplete="off"
                                    />
                                </div>
                                <div>
                                    <label className="form-label" htmlFor="settings-default-origin-lng">LONGITUD</label>
                                    <input
                                        id="settings-default-origin-lng"
                                        type="text"
                                        name="default_origin_lng"
                                        className="form-field"
                                        value={settings.default_origin_lng}
                                        onChange={handleChange}
                                        autoComplete="off"
                                    />
                                </div>
                            </div>

                            <p className="text-muted settings-tip">
                                Tip: Busca la dirección principal y luego ajusta el marcador rojo en el mapa para fijar el predio exacto de carga.
                            </p>
                        </div>

                        <div className="settings-map settings-map--compact">
                            <MapComponent
                                points={mapPoints}
                                onMarkerDrag={handleMarkerDrag}
                            />
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="settings-section__header">
                        <div className="settings-section__icon"><Info size={20} /></div>
                        <h3 className="settings-section__title">Combustible y eficiencia</h3>
                    </div>
                    <div className="settings-stack">
                        <div>
                            <label className="form-label" htmlFor="settings-gasoline-price">PRECIO GASOLINA ($/L)</label>
                            <input
                                id="settings-gasoline-price"
                                type="number"
                                name="gasoline_price"
                                value={settings.gasoline_price}
                                onChange={handleChange}
                                className="form-field"
                                placeholder="24.50"
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <label className="form-label" htmlFor="settings-base-efficiency">FACTOR EFICIENCIA BASE</label>
                            <input
                                id="settings-base-efficiency"
                                type="number"
                                step="0.1"
                                name="base_efficiency"
                                value={settings.base_efficiency}
                                onChange={handleChange}
                                className="form-field"
                                placeholder="1.0"
                                autoComplete="off"
                            />
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="settings-section__header">
                        <div className="settings-section__icon"><Info size={20} /></div>
                        <h3 className="settings-section__title">Ajustes de ruta</h3>
                    </div>
                    <div className="settings-stack">
                        <div>
                            <label className="form-label" htmlFor="settings-maneuver-factor">FACTOR MANIOBRA (MULTIPLICADOR)</label>
                            <input
                                id="settings-maneuver-factor"
                                type="number"
                                step="0.1"
                                name="maneuver_factor"
                                value={settings.maneuver_factor}
                                onChange={handleChange}
                                className="form-field"
                                placeholder="1.2"
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <label className="form-label" htmlFor="settings-traffic-factor">FACTOR TRÁFICO (TIEMPO)</label>
                            <input
                                id="settings-traffic-factor"
                                type="number"
                                step="0.1"
                                name="traffic_factor"
                                value={settings.traffic_factor}
                                onChange={handleChange}
                                className="form-field"
                                placeholder="1.5"
                                autoComplete="off"
                            />
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="settings-section__header">
                        <div className="settings-section__icon"><Info size={20} /></div>
                        <h3 className="settings-section__title">Costos de hospedaje</h3>
                    </div>
                    <p className="text-muted settings-section__intro">
                        Define las horas de trayecto de ida y el costo por noche según la duración.
                    </p>

                    <div className="settings-stack">
                        {[1, 2, 3].map((tier) => (
                            <div key={`lodging-tier-${tier}`} className="settings-tier settings-tier-grid">
                                <div>
                                    <label className="form-label" htmlFor={`settings-lodging-tier${tier}-hours`}>
                                        {`UMBRAL NIVEL ${tier} (HORAS IDA)`}
                                    </label>
                                    <input
                                        id={`settings-lodging-tier${tier}-hours`}
                                        type="number"
                                        name={`lodging_tier${tier}_hours`}
                                        value={settings[`lodging_tier${tier}_hours`]}
                                        onChange={handleChange}
                                        className="form-field"
                                        placeholder={`${tier === 1 ? '6' : tier === 2 ? '11' : '17'}`}
                                        autoComplete="off"
                                    />
                                </div>
                                <div>
                                    <label className="form-label" htmlFor={`settings-lodging-tier${tier}-cost`}>
                                        COSTO ASIGNADO ($)
                                    </label>
                                    <input
                                        id={`settings-lodging-tier${tier}-cost`}
                                        type="number"
                                        name={`lodging_tier${tier}_cost`}
                                        value={settings[`lodging_tier${tier}_cost`]}
                                        onChange={handleChange}
                                        className="form-field"
                                        placeholder={`${tier === 1 ? '1500' : tier === 2 ? '2400' : '3600'}`}
                                        autoComplete="off"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <div className="settings-section__header">
                        <div className="settings-section__icon"><Info size={20} /></div>
                        <h3 className="settings-section__title">Costos de alimentos / viáticos</h3>
                    </div>
                    <p className="text-muted settings-section__intro">
                        Configura los viáticos según la jornada laboral total o si hay pernocta.
                    </p>

                    <div className="settings-stack">
                        <div className="settings-tier settings-tier-grid">
                            <div>
                                <label className="form-label" htmlFor="settings-meal-tier1-hours">UMBRAL NIVEL 1 - JORNADA (HORAS)</label>
                                <input
                                    id="settings-meal-tier1-hours"
                                    type="number"
                                    name="meal_tier1_hours"
                                    value={settings.meal_tier1_hours}
                                    onChange={handleChange}
                                    className="form-field"
                                    placeholder="8"
                                    autoComplete="off"
                                />
                            </div>
                            <div>
                                <label className="form-label" htmlFor="settings-meal-tier1-cost">COSTO ASIGNADO ($)</label>
                                <input
                                    id="settings-meal-tier1-cost"
                                    type="number"
                                    name="meal_tier1_cost"
                                    value={settings.meal_tier1_cost}
                                    onChange={handleChange}
                                    className="form-field"
                                    placeholder="200"
                                    autoComplete="off"
                                />
                            </div>
                        </div>

                        <div className="settings-tier settings-tier-grid">
                            <div>
                                <label className="form-label" htmlFor="settings-meal-tier2-hours">UMBRAL NIVEL 2 - VIAJE LARGO (HORAS TOTAL)</label>
                                <input
                                    id="settings-meal-tier2-hours"
                                    type="number"
                                    name="meal_tier2_hours"
                                    value={settings.meal_tier2_hours}
                                    onChange={handleChange}
                                    className="form-field"
                                    placeholder="12"
                                    autoComplete="off"
                                />
                            </div>
                            <div>
                                <label className="form-label" htmlFor="settings-meal-tier2-cost">COSTO ASIGNADO ($)</label>
                                <input
                                    id="settings-meal-tier2-cost"
                                    type="number"
                                    name="meal_tier2_cost"
                                    value={settings.meal_tier2_cost}
                                    onChange={handleChange}
                                    className="form-field"
                                    placeholder="300"
                                    autoComplete="off"
                                />
                            </div>
                        </div>

                        <div className="settings-tier">
                            <label className="form-label" htmlFor="settings-meal-tier3-cost">COSTO ASIGNADO CUANDO APLICA HOSPEDAJE ($)</label>
                            <input
                                id="settings-meal-tier3-cost"
                                type="number"
                                name="meal_tier3_cost"
                                value={settings.meal_tier3_cost}
                                onChange={handleChange}
                                className="form-field"
                                placeholder="500"
                                autoComplete="off"
                            />
                        </div>
                    </div>
                </div>

                <div className="settings-save-row">
                    <button type="button" onClick={handleSave} className="btn btn-primary">
                        <Save size={18} />
                        Guardar configuración
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
