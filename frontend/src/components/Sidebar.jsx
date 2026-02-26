import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Route, History, Truck, Settings as SettingsIcon,
    Users, User, Package, ShieldCheck, LogOut, Moon, Sun, ChevronUp
} from 'lucide-react';
import logoHorizontal from '../assets/logo-horizontal-negativo.svg';
import ProfileModal from './ProfileModal';

const Sidebar = () => {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || {});
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const userPermissions = user.permissions || [];

    // Listen for storage changes in case other tabs or components update local storage
    useEffect(() => {
        const handleStorageChange = () => {
            const updatedUser = JSON.parse(localStorage.getItem('user')) || {};
            setUser(updatedUser);
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const handleUserUpdate = (updatedUser) => {
        setUser(updatedUser);
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    const menuGroups = [
        // ... (rest of menuGroups remains original)
    ];

    // Redeclaramos menuGroups aquí para asegurar disponibilidad si es necesario, 
    // pero idealmente mantenemos los que ya existen. 
    // Como estamos usando replace_file_content, necesitamos incluir el bloque completo si lo pisamos.

    const currentMenuGroups = [
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

            <nav style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
                {currentMenuGroups.map((group) => {
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
                                        <span style={{ fontSize: '13px' }}>{item.name}</span>
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* Profile Section */}
            <div style={{ position: 'relative', marginTop: 'auto', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-md)' }}>
                {isProfileOpen && (
                    <div style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 10px)',
                        left: 0,
                        right: 0,
                        backgroundColor: '#161616',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '8px',
                        boxShadow: '0 -8px 24px rgba(0,0,0,0.5)',
                        animation: 'fade-in-up 0.2s ease-out',
                        zIndex: 100
                    }}>
                        <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', marginBottom: '8px' }}>
                            Configuración de Cuenta
                        </div>

                        <button
                            onClick={() => { setIsProfileModalOpen(true); setIsProfileOpen(false); }}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'none', border: 'none', color: 'white', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                            onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                            <User size={16} />
                            <span style={{ fontSize: '13px' }}>Editar Perfil</span>
                        </button>

                        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', color: 'var(--color-text-muted)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Moon size={16} />
                                <span style={{ fontSize: '13px' }}>Modo Dark</span>
                            </div>
                            <div style={{ width: '32px', height: '18px', backgroundColor: 'var(--color-primary)', borderRadius: '10px', position: 'relative' }}>
                                <div style={{ width: '14px', height: '14px', backgroundColor: 'white', borderRadius: '50%', position: 'absolute', right: '2px', top: '2px' }} />
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'none', border: 'none', color: '#FF4848', cursor: 'pointer', borderRadius: 'var(--radius-sm)', borderTop: '1px solid var(--color-border)', marginTop: '8px' }}
                            onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255, 72, 72, 0.05)'}
                            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                            <LogOut size={16} />
                            <span style={{ fontSize: '13px' }}>Cerrar Sesión</span>
                        </button>
                    </div>
                )}

                <div
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: isProfileOpen ? 'rgba(255,255,255,0.05)' : 'transparent'
                    }}
                    onMouseOver={(e) => !isProfileOpen && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)')}
                    onMouseOut={(e) => !isProfileOpen && (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        backgroundColor: 'rgba(255, 72, 72, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', border: '1px solid var(--color-border)'
                    }}>
                        {user.photo_path ? (
                            <img src={`http://localhost:3000/${user.photo_path}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
                        ) : (
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary)' }}>{user.name?.charAt(0) || 'U'}</span>
                        )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user.name || 'Usuario'}
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {user.role_name || 'Miembro'}
                        </p>
                    </div>
                    <ChevronUp size={16} className="text-muted" style={{ transition: 'transform 0.3s', transform: isProfileOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                </div>
            </div>

            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                onUserUpdated={handleUserUpdate}
            />
        </aside>
    );
};

export default Sidebar;
