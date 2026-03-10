import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { reportClientError } from '../services/clientLogger';
import { isCurrentAppRoute } from '../utils/appPath';

const DISMISS_STORAGE_KEY = 'pwa_install_prompt_dismissed';
const DISMISS_CLOSE_MS = 12 * 60 * 60 * 1000;
const DISMISS_LATER_MS = 3 * 24 * 60 * 60 * 1000;

const isStandaloneMode = () => {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
};

const getStoredDismissalUntil = () => {
    try {
        const rawValue = localStorage.getItem(DISMISS_STORAGE_KEY);
        if (!rawValue) {
            return 0;
        }

        const dismissedUntil = Number(rawValue);
        if (!Number.isFinite(dismissedUntil) || dismissedUntil <= Date.now()) {
            localStorage.removeItem(DISMISS_STORAGE_KEY);
            return 0;
        }

        return dismissedUntil;
    } catch {
        return 0;
    }
};

const setStoredDismissal = (value) => {
    try {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue) || numericValue <= Date.now()) {
            localStorage.removeItem(DISMISS_STORAGE_KEY);
        } else {
            localStorage.setItem(DISMISS_STORAGE_KEY, String(numericValue));
        }
    } catch {
        // Ignore storage errors.
    }
};

const PwaInstallPrompt = () => {
    const location = useLocation();
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [dismissedUntil, setDismissedUntil] = useState(getStoredDismissalUntil);
    const [isInstalled, setIsInstalled] = useState(isStandaloneMode);
    const isDismissed = dismissedUntil > Date.now();

    useEffect(() => {
        const handleBeforeInstallPrompt = (event) => {
            event.preventDefault();

            if (isDismissed || isStandaloneMode()) {
                return;
            }

            setDeferredPrompt(event);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
            setDismissedUntil(0);
            setStoredDismissal(0);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, [isDismissed]);

    const dismissFor = (durationMs) => {
        const nextDismissedUntil = Date.now() + durationMs;
        setDismissedUntil(nextDismissedUntil);
        setDeferredPrompt(null);
        setStoredDismissal(nextDismissedUntil);
    };

    const handleClose = () => {
        dismissFor(DISMISS_CLOSE_MS);
    };

    const handleDismiss = () => {
        dismissFor(DISMISS_LATER_MS);
    };

    const handleInstall = async () => {
        if (!deferredPrompt) {
            return;
        }

        try {
            await deferredPrompt.prompt();
            await deferredPrompt.userChoice;
        } catch (error) {
            reportClientError({
                action: 'PWA_INSTALL_PROMPT_FAILED',
                message: error?.message || 'No se pudo ejecutar el prompt de instalación.',
                stack: error?.stack
            });
        } finally {
            setDeferredPrompt(null);
        }
    };

    if (isCurrentAppRoute(location.pathname, '/login') || isInstalled || isDismissed || !deferredPrompt) {
        return null;
    }

    return (
        <aside
            className="pwa-install-banner fade-in-up"
            role="region"
            aria-label="Instalar aplicación"
            aria-labelledby="pwa-install-title"
            aria-describedby="pwa-install-copy"
        >
            <button
                type="button"
                className="icon-button pwa-install-banner__close"
                onClick={handleClose}
                aria-label="Cerrar aviso de instalación"
            >
                <X size={14} />
            </button>

            <div className="pwa-install-banner__header">
                <span className="pwa-install-banner__badge" aria-hidden="true">
                    <Download size={14} />
                </span>
                <span className="pwa-install-banner__eyebrow">Experiencia optimizada</span>
            </div>

            <div className="pwa-install-banner__content">
                <p id="pwa-install-title" className="pwa-install-banner__title">Instala LINHER Move</p>
                <p id="pwa-install-copy" className="pwa-install-banner__message">
                    Abre la plataforma como app y entra más rápido a tus cotizaciones.
                </p>
            </div>

            <div className="pwa-install-banner__actions">
                <button type="button" className="btn btn-ghost pwa-install-banner__later" onClick={handleDismiss}>
                    Ahora no
                </button>
                <button type="button" className="btn btn-primary pwa-install-banner__install" onClick={handleInstall}>
                    <Download size={16} />
                    Instalar app
                </button>
            </div>
        </aside>
    );
};

export default PwaInstallPrompt;
