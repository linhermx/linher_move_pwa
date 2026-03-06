import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Clock, DollarSign } from 'lucide-react';
import { serviceService } from '../services/api';
import ServiceModal from '../components/ServiceModal';
import ConfirmModal from '../components/ConfirmModal';
import { useNotification } from '../context/NotificationContext';
import CustomMenu from '../components/CustomMenu';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';

const getServiceStatusBadge = (status) => {
    switch (status) {
        case 'active':
            return { variant: 'success', label: 'Activo' };
        case 'inactive':
            return { variant: 'neutral', label: 'Inactivo' };
        default:
            return { variant: 'neutral', label: status || 'Sin estatus' };
    }
};

const Services = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState(null);
    const { showNotification } = useNotification();

    const fetchServices = useCallback(async () => {
        setLoading(true);
        try {
            const data = await serviceService.list();
            setServices(data);
        } catch (err) {
            console.error('Error fetching services:', err);
            showNotification('Error al cargar servicios', 'error');
        } finally {
            setLoading(false);
        }
    }, [showNotification]);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const handleDelete = async () => {
        try {
            await serviceService.delete(serviceToDelete);
            showNotification('Servicio eliminado', 'success');
            fetchServices();
        } catch {
            showNotification('Error al eliminar servicio', 'error');
        } finally {
            setIsConfirmOpen(false);
            setServiceToDelete(null);
        }
    };

    const filteredServices = services.filter((service) =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-shell fade-in stack-lg">
            <PageHeader
                title="Servicios"
                subtitle={'Gestiona los servicios adicionales y maniobras.'}
                actions={(
                    <button
                        onClick={() => {
                            setEditingService(null);
                            setIsModalOpen(true);
                        }}
                        className="btn btn-primary"
                    >
                        <Plus size={18} />
                        {'Nuevo Servicio'}
                    </button>
                )}
            />

            <div className="form-field-group services-search">
                <label className="sr-only" htmlFor="services-search">{'Buscar servicios'}</label>
                <Search size={18} className="text-muted" />
                <input
                    id="services-search"
                    name="services_search"
                    type="text"
                    placeholder={'Buscar servicios...'}
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    autoComplete="off"
                />
            </div>

            <div className="resource-cards-grid">
                {loading ? (
                    <div className="resource-card__empty text-muted">{'Cargando servicios...'}</div>
                ) : filteredServices.length === 0 ? (
                    <div className="resource-card__empty text-muted">{'No se encontraron servicios.'}</div>
                ) : (
                    filteredServices.map((service) => {
                        const statusBadge = getServiceStatusBadge(service.status);

                        return (
                            <div key={service.id} className="card resource-card">
                                <div className="resource-card__header">
                                    <div className="resource-card__media">
                                        <Clock size={24} />
                                    </div>
                                    <CustomMenu
                                        options={[
                                            {
                                                label: 'Editar',
                                                icon: <Edit2 />,
                                                onClick: () => {
                                                    setEditingService(service);
                                                    setIsModalOpen(true);
                                                }
                                            },
                                            {
                                                label: 'Eliminar',
                                                icon: <Trash2 />,
                                                variant: 'danger',
                                                onClick: () => {
                                                    setServiceToDelete(service.id);
                                                    setIsConfirmOpen(true);
                                                }
                                            }
                                        ]}
                                    />
                                </div>

                                <h3 className="resource-card__title">{service.name}</h3>
                                <p className="resource-card__description">
                                    {service.description || 'Sin descripcion'}
                                </p>

                                <div className="resource-card__metrics">
                                    <div className="resource-card__metric">
                                        <span className="form-label">{'COSTO SUGERIDO'}</span>
                                        <div className="resource-card__metric-value">
                                            <DollarSign size={14} />
                                            <span>{Number(service.cost).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="resource-card__metric">
                                        <span className="form-label">{'TIEMPO ESTIMADO'}</span>
                                        <div className="resource-card__metric-value">
                                            <Clock size={14} />
                                            <span>{service.time_minutes} min</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="resource-card__status">
                                    <StatusBadge variant={statusBadge.variant} showDot>
                                        {statusBadge.label}
                                    </StatusBadge>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <ServiceModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onServiceSaved={fetchServices}
                editData={editingService}
            />

            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleDelete}
                title={'Eliminar Servicio'}
                message="¿Estás seguro de que deseas eliminar este servicio? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                type="danger"
            />
        </div>
    );
};

export default Services;
