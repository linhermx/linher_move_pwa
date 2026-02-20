import React, { useState, useEffect } from 'react';
import { Save, Info } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { settingsService } from '../services/api';

const Settings = () => {
    const [settings, setSettings] = useState({
        gasoline_price: '24.50',
        factor_maniobra: '1.2',
        factor_trafico: '1.5',
        cost_mantenimiento: '500',
        cost_comida: '150',
        cost_hospedaje: '800',
        cost_interconexion: '200'
    });
    const { showNotification } = useNotification();

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
        <div style={{ maxWidth: '800px' }}>
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h1 style={{ fontSize: '24px' }}>Parámetros Globales</h1>
                <p className="text-muted">Configura los valores por defecto para los cálculos logísticos</p>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                <section>
                    <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: '18px', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--spacing-sm)' }}>Factores de Ruta</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '12px' }} className="text-muted">Precio Gasolina ($/L)</label>
                            <input
                                type="number"
                                name="gasoline_price"
                                value={settings.gasoline_price}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'white' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '12px' }} className="text-muted">Factor Maniobra (Default: 1.2)</label>
                            <input
                                type="number"
                                name="factor_maniobra"
                                value={settings.factor_maniobra}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'white' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '12px' }} className="text-muted">Factor Tráfico (Default: 1.5)</label>
                            <input
                                type="number"
                                name="factor_trafico"
                                value={settings.factor_trafico}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'white' }}
                            />
                        </div>
                    </div>
                </section>

                <section>
                    <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: '18px', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--spacing-sm)' }}>Costos de Servicios</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '12px' }} className="text-muted">Interconexión ($)</label>
                            <input
                                type="number"
                                name="cost_interconexion"
                                value={settings.cost_interconexion}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'white' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '12px' }} className="text-muted">Mantenimiento ($)</label>
                            <input
                                type="number"
                                name="cost_mantenimiento"
                                value={settings.cost_mantenimiento}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'white' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '12px' }} className="text-muted">Comida ($)</label>
                            <input
                                type="number"
                                name="cost_comida"
                                value={settings.cost_comida}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'white' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '12px' }} className="text-muted">Hospedaje ($)</label>
                            <input
                                type="number"
                                name="cost_hospedaje"
                                value={settings.cost_hospedaje}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'white' }}
                            />
                        </div>
                    </div>
                </section>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-lg)' }}>
                    <button
                        onClick={handleSave}
                        style={{
                            backgroundColor: 'var(--color-primary)',
                            color: 'white',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: 'bold'
                        }}
                    >
                        <Save size={20} />
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
