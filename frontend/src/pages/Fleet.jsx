import React, { useEffect, useState } from 'react';
import { Truck, Plus, Edit2, Trash2, Search, Gauge } from 'lucide-react';
import { vehicleService } from '../services/api';
import VehicleModal from '../components/VehicleModal';
import ConfirmModal from '../components/ConfirmModal';
import { useNotification } from '../context/NotificationContext';
import CustomMenu from '../components/CustomMenu';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { resolveAssetUrl } from '../utils/url';

const getEfficiency = (vehicle) => {
    if (vehicle.status === 'maintenance') {
        return { label: 'N/A', toneClass: 'tone-muted' };
    }

    if (!vehicle.rendimiento_real || !vehicle.rendimiento_teorico) {
        return { label: 'Sin datos', toneClass: 'tone-muted' };
    }

    const pct = (vehicle.rendimiento_real / vehicle.rendimiento_teorico) * 100;

    if (pct >= 90) return { label: `Optima (${pct.toFixed(0)}%)`, toneClass: 'tone-success' };
    if (pct >= 70) return { label: `Regular (${pct.toFixed(0)}%)`, toneClass: 'tone-warning' };

    return { label: `Critica (${pct.toFixed(0)}%)`, toneClass: 'tone-danger' };
};

const getVehicleStatusBadge = (status) => {
    switch (status) {
        case 'available':
            return { variant: 'success', label: 'Disponible' };
        case 'maintenance':
            return { variant: 'warning', label: 'Mantenimiento' };
        case 'in_route':
            return { variant: 'info', label: 'En Ruta' };
        default:
            return { variant: 'neutral', label: status || 'Sin estatus' };
    }
};

const Fleet = () => {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [vehicleToDelete, setVehicleToDelete] = useState(null);
    const { showNotification } = useNotification();

    const fetchVehicles = async () => {
        setLoading(true);
        try {
            const data = await vehicleService.list();
            setVehicles(data);
        } catch (err) {
            console.error('Error fetching vehicles:', err);
            setVehicles([
                { id: 1, name: 'Tracto Volvo 2023', plate: 'ABC-123', rendimiento_real: 1.8, status: 'available' },
                { id: 2, name: 'Camioneta Toyota', plate: 'XYZ-789', rendimiento_real: 8.5, status: 'in_route' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVehicles();
    }, []);

    const handleVehicleCreated = () => {
        fetchVehicles();
        setEditingVehicle(null);
    };

    const handleDeleteClick = (id) => {
        setVehicleToDelete(id);
        setIsConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!vehicleToDelete) return;

        try {
            await vehicleService.delete(vehicleToDelete);
            fetchVehicles();
            showNotification('Vehículo eliminado exitosamente', 'success');
        } catch (err) {
            console.error('Error deleting vehicle:', err);
            showNotification('No se pudo eliminar el vehículo', 'error');
        } finally {
            setVehicleToDelete(null);
        }
    };

    const filteredVehicles = vehicles.filter((vehicle) =>
        vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-shell fade-in stack-lg">
            <PageHeader
                title="Gestión de Flota"
                subtitle="Administra los vehículos y sus rendimientos."
                actions={(
                    <button
                        onClick={() => {
                            setEditingVehicle(null);
                            setIsModalOpen(true);
                        }}
                        className="btn btn-primary"
                    >
                        <Plus size={18} />
                        Nuevo Vehículo
                    </button>
                )}
            />

            <VehicleModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingVehicle(null);
                }}
                onVehicleCreated={handleVehicleCreated}
                editData={editingVehicle}
            />

            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmDelete}
                title="Eliminar Vehículo"
                message="¿Estás seguro de que deseas eliminar este vehículo? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                type="danger"
            />

            <div className="form-field-group fleet-search">
                <label className="sr-only" htmlFor="fleet-search">Buscar vehículos</label>
                <Search size={18} className="text-muted" />
                <input
                    id="fleet-search"
                    name="fleet_search"
                    type="text"
                    placeholder="Buscar vehículos por nombre o placas..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    autoComplete="off"
                />
            </div>

            {loading ? (
                <div className="resource-card__empty text-muted">{'Cargando flota...'}</div>
            ) : filteredVehicles.length === 0 ? (
                <div className="resource-card__empty text-muted">No se encontraron vehículos.</div>
            ) : (
                <div className="resource-cards-grid">
                    {filteredVehicles.map((vehicle) => {
                        const efficiency = getEfficiency(vehicle);
                        const statusBadge = getVehicleStatusBadge(vehicle.status);

                        return (
                            <div key={vehicle.id} className="card resource-card">
                                <div className="resource-card__header">
                                    <div className="resource-card__media">
                                        {vehicle.photo_path ? (
                                            <img
                                                src={resolveAssetUrl(vehicle.photo_path)}
                                                alt={vehicle.name}
                                            />
                                        ) : (
                                            <Truck size={24} />
                                        )}
                                    </div>
                                    <CustomMenu
                                        options={[
                                            {
                                                label: 'Editar',
                                                icon: <Edit2 />,
                                                onClick: () => {
                                                    setEditingVehicle(vehicle);
                                                    setIsModalOpen(true);
                                                }
                                            },
                                            {
                                                label: 'Eliminar',
                                                icon: <Trash2 />,
                                                variant: 'danger',
                                                onClick: () => handleDeleteClick(vehicle.id)
                                            }
                                        ]}
                                    />
                                </div>

                                <h3 className="resource-card__title">{vehicle.name}</h3>
                                <p className="resource-card__subtitle">
                                    {'Placas: '}<strong>{vehicle.plate}</strong>
                                </p>

                                <div className="resource-card__metrics">
                                    <div className="resource-card__metric">
                                        <span className="form-label">{'RENDIMIENTO REAL'}</span>
                                        <div className="resource-card__metric-value">
                                            <Gauge size={14} />
                                            <span>{vehicle.rendimiento_real} km/L</span>
                                        </div>
                                    </div>
                                    <div className="resource-card__metric">
                                        <span className="form-label">EFICIENCIA</span>
                                        <div className={`resource-card__metric-value ${efficiency.toneClass}`.trim()}>
                                            <Gauge size={14} />
                                            <span>{efficiency.label}</span>
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
                    })}
                </div>
            )}
        </div>
    );
};

export default Fleet;
