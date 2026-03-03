import React, { useEffect, useRef, useState } from 'react';
import { X, Save, User, Shield, Camera } from 'lucide-react';
import { userService } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import CustomSelect from './CustomSelect';
import useModalAccessibility from '../hooks/useModalAccessibility';
import Alert from './Alert';
import { resolveAssetUrl } from '../utils/url';

const UserModal = ({ isOpen, onClose, onUserSaved, editData = null, roles = [] }) => {
    const isEdit = Boolean(editData);
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
    const dialogRef = useRef(null);
    const closeButtonRef = useRef(null);
    const labelledBy = 'user-modal-title';
    const describedBy = 'user-modal-description';
    const fieldIds = {
        photo: 'user-photo',
        name: 'user-name',
        email: 'user-email',
        password: 'user-password',
        role: 'user-role',
        status: 'user-status'
    };

    useEffect(() => {
        if (editData) {
            setFormData({
                name: editData.name,
                email: editData.email,
                password: '',
                role_id: editData.role_id,
                status: editData.status
            });
            setPhotoPreview(resolveAssetUrl(editData.photo_path));
            return;
        }

        setFormData({
            name: '',
            email: '',
            password: '',
            role_id: roles.length > 0 ? roles[roles.length - 1].id : '',
            status: 'active'
        });
        setPhoto(null);
        setPhotoPreview(null);
    }, [editData, isOpen, roles]);

    useModalAccessibility({
        isOpen,
        onClose,
        dialogRef,
        initialFocusRef: closeButtonRef
    });

    if (!isOpen) return null;

    const handleSubmit = async (event) => {
        event.preventDefault();
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
            const message = err.response?.data?.message || err.message;
            setError(message);
            showNotification(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handlePhotoChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setPhoto(file);
        const reader = new FileReader();
        reader.onloadend = () => setPhotoPreview(reader.result);
        reader.readAsDataURL(file);
    };

    return (
        <div className="modal-overlay modal-overlay--legacy" onClick={onClose}>
            <div
                ref={dialogRef}
                className="card modal-shell modal-shell--sm legacy-modal modal-shell--animated"
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
                    className="modal-close legacy-modal__close"
                >
                    <X size={24} />
                </button>

                <h2 id={labelledBy} className="legacy-modal__title legacy-modal__title-row">
                    <Shield size={20} className="text-primary" />
                    {isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h2>
                <p id={describedBy} className="text-muted legacy-modal__subtitle">
                    {'Completa los datos del usuario y define su rol dentro del sistema.'}
                </p>

                {error ? <Alert className="legacy-modal__error">{error}</Alert> : null}

                <form onSubmit={handleSubmit} className="legacy-modal-form">
                    <div className="legacy-modal__media">
                        <button
                            type="button"
                            onClick={() => document.getElementById(fieldIds.photo)?.click()}
                            className="legacy-modal__preview-trigger legacy-modal__preview-trigger--avatar"
                        >
                            {photoPreview ? (
                                <img src={photoPreview} alt="Vista previa del usuario" />
                            ) : (
                                <Camera size={24} className="text-muted" />
                            )}
                        </button>
                        <input
                            id={fieldIds.photo}
                            name="photo"
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            aria-label="Subir foto del usuario"
                            className="hidden-file-input"
                        />
                    </div>

                    <div>
                        <label className="form-label" htmlFor={fieldIds.name}>{'NOMBRE COMPLETO'}</label>
                        <input
                            id={fieldIds.name}
                            type="text"
                            name="name"
                            className="form-field"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder={'Ej. Juan Perez'}
                        />
                    </div>

                    <div>
                        <label className="form-label" htmlFor={fieldIds.email}>{'CORREO ELECTRONICO'}</label>
                        <input
                            id={fieldIds.email}
                            type="email"
                            name="email"
                            className="form-field"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="usuario@linher.com"
                        />
                    </div>

                    <div>
                        <label className="form-label" htmlFor={fieldIds.password}>
                            {`CONTRASENA ${isEdit ? '(Dejar en blanco para no cambiar)' : ''}`}
                        </label>
                        <input
                            id={fieldIds.password}
                            type="password"
                            name="password"
                            className="form-field"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="********"
                        />
                    </div>

                    <div className="form-grid form-grid--two">
                        <div>
                            <label className="form-label" htmlFor={fieldIds.role}>{'ROL DEL SISTEMA'}</label>
                            <div className="form-select-container">
                                <CustomSelect
                                    id={fieldIds.role}
                                    name="role_id"
                                    placeholder="Seleccionar rol"
                                    value={formData.role_id}
                                    onChange={(event) => setFormData({ ...formData, role_id: event.target.value })}
                                    options={roles.map((role) => ({ value: role.id, label: role.name.toUpperCase() }))}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="form-label" htmlFor={fieldIds.status}>ESTATUS</label>
                            <div className="form-select-container">
                                <CustomSelect
                                    id={fieldIds.status}
                                    name="status"
                                    value={formData.status}
                                    onChange={(event) => setFormData({ ...formData, status: event.target.value })}
                                    options={[
                                        { value: 'active', label: 'ACTIVO' },
                                        { value: 'inactive', label: 'INACTIVO' }
                                    ]}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="modal-actions modal-actions--split">
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} className="btn btn-primary">
                            <Save size={18} />
                            {loading ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear Usuario')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserModal;
