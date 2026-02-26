import React, { useState } from 'react';
import { X, Save, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { vehicleService } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import CustomSelect from './CustomSelect';

const VehicleModal = ({ isOpen, onClose, onVehicleCreated, editData = null }) => {
    const isEdit = !!editData;
    const [formData, setFormData] = useState({
        name: '',
        plate: '',
        rendimiento_teorico: '',
        rendimiento_real: '',
        status: 'available'
    });
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { showNotification } = useNotification();

    React.useEffect(() => {
        if (editData) {
            setFormData({
                name: editData.name,
                plate: editData.plate,
                rendimiento_teorico: editData.rendimiento_teorico,
                rendimiento_real: editData.rendimiento_real,
                status: editData.status
            });
            setPhotoPreview(editData.photo_path ? `http://localhost:3000/${editData.photo_path}` : null);
        } else {
            setFormData({
                name: '',
                plate: '',
                rendimiento_teorico: '',
                rendimiento_real: '',
                status: 'available'
            });
            setPhoto(null);
            setPhotoPreview(null);
        }
    }, [editData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Validation
            if (!formData.name || !formData.plate || !formData.rendimiento_teorico || !formData.rendimiento_real) {
                throw new Error('Todos los campos son obligatorios');
            }

            const formDataToSend = new FormData();
            formDataToSend.append('name', formData.name);
            formDataToSend.append('plate', formData.plate);
            formDataToSend.append('rendimiento_teorico', parseFloat(formData.rendimiento_teorico));
            formDataToSend.append('rendimiento_real', parseFloat(formData.rendimiento_real));
            formDataToSend.append('status', formData.status);
            if (photo) {
                formDataToSend.append('photo', photo);
            }

            if (isEdit) {
                await vehicleService.update(editData.id, formDataToSend);
            } else {
                await vehicleService.create(formDataToSend);
            }

            showNotification(isEdit ? 'Vehículo actualizado exitosamente' : 'Vehículo creado exitosamente', 'success');
            onVehicleCreated();
            onClose();
            setFormData({
                name: '',
                plate: '',
                rendimiento_teorico: '',
                rendimiento_real: '',
                status: 'available'
            });
            setPhoto(null);
            setPhotoPreview(null);
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

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
        }}>
            <div className="card" style={{
                width: '100%',
                maxWidth: '500px',
                padding: 'var(--spacing-xl)',
                position: 'relative',
                animation: 'modal-appear 0.3s ease-out'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer'
                    }}
                >
                    <X size={24} />
                </button>

                <h2 style={{ marginBottom: 'var(--spacing-lg)', fontSize: '20px' }}>
                    {isEdit ? 'Editar Vehículo' : 'Nuevo Vehículo'}
                </h2>

                {error && (
                    <div style={{
                        backgroundColor: 'rgba(255, 72, 72, 0.1)',
                        color: 'var(--color-primary)',
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--spacing-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px'
                    }}>
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--spacing-md)' }}>
                        <div
                            onClick={() => document.getElementById('vehicle-photo').click()}
                            style={{
                                width: '120px',
                                height: '120px',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: '2px dashed var(--color-border)',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                cursor: 'pointer',
                                overflow: 'hidden',
                                position: 'relative'
                            }}
                        >
                            {photoPreview ? (
                                <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <>
                                    <ImageIcon size={32} className="text-muted" style={{ marginBottom: '8px' }} />
                                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>SUBIR FOTO</span>
                                </>
                            )}
                            <input
                                id="vehicle-photo"
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoChange}
                                style={{ display: 'none' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--color-text-muted)' }}>
                            NOMBRE DEL VEHÍCULO
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Ej. Tracto Volvo 2023"
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                color: 'white',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--color-text-muted)' }}>
                            PLACAS
                        </label>
                        <input
                            type="text"
                            name="plate"
                            value={formData.plate}
                            onChange={handleChange}
                            placeholder="Ej. ABC-123-D"
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                color: 'white',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--color-text-muted)' }}>
                                REND. TEÓRICO (km/L)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                name="rendimiento_teorico"
                                value={formData.rendimiento_teorico}
                                onChange={handleChange}
                                placeholder="1.5"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'white',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--color-text-muted)' }}>
                                REND. REAL (km/L)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                name="rendimiento_real"
                                value={formData.rendimiento_real}
                                onChange={handleChange}
                                placeholder="1.2"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'white',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--color-text-muted)' }}>
                            ESTATUS INICIAL
                        </label>
                        <div style={{ padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                            <CustomSelect
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                options={[
                                    { value: 'available', label: 'Disponible' },
                                    { value: 'in_route', label: 'En Ruta' },
                                    { value: 'maintenance', label: 'Mantenimiento' }
                                ]}
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-md)' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: 'transparent',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: '12px',
                                backgroundColor: loading ? 'rgba(255, 72, 72, 0.5)' : 'var(--color-primary)',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                color: 'white',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <Save size={18} />
                            {loading ? 'Guardando...' : (isEdit ? 'Actualizar Vehículo' : 'Guardar Vehículo')}
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

export default VehicleModal;
