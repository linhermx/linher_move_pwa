import React, { useEffect, useRef, useState } from 'react';
import { X, Save } from 'lucide-react';
import { serviceService } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import CustomSelect from './CustomSelect';
import useModalAccessibility from '../hooks/useModalAccessibility';
import Alert from './Alert';

const ServiceModal = ({ isOpen, onClose, onServiceSaved, editData = null }) => {
    const isEdit = Boolean(editData);
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
    const dialogRef = useRef(null);
    const closeButtonRef = useRef(null);
    const labelledBy = 'service-modal-title';
    const describedBy = 'service-modal-description';
    const fieldIds = {
        name: 'service-name',
        cost: 'service-cost',
        timeMinutes: 'service-time-minutes',
        description: 'service-description',
        status: 'service-status'
    };

    useEffect(() => {
        if (editData) {
            setFormData({
                name: editData.name,
                cost: editData.cost,
                time_minutes: editData.time_minutes,
                description: editData.description || '',
                status: editData.status
            });
            return;
        }

        setFormData({
            name: '',
            cost: '',
            time_minutes: '',
            description: '',
            status: 'active'
        });
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
                <button ref={closeButtonRef} type="button" onClick={onClose} className="modal-close legacy-modal__close">
                    <X size={24} />
                </button>

                <h2 id={labelledBy} className="legacy-modal__title">
                    {isEdit ? 'Editar servicio' : 'Nuevo servicio'}
                </h2>
                <p id={describedBy} className="text-muted legacy-modal__subtitle">
                    Define el servicio, su costo y el tiempo operativo asociado.
                </p>

                {error ? <Alert className="legacy-modal__error">{error}</Alert> : null}

                <form onSubmit={handleSubmit} className="legacy-modal-form">
                    <div>
                        <label className="form-label" htmlFor={fieldIds.name}>NOMBRE DEL SERVICIO</label>
                        <input
                            id={fieldIds.name}
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Ej. Maniobra especial"
                            className="form-field"
                            autoComplete="off"
                        />
                    </div>

                    <div className="form-grid form-grid--two">
                        <div>
                            <label className="form-label" htmlFor={fieldIds.cost}>COSTO ($)</label>
                            <input
                                id={fieldIds.cost}
                                type="number"
                                step="0.01"
                                name="cost"
                                value={formData.cost}
                                onChange={handleChange}
                                placeholder="0.00"
                                className="form-field"
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <label className="form-label" htmlFor={fieldIds.timeMinutes}>TIEMPO (MIN)</label>
                            <input
                                id={fieldIds.timeMinutes}
                                type="number"
                                name="time_minutes"
                                value={formData.time_minutes}
                                onChange={handleChange}
                                placeholder="0"
                                className="form-field"
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="form-label" htmlFor={fieldIds.description}>DESCRIPCIÓN (OPCIONAL)</label>
                        <textarea
                            id={fieldIds.description}
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="3"
                            className="form-field resize-none"
                            autoComplete="off"
                        />
                    </div>

                    <div>
                        <label className="form-label" htmlFor={fieldIds.status}>ESTADO</label>
                        <div className="form-select-container">
                            <CustomSelect
                                id={fieldIds.status}
                                name="status"
                                value={formData.status}
                                onChange={(event) => setFormData({ ...formData, status: event.target.value })}
                                options={[
                                    { value: 'active', label: 'Activo' },
                                    { value: 'inactive', label: 'Inactivo' }
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
                            {loading ? 'Guardando...' : (isEdit ? 'Actualizar servicio' : 'Guardar servicio')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ServiceModal;
