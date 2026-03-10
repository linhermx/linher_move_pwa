import React, { useState } from 'react';
import { Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { buildBaseRelativePath } from '../utils/appPath';

const DEFAULT_ASSET_MAP = Object.freeze({
    offline: [
        buildBaseRelativePath('media/connectivity/offline.gif'),
        buildBaseRelativePath('icons/media/connectivity/offline.gif')
    ],
    online: [
        buildBaseRelativePath('media/connectivity/online.gif'),
        buildBaseRelativePath('icons/media/connectivity/online.gif')
    ]
});

const ConnectivityMedia = ({ variant, assetMap }) => {
    const [hasError, setHasError] = useState(false);
    const rawSource = assetMap[variant];
    const sourceList = Array.isArray(rawSource) ? rawSource : [rawSource];
    const [sourceIndex, setSourceIndex] = useState(0);
    const mediaSource = sourceList[sourceIndex] || null;
    const canRenderMedia = Boolean(mediaSource) && !hasError;

    if (!canRenderMedia) {
        return (
            <span className="connectivity-media__icon" aria-hidden="true">
                {variant === 'online' ? <Wifi size={28} /> : <WifiOff size={30} />}
            </span>
        );
    }

    return (
        <img
            className="connectivity-media__image"
            src={mediaSource}
            alt=""
            loading="eager"
            decoding="async"
            onError={() => {
                if (sourceIndex < sourceList.length - 1) {
                    setSourceIndex(sourceIndex + 1);
                    return;
                }
                setHasError(true);
            }}
        />
    );
};

export const ConnectivityOfflineView = ({
    phase = 'offline',
    onRetry,
    isCheckingConnection = false,
    assetMap = DEFAULT_ASSET_MAP
}) => {
    const isReconnecting = phase === 'reconnecting';
    const mediaVariant = isReconnecting ? 'online' : 'offline';

    return (
        <section
            className={`connectivity-offline-view connectivity-offline-view--${phase} page-shell fade-in`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
        >
            <article className="connectivity-offline-view__card">
                <div className="connectivity-offline-view__media-frame">
                    <div className="connectivity-offline-view__media-shell">
                        <ConnectivityMedia variant={mediaVariant} assetMap={assetMap} />
                    </div>
                </div>

                <h2 className="connectivity-offline-view__title">
                    {isReconnecting ? 'Conexión restablecida' : 'Conéctate a internet'}
                </h2>
                <p className="connectivity-offline-view__message">
                    {isReconnecting
                        ? 'Sincronizando información y preparando la app de nuevo.'
                        : 'No tienes conexión disponible. Revisa tu red y vuelve a intentar.'}
                </p>

                {isReconnecting ? (
                    <button
                        type="button"
                        className="btn btn-secondary connectivity-offline-view__retry"
                        disabled
                    >
                        <Loader2 size={16} className="spin" />
                        Reconectando...
                    </button>
                ) : (
                    <button
                        type="button"
                        className="btn btn-secondary connectivity-offline-view__retry"
                        onClick={onRetry}
                        disabled={isCheckingConnection}
                    >
                        {isCheckingConnection ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                        {isCheckingConnection ? 'Comprobando...' : 'Reintentar'}
                    </button>
                )}
            </article>
        </section>
    );
};

export default ConnectivityOfflineView;
