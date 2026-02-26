import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Shield, Edit2, Trash2, Key, Check, X, Camera } from 'lucide-react';
import { userService } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import ConfirmModal from '../components/ConfirmModal';
import UserModal from '../components/UserModal';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    // Modal state for permissions
    const [selectedUserForPerms, setSelectedUserForPerms] = useState(null);
    const [userIndividualPerms, setUserIndividualPerms] = useState([]);

    const { showNotification } = useNotification();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersData, rolesData, permsData] = await Promise.all([
                userService.list(),
                userService.listRoles(),
                userService.listPermissions()
            ]);
            setUsers(usersData);
            setRoles(rolesData);
            setPermissions(permsData);
        } catch (err) {
            console.error('Error fetching data:', err);
            showNotification('Error al cargar datos de usuarios', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDeleteClick = (user) => {
        setUserToDelete(user);
        setIsConfirmOpen(true);
    };

    const confirmDelete = async () => {
        try {
            await userService.delete(userToDelete.id);
            showNotification('Usuario eliminado exitosamente', 'success');
            fetchData();
        } catch (err) {
            showNotification('Error al eliminar usuario', 'error');
        } finally {
            setIsConfirmOpen(false);
            setUserToDelete(null);
        }
    };

    const handleEditPermissions = async (user) => {
        try {
            const fullUser = await userService.get(user.id);
            setSelectedUserForPerms(fullUser);
            setUserIndividualPerms(fullUser.individual_permissions || []);
        } catch (err) {
            showNotification('Error al cargar permisos', 'error');
        }
    };

    const togglePermission = (slug) => {
        setUserIndividualPerms(prev =>
            prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
        );
    };

    const savePermissions = async () => {
        try {
            await userService.updatePermissions(selectedUserForPerms.id, userIndividualPerms);
            showNotification('Permisos actualizados correctamente', 'success');
            setSelectedUserForPerms(null);
            fetchData();
        } catch (err) {
            showNotification('Error al actualizar permisos', 'error');
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
                <div>
                    <h1 style={{ fontSize: '24px' }}>Gestión de Usuarios</h1>
                    <p className="text-muted">Administra el acceso y permisos granulares del equipo</p>
                </div>
                <button
                    onClick={() => {
                        setEditingUser(null);
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
                    <UserPlus size={18} />
                    Nuevo Usuario
                </button>
            </div>

            {/* Toolbar */}
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                <div style={{ flexGrow: 1, display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: 'var(--color-bg)', padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <Search size={18} className="text-muted" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%' }}
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                            <th style={{ padding: '16px' }}>USUARIO</th>
                            <th style={{ padding: '16px' }}>ROL</th>
                            <th style={{ padding: '16px' }}>ESTATUS</th>
                            <th style={{ padding: '16px' }}>CREADO</th>
                            <th style={{ padding: '16px', textAlign: 'right' }}>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center' }}>Cargando usuarios...</td></tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center' }} className="text-muted">No se encontraron usuarios</td></tr>
                        ) : (
                            filteredUsers.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                {u.photo_path ? (
                                                    <img src={`http://localhost:3000/${u.photo_path}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{u.name.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div>
                                                <p style={{ fontWeight: 'bold', fontSize: '14px' }}>{u.name}</p>
                                                <p className="text-muted" style={{ fontSize: '12px' }}>{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{
                                            fontSize: '11px',
                                            textTransform: 'uppercase',
                                            backgroundColor: 'rgba(255,255,255,0.05)',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            fontWeight: 'bold'
                                        }}>
                                            {u.role_name}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{
                                            fontSize: '11px',
                                            color: u.status === 'active' ? '#28A745' : '#6C757D',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: u.status === 'active' ? '#28A745' : '#6C757D' }} />
                                            {u.status === 'active' ? 'ACTIVO' : 'INACTIVO'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '13px' }} className="text-muted">
                                        {new Date(u.created_at).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                            <button
                                                title="Permisos Especiales"
                                                onClick={() => handleEditPermissions(u)}
                                                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: '5px' }}
                                            >
                                                <Shield size={18} />
                                            </button>
                                            <button
                                                onClick={() => { setEditingUser(u); setIsModalOpen(true); }}
                                                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '5px' }}
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(u)}
                                                style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', padding: '5px' }}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Permissions Modal */}
            {selectedUserForPerms && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h2 style={{ fontSize: '18px' }}>Permisos Especiales</h2>
                                <p className="text-muted" style={{ fontSize: '12px' }}>Usuario: {selectedUserForPerms.name}</p>
                            </div>
                            <X size={20} cursor="pointer" onClick={() => setSelectedUserForPerms(null)} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto', marginBottom: '24px', paddingRight: '10px' }}>
                            {permissions.map(p => {
                                const isFromRole = selectedUserForPerms.role_permissions?.includes(p.slug);
                                const isIndividual = userIndividualPerms.includes(p.slug);
                                const isActive = isFromRole || isIndividual;

                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => !isFromRole && togglePermission(p.slug)}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '12px 16px',
                                            backgroundColor: isFromRole ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
                                            borderRadius: 'var(--radius-md)',
                                            border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                            cursor: isFromRole ? 'not-allowed' : 'pointer',
                                            opacity: isFromRole ? 0.7 : 1,
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <p style={{ fontSize: '14px', fontWeight: 'bold' }}>{p.name}</p>
                                                {isFromRole && (
                                                    <span style={{ fontSize: '9px', backgroundColor: 'var(--color-primary)', color: 'white', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                                                        ROL
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-muted" style={{ fontSize: '11px' }}>{isFromRole ? 'Heredado del rol del sistema' : 'Permiso asignable individualmente'}</p>
                                        </div>
                                        <div style={{
                                            width: '20px', height: '20px', borderRadius: '4px',
                                            border: '1px solid var(--color-border)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            backgroundColor: isActive ? 'var(--color-primary)' : 'transparent'
                                        }}>
                                            {isActive && <Check size={14} color="white" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setSelectedUserForPerms(null)}
                                style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'none', color: 'white', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={savePermissions}
                                style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius-md)', border: 'none', backgroundColor: 'var(--color-primary)', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Guardar Permisos
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmDelete}
                title="Eliminar Usuario"
                message={`¿Estás seguro de que deseas eliminar a ${userToDelete?.name}? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                type="danger"
            />

            <UserModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingUser(null);
                }}
                onUserSaved={fetchData}
                editData={editingUser}
                roles={roles}
            />
        </div>
    );
};

export default Users;
