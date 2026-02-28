import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, User, Shield, Camera } from 'lucide-react';
import { userService } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import CustomSelect from './CustomSelect';

const UserModal = ({ isOpen, onClose, onUserSaved, editData = null, roles = [] }) => {
    const isEdit = !!editData;
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role_id: '',
        status: 'active'
    });
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { showNotification } = useNotification();

    useEffect(() => {
        if (editData) {
            setFormData({
                name: editData.name,
                email: editData.email,
                password: '',
                role_id: editData.role_id,
                status: editData.status
            });
            setPhotoPreview(editData.photo_path ? `http://localhost:3000/${editData.photo_path}` : null);
        } else {
            setFormData({
                name: '',
                email: '',
                password: '',
                role_id: roles.length > 0 ? roles[roles.length - 1].id : '',
                status: 'active'
            });
            setPhoto(null);
            setPhotoPreview(null);
        }
    }, [editData, isOpen, roles]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!formData.name || !formData.email || !formData.role_id) {
                throw new Error('Nombre, email y rol son obligatorios');
            }

            if (!isEdit && !formData.password) {
                throw new Error('La contraseña es obligatoria para nuevos usuarios');
            }

            const data = new FormData();
            data.append('entity', 'users');
            data.append('name', formData.name);
            data.append('email', formData.email);
            data.append('role_id', formData.role_id);
            data.append('status', formData.status);
            if (formData.password) data.append('password', formData.password);
            if (photo) data.append('photo', photo);

            if (isEdit) {
                await userService.update(editData.id, data);
                showNotification('Usuario actualizado exitosamente', 'success');
            } else {
                await userService.create(data);
                showNotification('Usuario creado exitosamente', 'success');
            }

            onUserSaved();
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

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => setPhotoPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
        }}>
            <div className="card" style={{
                width: '100%',
                maxWidth: '450px',
                padding: 'var(--spacing-xl)',
                position: 'relative',
                animation: 'modal-appear 0.3s ease-out'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '20px', right: '20px',
                        background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer'
                    }}
                >
                    <X size={24} />
                </button>

                <h2 style={{ marginBottom: 'var(--spacing-lg)', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Shield size={20} className="text-primary" />
                    {isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
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
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--spacing-sm)' }}>
                        <div
                            onClick={() => document.getElementById('user-photo').click()}
                            style={{
                                width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)',
                                border: '2px dashed var(--color-border)', display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden'
                            }}>
                            {photoPreview ? (
                                <img src={photoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <Camera size={24} className="text-muted" />
                            )}
                            <input id="user-photo" type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                        </div>
                    </div>                    <div>
                        <label className="form-label">NOMBRE COMPLETO</label>
                        <input
                            type="text"
                            name="name"
                            className="form-field"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Ej. Juan Pérez"
                        />
                    </div>

                    <div>
                        <label className="form-label">CORREO ELECTRÓNICO</label>
                        <input
                            type="email"
                            name="email"
                            className="form-field"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="usuario@linher.com"
                        />
                    </div>

                    <div>
                        <label className="form-label">CONTRASEÑA {isEdit && '(Dejar en blanco para no cambiar)'}</label>
                        <input
                            type="password"
                            name="password"
                            className="form-field"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label className="form-label">ROL DEL SISTEMA</label>
                            <div className="form-select-container">
                                <CustomSelect
                                    placeholder="Seleccionar rol"
                                    value={formData.role_id}
                                    onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                                    options={roles.map(role => ({ value: role.id, label: role.name.toUpperCase() }))}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="form-label">ESTATUS</label>
                            <div className="form-select-container">
                                <CustomSelect
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    options={[
                                        { value: 'active', label: 'ACTIVO' },
                                        { value: 'inactive', label: 'INACTIVO' }
                                    ]}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-md)' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1, padding: '12px', background: 'transparent',
                                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                                color: 'white', cursor: 'pointer'
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                flex: 1, padding: '12px', backgroundColor: loading ? 'rgba(255, 72, 72, 0.5)' : 'var(--color-primary)',
                                border: 'none', borderRadius: 'var(--radius-md)', color: 'white', fontWeight: 'bold',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <Save size={18} />
                            {loading ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear Usuario')}
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

export default UserModal;
