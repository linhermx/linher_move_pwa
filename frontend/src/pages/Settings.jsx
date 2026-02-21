import React, { useState, useEffect } from 'react';
import { Save, Info } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { settingsService } from '../services/api';

const Settings = () => {
    const [settings, setSettings] = useState({
        gasoline_price: '24.50',
        factor_maniobra: '1.2',
        factor_trafico: '1.5',
        eficiencia_base: '1.0',
        umbral_hospedaje_horas: '12',
        umbral_viaticos_horas: '6'
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
        <div style={{ maxWidth: '900px' }} className="fade-in">
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
                            />
                        </div>
                        <div>
                            <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>FACTOR EFICIENCIA BASE</label>
                            <input
                                type="number" step="0.1" name="eficiencia_base" value={settings.eficiencia_base} onChange={handleChange}
                                style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'white' }}
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
                            <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>FACTOR MANIOBRA</label>
                            <input
                                type="number" step="0.1" name="factor_maniobra" value={settings.factor_maniobra} onChange={handleChange}
                                style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'white' }}
                            />
                        </div>
                        <div>
                            <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>FACTOR TRÁFICO</label>
                            <input
                                type="number" step="1" name="factor_trafico" value={settings.factor_trafico} onChange={handleChange}
                                style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'white' }}
                            />
                        </div>
                    </div>
                </div>

                {/* SECCIÓN 3: GASTOS CONDICIONALES */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--spacing-lg)', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                        <div style={{ color: 'var(--color-primary)' }}><Info size={20} /></div>
                        <h3 style={{ fontSize: '18px' }}>Gastos Condicionales (Umbrales)</h3>
                    </div>
                    <p className="text-muted" style={{ fontSize: '13px', marginBottom: 'var(--spacing-md)' }}>Define después de cuántas horas de viaje se deben aplicar automáticamente los gastos de viáticos y hospedaje.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>UMBRAL VIÁTICOS (HORAS)</label>
                            <input
                                type="number" name="umbral_viaticos_horas" value={settings.umbral_viaticos_horas} onChange={handleChange}
                                style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'white' }}
                            />
                        </div>
                        <div>
                            <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>UMBRAL HOSPEDAJE (HORAS)</label>
                            <input
                                type="number" name="umbral_hospedaje_horas" value={settings.umbral_hospedaje_horas} onChange={handleChange}
                                style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'white' }}
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
