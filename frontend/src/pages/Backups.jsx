import React, { useState, useEffect } from 'react';
import {
    Database,
    Download,
    Trash2,
    RefreshCcw,
    Cloud,
    Upload,
    CheckCircle,
    AlertCircle,
    Calendar,
    Clock,
    FileText,
    History,
    Shield,
    Filter,
    ChevronDown
} from 'lucide-react';
import { backupService } from '../services/backupService';
import { settingsService } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import CustomSelect from '../components/CustomSelect';
import { formatDate } from '../utils/formatters';

const Backups = () => {
    const [backups, setBackups] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(null);
    const [error, setError] = useState(null);

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [bData, sData] = await Promise.all([
                backupService.list(),
                settingsService.get()
            ]);
            setBackups(bData);
            setSettings(sData);
        } catch (err) {
            setError('Error al cargar datos de respaldo');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        setError(null);
        try {
            await backupService.generate(user.id);
            await fetchData();
        } catch (err) {
            setError('Error al generar respaldo local');
            console.error(err);
        } finally {
            setGenerating(false);
        }
    };

    const handleDelete = async () => {
        if (!showConfirmDelete) return;
        try {
            await backupService.delete(showConfirmDelete);
            await fetchData();
            setShowConfirmDelete(null);
        } catch (err) {
            setError('No se pudo eliminar el respaldo');
            console.error(err);
        }
    };

    const handleToggleAutomation = async () => {
        const newSettings = {
            ...settings,
            backups_enabled: !settings.backups_enabled
        };
        try {
            await settingsService.update(newSettings);
            setSettings(newSettings);
        } catch (err) {
            console.error('Error updating settings:', err);
        }
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '40px' }} className="text-muted">Cargando gestión de respaldos...</div>;

    return (
        <div className="fade-in">
            {/* Header matches Users.jsx and Fleet.jsx */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
                <div>
                    <h1 style={{ fontSize: '24px' }}>Gestión de Respaldos</h1>
                    <p className="text-muted">Protege tu información y archivos mediante copias de seguridad locales y en la nube.</p>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={generating}
                    style={{
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: generating ? 'not-allowed' : 'pointer',
                        opacity: generating ? 0.7 : 1
                    }}
                >
                    {generating ? (
                        <><RefreshCcw size={18} className="spin" /> Generando...</>
                    ) : (
                        <><Database size={18} /> Generar Respaldo</>
                    )}
                </button>
            </div>

            {error && (
                <div style={{
                    backgroundColor: 'rgba(255, 72, 72, 0.1)',
                    border: '1px solid var(--color-primary)',
                    color: 'white',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--spacing-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
                {/* Automation Card */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                        <Clock size={20} className="text-primary" />
                        <h3 style={{ fontSize: '16px' }}>Automatización</h3>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <p style={{ fontSize: '14px', fontWeight: 'bold' }}>Respaldos Automáticos</p>
                            <p className="text-muted" style={{ fontSize: '12px' }}>Copia de seguridad diaria a la medianoche.</p>
                        </div>
                        <div
                            onClick={handleToggleAutomation}
                            style={{
                                width: '40px',
                                height: '20px',
                                backgroundColor: settings?.backups_enabled ? 'var(--color-primary)' : '#333',
                                borderRadius: '10px',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'all 0.3s'
                            }}
                        >
                            <div style={{
                                width: '16px',
                                height: '16px',
                                backgroundColor: 'white',
                                borderRadius: '50%',
                                position: 'absolute',
                                top: '2px',
                                left: settings?.backups_enabled ? '22px' : '2px',
                                transition: 'all 0.3s'
                            }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontSize: '14px', fontWeight: '500' }}>Frecuencia de respaldo</p>
                        <div style={{
                            width: '160px',
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center',
                            backgroundColor: 'var(--color-bg)',
                            padding: '0 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-border)',
                            height: '42px'
                        }}>
                            <CustomSelect
                                icon={Calendar}
                                value={settings?.backup_frequency || 'daily'}
                                onChange={async (e) => {
                                    const val = e.target.value;
                                    const newSetts = { ...settings, backup_frequency: val };
                                    await settingsService.update(newSetts);
                                    setSettings(newSetts);
                                }}
                                options={[
                                    { value: 'daily', label: 'Diario' },
                                    { value: 'weekly', label: 'Semanal' }
                                ]}
                            />
                        </div>
                    </div>
                </div>

                {/* Cloud Sync Card */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                        <Cloud size={20} className="text-primary" />
                        <h3 style={{ fontSize: '16px' }}>Sincronización Cloud</h3>
                    </div>
                    <div style={{
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        padding: '16px',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center',
                        border: '1px dashed var(--color-border)'
                    }}>
                        <p className="text-muted" style={{ fontSize: '13px', marginBottom: '12px' }}>Google Drive no conectado</p>
                        <button style={{
                            background: 'none',
                            border: '1px solid var(--color-border)',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            margin: '0 auto',
                            cursor: 'pointer'
                        }}>
                            <Upload size={16} />
                            Conectar Google Drive
                        </button>
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="card" style={{ padding: 0, overflow: 'visible' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <History size={20} className="text-primary" />
                    <h3 style={{ fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Historial de Respaldos</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>FECHA</th>
                                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>ARCHIVO</th>
                                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>TAMAÑO</th>
                                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>TIPO</th>
                                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>ESTADO</th>
                                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'right' }}>ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {backups.length === 0 ? (
                                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center' }} className="text-muted">No hay respaldos disponibles.</td></tr>
                            ) : (
                                backups.map(b => (
                                    <tr key={b.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ fontSize: '14px' }}>{formatDate(b.created_at)}</div>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>{b.filename}</div>
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '14px' }}>
                                            {formatSize(b.size_bytes)}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{
                                                fontSize: '10px',
                                                backgroundColor: 'rgba(255,255,255,0.05)',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                fontWeight: 'bold',
                                                textTransform: 'uppercase'
                                            }}>
                                                {b.type === 'local' ? <Database size={12} /> : <Cloud size={12} />}
                                                {b.type}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{
                                                fontSize: '11px',
                                                color: b.status === 'success' ? '#28A745' : '#FF4848',
                                                fontWeight: 'bold',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: b.status === 'success' ? '#28A745' : '#FF4848' }} />
                                                {b.status === 'success' ? 'COMPLETADO' : 'FALLIDO'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => backupService.download(b.id)}
                                                    style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', transition: 'color 0.2s' }}
                                                    onMouseOver={(e) => e.currentTarget.style.color = 'white'}
                                                    onMouseOut={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                                                    title="Descargar"
                                                >
                                                    <Download size={18} />
                                                </button>
                                                <button
                                                    onClick={() => setShowConfirmDelete(b.id)}
                                                    style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', transition: 'color 0.2s' }}
                                                    onMouseOver={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                                                    onMouseOut={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                                                    title="Eliminar"
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
            </div>

            <ConfirmModal
                isOpen={!!showConfirmDelete}
                onClose={() => setShowConfirmDelete(null)}
                onConfirm={handleDelete}
                title="Eliminar Respaldo"
                message="Esta acción borrará el archivo físico del servidor de forma permanente."
                confirmText="Eliminar"
                type="danger"
            />
        </div>
    );
};

export default Backups;
