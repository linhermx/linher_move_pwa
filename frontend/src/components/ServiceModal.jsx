import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { serviceService } from '../services/api';
import { useNotification } from '../context/NotificationContext';

const ServiceModal = ({ isOpen, onClose, onServiceSaved, editData = null }) => {
    const isEdit = !!editData;
    const { showNotification } = useNotification();
    const [formData, setFormData] = useState({
        name: '',
        cost: '',
        time_minutes: '',
        description: '',
        status: 'active'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (editData) {
            setFormData({
                name: editData.name,
                cost: editData.cost,
                time_minutes: editData.time_minutes,
                description: editData.description || '',
                status: editData.status
            });
        } else {
            setFormData({
                name: '',
                cost: '',
                time_minutes: '',
                description: '',
                status: 'active'
            });
        }
    }, [editData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!formData.name || !formData.cost || !formData.time_minutes) {
                throw new Error('Nombre, costo y tiempo son obligatorios');
            }

            if (isEdit) {
                await serviceService.update(editData.id, formData);
                showNotification('Servicio actualizado exitosamente', 'success');
            } else {
                await serviceService.create(formData);
                showNotification('Servicio creado exitosamente', 'success');
            }

            onServiceSaved();
            onClose();
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            setError(msg);
            showNotification(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
            <div className="card" style={{
                width: '100%', maxWidth: '500px', padding: 'var(--spacing-xl)',
                position: 'relative', animation: 'modal-appear 0.3s ease-out'
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute', top: '20px', right: '20px',
                    background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer'
                }}>
                    <X size={24} />
                </button>

                <h2 style={{ marginBottom: 'var(--spacing-lg)', fontSize: '20px' }}>
                    {isEdit ? 'Editar Servicio' : 'Nuevo Servicio'}
                </h2>

                {error && (
                    <div style={{
                        backgroundColor: 'rgba(255, 72, 72, 0.1)', color: 'var(--color-primary)',
                        padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-md)',
                        display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px'
                    }}>
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    <div>
                        <label className="text-muted" style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>NOMBRE DEL SERVICIO</label>
                        <input
                            type="text" name="name" value={formData.name} onChange={handleChange}
                            placeholder="Ej. Maniobra Especial"
                            className="input-field"
                            style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'white' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label className="text-muted" style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>COSTO ($)</label>
                            <input
                                type="number" step="0.01" name="cost" value={formData.cost} onChange={handleChange}
                                placeholder="0.00"
                                style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'white' }}
                            />
                        </div>
                        <div>
                            <label className="text-muted" style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>TIEMPO (MIN)</label>
                            <input
                                type="number" name="time_minutes" value={formData.time_minutes} onChange={handleChange}
                                placeholder="0"
                                style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'white' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-muted" style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>DESCRIPCIÓN (OPCIONAL)</label>
                        <textarea
                            name="description" value={formData.description} onChange={handleChange}
                            rows="3"
                            style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'white', resize: 'none' }}
                        />
                    </div>

                    <div>
                        <label className="text-muted" style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>ESTADO</label>
                        <select
                            name="status" value={formData.status} onChange={handleChange}
                            style={{ width: '100%', padding: '12px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'white' }}
                        >
                            <option value="active">Activo</option>
                            <option value="inactive">Inactivo</option>
                        </select>
                    </div>

                    <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-md)' }}>
                        <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'white', cursor: 'pointer' }}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} style={{
                            flex: 1, padding: '12px', backgroundColor: loading ? 'rgba(255, 72, 72, 0.5)' : 'var(--color-primary)',
                            border: 'none', borderRadius: 'var(--radius-md)', color: 'white', fontWeight: 'bold',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}>
                            <Save size={18} />
                            {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
            <style>{`
                @keyframes modal-appear {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default ServiceModal;
