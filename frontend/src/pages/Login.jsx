import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import logoVerticalDark from '../assets/logo-vertical-negativo.svg';
import logoVerticalLight from '../assets/logo-vertical-positivo.svg';
import { authService } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import ModalShell from '../components/ModalShell';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import { clearSession, persistSession } from '../utils/session';
import { buildAppPath } from '../utils/appPath';

const ForgotPasswordModal = ({ isOpen, onClose }) => (
    <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title="Recuperación de cuenta"
        subtitle="Política de seguridad"
        size="sm"
        labelledBy="forgot-password-title"
        describedBy="forgot-password-description"
        footer={(
            <button type="button" className="btn btn-primary" onClick={onClose}>
                Entendido
            </button>
        )}
    >
        <div className="stack-md">
            <p id="forgot-password-description" className="text-muted">
                Por motivos de seguridad y para proteger la integridad de los datos, el restablecimiento automático de contraseñas está deshabilitado.
            </p>
            <div className="alert alert--warning">
                <div>
                    <strong>Contacto requerido</strong>
                    <p className="text-muted">
                        Solicita apoyo a tu Supervisor o Administrador para restablecer el acceso manualmente.
                    </p>
                </div>
            </div>
        </div>
    </ModalShell>
);

const Login = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);
    const [showForgot, setShowForgot] = useState(false);
    const { showNotification } = useNotification();
    const { theme } = useTheme();

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            const data = await authService.login(email, password, rememberMe);
            clearSession();
            persistSession({
                user: data.user,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                rememberMe
            });
            window.location.href = buildAppPath('/');
        } catch (error) {
            showNotification(error.response?.data?.message || 'Error al iniciar sesión', 'error');
        }
    };

    return (
        <>
            <ForgotPasswordModal isOpen={showForgot} onClose={() => setShowForgot(false)} />

            <main className="auth-layout">
                <section className="auth-shell" aria-labelledby="login-title">
                    <div className="auth-layout__toggle">
                        <ThemeToggle variant="auth" />
                    </div>

                    <header className="auth-brand">
                        <img
                            src={theme === 'light' ? logoVerticalLight : logoVerticalDark}
                            alt="LINHER Move"
                            className="auth-logo"
                        />
                    </header>

                    <article className="card auth-card">
                        <header className="auth-card__header stack-sm text-center">
                            <h1 id="login-title" className="auth-title">Bienvenido de nuevo</h1>
                            <p className="auth-card__subtitle text-muted">Ingresa con tu cuenta para continuar.</p>
                        </header>

                        <form className="auth-form stack-md" onSubmit={handleSubmit}>
                            <div>
                                <label className="form-label" htmlFor="login-email">CORREO ELECTRÓNICO</label>
                                <div className="form-field-group">
                                    <Mail size={18} className="text-muted" />
                                    <input
                                        id="login-email"
                                        name="email"
                                        type="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        placeholder="name@company.com"
                                        inputMode="email"
                                        autoComplete="email"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="form-label" htmlFor="login-password">CONTRASEÑA</label>
                                <div className="form-field-group">
                                    <Lock size={18} className="text-muted" />
                                    <input
                                        id="login-password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="icon-button"
                                        onClick={() => setShowPassword((currentState) => !currentState)}
                                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="auth-card__options">
                                <label className="auth-card__remember cluster-sm text-muted" htmlFor="login-remember">
                                    <input
                                        id="login-remember"
                                        name="remember_me"
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={() => setRememberMe((currentState) => !currentState)}
                                        autoComplete="off"
                                    />
                                    <span>Recordarme</span>
                                </label>
                                <button type="button" className="btn btn-ghost auth-card__forgot" onClick={() => setShowForgot(true)}>
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>

                            <button type="submit" className="btn btn-primary auth-submit">
                                Iniciar sesión
                            </button>
                        </form>
                    </article>

                    <p className="auth-footer">&copy; 2026 Move by LINHER. Todos los derechos reservados.</p>
                </section>
            </main>
        </>
    );
};

export default Login;
