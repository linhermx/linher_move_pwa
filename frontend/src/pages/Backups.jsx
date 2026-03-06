import React, { useCallback, useEffect, useState } from 'react';
import {
    Calendar,
    Cloud,
    Database,
    Download,
    RefreshCcw,
    Trash2,
    Upload
} from 'lucide-react';
import { backupService } from '../services/backupService';
import { dropboxService, settingsService } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import Alert from '../components/Alert';
import CustomSelect from '../components/CustomSelect';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import StatusBadge from '../components/StatusBadge';
import TableScrollFade from '../components/TableScrollFade';
import { formatDateTime } from '../utils/formatters';
import { useNotification } from '../context/NotificationContext';

const Backups = () => {
    const [backups, setBackups] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, limit: 10, pages: 1, current_page: 1 });
    const [backupSummary, setBackupSummary] = useState(null);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(null);
    const [cloudStatus, setCloudStatus] = useState({ connected: false });
    const [error, setError] = useState('');
    const [limit, setLimit] = useState(10);
    const [offset, setOffset] = useState(0);
    const { showNotification } = useNotification();
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    const isInitialLoading = loading && !backupSummary && !settings && backups.length === 0;
    const automationEnabled = settings?.backups_enabled === true
        || settings?.backups_enabled === 'true'
        || settings?.backups_enabled === 1
        || settings?.backups_enabled === '1';

    const getAutomationBadge = () => {
        const health = backupSummary?.automation?.health;

        if (health === 'healthy') {
            return { variant: 'success', label: 'Operando' };
        }

        if (health === 'stale') {
            return { variant: 'warning', label: 'Atrasado' };
        }

        if (health === 'never_run') {
            return { variant: 'warning', label: 'Sin ejecución' };
        }

        return { variant: 'neutral', label: 'Desactivado' };
    };

    const getAutomationSummaryText = () => {
        const frequency = backupSummary?.automation?.frequency === 'weekly' ? 'Semanal' : 'Diaria';

        if (!automationEnabled) {
            return 'La automatización está desactivada. Actívala para que el servidor genere respaldos sin intervención manual.';
        }

        if (backupSummary?.automation?.health === 'healthy') {
            return `Automatización ${frequency.toLowerCase()} activa y operando dentro de la ventana esperada.`;
        }

        if (backupSummary?.automation?.health === 'stale') {
            return `Automatización ${frequency.toLowerCase()} activa, pero con retraso detectado en la última ejecución.`;
        }

        if (backupSummary?.automation?.health === 'never_run') {
            return `Automatización ${frequency.toLowerCase()} activa, pendiente de su primera ejecución automática.`;
        }

        return `Automatización ${frequency.toLowerCase()} disponible para el servidor.`;
    };

    const getCloudBadge = () => {
        if (cloudStatus.connected) {
            return { variant: 'success', label: 'Conectado' };
        }

        if (cloudStatus.last_error_message) {
            return { variant: 'warning', label: 'Con incidencia' };
        }

        return { variant: 'neutral', label: 'Sin conexión' };
    };

    const getCloudSummaryText = () => {
        if (cloudStatus.connected && cloudStatus.user?.emailAddress) {
            return `La sincronización cloud está disponible para la cuenta ${cloudStatus.user.emailAddress}.`;
        }

        if (cloudStatus.last_error_message) {
            return 'La integración con Dropbox reportó una incidencia y requiere revisión.';
        }

        return 'Conecta Dropbox para duplicar cada respaldo local en la nube después de su generación.';
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [backupData, summaryData, settingsData, cloudData] = await Promise.all([
                backupService.list({ limit, offset }),
                backupService.summary(),
                settingsService.get(),
                dropboxService.getStatus()
            ]);

            setBackups(backupData.data || []);
            setPagination(backupData.pagination || { total: 0, limit, pages: 1, current_page: 1 });
            setBackupSummary(summaryData);
            setSettings(settingsData);
            setCloudStatus(cloudData);
            setError('');
        } catch {
            setError('Error al cargar datos de respaldo.');
        } finally {
            setLoading(false);
        }
    }, [limit, offset]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('sync') === 'success') {
            showNotification('Dropbox se vinculó correctamente', 'success');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [showNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            await backupService.generate(user.id);
            await fetchData();
            showNotification('Respaldo generado', 'success');
        } catch {
            setError('Error al generar respaldo local.');
        } finally {
            setGenerating(false);
        }
    };

    const handleDelete = async () => {
        if (!showConfirmDelete) {
            return;
        }

        try {
            await backupService.delete(showConfirmDelete);
            setShowConfirmDelete(null);
            if (backups.length === 1 && offset > 0) {
                setOffset(Math.max(0, offset - limit));
            } else {
                await fetchData();
            }
            showNotification('Respaldo eliminado', 'success');
        } catch {
            setError('No se pudo eliminar el respaldo.');
        }
    };

    const handleToggleAutomation = async () => {
        const newSettings = {
            ...settings,
            backups_enabled: !automationEnabled
        };

        try {
            await settingsService.update(newSettings);
            await fetchData();
            showNotification('Automatización actualizada', 'success');
        } catch {
            setError('No se pudo actualizar la automatización.');
        }
    };

    const handleFrequencyChange = async (value) => {
        const newSettings = {
            ...settings,
            backup_frequency: value
        };

        try {
            await settingsService.update(newSettings);
            await fetchData();
            showNotification('Frecuencia actualizada', 'success');
        } catch {
            setError('No se pudo actualizar la frecuencia.');
        }
    };

    const handleConnectCloud = async () => {
        try {
            const { url } = await dropboxService.getAuthUrl();
            window.location.href = url;
        } catch {
            setError('No se pudo iniciar la vinculación con Dropbox.');
        }
    };

    const handleDisconnectCloud = async () => {
        try {
            await dropboxService.disconnect();
            await fetchData();
            showNotification('Dropbox desconectado', 'success');
        } catch {
            setError('Error al desconectar Dropbox.');
        }
    };

    const formatSize = (bytes) => {
        if (!bytes) {
            return '0 Bytes';
        }

        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const index = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${parseFloat((bytes / (1024 ** index)).toFixed(2))} ${sizes[index]}`;
    };

    const getBackupTypeVariant = (type) => {
        if (type === 'dropbox') {
            return 'info';
        }
        if (type === 'google_drive') {
            return 'warning';
        }
        return 'neutral';
    };

    const renderGenerateBackupButton = (className = '') => (
        <button
            type="button"
            className={`btn btn-primary ${className}`.trim()}
            onClick={handleGenerate}
            disabled={generating || loading}
        >
            {generating ? <RefreshCcw size={18} className="spin" /> : <Database size={18} />}
            {generating ? 'Generando...' : 'Generar respaldo'}
        </button>
    );

    return (
        <div className="page-shell fade-in stack-lg backups-page">
            <PageHeader
                title="Gestión de respaldos"
                subtitle="Protege tu información mediante copias locales y sincronización opcional en Dropbox."
                actions={renderGenerateBackupButton()}
            />

            {error ? <Alert type="error">{error}</Alert> : null}

            <section className="page-grid page-grid--fit" aria-label="Configuración de respaldos">
                <article className="card stack-md">
                    <div className="card-header">
                        <div>
                            <div className="card-header__title">
                                <RefreshCcw size={18} className="text-primary" />
                                <span>Automatización</span>
                            </div>
                            <p className="card-header__subtitle">Programa respaldos periódicos desde el servidor.</p>
                        </div>
                    </div>

                    {isInitialLoading ? (
                        <p className="text-muted">Cargando configuración de respaldos...</p>
                    ) : (
                        <div className="stack-sm">
                            <div className="cluster-md justify-between">
                                <div className="stack-xs">
                                    <strong>Respaldos automáticos</strong>
                                    <span className="text-muted">Copia de seguridad diaria a la medianoche.</span>
                                </div>
                                <button type="button" className="btn btn-secondary" onClick={handleToggleAutomation}>
                                    {automationEnabled ? 'Desactivar' : 'Activar'}
                                </button>
                            </div>
                            <div className="backup-status-panel stack-sm">
                                <div className="backup-status-panel__header">
                                    <StatusBadge variant={getAutomationBadge().variant} showDot>
                                        {getAutomationBadge().label}
                                    </StatusBadge>
                                    <span className="backup-status-panel__window">
                                        {backupSummary?.automation?.frequency === 'weekly' ? 'Ventana: cada 7 días' : 'Ventana: cada 24 horas'}
                                    </span>
                                </div>
                                <p className="backup-status-panel__summary">
                                    {getAutomationSummaryText()}
                                </p>
                                <dl className="backup-status-stats">
                                    <div className="backup-status-stats__item">
                                        <dt>Frecuencia</dt>
                                        <dd>{backupSummary?.automation?.frequency === 'weekly' ? 'Semanal' : 'Diaria'}</dd>
                                    </div>
                                    <div className="backup-status-stats__item">
                                        <dt>Último automático</dt>
                                        <dd>
                                            {backupSummary?.automation?.latest_automated_backup?.created_at
                                                ? formatDateTime(backupSummary.automation.latest_automated_backup.created_at)
                                                : 'Sin registros automáticos'}
                                        </dd>
                                    </div>
                                    <div className="backup-status-stats__item">
                                        <dt>Último local</dt>
                                        <dd>
                                            {backupSummary?.automation?.latest_local_backup?.created_at
                                                ? formatDateTime(backupSummary.automation.latest_local_backup.created_at)
                                                : 'Sin registros locales'}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                            {backupSummary?.automation?.warning_message ? (
                                <Alert type="warning">{backupSummary.automation.warning_message}</Alert>
                            ) : null}
                            <div>
                                <label className="form-label" htmlFor="backup-frequency">FRECUENCIA</label>
                                <div className="form-select-container">
                                    <CustomSelect
                                        id="backup-frequency"
                                        name="backup_frequency"
                                        ariaLabel="Seleccionar frecuencia de respaldo"
                                        icon={Calendar}
                                        value={settings?.backup_frequency || 'daily'}
                                        onChange={(event) => handleFrequencyChange(event.target.value)}
                                        options={[
                                            { value: 'daily', label: 'Diario' },
                                            { value: 'weekly', label: 'Semanal' }
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </article>

                <article className="card stack-md">
                    <div className="card-header">
                        <div>
                            <div className="card-header__title">
                                <Cloud size={18} className="text-primary" />
                                <span>Sincronización cloud</span>
                            </div>
                            <p className="card-header__subtitle">Estado operativo de la integración con Dropbox.</p>
                        </div>
                    </div>

                    {isInitialLoading ? (
                        <p className="text-muted">Cargando estado de sincronización...</p>
                    ) : (
                        <div className="stack-sm">
                            <div className="backup-status-panel stack-sm">
                                <div className="backup-status-panel__header">
                                    <StatusBadge variant={getCloudBadge().variant} showDot>
                                        {getCloudBadge().label}
                                    </StatusBadge>
                                    <span className="backup-status-panel__window">
                                        {cloudStatus.connected ? 'Listo para sincronizar' : 'Sin sincronización activa'}
                                    </span>
                                </div>
                                <p className="backup-status-panel__summary">
                                    {getCloudSummaryText()}
                                </p>
                                <dl className="backup-status-stats">
                                    <div className="backup-status-stats__item">
                                        <dt>Cuenta</dt>
                                        <dd>{cloudStatus.user?.emailAddress || 'Sin cuenta vinculada'}</dd>
                                    </div>
                                    <div className="backup-status-stats__item">
                                        <dt>Última sincronización</dt>
                                        <dd>
                                            {cloudStatus.last_sync_at
                                                ? formatDateTime(cloudStatus.last_sync_at)
                                                : 'Sin registros de sincronización'}
                                        </dd>
                                    </div>
                                    <div className="backup-status-stats__item">
                                        <dt>Estado operativo</dt>
                                        <dd>{cloudStatus.last_error_message ? 'Requiere revisión' : (cloudStatus.connected ? 'Sin incidencias' : 'Pendiente de conexión')}</dd>
                                    </div>
                                </dl>
                            </div>
                            {cloudStatus.last_error_message ? (
                                <Alert type="warning">{cloudStatus.last_error_message}</Alert>
                            ) : null}

                            <div className="cluster-sm">
                                {!cloudStatus.connected ? (
                                    <button type="button" className="btn btn-secondary" onClick={handleConnectCloud}>
                                        <Upload size={16} />
                                        Conectar Dropbox
                                    </button>
                                ) : (
                                    <button type="button" className="btn btn-secondary" onClick={handleDisconnectCloud}>
                                        Desconectar cuenta
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </article>
            </section>

            <section className="card card--flush table-shell" aria-labelledby="backups-history-title">
                <div className="card-header">
                    <div>
                        <div className="card-header__title" id="backups-history-title">
                            <Database size={18} className="text-primary" />
                            <span>Historial de respaldos</span>
                        </div>
                        <p className="card-header__subtitle">Listado de copias locales y sincronizadas.</p>
                    </div>
                </div>

                {loading ? (
                    <div className="table-loading-overlay" aria-hidden="true">
                        <div className="spinner" />
                    </div>
                ) : null}

                <TableScrollFade>
                    <table className="table table--backups">
                        <caption className="sr-only">Historial de respaldos</caption>
                        <thead>
                            <tr>
                                <th scope="col" className="table__head--datetime">FECHA</th>
                                <th scope="col">ARCHIVO</th>
                                <th scope="col">TAMAÑO</th>
                                <th scope="col">TIPO</th>
                                <th scope="col">ESTADO</th>
                                <th scope="col" align="right">ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && !backups.length ? (
                                <tr>
                                    <td colSpan="6" className="table__empty">Cargando respaldos...</td>
                                </tr>
                            ) : !backups.length ? (
                                <tr>
                                    <td colSpan="6" className="table__empty">No hay respaldos disponibles.</td>
                                </tr>
                            ) : (
                                backups.map((backup) => (
                                    <tr key={backup.id}>
                                        <td className="table__cell--datetime">{formatDateTime(backup.created_at)}</td>
                                        <td>{backup.filename}</td>
                                        <td>{formatSize(backup.size_bytes)}</td>
                                        <td>
                                            <StatusBadge variant={getBackupTypeVariant(backup.type)}>
                                                {backup.type}
                                            </StatusBadge>
                                        </td>
                                        <td>
                                            <StatusBadge variant={backup.status === 'success' ? 'success' : 'danger'} showDot>
                                                {backup.status === 'success' ? 'Completado' : 'Fallido'}
                                            </StatusBadge>
                                        </td>
                                        <td className="table__cell--actions">
                                            <div className="cluster-sm justify-end">
                                                <button
                                                    type="button"
                                                    className="icon-button"
                                                    onClick={() => {
                                                        backupService.download(backup.id).catch(() => {
                                                            setError('No se pudo descargar el respaldo.');
                                                        });
                                                    }}
                                                    aria-label={`Descargar ${backup.filename}`}
                                                >
                                                    <Download size={18} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="icon-button icon-button--danger"
                                                    onClick={() => setShowConfirmDelete(backup.id)}
                                                    aria-label={`Eliminar ${backup.filename}`}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </TableScrollFade>

                <Pagination
                    pagination={pagination}
                    onPageChange={(newPage) => setOffset((newPage - 1) * limit)}
                    onLimitChange={(newLimit) => {
                        setLimit(newLimit);
                        setOffset(0);
                    }}
                />
            </section>

            <ConfirmModal
                isOpen={Boolean(showConfirmDelete)}
                onClose={() => setShowConfirmDelete(null)}
                onConfirm={handleDelete}
                title="Eliminar respaldo"
                message="Esta acción eliminará el archivo del servidor de forma permanente."
                confirmText="Eliminar"
                type="danger"
            />

            <div className="backups-mobile-actions-shell">
                {renderGenerateBackupButton()}
            </div>
        </div>
    );
};

export default Backups;






