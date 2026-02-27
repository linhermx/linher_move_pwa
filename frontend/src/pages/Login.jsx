import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import logoVertical from '../assets/logo-vertical-negativo.svg';
import { authService } from '../services/api';
import { useNotification } from '../context/NotificationContext';

const Login = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { showNotification } = useNotification();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = await authService.login(email, password);
            localStorage.setItem('user', JSON.stringify(data.user));
            // Force reload to update sidebar/navigation if needed
            window.location.href = '/dashboard';
        } catch (err) {
            showNotification(err.response?.data?.message || 'Error al iniciar sesión', 'error');
        }
    };

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'var(--color-bg)',
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 2000
        }}>
            <div style={{ width: '100%', maxWidth: '400px', padding: 'var(--spacing-lg)' }}>
                <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
                    <img src={logoVertical} alt="LINHER MOVE" style={{ width: '160px', height: 'auto', marginBottom: '10px' }} />
                </div>

                <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
                    <h2 style={{ fontSize: '20px', marginBottom: 'var(--spacing-lg)', textAlign: 'center' }}>Bienvenido de nuevo</h2>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '12px' }} className="text-muted">Correo Electrónico</label>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                                <Mail size={18} className="text-muted" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    inputMode="email"
                                    autoComplete="email"
                                    style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%' }}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '12px' }} className="text-muted">Contraseña</label>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                                <Lock size={18} className="text-muted" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%' }}
                                    required
                                />
                                <div onClick={() => setShowPassword(!showPassword)} style={{ cursor: 'pointer' }}>
                                    {showPassword ? <EyeOff size={18} className="text-muted" /> : <Eye size={18} className="text-muted" />}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input type="checkbox" id="remember" style={{ accentColor: 'var(--color-primary)' }} />
                                <label htmlFor="remember" style={{ fontSize: '12px' }} className="text-muted">Recordarme</label>
                            </div>
                            <a href="#" style={{ fontSize: '12px', color: 'var(--color-primary)', textDecoration: 'none' }}>¿Olvidaste tu contraseña?</a>
                        </div>

                        <button type="submit" style={{
                            backgroundColor: 'var(--color-primary)',
                            color: 'white',
                            border: 'none',
                            padding: '12px',
                            borderRadius: 'var(--radius-md)',
                            marginTop: 'var(--spacing-md)',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}>
                            Iniciar Sesión
                        </button>
                    </form>
                </div>

                <p className="text-muted" style={{ textAlign: 'center', marginTop: 'var(--spacing-xl)', fontSize: '12px' }}>
                    &copy; 2026 LINHER Move. Todos los derechos reservados.
                </p>
            </div>
        </div>
    );
};

export default Login;
