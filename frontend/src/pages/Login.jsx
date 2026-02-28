import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, X, KeyRound, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import logoVertical from '../assets/logo-vertical-negativo.svg';
import { authService } from '../services/api';
import { useNotification } from '../context/NotificationContext';

// ── Forgot password modal (Informativo por seguridad) ─────────────────────
const ForgotPasswordModal = ({ onClose }) => {
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
        }}>
            <div style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '32px',
                width: '100%',
                maxWidth: '400px',
                position: 'relative',
                boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}>
                {/* Close button */}
                <button onClick={onClose} style={{
                    position: 'absolute', top: '16px', right: '16px',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.4)', padding: '4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '6px', transition: 'color 0.2s',
                }}>
                    <X size={18} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <div style={{
                        background: 'rgba(255,193,7,0.12)', border: '1px solid rgba(255,193,7,0.25)',
                        borderRadius: '10px', padding: '10px', color: '#ffc107',
                    }}>
                        <Lock size={20} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '2px' }}>
                            Recuperación de cuenta
                        </h2>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                            Política de seguridad
                        </p>
                    </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', marginBottom: '24px' }}>
                        Por motivos de seguridad y para proteger la integridad de los datos, el restablecimiento automático de contraseñas está deshabilitado.
                    </p>

                    <div style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px', padding: '16px', marginBottom: '24px',
                        display: 'flex', gap: '12px', alignItems: 'flex-start', textAlign: 'left'
                    }}>
                        <AlertCircle size={20} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.5', margin: 0 }}>
                            Por favor, <strong>contacta a tu Supervisor o Administrador de sistema</strong> para que restablezcan el acceso a tu cuenta de forma manual.
                        </p>
                    </div>

                    <button onClick={onClose} className="btn btn-primary" style={{ width: '100%' }}>
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Login page ─────────────────────────────────────────────────────────────
const Login = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const { showNotification } = useNotification();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = await authService.login(email, password);
            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem('user', JSON.stringify(data.user));
            window.location.href = '/';
        } catch (err) {
            showNotification(err.response?.data?.message || 'Error al iniciar sesión', 'error');
        }
    };

    return (
        <>
            {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}

            <div style={{
                height: '100vh', width: '100vw',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                backgroundColor: 'var(--color-bg)',
                position: 'fixed', top: 0, left: 0, zIndex: 2000,
            }}>
                <div style={{ width: '100%', maxWidth: '400px', padding: 'var(--spacing-lg)' }}>
                    <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
                        <img src={logoVertical} alt="LINHER MOVE" style={{ width: '160px', height: 'auto', marginBottom: '10px' }} />
                    </div>

                    <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
                        <h2 style={{ fontSize: '20px', marginBottom: 'var(--spacing-lg)', textAlign: 'center' }}>
                            Bienvenido de nuevo
                        </h2>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            <div>
                                <label className="form-label">Correo Electrónico</label>
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
                                <label className="form-label">Contraseña</label>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                                    <Lock size={18} className="text-muted" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%' }}
                                        required
                                    />
                                    <div onClick={() => setShowPassword(!showPassword)} style={{ cursor: 'pointer', flexShrink: 0 }}>
                                        {showPassword ? <EyeOff size={18} className="text-muted" /> : <Eye size={18} className="text-muted" />}
                                    </div>
                                </div>
                            </div>

                            {/* Remember me + Forgot password */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                                    <div
                                        onClick={() => setRememberMe(!rememberMe)}
                                        style={{
                                            width: '18px', height: '18px', borderRadius: '5px',
                                            border: `2px solid ${rememberMe ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                            background: rememberMe ? 'var(--color-primary)' : 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'all 0.15s ease', flexShrink: 0,
                                        }}
                                    >
                                        {rememberMe && (
                                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Recordarme</span>
                                </label>

                                <button
                                    type="button"
                                    onClick={() => setShowForgot(true)}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        fontSize: '12px', color: 'var(--color-primary)',
                                        textDecoration: 'none', padding: 0, fontFamily: 'inherit',
                                        transition: 'opacity 0.2s',
                                    }}
                                    onMouseEnter={e => e.target.style.opacity = '0.75'}
                                    onMouseLeave={e => e.target.style.opacity = '1'}
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>

                            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--spacing-md)' }}>
                                Iniciar Sesión
                            </button>
                        </form>
                    </div>

                    <p className="text-muted" style={{ textAlign: 'center', marginTop: 'var(--spacing-xl)', fontSize: '12px' }}>
                        &copy; 2026 Move by LINHER. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </>
    );
};

export default Login;
