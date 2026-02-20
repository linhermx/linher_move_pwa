import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Truck, Plus, MoreVertical } from 'lucide-react';
import { vehicleService } from '../services/api';

const Fleet = () => {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVehicles = async () => {
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
        fetchVehicles();
    }, []);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
                <div>
                    <h1 style={{ fontSize: '24px' }}>Gestión de Flota</h1>
                    <p className="text-muted">Administra los vehículos y sus rendimientos</p>
                </div>
                <button style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                }}>
                    <Plus size={18} />
                    Nuevo Vehículo
                </button>
            </div>

            {loading ? (
                <p>Cargando flota...</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-md)' }}>
                    {vehicles.map(v => (
                        <div key={v.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ backgroundColor: 'rgba(255, 72, 72, 0.1)', padding: '10px', borderRadius: 'var(--radius-md)', color: 'var(--color-primary)' }}>
                                        <Truck size={24} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '16px' }}>{v.name}</h3>
                                        <p className="text-muted" style={{ fontSize: '12px' }}>Placas: {v.plate}</p>
                                    </div>
                                </div>
                                <MoreVertical size={18} className="text-muted" cursor="pointer" />
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
