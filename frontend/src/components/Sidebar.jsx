import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Route, History, Truck, Settings as SettingsIcon, Users, User, Package, ShieldCheck } from 'lucide-react';
import logoHorizontal from '../assets/logo-horizontal-negativo.svg';

const Sidebar = () => {
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const userPermissions = user.permissions || [];

    const menuGroups = [
        {
            title: 'OPERACIÓN',
            items: [
                { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
                { name: 'Nueva Cotización', path: '/new-quote', icon: <Route size={20} />, permission: 'create_quotation' },
                { name: 'Historial', path: '/history', icon: <History size={20} />, permission: 'view_history' },
            ]
        },
        {
            title: 'RECURSOS',
            items: [
                { name: 'Flota', path: '/fleet', icon: <Truck size={20} />, permission: 'manage_fleet' },
                { name: 'Servicios', path: '/services', icon: <Package size={20} />, permission: 'manage_services' },
            ]
        },
        {
            title: 'SISTEMA',
            items: [
                { name: 'Usuarios', path: '/users', icon: <Users size={20} />, permission: 'manage_users' },
                { name: 'Auditoría', path: '/audit', icon: <ShieldCheck size={20} />, permission: 'manage_users' },
                { name: 'Ajustes', path: '/settings', icon: <SettingsIcon size={20} />, permission: 'edit_settings' },
            ]
        }
    ];

    return (
        <aside style={{
            width: '260px',
            backgroundColor: 'var(--color-surface)',
            height: '100vh',
            position: 'sticky',
            top: 0,
            borderRight: '1px solid var(--color-border)',
            padding: 'var(--spacing-md)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10
        }}>
            <div style={{ marginBottom: 'var(--spacing-xl)', textAlign: 'center', padding: '10px' }}>
                <img src={logoHorizontal} alt="LINHER MOVE" style={{ width: '100%', maxWidth: '180px', height: 'auto' }} />
            </div>

            <nav style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', paddingRight: '4px' }}>
                {menuGroups.map((group, groupIdx) => {
                    const filteredItems = group.items.filter(item =>
                        !item.permission || userPermissions.includes(item.permission)
                    );

                    if (filteredItems.length === 0) return null;

                    return (
                        <div key={group.title} style={{ marginBottom: '16px' }}>
                            <div style={{
                                padding: '0 12px',
                                marginBottom: '8px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                color: 'var(--color-text-muted)',
                                letterSpacing: '1px'
                            }}>
                                {group.title}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {filteredItems.map((item) => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        style={({ isActive }) => ({
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '10px 12px',
                                            borderRadius: 'var(--radius-md)',
                                            textDecoration: 'none',
                                            color: isActive ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                                            backgroundColor: isActive ? 'rgba(255, 72, 72, 0.1)' : 'transparent',
                                            borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                                            transition: 'all 0.2s'
                                        })}
                                    >
                                        {item.icon}
                                        <span style={{ fontSize: '14px' }}>{item.name}</span>
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </nav>

            <div style={{ marginTop: 'auto', padding: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <NavLink
                    to="/profile"
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-text-muted)', textDecoration: 'none' }}
                >
                    <User size={20} />
                    <span>{(() => {
                        try {
                            const u = JSON.parse(localStorage.getItem('user'));
                            return u?.name || 'Usuario';
                        } catch (e) {
                            return 'Usuario';
                        }
                    })()}</span>
                </NavLink>
                <button
                    onClick={() => {
                        localStorage.removeItem('user');
                        window.location.href = '/login';
                    }}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-primary)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        padding: '0 0 0 32px'
                    }}
                >
                    Cerrar Sesión
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
