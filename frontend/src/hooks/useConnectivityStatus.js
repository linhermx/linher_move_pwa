import { useCallback, useEffect, useRef, useState } from 'react';
import { buildApiUrl } from '../utils/url';

const HEALTHCHECK_URL = buildApiUrl('/health');
const DEFAULT_RECOVERY_MS = 3200;
const CONNECTIVITY_MEDIA_ASSETS = [
    '/media/connectivity/offline.gif',
    '/media/connectivity/online.gif',
    '/icons/media/connectivity/offline.gif',
    '/icons/media/connectivity/online.gif'
];

const getInitialStatus = () => {
    if (typeof window === 'undefined') {
        return 'online';
    }

    return window.navigator.onLine ? 'online' : 'offline';
};

const checkBackendReachability = async () => {
    try {
        const requestUrl = `${HEALTHCHECK_URL}?ts=${Date.now()}`;
        const response = await fetch(requestUrl, {
            method: 'GET',
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache',
                Pragma: 'no-cache'
            }
        });
        return response.ok;
    } catch {
        return false;
    }
};

const useConnectivityStatus = ({ recoveryVisibleMs = DEFAULT_RECOVERY_MS } = {}) => {
    const [status, setStatus] = useState(getInitialStatus);
    const [showRecoveryNotice, setShowRecoveryNotice] = useState(false);
    const [isCheckingConnection, setIsCheckingConnection] = useState(false);

    const mountedRef = useRef(true);
    const wasOfflineRef = useRef(getInitialStatus() === 'offline');
    const recoveryTimerRef = useRef(null);
    const reloadTimerRef = useRef(null);

    const clearTimers = useCallback(() => {
        if (recoveryTimerRef.current) {
            window.clearTimeout(recoveryTimerRef.current);
            recoveryTimerRef.current = null;
        }
        if (reloadTimerRef.current) {
            window.clearTimeout(reloadTimerRef.current);
            reloadTimerRef.current = null;
        }
    }, []);

    const applyOfflineState = useCallback(() => {
        clearTimers();
        wasOfflineRef.current = true;
        if (!mountedRef.current) {
            return;
        }
        setShowRecoveryNotice(false);
        setStatus('offline');
    }, [clearTimers]);

    const scheduleRecoveryFlow = useCallback(() => {
        clearTimers();
        wasOfflineRef.current = false;

        if (!mountedRef.current) {
            return;
        }

        setStatus('online');
        setShowRecoveryNotice(true);

        recoveryTimerRef.current = window.setTimeout(() => {
            if (!mountedRef.current) {
                return;
            }
            setShowRecoveryNotice(false);
        }, recoveryVisibleMs);

        reloadTimerRef.current = window.setTimeout(() => {
            window.location.reload();
        }, recoveryVisibleMs);
    }, [clearTimers, recoveryVisibleMs]);

    const verifyConnection = useCallback(async () => {
        if (!mountedRef.current) {
            return false;
        }

        setIsCheckingConnection(true);
        const isReachable = await checkBackendReachability();

        if (!mountedRef.current) {
            return isReachable;
        }

        setIsCheckingConnection(false);

        if (isReachable) {
            if (wasOfflineRef.current) {
                scheduleRecoveryFlow();
            } else {
                setStatus('online');
            }
            return true;
        }

        applyOfflineState();
        return false;
    }, [applyOfflineState, scheduleRecoveryFlow]);

    useEffect(() => {
        CONNECTIVITY_MEDIA_ASSETS.forEach((assetPath) => {
            const image = new Image();
            image.src = assetPath;
        });
    }, []);

    useEffect(() => {
        mountedRef.current = true;

        const handleOffline = () => {
            applyOfflineState();
        };

        const handleOnline = () => {
            void verifyConnection();
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        const initCheckTimer = window.setTimeout(() => {
            void verifyConnection();
        }, 0);

        return () => {
            mountedRef.current = false;
            clearTimers();
            window.clearTimeout(initCheckTimer);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, [applyOfflineState, clearTimers, verifyConnection]);

    return {
        isOffline: status === 'offline',
        isCheckingConnection,
        showRecoveryNotice,
        retryConnection: verifyConnection
    };
};

export default useConnectivityStatus;
