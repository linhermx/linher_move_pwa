import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreHorizontal, MoreVertical, Edit2, Trash2, Clock, DollarSign } from 'lucide-react';
import { serviceService } from '../services/api';
import ServiceModal from '../components/ServiceModal';
import ConfirmModal from '../components/ConfirmModal';
import StatusView from '../components/StatusView';
import { useNotification } from '../context/NotificationContext';

const Services = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState(null);
    const [activeMenu, setActiveMenu] = useState(null);
    const { showNotification } = useNotification();

    const fetchServices = async () => {
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
    };

    useEffect(() => {
        fetchServices();
    }, []);

    const handleDelete = async () => {
        try {
            await serviceService.delete(serviceToDelete);
            showNotification('Servicio eliminado', 'success');
            fetchServices();
        } catch (err) {
            showNotification('Error al eliminar servicio', 'error');
        } finally {
            setIsConfirmOpen(false);
            setServiceToDelete(null);
        }
    };

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
                <div>
                    <h1 style={{ fontSize: '24px' }}>Servicios</h1>
                    <p className="text-muted">Gestiona los servicios adicionales y maniobras</p>
                </div>
                <button
                    onClick={() => { setEditingService(null); setIsModalOpen(true); }}
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
                    Nuevo Servicio
                </button>
            </div>

            <div className="card" style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px' }}>
                <Search size={20} className="text-muted" />
                <input
                    type="text"
                    placeholder="Buscar servicios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ background: 'none', border: 'none', color: 'white', outline: 'none', width: '100%', fontSize: '16px' }}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-lg)' }}>
                {loading ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px' }} className="text-muted">Cargando servicios...</div>
                ) : filteredServices.length === 0 ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px' }} className="text-muted">No se encontraron servicios.</div>
                ) : (
                    filteredServices.map(service => (
                        <div key={service.id} className="card" style={{ position: 'relative', overflow: 'visible' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '10px',
                                    backgroundColor: 'rgba(255, 72, 72, 0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--color-primary)'
                                }}>
                                    <Clock size={24} />
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => setActiveMenu(activeMenu === service.id ? null : service.id)}
                                        style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px' }}
                                    >
                                        <MoreVertical size={20} />
                                    </button>
                                    {activeMenu === service.id && (
                                        <div style={{
                                            position: 'absolute', top: '100%', right: 0,
                                            backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius-md)', zIndex: 10, minWidth: '150px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)', overflow: 'hidden'
                                        }}>
                                            <button
                                                onClick={() => { setEditingService(service); setIsModalOpen(true); setActiveMenu(null); }}
                                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'none', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left' }}
                                            >
                                                <Edit2 size={16} /> Editar
                                            </button>
                                            <button
                                                onClick={() => { setServiceToDelete(service.id); setIsConfirmOpen(true); setActiveMenu(null); }}
                                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', textAlign: 'left' }}
                                            >
                                                <Trash2 size={16} /> Eliminar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>{service.name}</h3>
                            <p className="text-muted" style={{ fontSize: '13px', marginBottom: 'var(--spacing-md)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {service.description || 'Sin descripción'}
                            </p>

                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-md)' }}>
                                <div style={{ flex: 1 }}>
                                    <span className="text-muted" style={{ fontSize: '10px', display: 'block' }}>COSTO SUGERIDO</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                                        <DollarSign size={14} />
                                        <span>{Number(service.cost).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <span className="text-muted" style={{ fontSize: '10px', display: 'block' }}>TIEMPO ESTIMADO</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                                        <Clock size={14} />
                                        <span>{service.time_minutes} min</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                marginTop: '12px', fontSize: '11px',
                                display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
                                backgroundColor: service.status === 'active' ? 'rgba(40, 167, 69, 0.1)' : 'rgba(255, 72, 72, 0.1)',
                                color: service.status === 'active' ? '#28A745' : 'var(--color-primary)'
                            }}>
                                {service.status === 'active' ? '● Activo' : '● Inactivo'}
                            </div>
                        </div>
                    ))
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
                title="Eliminar Servicio"
                message="¿Estás seguro de que deseas eliminar este servicio? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                type="danger"
            />
        </div>
    );
};

export default Services;
