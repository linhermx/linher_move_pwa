import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, User, Camera, Lock, Mail } from 'lucide-react';
import { userService } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import useModalAccessibility from '../hooks/useModalAccessibility';
import { resolveAssetUrl } from '../utils/url';

const getStoredUser = () => JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user')) || {};

const ProfileModal = ({ isOpen, onClose, onUserUpdated }) => {
    const [user, setUser] = useState(getStoredUser());
    const [formData, setFormData] = useState({
        name: user.name || '',
        password: '',
        confirmPassword: ''
    });
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(resolveAssetUrl(user.photo_path));
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
        ? 'Las contraseñas no coinciden.'
        : passwordIncomplete
            ? 'Completa ambos campos para cambiar la contraseña.'
            : passwordsMatch
                ? 'Las contraseñas coinciden.'
                : '';
    const isSubmitDisabled = loading || passwordMismatch || passwordIncomplete;

    useEffect(() => {
        if (!isOpen) return;

        const currentUser = getStoredUser();
        setUser(currentUser);
        setFormData({
            name: currentUser.name || '',
            password: '',
            confirmPassword: ''
        });
        setPhotoPreview(resolveAssetUrl(currentUser.photo_path));
        setPhoto(null);
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
        if (!file) return;

        setPhoto(file);
        const reader = new FileReader();
        reader.onloadend = () => setPhotoPreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const persistUpdatedUser = (updatedUser) => {
        if (localStorage.getItem('user')) {
            localStorage.setItem('user', JSON.stringify(updatedUser));
        }

        if (sessionStorage.getItem('user')) {
            sessionStorage.setItem('user', JSON.stringify(updatedUser));
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (passwordIncomplete) {
            showNotification('Completa ambos campos para cambiar la contraseña', 'error');
            return;
        }

        if (passwordMismatch) {
            showNotification('Las contraseñas no coinciden', 'error');
            return;
        }

        setLoading(true);
        try {
            const data = new FormData();
            data.append('entity', 'users');
            data.append('name', formData.name);
            if (formData.password) data.append('password', formData.password);
            if (photo) data.append('photo', photo);

            const response = await userService.update(user.id, data);
            const updatedUser = {
                ...user,
                name: formData.name,
                photo_path: response.photo_path || user.photo_path
            };

            persistUpdatedUser(updatedUser);
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
            className="modal-overlay modal-overlay--legacy modal-overlay--priority"
            onClick={onClose}
        >
            <div
                ref={dialogRef}
                className="card modal-shell modal-shell--sm profile-modal modal-shell--animated"
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                aria-describedby={describedBy}
                tabIndex={-1}
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={onClose}
                    className="modal-close profile-modal__close"
                >
                    <X size={24} />
                </button>

                <h2 id={labelledBy} className="profile-modal__title">{'Mi Perfil'}</h2>
                <p id={describedBy} className="text-muted profile-modal__subtitle">
                    {'Actualiza tu nombre, foto y contraseña desde esta ventana.'}
                </p>

                <form onSubmit={handleSubmit} className="legacy-modal-form">
                    <div className="profile-modal__avatar-stack">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="profile-modal__avatar-trigger"
                        >
                            {photoPreview ? (
                                <img src={photoPreview} alt="Vista previa del perfil" />
                            ) : (
                                <User size={40} className="text-muted" />
                            )}
                            <span className="profile-modal__avatar-overlay">
                                <Camera size={14} className="profile-modal__camera" />
                            </span>
                        </button>
                        <input
                            id={fieldIds.photo}
                            ref={fileInputRef}
                            name="photo"
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            aria-label="Subir foto de perfil"
                            className="hidden-file-input"
                        />
                        <span className="profile-modal__hint">{'Haz click para cambiar foto'}</span>
                    </div>

                    <div>
                        <p className="form-label">{'CORREO ELECTRONICO (SOLO LECTURA)'}</p>
                        <div className="form-field-group form-field-group--readonly">
                            <Mail size={16} />
                            <span className="form-field-group__text">{user.email}</span>
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
                                value={formData.name}
                                onChange={handleChange}
                                autoComplete="name"
                                placeholder="Tu nombre"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-grid form-grid--two">
                        <div>
                            <label className="form-label" htmlFor={fieldIds.password}>{'NUEVA CONTRASEÑA'}</label>
                            <div className={`form-field-group ${passwordMismatch ? 'form-field-group--error' : ''}`.trim()}>
                                <Lock size={14} className="text-muted" />
                                <input
                                    id={fieldIds.password}
                                    name="password"
                                    type="password"
                                    className="form-input-clean"
                                    aria-invalid={passwordMismatch}
                                    aria-describedby={hasPasswordAttempt ? passwordFeedbackId : undefined}
                                    value={formData.password}
                                    onChange={handleChange}
                                    autoComplete="new-password"
                                    placeholder="********"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="form-label" htmlFor={fieldIds.confirmPassword}>CONFIRMAR</label>
                            <div className={`form-field-group ${passwordMismatch ? 'form-field-group--error' : ''}`.trim()}>
                                <Lock size={14} className="text-muted" />
                                <input
                                    id={fieldIds.confirmPassword}
                                    name="confirmPassword"
                                    type="password"
                                    className="form-input-clean"
                                    aria-invalid={passwordMismatch}
                                    aria-describedby={hasPasswordAttempt ? passwordFeedbackId : undefined}
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    autoComplete="new-password"
                                    placeholder="********"
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
                        className="btn btn-primary profile-modal__submit"
                    >
                        {loading ? 'Guardando...' : (
                            <>
                                <Save size={18} />
                                {'Guardar Cambios'}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default ProfileModal;
