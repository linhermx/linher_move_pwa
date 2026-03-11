import React, { useEffect, useRef, useState } from 'react';
import { X, Save, Image as ImageIcon } from 'lucide-react';
import { vehicleService } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import CustomSelect from './CustomSelect';
import useModalAccessibility from '../hooks/useModalAccessibility';
import Alert from './Alert';
import { resolveAssetUrl } from '../utils/url';

const VehicleModal = ({ isOpen, onClose, onVehicleCreated, editData = null }) => {
    const isEdit = Boolean(editData);
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
    const dialogRef = useRef(null);
    const closeButtonRef = useRef(null);
    const labelledBy = 'vehicle-modal-title';
    const describedBy = 'vehicle-modal-description';
    const fieldIds = {
        photo: 'vehicle-photo',
        name: 'vehicle-name',
        plate: 'vehicle-plate',
        rendimientoTeorico: 'vehicle-rendimiento-teorico',
        rendimientoReal: 'vehicle-rendimiento-real',
        status: 'vehicle-status'
    };

    useEffect(() => {
        if (editData) {
            setFormData({
                name: editData.name,
                plate: editData.plate,
                rendimiento_teorico: editData.rendimiento_teorico,
                rendimiento_real: editData.rendimiento_real,
                status: editData.status
            });
            setPhotoPreview(resolveAssetUrl(editData.photo_path));
            return;
        }

        setFormData({
            name: '',
            plate: '',
            rendimiento_teorico: '',
            rendimiento_real: '',
            status: 'available'
        });
        setPhoto(null);
        setPhotoPreview(null);
    }, [editData, isOpen]);

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
            if (!formData.name || !formData.plate || !formData.rendimiento_teorico || !formData.rendimiento_real) {
                throw new Error('Todos los campos son obligatorios');
            }

            const formDataToSend = new FormData();
            formDataToSend.append('entity', 'vehicles');
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

                <h2 id={labelledBy} className="legacy-modal__title">
                    {isEdit ? 'Editar vehículo' : 'Nuevo vehículo'}
                </h2>
                <p id={describedBy} className="text-muted legacy-modal__subtitle">
                    Registra la unidad y sus datos operativos para usarla en cotizaciones.
                </p>

                {error ? <Alert className="legacy-modal__error">{error}</Alert> : null}

                <form onSubmit={handleSubmit} className="legacy-modal-form">
                    <div className="legacy-modal__media">
                        <button
                            type="button"
                            onClick={() => document.getElementById(fieldIds.photo)?.click()}
                            className="legacy-modal__preview-trigger"
                        >
                            {photoPreview ? (
                                <img src={photoPreview} alt="Vista previa del vehículo" />
                            ) : (
                                <>
                                    <ImageIcon size={32} className="text-muted" />
                                    <span className="legacy-modal__hint">SUBIR FOTO</span>
                                </>
                            )}
                        </button>
                        <input
                            id={fieldIds.photo}
                            name="photo"
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            aria-label="Subir foto del vehículo"
                            className="hidden-file-input"
                        />
                    </div>

                    <div>
                        <label className="form-label" htmlFor={fieldIds.name}>NOMBRE DEL VEHÍCULO</label>
                        <input
                            id={fieldIds.name}
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Ej. Tracto Volvo 2023"
                            className="form-field"
                            autoComplete="off"
                        />
                    </div>

                    <div>
                        <label className="form-label" htmlFor={fieldIds.plate}>PLACAS</label>
                        <input
                            id={fieldIds.plate}
                            type="text"
                            name="plate"
                            value={formData.plate}
                            onChange={handleChange}
                            placeholder="Ej. ABC-123-D"
                            className="form-field"
                            autoComplete="off"
                        />
                    </div>

                    <div className="form-grid form-grid--two">
                        <div>
                            <label className="form-label" htmlFor={fieldIds.rendimientoTeorico}>REND. TEÓRICO (KM/L)</label>
                            <input
                                id={fieldIds.rendimientoTeorico}
                                type="number"
                                step="0.1"
                                name="rendimiento_teorico"
                                value={formData.rendimiento_teorico}
                                onChange={handleChange}
                                placeholder="1.5"
                                className="form-field"
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <label className="form-label" htmlFor={fieldIds.rendimientoReal}>REND. REAL (KM/L)</label>
                            <input
                                id={fieldIds.rendimientoReal}
                                type="number"
                                step="0.1"
                                name="rendimiento_real"
                                value={formData.rendimiento_real}
                                onChange={handleChange}
                                placeholder="1.2"
                                className="form-field"
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="form-label" htmlFor={fieldIds.status}>ESTATUS INICIAL</label>
                        <div className="form-select-container">
                            <CustomSelect
                                id={fieldIds.status}
                                name="status"
                                value={formData.status}
                                onChange={(event) => setFormData({ ...formData, status: event.target.value })}
                                options={[
                                    { value: 'available', label: 'Disponible' },
                                    { value: 'in_route', label: 'En Ruta' },
                                    { value: 'maintenance', label: 'Mantenimiento' }
                                ]}
                            />
                        </div>
                    </div>

                    <div className="modal-actions modal-actions--split legacy-modal__actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary legacy-modal__action-button">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} className="btn btn-primary legacy-modal__action-button">
                            <Save size={18} />
                            {loading ? 'Guardando...' : (isEdit ? 'Actualizar vehículo' : 'Guardar vehículo')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default VehicleModal;
