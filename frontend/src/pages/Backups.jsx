import React, { useEffect, useState } from 'react';
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
import StatusBadge from '../components/StatusBadge';
import { formatDateTime } from '../utils/formatters';
import { useNotification } from '../context/NotificationContext';

const Backups = () => {
    const [backups, setBackups] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(null);
    const [cloudStatus, setCloudStatus] = useState({ connected: false });
    const [error, setError] = useState('');
    const { showNotification } = useNotification();
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    const automationEnabled = settings?.backups_enabled === true
        || settings?.backups_enabled === 'true'
        || settings?.backups_enabled === 1
        || settings?.backups_enabled === '1';

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('sync') === 'success') {
            showNotification('Dropbox se vinculó correctamente', 'success');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [backupData, settingsData, cloudData] = await Promise.all([
                backupService.list(),
                settingsService.get(),
                dropboxService.getStatus()
            ]);

            setBackups(backupData);
            setSettings(settingsData);
            setCloudStatus(cloudData);
            setError('');
        } catch {
            setError('Error al cargar datos de respaldo.');
        } finally {
            setLoading(false);
        }
    };

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
            await fetchData();
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
            setSettings(newSettings);
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
            setSettings(newSettings);
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

    if (loading) {
        return (
            <section className="page-shell fade-in">
                <div className="card">
                    <p className="text-muted">Cargando gestión de respaldos...</p>
                </div>
            </section>
        );
    }

    return (
        <div className="page-shell fade-in stack-lg">
            <PageHeader
                title="Gestión de respaldos"
                subtitle="Protege tu información mediante copias locales y sincronización opcional en Dropbox."
                actions={(
                    <button type="button" className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
                        {generating ? <RefreshCcw size={18} className="spin" /> : <Database size={18} />}
                        {generating ? 'Generando...' : 'Generar respaldo'}
                    </button>
                )}
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

                    <div className="stack-sm">
                        <div className="cluster-sm">
                            <StatusBadge variant={cloudStatus.connected ? 'success' : 'neutral'} showDot>
                                {cloudStatus.connected ? 'Conectado' : 'Sin conexión'}
                            </StatusBadge>
                            {cloudStatus.user?.emailAddress ? (
                                <span className="text-muted">{cloudStatus.user.emailAddress}</span>
                            ) : null}
                        </div>

                        {cloudStatus.last_sync_at ? (
                            <p className="text-muted">Última sincronización: {formatDateTime(cloudStatus.last_sync_at)}</p>
                        ) : null}
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

                <div className="table-scroll">
                    <table className="table">
                        <caption className="sr-only">Historial de respaldos</caption>
                        <thead>
                            <tr>
                                <th scope="col">FECHA</th>
                                <th scope="col">ARCHIVO</th>
                                <th scope="col">TAMAÑO</th>
                                <th scope="col">TIPO</th>
                                <th scope="col">ESTADO</th>
                                <th scope="col" align="right">ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!backups.length ? (
                                <tr>
                                    <td colSpan="6" className="table__empty">No hay respaldos disponibles.</td>
                                </tr>
                            ) : (
                                backups.map((backup) => (
                                    <tr key={backup.id}>
                                        <td>{formatDateTime(backup.created_at)}</td>
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
                                                    onClick={() => backupService.download(backup.id)}
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
                </div>
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
        </div>
    );
};

export default Backups;
