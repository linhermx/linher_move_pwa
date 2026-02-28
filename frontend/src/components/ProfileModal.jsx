import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, User, Camera, Lock, Mail } from 'lucide-react';
import { userService } from '../services/api';
import { useNotification } from '../context/NotificationContext';

const ProfileModal = ({ isOpen, onClose, onUserUpdated }) => {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user')) || {});
    const [formData, setFormData] = useState({
        name: user.name || '',
        password: '',
        confirmPassword: ''
    });
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(user.photo_path ? `http://localhost:3000/${user.photo_path}` : null);
    const [loading, setLoading] = useState(false);
    const { showNotification } = useNotification();
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user')) || {};
            setUser(currentUser);
            setFormData({
                name: currentUser.name || '',
                password: '',
                confirmPassword: ''
            });
            setPhotoPreview(currentUser.photo_path ? `http://localhost:3000/${currentUser.photo_path}` : null);
            setPhoto(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => setPhotoPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password && formData.password !== formData.confirmPassword) {
            showNotification('Las contraseñas no coinciden', 'error');
            return;
        }

        setLoading(true);
        try {
            const data = new FormData();
            data.append('name', formData.name);
            if (formData.password) data.append('password', formData.password);
            if (photo) data.append('photo', photo);

            // We use the current user id for the update
            const response = await userService.update(user.id, data);

            // Update local storage with new data
            const updatedUser = {
                ...user,
                name: formData.name,
                photo_path: response.photo_path || user.photo_path
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));

            showNotification('Perfil actualizado correctamente', 'success');
            onUserUpdated(updatedUser);
            onClose();
        } catch (err) {
            console.error('Error updating profile:', err);
            showNotification('Error al actualizar el perfil', 'error');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 10000, backdropFilter: 'blur(8px)',
            animation: 'fade-in 0.3s ease-out'
        }}>
            <div className="card" style={{
                width: '100%', maxWidth: '450px',
                padding: 'var(--spacing-xl)', position: 'relative',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute', top: '20px', right: '20px',
                    background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer'
                }}>
                    <X size={24} />
                </button>

                <h2 style={{ marginBottom: 'var(--spacing-xl)', fontSize: '22px', fontWeight: 'bold', textAlign: 'center' }}>Mi Perfil</h2>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Photo Upload Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <div
                            onClick={() => fileInputRef.current.click()}
                            style={{
                                width: '100px', height: '100px', borderRadius: '50%',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                border: '2px solid var(--color-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', overflow: 'hidden', position: 'relative'
                            }}
                        >
                            {photoPreview ? (
                                <img src={photoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" />
                            ) : (
                                <User size={40} className="text-muted" />
                            )}
                            <div style={{
                                position: 'absolute', bottom: 0, width: '100%', height: '30%',
                                backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Camera size={14} color="white" />
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            style={{ display: 'none' }}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Haz click para cambiar foto</span>
                    </div>

                    {/* Email (Read-only) */}
                    <div>
                        <label className="form-label">CORREO ELECTRÓNICO (SOLO LECTURA)</label>
                        <div className="form-field-group" style={{
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            color: 'var(--color-text-muted)',
                            cursor: 'default'
                        }}>
                            <Mail size={16} />
                            <span style={{ fontSize: '14px', opacity: 0.8 }}>{user.email}</span>
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="form-label">NOMBRE COMPLETO</label>
                        <div className="form-field-group">
                            <User size={16} className="text-primary" />
                            <input
                                type="text"
                                className="form-input-clean"
                                style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', height: '100%', fontSize: '14px' }}
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                autoComplete="name"
                                placeholder="Tu nombre"
                                required
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label className="form-label">NUEVA CONTRASEÑA</label>
                            <div className="form-field-group">
                                <Lock size={14} className="text-muted" />
                                <input
                                    type="password"
                                    className="form-input-clean"
                                    style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', height: '100%', fontSize: '13px' }}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    autoComplete="new-password"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="form-label">CONFIRMAR</label>
                            <div className="form-field-group">
                                <Lock size={14} className="text-muted" />
                                <input
                                    type="password"
                                    className="form-input-clean"
                                    style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', height: '100%', fontSize: '13px' }}
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    autoComplete="new-password"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            marginTop: '10px',
                            padding: '14px',
                            backgroundColor: loading ? 'rgba(255,72,72,0.5)' : 'var(--color-primary)',
                            color: 'white', border: 'none', borderRadius: 'var(--radius-md)',
                            fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            transition: 'all 0.2s'
                        }}
                    >
                        {loading ? 'Guardando...' : <><Save size={18} /> Guardar Cambios</>}
                    </button>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default ProfileModal;
