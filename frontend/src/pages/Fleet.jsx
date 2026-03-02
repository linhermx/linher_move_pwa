import React, { useState, useEffect } from 'react';
import { Truck, Plus, Edit2, Trash2, Search, Gauge } from 'lucide-react';
import { vehicleService } from '../services/api';
import VehicleModal from '../components/VehicleModal';
import ConfirmModal from '../components/ConfirmModal';
import StatusView from '../components/StatusView';
import { useNotification } from '../context/NotificationContext';
import CustomMenu from '../components/CustomMenu';
import PageHeader from '../components/PageHeader';

const getEfficiency = (vehicle) => {
    if (vehicle.status === 'maintenance') {
        return { label: 'N/A', color: 'var(--color-text-muted)', pct: null };
    }
    if (!vehicle.rendimiento_real || !vehicle.rendimiento_teorico) {
        return { label: 'Sin datos', color: 'var(--color-text-muted)', pct: null };
    }
    const pct = (vehicle.rendimiento_real / vehicle.rendimiento_teorico) * 100;
    if (pct >= 90) return { label: `Óptima (${pct.toFixed(0)}%)`, color: '#28A745', pct };
    if (pct >= 70) return { label: `Regular (${pct.toFixed(0)}%)`, color: '#FFC107', pct };
    return { label: `Crítica (${pct.toFixed(0)}%)`, color: '#DC3545', pct };
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
            // Fallback to mock if API fails
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

    const handleEdit = (vehicle) => {
        setEditingVehicle(vehicle);
        setIsModalOpen(true);
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
    }; const filteredVehicles = vehicles.filter(v =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.plate.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return (
        <div className="page-shell fade-in">
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

            <div className="form-field-group" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label className="sr-only" htmlFor="fleet-search">Buscar vehículos</label>
                <Search size={18} className="text-muted" />
                <input
                    id="fleet-search"
                    name="fleet_search"
                    type="text"
                    placeholder="Buscar vehículos por nombre o placas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }} className="text-muted">Cargando flota...</div>
            ) : filteredVehicles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }} className="text-muted">No se encontraron vehículos.</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-lg)' }}>
                    {filteredVehicles.map(v => (
                        <div key={v.id} className="card" style={{ position: 'relative', overflow: 'visible' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '10px',
                                    backgroundColor: 'rgba(255, 72, 72, 0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--color-primary)',
                                    overflow: 'hidden'
                                }}>
                                    {v.photo_path ? (
                                        <img
                                            src={`http://localhost:3000/${v.photo_path}`}
                                            alt={v.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
                                            onClick: () => handleEdit(v)
                                        },
                                        {
                                            label: 'Eliminar',
                                            icon: <Trash2 />,
                                            variant: 'danger',
                                            onClick: () => handleDeleteClick(v.id)
                                        }
                                    ]}
                                />
                            </div>

                            <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>{v.name}</h3>
                            <p className="text-muted" style={{ fontSize: '13px', marginBottom: 'var(--spacing-md)' }}>
                                Placas: <strong>{v.plate}</strong>
                            </p>

                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-md)' }}>
                                <div style={{ flex: 1 }}>
                                    <span className="form-label">RENDIMIENTO REAL</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                                        <Gauge size={14} />
                                        <span>{v.rendimiento_real} km/L</span>
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <span className="form-label">EFICIENCIA</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                                        <Gauge size={14} style={{ color: getEfficiency(v).color }} />
                                        <span style={{ color: getEfficiency(v).color, fontSize: '12px' }}>
                                            {getEfficiency(v).label}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                marginTop: '12px', fontSize: '11px',
                                display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
                                backgroundColor: v.status === 'available'
                                    ? 'rgba(40, 167, 69, 0.1)'
                                    : v.status === 'maintenance'
                                        ? 'rgba(255, 193, 7, 0.1)'
                                        : 'rgba(0, 123, 255, 0.1)',
                                color: v.status === 'available'
                                    ? '#28A745'
                                    : v.status === 'maintenance'
                                        ? '#FFC107'
                                        : '#007BFF'
                            }}>
                                {v.status === 'available' ? '● Disponible' : v.status === 'maintenance' ? '● Mantenimiento' : '● En Ruta'}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Fleet;
