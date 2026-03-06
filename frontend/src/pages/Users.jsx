import React, { useCallback, useEffect, useState } from 'react';
import { Check, Edit2, Filter, Search, Shield, Trash2, UserMinus, UserPlus, X } from 'lucide-react';
import { userService } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import ConfirmModal from '../components/ConfirmModal';
import UserModal from '../components/UserModal';
import CustomMenu from '../components/CustomMenu';
import CustomSelect from '../components/CustomSelect';
import Pagination from '../components/Pagination';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import TableScrollFade from '../components/TableScrollFade';
import { resolveAssetUrl } from '../utils/url';
import ModalShell from '../components/ModalShell';
import { formatDate } from '../utils/formatters';

const NON_DELEGABLE_PERMISSIONS = new Set(['manage_users', 'manage_backups']);
const USER_STATUS_FILTERS = [
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
    { value: 'all', label: 'Todos' }
];

const Users = () => {
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, pages: 1, total: 0, limit: 10 });
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');
    const [limit, setLimit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [selectedUserForPerms, setSelectedUserForPerms] = useState(null);
    const [userIndividualPerms, setUserIndividualPerms] = useState([]);
    const [isOffboardOpen, setIsOffboardOpen] = useState(false);
    const [offboardTargetUser, setOffboardTargetUser] = useState(null);
    const [offboardReplacementId, setOffboardReplacementId] = useState('');
    const [offboardReason, setOffboardReason] = useState('');
    const [offboardCandidates, setOffboardCandidates] = useState([]);
    const [offboardLoading, setOffboardLoading] = useState(false);
    const { showNotification } = useNotification();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = { limit, offset };
            if (search) {
                params.search = search;
            }
            if (statusFilter !== 'all') {
                params.status = statusFilter;
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
        } catch (error) {
            showNotification(error.response?.data?.message || 'Error al cargar datos de usuarios', 'error');
        } finally {
            setLoading(false);
        }
    }, [limit, offset, search, showNotification, statusFilter]);

    useEffect(() => {
        const timer = setTimeout(fetchData, 250);
        return () => clearTimeout(timer);
    }, [fetchData]);

    const confirmDelete = async () => {
        try {
            await userService.delete(userToDelete.id);
            showNotification('Usuario eliminado exitosamente', 'success');
            await fetchData();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Error al eliminar usuario', 'error');
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
            const result = await userService.updatePermissions(selectedUserForPerms.id, userIndividualPerms);
            const ignoredPermissions = result?.ignored_permissions || [];

            if (ignoredPermissions.length > 0) {
                showNotification('Se guardaron permisos, pero algunos están bloqueados para este rol.', 'warning');
            } else {
                showNotification('Permisos actualizados correctamente', 'success');
            }
            setSelectedUserForPerms(null);
            await fetchData();
        } catch {
            showNotification('Error al actualizar permisos', 'error');
        }
    };

    const openOffboardModal = async (user) => {
        setOffboardTargetUser(user);
        setOffboardReplacementId('');
        setOffboardReason('');
        setOffboardCandidates([]);
        setOffboardLoading(true);
        setIsOffboardOpen(true);

        try {
            const response = await userService.list({
                limit: 500,
                offset: 0,
                status: 'active'
            });
            const candidates = (response.data || []).filter((candidate) => candidate.id !== user.id);
            setOffboardCandidates(candidates);
        } catch (error) {
            showNotification(error.response?.data?.message || 'No se pudo cargar la lista de reemplazo.', 'error');
        } finally {
            setOffboardLoading(false);
        }
    };

    const closeOffboardModal = () => {
        setIsOffboardOpen(false);
        setOffboardTargetUser(null);
        setOffboardReplacementId('');
        setOffboardReason('');
        setOffboardCandidates([]);
        setOffboardLoading(false);
    };

    const submitOffboard = async () => {
        if (!offboardTargetUser) {
            return;
        }

        if (!offboardReplacementId) {
            showNotification('Selecciona un usuario de reemplazo.', 'warning');
            return;
        }

        setOffboardLoading(true);
        try {
            const response = await userService.offboard(offboardTargetUser.id, {
                replacement_user_id: Number(offboardReplacementId),
                reason: offboardReason.trim()
            });
            const reassignedQuotes = Number(response.reassigned_quotes || 0);
            showNotification(`Baja aplicada. ${reassignedQuotes} cotizaciones activas reasignadas.`, 'success');
            closeOffboardModal();
            await fetchData();
        } catch (error) {
            showNotification(error.response?.data?.message || 'No se pudo completar la baja.', 'error');
        } finally {
            setOffboardLoading(false);
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


            <section className="card stack-md" aria-label="Filtros de usuarios">
                <div className="filter-toolbar filter-toolbar--users">
                    <div className="filter-toolbar__item filter-toolbar__item--search">
                        <div className="form-field-group">
                            <label className="sr-only" htmlFor="users-search">Buscar usuarios</label>
                            <Search size={18} className="text-muted" />
                            <input
                                id="users-search"
                                name="users_search"
                                type="text"
                                value={search}
                                placeholder="Buscar por nombre o email..."
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setOffset(0);
                                }}
                                autoComplete="off"
                            />
                        </div>
                    </div>
                    <div className="filter-toolbar__item filter-toolbar__item--status">
                        <div className="form-field-group">
                            <Filter size={18} className="text-muted" />
                            <CustomSelect
                                id="users-status-filter"
                                name="users_status_filter"
                                value={statusFilter}
                                options={USER_STATUS_FILTERS}
                                onChange={(event) => {
                                    setStatusFilter(event.target.value);
                                    setOffset(0);
                                }}
                                ariaLabel="Filtrar usuarios por estatus"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section className="card card--flush table-shell" aria-labelledby="users-table-title">
                <div className="card-header">
                    <div>
                        <div className="card-header__title" id="users-table-title">
                            <Shield size={18} className="text-primary" />
                            <span>Usuarios registrados</span>
                        </div>
                        <p className="card-header__subtitle">
                            {pagination.total} registros encontrados
                            {statusFilter === 'active' ? ' (activos).' : statusFilter === 'inactive' ? ' (inactivos).' : '.'}
                        </p>
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
                                <th scope="col" className="table__head--date">CREADO</th>
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
                                        <td className="table__cell--date">{formatDate(user.created_at)}</td>
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
                                                    ...(user.status === 'active'
                                                        ? [{
                                                            label: 'Dar de baja y reasignar',
                                                            icon: <UserMinus />,
                                                            onClick: () => openOffboardModal(user)
                                                        }]
                                                        : []),
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
                        const isTargetAdmin = String(selectedUserForPerms?.role_name || '').toLowerCase() === 'admin';
                        const isBlockedByPolicy = !isTargetAdmin && NON_DELEGABLE_PERMISSIONS.has(permission.slug);
                        const isDisabled = isFromRole || isBlockedByPolicy;

                        return (
                            <button
                                key={permission.id}
                                type="button"
                                className="card card--tight"
                                onClick={() => !isDisabled && togglePermission(permission.slug)}
                                disabled={isDisabled}
                            >
                                <div className="cluster-md justify-between">
                                    <div className="stack-xs">
                                        <div className="cluster-sm">
                                            <strong>{permission.name}</strong>
                                            {isFromRole ? <StatusBadge variant="info">Rol</StatusBadge> : null}
                                            {isBlockedByPolicy ? <StatusBadge variant="warning">Bloqueado</StatusBadge> : null}
                                        </div>
                                        <span className="text-muted">
                                            {isFromRole
                                                ? 'Heredado del rol del sistema'
                                                : isBlockedByPolicy
                                                    ? 'Solo disponible para cuentas administrativas'
                                                    : 'Permiso asignable individualmente'}
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

            <ModalShell
                isOpen={isOffboardOpen}
                onClose={closeOffboardModal}
                title="Dar de baja y reasignar"
                subtitle={offboardTargetUser ? `Usuario: ${offboardTargetUser.name}` : ''}
                size="sm"
                labelledBy="offboard-user-title"
                describedBy="offboard-user-description"
                footer={(
                    <>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={closeOffboardModal}
                            disabled={offboardLoading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={submitOffboard}
                            disabled={offboardLoading || offboardCandidates.length === 0}
                        >
                            {offboardLoading ? 'Aplicando...' : 'Dar de baja'}
                        </button>
                    </>
                )}
            >
                <div className="stack-sm">
                    <p className="text-muted">
                        Las cotizaciones activas se transferirán al reemplazo y el usuario quedará inactivo sin perder historial.
                    </p>

                    <div>
                        <label className="form-label" htmlFor="offboard-replacement">REASIGNAR A</label>
                        <div className="form-select-container">
                            <CustomSelect
                                id="offboard-replacement"
                                name="offboard_replacement"
                                value={offboardReplacementId}
                                options={offboardCandidates.map((candidate) => ({
                                    value: String(candidate.id),
                                    label: `${candidate.name} (${candidate.role_name})`
                                }))}
                                onChange={(event) => setOffboardReplacementId(event.target.value)}
                                ariaLabel="Seleccionar usuario de reemplazo"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="form-label" htmlFor="offboard-reason">MOTIVO (OPCIONAL)</label>
                        <textarea
                            id="offboard-reason"
                            name="offboard_reason"
                            className="form-field"
                            value={offboardReason}
                            onChange={(event) => setOffboardReason(event.target.value)}
                            rows={3}
                            maxLength={255}
                            placeholder="Ej. Baja voluntaria"
                        />
                    </div>

                    {!offboardLoading && offboardCandidates.length === 0 ? (
                        <p className="text-muted">No hay usuarios activos disponibles para reasignar.</p>
                    ) : null}
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
