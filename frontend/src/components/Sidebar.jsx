import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    BarChart3,
    Database,
    History,
    LayoutDashboard,
    LogOut,
    Package,
    Route,
    Settings as SettingsIcon,
    ShieldCheck,
    Truck,
    User,
    Users,
    X
} from 'lucide-react';
import logoHorizontalDark from '../assets/logo-horizontal-negativo.svg';
import logoHorizontalLight from '../assets/logo-horizontal-positivo.svg';
import logoMonogram from '../assets/logo-monograma-move.svg';
import ProfileModal from './ProfileModal';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import { resolveAssetUrl } from '../utils/url';
import { clearSession } from '../utils/session';
import { buildAppPath } from '../utils/appPath';

const Sidebar = ({
    user = {},
    onUserUpdated = () => {},
    isMobileOpen = false,
    onRequestCloseMobile = () => {}
}) => {
    const { theme } = useTheme();
    const location = useLocation();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');
    const userPermissions = user.permissions || [];
    const profileMenuRef = useRef(null);
    const profileTriggerRef = useRef(null);
    const previousPathnameRef = useRef(location.pathname);
    const closeMobileSidebarRef = useRef(onRequestCloseMobile);

    useEffect(() => {
        closeMobileSidebarRef.current = onRequestCloseMobile;
    }, [onRequestCloseMobile]);

    useEffect(() => {
        if (previousPathnameRef.current === location.pathname) {
            return;
        }

        previousPathnameRef.current = location.pathname;
        closeMobileSidebarRef.current();
    }, [location.pathname]);

    useEffect(() => {
        if (!isProfileOpen) {
            return undefined;
        }

        const handlePointerDown = (event) => {
            const menuElement = profileMenuRef.current;
            const triggerElement = profileTriggerRef.current;

            if (menuElement?.contains(event.target) || triggerElement?.contains(event.target)) {
                return;
            }

            setIsProfileOpen(false);
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsProfileOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isProfileOpen]);

    useEffect(() => {
        if (!isMobileOpen) {
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                closeMobileSidebarRef.current();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isMobileOpen]);

    const currentMenuGroups = useMemo(() => ([
        {
            title: 'OPERACIÓN',
            items: [
                { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
                { name: 'Nueva Cotización', path: '/new-quote', icon: <Route size={20} />, permission: 'create_quotation' },
                { name: 'Historial', path: '/history', icon: <History size={20} />, permission: 'view_history' },
                { name: 'Reportes', path: '/reports', icon: <BarChart3 size={20} />, permission: 'view_reports' }
            ]
        },
        {
            title: 'RECURSOS',
            items: [
                { name: 'Flota', path: '/fleet', icon: <Truck size={20} />, permission: 'manage_fleet' },
                { name: 'Servicios', path: '/services', icon: <Package size={20} />, permission: 'manage_services' }
            ]
        },
        {
            title: 'SISTEMA',
            items: [
                { name: 'Usuarios', path: '/users', icon: <Users size={20} />, permission: 'manage_users' },
                { name: 'Respaldos', path: '/backups', icon: <Database size={20} />, permission: 'manage_backups' },
                { name: 'Auditoría', path: '/audit', icon: <ShieldCheck size={20} />, permission: 'manage_users' },
                { name: 'Ajustes', path: '/settings', icon: <SettingsIcon size={20} />, permission: 'edit_settings' }
            ]
        }
    ]), []);

    const toggleSidebar = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('sidebarCollapsed', String(newState));
        if (isProfileOpen) {
            setIsProfileOpen(false);
        }
    };

    const handleUserUpdate = (updatedUser) => {
        onUserUpdated(updatedUser);
    };

    const handleLogout = () => {
        clearSession();
        window.location.href = buildAppPath('/login');
    };

    const showExpandedContent = !isCollapsed || isMobileOpen;
    const logoSource = showExpandedContent ? (theme === 'light' ? logoHorizontalLight : logoHorizontalDark) : logoMonogram;
    const onboardingByPath = {
        '/': 'sidebar-dashboard',
        '/new-quote': 'sidebar-new-quote',
        '/history': 'sidebar-history',
        '/reports': 'sidebar-reports',
        '/fleet': 'sidebar-fleet',
        '/services': 'sidebar-services',
        '/settings': 'sidebar-settings'
    };

    const handleNavigation = () => {
        setIsProfileOpen(false);
        closeMobileSidebarRef.current();
    };

    return (
        <aside
            id="app-sidebar"
            className={`sidebar sidebar--mobile ${isMobileOpen ? 'sidebar--mobile-open' : ''} ${isCollapsed ? 'sidebar--collapsed' : ''}`.trim()}
            aria-label="Navegacion principal"
        >
            <div className="sidebar__brand">
                <NavLink
                    to="/"
                    className="sidebar__brand-link"
                    aria-label="Ir al Dashboard"
                    onClick={handleNavigation}
                >
                    <img src={logoSource} alt="LINHER Move" className="sidebar__logo" />
                </NavLink>
                <button
                    type="button"
                    className="sidebar__mobile-close icon-button"
                    onClick={() => closeMobileSidebarRef.current()}
                    aria-label="Cerrar menu de navegacion"
                >
                    <X size={18} />
                </button>
            </div>

            <nav className="sidebar__nav custom-scrollbar">
                {currentMenuGroups.map((group) => {
                    const filteredItems = group.items.filter((item) => {
                        const isAdmin = user.role_name?.toLowerCase() === 'admin' || Number(user.role_id) === 1;
                        const adminOnlyPaths = new Set(['/users', '/audit', '/backups']);

                        if (adminOnlyPaths.has(item.path)) {
                            return isAdmin;
                        }

                        const hasPermission = !item.permission || userPermissions.includes(item.permission);

                        if (isAdmin && ['manage_backups', 'manage_users', 'edit_settings'].includes(item.permission)) {
                            return true;
                        }

                        return hasPermission;
                    });

                    if (!filteredItems.length) {
                        return null;
                    }

                    return (
                        <section key={group.title} aria-label={group.title}>
                            {showExpandedContent ? (
                                <p className="sidebar__section-title">{group.title}</p>
                            ) : null}
                            <div className="sidebar__links">
                                {filteredItems.map((item) => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        title={item.name}
                                        data-onboarding={onboardingByPath[item.path]}
                                        className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`.trim()}
                                        onClick={handleNavigation}
                                    >
                                        <span aria-hidden="true">{item.icon}</span>
                                        {showExpandedContent ? <span className="sidebar__label">{item.name}</span> : null}
                                    </NavLink>
                                ))}
                            </div>
                        </section>
                    );
                })}
            </nav>

            <footer className="sidebar__footer">
                <button
                    type="button"
                    className="sidebar__toggle"
                    onClick={toggleSidebar}
                    aria-label={isCollapsed ? 'Expandir menú' : 'Contraer menú'}
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                {isProfileOpen ? (
                    <div
                        ref={profileMenuRef}
                        className={`sidebar__menu fade-in-up ${showExpandedContent ? '' : 'sidebar__menu--floating'}`.trim()}
                        role="menu"
                        aria-label="Opciones de cuenta"
                    >
                        <div className="sidebar__menu-header">Configuración de cuenta</div>
                        <button
                            type="button"
                            className="sidebar__menu-item"
                            onClick={() => {
                                setIsProfileModalOpen(true);
                                setIsProfileOpen(false);
                            }}
                        >
                            <span className="cluster-sm">
                                <User size={16} />
                                <span>Editar perfil</span>
                            </span>
                        </button>
                        <div className="sidebar__menu-item sidebar__menu-item--theme" role="presentation">
                            <ThemeToggle variant="menu" />
                        </div>
                        <button type="button" className="sidebar__menu-item sidebar__menu-item--danger" onClick={handleLogout}>
                            <span className="cluster-sm">
                                <LogOut size={16} />
                                <span>Cerrar sesión</span>
                            </span>
                        </button>
                    </div>
                ) : null}

                <button
                    ref={profileTriggerRef}
                    type="button"
                    className="sidebar__profile-trigger"
                    onClick={() => setIsProfileOpen((currentState) => !currentState)}
                    aria-expanded={isProfileOpen}
                    aria-label={isProfileOpen ? 'Cerrar opciones de cuenta' : 'Abrir opciones de cuenta'}
                >
                    <span className="avatar">
                        {user.photo_path ? (
                            <img src={resolveAssetUrl(user.photo_path)} alt={user.name || 'Usuario'} />
                        ) : (
                            <strong className="text-primary">{user.name?.charAt(0) || 'U'}</strong>
                        )}
                    </span>

                    {showExpandedContent ? (
                        <>
                            <span className="sidebar__profile-meta">
                                <span className="sidebar__profile-name">{user.name || 'Usuario'}</span>
                                <span className="sidebar__profile-role">{user.role_name || 'Miembro'}</span>
                            </span>
                            {isProfileOpen ? (
                                <ChevronUp size={16} className="text-primary" />
                            ) : (
                                <ChevronDown size={16} className="text-muted" />
                            )}
                        </>
                    ) : null}
                </button>
            </footer>

            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                onUserUpdated={handleUserUpdate}
            />
        </aside>
    );
};

export default Sidebar;
