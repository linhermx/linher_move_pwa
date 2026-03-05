import { reportClientError } from './clientLogger';

const SW_URL = '/service-worker.js';

export const registerPwaServiceWorker = () => {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    const isLocalDev = import.meta.env.DEV
        && ['localhost', '127.0.0.1'].includes(window.location.hostname);

    if (!import.meta.env.PROD && !isLocalDev) {
        return;
    }

    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register(SW_URL, { scope: '/' });

            if (typeof registration.update === 'function') {
                registration.update();
            }
        } catch (error) {
            reportClientError({
                action: 'PWA_SW_REGISTER_FAILED',
                message: error?.message || 'No se pudo registrar el service worker.',
                stack: error?.stack,
                details: {
                    sw_url: SW_URL
                }
            });
        }
    });
};
