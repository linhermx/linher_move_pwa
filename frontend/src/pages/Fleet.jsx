import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Truck, Plus, MoreVertical } from 'lucide-react';
import { vehicleService } from '../services/api';
import VehicleModal from '../components/VehicleModal';
import ConfirmModal from '../components/ConfirmModal';
import { useNotification } from '../context/NotificationContext';

const Fleet = () => {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState(null);
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
        setActiveMenu(null);
    };

    const handleDeleteClick = (id) => {
        setVehicleToDelete(id);
        setIsConfirmOpen(true);
        setActiveMenu(null);
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

    const toggleMenu = (e, id) => {
        e.stopPropagation();
        setActiveMenu(activeMenu === id ? null : id);
    };

    // Close menu when clicking outside
    useEffect(() => {
        const closeMenu = () => setActiveMenu(null);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
                <div>
                    <h1 style={{ fontSize: '24px' }}>Gestión de Flota</h1>
                    <p className="text-muted">Administra los vehículos y sus rendimientos</p>
                </div>
                <button
                    onClick={() => {
                        setEditingVehicle(null);
                        setIsModalOpen(true);
                    }}
                    style={{
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer'
                    }}
                >
                    <Plus size={18} />
                    Nuevo Vehículo
                </button>
            </div>

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

            {loading ? (
                <p>Cargando flota...</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-md)' }}>
                    {vehicles.map(v => (
                        <div key={v.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '44px',
                                        height: '44px',
                                        backgroundColor: 'rgba(255, 72, 72, 0.1)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--color-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
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
                                    <div>
                                        <h3 style={{ fontSize: '16px' }}>{v.name}</h3>
                                        <p className="text-muted" style={{ fontSize: '12px' }}>Placas: {v.plate}</p>
                                    </div>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <div
                                        onClick={(e) => toggleMenu(e, v.id)}
                                        style={{ cursor: 'pointer', padding: '4px', borderRadius: '4px', backgroundColor: activeMenu === v.id ? 'rgba(255, 255, 255, 0.05)' : 'transparent' }}
                                    >
                                        <MoreVertical size={18} className="text-muted" />
                                    </div>

                                    {activeMenu === v.id && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            right: 0,
                                            backgroundColor: 'var(--color-surface)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius-sm)',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                            zIndex: 100,
                                            minWidth: '120px',
                                            padding: '4px 0',
                                            animation: 'fade-in 0.2s ease-out'
                                        }}>
                                            <div
                                                onClick={() => handleEdit(v)}
                                                style={{ padding: '8px 16px', fontSize: '12px', cursor: 'pointer', hover: { backgroundColor: 'rgba(255,255,255,0.05)' } }}
                                                className="menu-item"
                                            >
                                                Editar
                                            </div>
                                            <div
                                                onClick={() => handleDeleteClick(v.id)}
                                                style={{ padding: '8px 16px', fontSize: '12px', cursor: 'pointer', color: 'var(--color-primary)' }}
                                                className="menu-item"
                                            >
                                                Eliminar
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '20px', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-md)' }}>
                                <div>
                                    <p className="text-muted" style={{ fontSize: '10px' }}>RENDIMIENTO REAL</p>
                                    <p style={{ fontWeight: 'bold' }}>{v.rendimiento_real} km/L</p>
                                </div>
                                <div>
                                    <p className="text-muted" style={{ fontSize: '10px' }}>ESTATUS</p>
                                    <span style={{
                                        fontSize: '10px',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        backgroundColor: v.status === 'available' ? 'rgba(40, 167, 69, 0.1)' : 'rgba(0, 123, 255, 0.1)',
                                        color: v.status === 'available' ? '#28A745' : '#007BFF'
                                    }}>
                                        {v.status === 'available' ? 'Disponible' : 'En Ruta'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Fleet;
