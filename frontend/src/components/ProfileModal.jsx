import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, User, Camera, Lock, Mail } from 'lucide-react';
import { userService } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import useModalAccessibility from '../hooks/useModalAccessibility';

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
    const dialogRef = useRef(null);
    const closeButtonRef = useRef(null);
    const labelledBy = 'profile-modal-title';
    const describedBy = 'profile-modal-description';
    const passwordFeedbackId = 'profile-password-feedback';
    const fieldIds = {
        photo: 'profile-photo',
        name: 'profile-name',
        password: 'profile-password',
        confirmPassword: 'profile-confirm-password'
    };
    const hasPasswordAttempt = Boolean(formData.password || formData.confirmPassword);
    const passwordMismatch = Boolean(formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword);
    const passwordIncomplete = Boolean(hasPasswordAttempt && (!formData.password || !formData.confirmPassword) && !passwordMismatch);
    const passwordsMatch = Boolean(formData.password && formData.confirmPassword && formData.password === formData.confirmPassword);
    const passwordFeedbackMessage = passwordMismatch
        ? 'Las contrase\u00f1as no coinciden.'
        : passwordIncomplete
            ? 'Completa ambos campos para cambiar la contrase\u00f1a.'
            : passwordsMatch
                ? 'Las contrase\u00f1as coinciden.'
                : '';
    const isSubmitDisabled = loading || passwordMismatch || passwordIncomplete;

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

    useModalAccessibility({
        isOpen,
        onClose,
        dialogRef,
        initialFocusRef: closeButtonRef
    });

    if (!isOpen) return null;

    const handlePhotoChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setPhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => setPhotoPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (passwordIncomplete) {
            showNotification('Completa ambos campos para cambiar la contrase\u00f1a', 'error');
            return;
        }

        if (passwordMismatch) {
            showNotification('Las contrase\u00f1as no coinciden', 'error');
            return;
        }

        setLoading(true);
        try {
            const data = new FormData();
            data.append('name', formData.name);
            if (formData.password) data.append('password', formData.password);
            if (photo) data.append('photo', photo);

            const response = await userService.update(user.id, data);

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
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10000,
                backdropFilter: 'blur(8px)',
                animation: 'fade-in 0.3s ease-out'
            }}
            onClick={onClose}
        >
            <div
                ref={dialogRef}
                className="card"
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                aria-describedby={describedBy}
                tabIndex={-1}
                onClick={(event) => event.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: '450px',
                    padding: 'var(--spacing-xl)',
                    position: 'relative',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}
            >
                <button
                    ref={closeButtonRef}
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

                <h2
                    id={labelledBy}
                    style={{
                        marginBottom: 'var(--spacing-sm)',
                        fontSize: '22px',
                        fontWeight: 'bold',
                        textAlign: 'center'
                    }}
                >
                    {'Mi Perfil'}
                </h2>
                <p
                    id={describedBy}
                    className="text-muted"
                    style={{ marginBottom: 'var(--spacing-xl)', textAlign: 'center' }}
                >
                    {'Actualiza tu nombre, foto y contrase\u00f1a desde esta ventana.'}
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <div
                            onClick={() => fileInputRef.current.click()}
                            style={{
                                width: '100px',
                                height: '100px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                border: '2px solid var(--color-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                overflow: 'hidden',
                                position: 'relative'
                            }}
                        >
                            {photoPreview ? (
                                <img
                                    src={photoPreview}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    alt="Vista previa del perfil"
                                />
                            ) : (
                                <User size={40} className="text-muted" />
                            )}
                            <div
                                style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    width: '100%',
                                    height: '30%',
                                    backgroundColor: 'rgba(0,0,0,0.5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Camera size={14} color="white" />
                            </div>
                        </div>
                        <input
                            id={fieldIds.photo}
                            ref={fileInputRef}
                            name="photo"
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            aria-label="Subir foto de perfil"
                            style={{ display: 'none' }}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{'Haz click para cambiar foto'}</span>
                    </div>

                    <div>
                        <p className="form-label">{'CORREO ELECTR\u00d3NICO (SOLO LECTURA)'}</p>
                        <div
                            className="form-field-group"
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.02)',
                                color: 'var(--color-text-muted)',
                                cursor: 'default'
                            }}
                        >
                            <Mail size={16} />
                            <span style={{ fontSize: '14px', opacity: 0.8 }}>{user.email}</span>
                        </div>
                    </div>

                    <div>
                        <label className="form-label" htmlFor={fieldIds.name}>{'NOMBRE COMPLETO'}</label>
                        <div className="form-field-group">
                            <User size={16} className="text-primary" />
                            <input
                                id={fieldIds.name}
                                name="name"
                                type="text"
                                className="form-input-clean"
                                style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', height: '100%', fontSize: '14px' }}
                                value={formData.name}
                                onChange={handleChange}
                                autoComplete="name"
                                placeholder="Tu nombre"
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label className="form-label" htmlFor={fieldIds.password}>{'NUEVA CONTRASE\u00d1A'}</label>
                            <div className={`form-field-group ${passwordMismatch ? 'form-field-group--error' : ''}`.trim()}>
                                <Lock size={14} className="text-muted" />
                                <input
                                    id={fieldIds.password}
                                    name="password"
                                    type="password"
                                    className="form-input-clean"
                                    aria-invalid={passwordMismatch}
                                    aria-describedby={hasPasswordAttempt ? passwordFeedbackId : undefined}
                                    style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', height: '100%', fontSize: '13px' }}
                                    value={formData.password}
                                    onChange={handleChange}
                                    autoComplete="new-password"
                                    placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="form-label" htmlFor={fieldIds.confirmPassword}>{'CONFIRMAR'}</label>
                            <div className={`form-field-group ${passwordMismatch ? 'form-field-group--error' : ''}`.trim()}>
                                <Lock size={14} className="text-muted" />
                                <input
                                    id={fieldIds.confirmPassword}
                                    name="confirmPassword"
                                    type="password"
                                    className="form-input-clean"
                                    aria-invalid={passwordMismatch}
                                    aria-describedby={hasPasswordAttempt ? passwordFeedbackId : undefined}
                                    style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', height: '100%', fontSize: '13px' }}
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    autoComplete="new-password"
                                    placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                                />
                            </div>
                        </div>
                    </div>

                    {passwordFeedbackMessage ? (
                        <p
                            id={passwordFeedbackId}
                            className={`form-feedback ${passwordMismatch ? 'form-feedback--error' : passwordsMatch ? 'form-feedback--success' : 'text-muted'}`.trim()}
                            aria-live="polite"
                            role={passwordMismatch ? 'alert' : 'status'}
                        >
                            {passwordFeedbackMessage}
                        </p>
                    ) : null}

                    <button
                        type="submit"
                        disabled={isSubmitDisabled}
                        style={{
                            marginTop: '10px',
                            padding: '14px',
                            backgroundColor: isSubmitDisabled ? 'rgba(255,72,72,0.5)' : 'var(--color-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 'bold',
                            cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            transition: 'all 0.2s'
                        }}
                    >
                        {loading ? 'Guardando...' : <><Save size={18} /> {'Guardar Cambios'}</>}
                    </button>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default ProfileModal;
