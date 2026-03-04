import React, { useEffect, useState } from 'react';
import { Check, Edit2, Search, Shield, Trash2, UserPlus, X } from 'lucide-react';
import { userService } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import ConfirmModal from '../components/ConfirmModal';
import UserModal from '../components/UserModal';
import CustomMenu from '../components/CustomMenu';
import Pagination from '../components/Pagination';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import TableScrollFade from '../components/TableScrollFade';
import { resolveAssetUrl } from '../utils/url';
import ModalShell from '../components/ModalShell';
import { formatDate } from '../utils/formatters';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, pages: 1, total: 0, limit: 10 });
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [selectedUserForPerms, setSelectedUserForPerms] = useState(null);
    const [userIndividualPerms, setUserIndividualPerms] = useState([]);
    const { showNotification } = useNotification();

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = { limit, offset };
            if (search) {
                params.search = search;
            }

            const [usersResponse, rolesData, permissionsData] = await Promise.all([
                userService.list(params),
                userService.listRoles(),
                userService.listPermissions()
            ]);

            setUsers(usersResponse.data || []);
            setPagination(usersResponse.pagination || { current_page: 1, pages: 1, total: 0, limit });
            setRoles(rolesData);
            setPermissions(permissionsData);
        } catch {
            showNotification('Error al cargar datos de usuarios', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(fetchData, 250);
        return () => clearTimeout(timer);
    }, [limit, offset, search]);

    const confirmDelete = async () => {
        try {
            await userService.delete(userToDelete.id);
            showNotification('Usuario eliminado exitosamente', 'success');
            await fetchData();
        } catch {
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
        } catch {
            showNotification('Error al cargar permisos', 'error');
        }
    };

    const togglePermission = (slug) => {
        setUserIndividualPerms((currentPermissions) => (
            currentPermissions.includes(slug)
                ? currentPermissions.filter((currentSlug) => currentSlug !== slug)
                : [...currentPermissions, slug]
        ));
    };

    const savePermissions = async () => {
        try {
            await userService.updatePermissions(selectedUserForPerms.id, userIndividualPerms);
            showNotification('Permisos actualizados correctamente', 'success');
            setSelectedUserForPerms(null);
            await fetchData();
        } catch {
            showNotification('Error al actualizar permisos', 'error');
        }
    };

    return (
        <div className="page-shell stack-lg">
            <PageHeader
                title="Gestión de usuarios"
                subtitle="Administra acceso, roles y permisos especiales del equipo."
                actions={(
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                            setEditingUser(null);
                            setIsModalOpen(true);
                        }}
                    >
                        <UserPlus size={18} />
                        Nuevo usuario
                    </button>
                )}
            />

            <section className="form-field-group" aria-label="Búsqueda de usuarios">
                <label className="sr-only" htmlFor="users-search">Buscar usuarios</label>
                <Search size={18} className="text-muted" />
                <input
                    id="users-search"
                    name="users_search"
                    type="text"
                    value={search}
                    placeholder="Buscar por nombre o email..."
                    onChange={(event) => setSearch(event.target.value)}
                    autoComplete="off"
                />
            </section>

            <section className="card card--flush table-shell" aria-labelledby="users-table-title">
                <div className="card-header">
                    <div>
                        <div className="card-header__title" id="users-table-title">
                            <Shield size={18} className="text-primary" />
                            <span>Usuarios registrados</span>
                        </div>
                        <p className="card-header__subtitle">{pagination.total} registros encontrados.</p>
                    </div>
                </div>

                <TableScrollFade>
                    <table className="table table--users">
                        <caption className="sr-only">Tabla de usuarios</caption>
                        <thead>
                            <tr>
                                <th scope="col">USUARIO</th>
                                <th scope="col">ROL</th>
                                <th scope="col">ESTATUS</th>
                                <th scope="col">CREADO</th>
                                <th scope="col" align="right">ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="table__empty">Cargando usuarios...</td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="table__empty">No se encontraron usuarios.</td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id}>
                                        <td>
                                            <div className="table__entity">
                                                <span className="table__entity-media">
                                                    {user.photo_path ? (
                                                        <img src={resolveAssetUrl(user.photo_path)} alt={user.name} />
                                                    ) : (
                                                        <strong>{user.name.charAt(0)}</strong>
                                                    )}
                                                </span>
                                                <div>
                                                    <p className="table__entity-title">{user.name}</p>
                                                    <p className="table__entity-subtitle">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <StatusBadge variant="neutral">{user.role_name}</StatusBadge>
                                        </td>
                                        <td>
                                            <StatusBadge variant={user.status === 'active' ? 'success' : 'warning'} showDot>
                                                {user.status === 'active' ? 'Activo' : 'Inactivo'}
                                            </StatusBadge>
                                        </td>
                                        <td>{formatDate(user.created_at)}</td>
                                        <td className="table__cell--actions">
                                            <CustomMenu
                                                options={[
                                                    {
                                                        label: 'Permisos',
                                                        icon: <Shield />,
                                                        onClick: () => handleEditPermissions(user)
                                                    },
                                                    {
                                                        label: 'Editar usuario',
                                                        icon: <Edit2 />,
                                                        onClick: () => {
                                                            setEditingUser(user);
                                                            setIsModalOpen(true);
                                                        }
                                                    },
                                                    {
                                                        label: 'Eliminar',
                                                        icon: <Trash2 />,
                                                        variant: 'danger',
                                                        onClick: () => {
                                                            setUserToDelete(user);
                                                            setIsConfirmOpen(true);
                                                        }
                                                    }
                                                ]}
                                            />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </TableScrollFade>

                <Pagination
                    pagination={pagination}
                    onPageChange={(newPage) => setOffset((newPage - 1) * limit)}
                    onLimitChange={(newLimit) => {
                        setLimit(newLimit);
                        setOffset(0);
                    }}
                />
            </section>

            <ModalShell
                isOpen={Boolean(selectedUserForPerms)}
                onClose={() => setSelectedUserForPerms(null)}
                title="Permisos especiales"
                subtitle={selectedUserForPerms ? `Usuario: ${selectedUserForPerms.name}` : ''}
                size="md"
                labelledBy="user-permissions-title"
                describedBy="user-permissions-description"
                footer={(
                    <>
                        <button type="button" className="btn btn-secondary" onClick={() => setSelectedUserForPerms(null)}>
                            Cancelar
                        </button>
                        <button type="button" className="btn btn-primary" onClick={savePermissions}>
                            Guardar permisos
                        </button>
                    </>
                )}
            >
                <div className="stack-sm custom-scrollbar">
                    {permissions.map((permission) => {
                        const isFromRole = selectedUserForPerms?.role_permissions?.includes(permission.slug);
                        const isIndividual = userIndividualPerms.includes(permission.slug);
                        const isActive = isFromRole || isIndividual;

                        return (
                            <button
                                key={permission.id}
                                type="button"
                                className="card card--tight"
                                onClick={() => !isFromRole && togglePermission(permission.slug)}
                                disabled={isFromRole}
                            >
                                <div className="cluster-md justify-between">
                                    <div className="stack-xs">
                                        <div className="cluster-sm">
                                            <strong>{permission.name}</strong>
                                            {isFromRole ? <StatusBadge variant="info">Rol</StatusBadge> : null}
                                        </div>
                                        <span className="text-muted">
                                            {isFromRole ? 'Heredado del rol del sistema' : 'Permiso asignable individualmente'}
                                        </span>
                                    </div>
                                    <StatusBadge variant={isActive ? 'success' : 'neutral'}>
                                        {isActive ? <Check size={14} /> : <X size={14} />}
                                    </StatusBadge>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </ModalShell>

            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmDelete}
                title="Eliminar usuario"
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
