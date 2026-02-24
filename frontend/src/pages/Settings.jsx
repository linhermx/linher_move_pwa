import React, { useState, useEffect } from 'react';
import { Save, Info } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { settingsService } from '../services/api';

const Settings = () => {
    const [settings, setSettings] = useState({
        gasoline_price: '',
        factor_maniobra: '',
        factor_trafico: '',
        eficiencia_base: '',
        lodging_tier1_cost: '',
        lodging_tier2_cost: '',
        lodging_tier3_cost: '',
        meal_tier1_cost: '',
        meal_tier2_cost: '',
        meal_tier3_cost: '',
        hospedaje_tier1_hours: '',
        hospedaje_tier2_hours: '',
        hospedaje_tier3_hours: '',
        viaticos_tier1_hours: '',
        viaticos_tier2_hours: ''
    });
    const { showNotification } = useNotification();

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

    return (
        <div style={{ maxWidth: '900px', paddingBottom: 'var(--spacing-xxl)' }} className="fade-in">
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Parámetros Globales</h1>
                <p className="text-muted">Configura los valores base y reglas de negocio para las cotizaciones</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--spacing-lg)' }}>
                {/* SECCIÓN 1: COMBUSTIBLE Y EFICIENCIA */}
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
                                type="number" step="0.1" name="eficiencia_base" value={settings.eficiencia_base} onChange={handleChange}
                                style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'white' }}
                                placeholder="1.0"
                            />
                        </div>
                    </div>
                </div>

                {/* SECCIÓN 2: AJUSTES DE RUTA */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--spacing-lg)', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                        <div style={{ color: 'var(--color-primary)' }}><Info size={20} /></div>
                        <h3 style={{ fontSize: '18px' }}>Ajustes de Ruta</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>FACTOR MANIOBRA (MULTIPLICADOR)</label>
                            <input
                                type="number" step="0.1" name="factor_maniobra" value={settings.factor_maniobra} onChange={handleChange}
                                style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'white' }}
                                placeholder="1.2"
                            />
                        </div>
                        <div>
                            <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>FACTOR TRÁFICO (TIEMPO)</label>
                            <input
                                type="number" step="0.1" name="factor_trafico" value={settings.factor_trafico} onChange={handleChange}
                                style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'white' }}
                                placeholder="1.5"
                            />
                        </div>
                    </div>
                </div>

                {/* SECCIÓN 3: HOSPEDAJE */}
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
                                        type="number" name={`hospedaje_tier${tier}_hours`} value={settings[`hospedaje_tier${tier}_hours`]} onChange={handleChange}
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

                {/* SECCIÓN 4: ALIMENTOS */}
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
                                    type="number" name="viaticos_tier1_hours" value={settings.viaticos_tier1_hours} onChange={handleChange}
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
                                    type="number" name="viaticos_tier2_hours" value={settings.viaticos_tier2_hours} onChange={handleChange}
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
        </div>
    );
};

export default Settings;
