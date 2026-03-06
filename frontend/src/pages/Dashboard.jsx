import React, { useState, useEffect } from 'react';
import { useCallback } from 'react';
import {
    DollarSign, FileText, CheckCircle, Truck, Clock,
    Users, AlertTriangle, BarChart2, Activity
} from 'lucide-react';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    AreaChart, Area, LineChart, Line,
    RadialBarChart, RadialBar
} from 'recharts';
import { dashboardService } from '../services/api';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';

// ── Chart color palette aligned with the design system ───────────────────
const C = {
    primary: '#FF4848',
    success: '#28A745',
    info: '#2F7DE1',
    warning: '#C79100',
    purple: '#8E62C2',
    muted: '#7A8696',
    grid: 'var(--dashboard-grid)',
    axis: 'var(--dashboard-axis)',
    tooltip: 'var(--dashboard-tooltip-bg)',
    border: 'var(--dashboard-tooltip-border)',
};

const ACCENT_TONE_BY_COLOR = {
    [C.primary.toLowerCase()]: 'primary',
    [C.success.toLowerCase()]: 'success',
    [C.info.toLowerCase()]: 'info',
    [C.warning.toLowerCase()]: 'warning',
    [C.purple.toLowerCase()]: 'purple',
    [C.muted.toLowerCase()]: 'muted'
};

const resolveAccentTone = (color) => {
    const normalized = typeof color === 'string' ? color.trim().toLowerCase() : '';
    return ACCENT_TONE_BY_COLOR[normalized] || 'neutral';
};

const STATUS_COLORS = {
    completada: C.success,
    pendiente: C.warning,
    en_proceso: C.info,
    cancelada: C.muted,
};

const FLEET_COLORS = {
    available: C.success,
    in_route: C.info,
    maintenance: C.warning,
};

const STATUS_LABEL = {
    completada: 'Completada',
    pendiente: 'Pendiente',
    en_proceso: 'En Proceso',
    cancelada: 'Cancelada',
};
const FLEET_LABEL = {
    available: 'Disponible',
    in_route: 'En Ruta',
    maintenance: 'Mantenimiento',
};

const STATUS_VARIANT = {
    completada: 'success',
    pendiente: 'warning',
    en_proceso: 'info',
    cancelada: 'neutral',
};

const LOG_TYPE_VARIANT = {
    system: 'neutral',
    business: 'info',
    auth: 'warning',
    config: 'warning',
    error: 'error',
};

// ── Formatters ─────────────────────────────────────────────────────────────

// Full currency with 2 decimal places — for tables and detailed views
const formatMXN = (v) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);

// Compact currency for KPI cards — avoids digit overflow (1.2K, 1.5M)
const formatKpi = (v) => {
    const n = parseFloat(v) || 0;
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (Math.abs(n) >= 10_000) return `$${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
};

// Minutes → "2h 15m" or "45m"
const fmtMin = (m) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
};

// Date formatter (es-MX): "27 feb 2026, 11:05"
const formatDate = (raw) => {
    if (!raw) return '—';
    const d = raw instanceof Date ? raw : new Date(raw);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};



// ── Custom Recharts tooltip ────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="dashboard-tooltip">
            {label && <p className="dashboard-tooltip__label">{label}</p>}
            {payload.map((p, i) => (
                <p
                    key={i}
                    className={`dashboard-tooltip__row dashboard-tooltip__row--${resolveAccentTone(p.color)}`.trim()}
                >
                    {p.name}: <span className="dashboard-tooltip__value">{p.value}</span>
                </p>
            ))}
        </div>
    );
};

// ── Shared legend formatter ────────────────────────────────────────────────
const legendFmt = (v) => (
    <span className="dashboard-legend-label">{v}</span>
);

// ── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, color = C.primary, sub, className = '' }) => {
    const accentTone = resolveAccentTone(color);

    return (
        <div className={`card dashboard-kpi-card ${className}`.trim()}>
            <div className={`dashboard-kpi-card__icon dashboard-kpi-card__icon--${accentTone}`.trim()}>
                {icon}
            </div>
            <div>
                <p className="dashboard-kpi-card__label">{label}</p>
                <p className="dashboard-kpi-card__value">{value}</p>
                {sub && <p className="dashboard-kpi-card__sub">{sub}</p>}
            </div>
        </div>
    );
};

// ── Section Card ───────────────────────────────────────────────────────────
const Section = ({ title, children, className = '' }) => (
    <div className={`card dashboard-section ${className}`.trim()}>
        <div className="dashboard-section__header">
            <h3 className="dashboard-section__title">{title}</h3>
        </div>
        {children}
    </div>
);

// ─── Reusable chart styles ─────────────────────────────────────────────────
const axisProps = {
    tick: { fill: C.axis, fontSize: 11, fontFamily: 'inherit' },
    axisLine: false,
    tickLine: false,
};

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN VIEW
// ═══════════════════════════════════════════════════════════════════════════
const AdminDashboard = ({ data }) => {
    const { kpis, quotations_by_status, top_operators, by_day, fleet_status, fleet_efficiency, recent_logs } = data;

    const pieData = (quotations_by_status || [])
        .filter(r => r.count > 0)
        .map(r => ({
            name: STATUS_LABEL[r.status] || r.status,
            value: r.count,
            color: STATUS_COLORS[r.status] || C.muted,
        }));

    const barData = (top_operators || []).map(r => ({
        name: r.name.split(' ')[0],
        total: parseInt(r.total),
    }));

    const areaData = (by_day || []).map(r => {
        // mysql2 may return DATE as a JS Date object or as a 'YYYY-MM-DD' string
        const raw = r.day instanceof Date
            ? r.day.toISOString().split('T')[0]   // already a Date — extract YYYY-MM-DD
            : String(r.day).split('T')[0];         // string — trim any time portion
        return {
            day: new Date(raw + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
            cotizaciones: r.count,
        };
    });


    const fleetPie = (fleet_status || [])
        .filter(r => r.count > 0)
        .map(r => ({
            name: FLEET_LABEL[r.status] || r.status,
            value: r.count,
            color: FLEET_COLORS[r.status] || C.muted,
        }));

    const maxBar = Math.max(...barData.map(d => d.total), 1);
    const effVal = parseFloat(fleet_efficiency || 0);
    const effTone = effVal >= 90 ? 'success' : effVal >= 70 ? 'warning' : 'primary';

    return (
        <div className="dashboard-stack dashboard-stack--admin">
            {/* KPIs */}
            <div className="dashboard-kpis-grid">
                <KpiCard icon={<DollarSign size={20} />} label="Ingresos del período" value={formatKpi(kpis.revenue)} color={C.success} className="dashboard-kpi-card--hero" />
                <KpiCard icon={<FileText size={20} />} label="Total cotizaciones" value={kpis.total_quotes} color={C.info} />
                <KpiCard icon={<CheckCircle size={20} />} label="Tasa de éxito" value={`${kpis.success_rate}%`} color={C.primary} sub="cotizaciones completadas" />
                <KpiCard icon={<Truck size={20} />} label="Vehículos disponibles" value={kpis.available_vehicles} color={C.warning} />
                <KpiCard icon={<Users size={20} />} label="Usuarios activos" value={kpis.active_users} color={C.purple} />
            </div>

            {/* Row 1: Donut + Bar */}
            <div className="dashboard-two-grid">
                <Section title="Distribución de cotizaciones" className="dashboard-section--distribution">
                    {pieData.length === 0
                        ? <p className="dashboard-empty">Sin datos en el período</p>
                        : <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <defs>
                                    {pieData.map((d, i) => (
                                        <radialGradient key={i} id={`pg${i}`} cx="50%" cy="50%" r="50%">
                                            <stop offset="0%" stopColor={d.color} stopOpacity={1} />
                                            <stop offset="100%" stopColor={d.color} stopOpacity={0.7} />
                                        </radialGradient>
                                    ))}
                                </defs>
                                <Pie
                                    data={pieData}
                                    cx="50%" cy="50%"
                                    innerRadius={52} outerRadius={80}
                                    paddingAngle={4}
                                    dataKey="value"
                                    strokeWidth={0}
                                >
                                    {pieData.map((entry, i) => <Cell key={i} fill={`url(#pg${i})`} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    iconType="circle" iconSize={8}
                                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                                    formatter={legendFmt}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    }
                </Section>

                <Section title="Top operadores" className="dashboard-section--operators">
                    {barData.length === 0
                        ? <p className="dashboard-empty">Sin datos en el período</p>
                        : <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={barData} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="2 4" stroke={C.grid} horizontal={false} />
                                <XAxis
                                    type="number"
                                    domain={[0, maxBar + 1]}
                                    tickCount={Math.min(maxBar + 2, 6)}
                                    allowDecimals={false}
                                    {...axisProps}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={64}
                                    {...axisProps}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--dashboard-cursor-fill)' }} />
                                <Bar dataKey="total" name="Completadas" radius={[0, 8, 8, 0]} maxBarSize={14} fill="transparent">
                                    {barData.map((_, i) => (
                                        <Cell key={i} fill={`url(#barGrad${i})`} />
                                    ))}
                                </Bar>
                                <defs>
                                    {barData.map((_, i) => (
                                        <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor={C.primary} stopOpacity={0.5} />
                                            <stop offset="100%" stopColor={C.primary} stopOpacity={1} />
                                        </linearGradient>
                                    ))}
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    }
                </Section>
            </div>

            {/* Row 2: Area + Fleet donut */}
            <div className="dashboard-wide-grid">
                <Section title="Actividad en el período" className="dashboard-section--activity dashboard-section--primary">
                    {areaData.length === 0
                        ? <p className="dashboard-empty">Sin actividad en el período</p>
                        : <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={areaData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                                <defs>
                                    <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={C.primary} stopOpacity={0.35} />
                                        <stop offset="100%" stopColor={C.primary} stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="2 6" stroke={C.grid} />
                                <XAxis dataKey="day" interval="preserveStartEnd" {...axisProps} tick={{ ...axisProps.tick, fontSize: 10 }} />
                                <YAxis allowDecimals={false} {...axisProps} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="cotizaciones"
                                    name="Cotizaciones"
                                    stroke={C.primary}
                                    strokeWidth={2.5}
                                    fill="url(#gradArea)"
                                    dot={false}
                                    activeDot={{ r: 5, fill: C.primary, strokeWidth: 0 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    }
                </Section>

                <Section title="Estado de flota" className="dashboard-section--fleet dashboard-section--compact">
                    <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                            <Pie
                                data={fleetPie.length > 0 ? fleetPie : [{ name: 'Sin datos', value: 1, color: C.grid }]}
                                cx="50%" cy="50%"
                                innerRadius={42} outerRadius={65}
                                paddingAngle={fleetPie.length > 1 ? 4 : 0}
                                dataKey="value"
                                strokeWidth={0}
                            >
                                {(fleetPie.length > 0 ? fleetPie : [{ color: C.muted }]).map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} formatter={legendFmt} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="dashboard-inline-stat">
                        <span className="dashboard-inline-stat__label">Eficiencia promedio: </span>
                        <span className={`dashboard-inline-stat__value dashboard-inline-stat__value--${effTone}`.trim()}>{effVal.toFixed(1)}%</span>
                    </div>
                </Section>
            </div>

            {/* Recent logs */}
            <Section title="Actividad reciente del sistema" className="dashboard-section--logs">
                {(recent_logs || []).length === 0
                    ? <p className="dashboard-empty dashboard-empty--compact">Sin registros recientes</p>
                    : (recent_logs || []).map((log, i) => (
                        <div key={i} className="dashboard-list-row">
                            <div className="dashboard-list-row__main">
                                <StatusBadge variant={LOG_TYPE_VARIANT[log.log_type] || 'neutral'}>
                                    {log.log_type}
                                </StatusBadge>
                                <span className="dashboard-list-row__title">{log.action}</span>
                            </div>
                            <div className="dashboard-list-row__stack">
                                <span className="dashboard-list-row__user">{log.user_name || 'Sistema'}</span>
                                <span className="dashboard-list-row__meta">{formatDate(log.created_at)}</span>
                            </div>
                        </div>
                    ))
                }
            </Section>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// SUPERVISOR VIEW
// ═══════════════════════════════════════════════════════════════════════════
const SupervisorDashboard = ({ data }) => {
    const { kpis, quotations_by_status, fleet_status, fleet_efficiency, pending_quotes, top_operators, by_day } = data;

    const quotePie = (quotations_by_status || [])
        .filter(r => r.count > 0)
        .map(r => ({
            name: STATUS_LABEL[r.status] || r.status,
            value: r.count,
            color: STATUS_COLORS[r.status] || C.muted,
        }));

    const fleetPie = (fleet_status || [])
        .filter(r => r.count > 0)
        .map(r => ({
            name: FLEET_LABEL[r.status] || r.status,
            value: r.count,
            color: FLEET_COLORS[r.status] || C.muted,
        }));

    const barData = (top_operators || []).map(r => ({
        name: r.name.split(' ')[0],
        total: parseInt(r.total),
    }));

    const areaData = (by_day || []).map(r => {
        const raw = r.day instanceof Date
            ? r.day.toISOString().split('T')[0]
            : String(r.day).split('T')[0];
        return {
            day: new Date(raw + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
            cotizaciones: r.count,
        };
    });

    const eff = parseFloat(fleet_efficiency || 0);
    const effTone = eff >= 90 ? 'success' : eff >= 70 ? 'warning' : 'primary';
    const effColor = C[effTone];
    const radialData = [{ name: 'Eficiencia', value: Math.min(eff, 100), fill: effColor }];
    const maxBar = Math.max(...barData.map(d => d.total), 1);

    return (
        <div className="dashboard-stack dashboard-stack--supervisor">
            <div className="dashboard-kpis-grid dashboard-kpis-grid--supervisor">
                <KpiCard icon={<DollarSign size={20} />} label="Ingresos del período" value={formatKpi(kpis.revenue)} color={C.success} />
                <KpiCard icon={<Activity size={20} />} label="Cotizaciones activas" value={kpis.active_quotes} color={C.info} />
                <KpiCard icon={<Truck size={20} />} label="Vehículos en ruta" value={kpis.vehicles_in_route} color={C.primary} />
                <KpiCard icon={<Clock size={20} />} label="Tiempo prom./ruta" value={fmtMin(kpis.avg_route_time)} color={C.warning} sub="cotizaciones completadas" />
            </div>

            <div className="dashboard-two-grid dashboard-two-grid--supervisor">
                <Section title="Cotizaciones pendientes recientes" className="dashboard-section--pending dashboard-section--primary">
                    {(pending_quotes || []).length === 0
                        ? <p className="dashboard-empty dashboard-empty--compact">Sin cotizaciones pendientes</p>
                        : (pending_quotes || []).map((q, i) => (
                            <div key={i} className="dashboard-list-row">
                                <div>
                                    <p className="dashboard-list-row__title">{q.folio}</p>
                                    <p className="dashboard-list-row__meta">{q.operator}</p>
                                </div>
                                <p className="dashboard-list-row__value dashboard-list-row__value--warning">{formatKpi(q.total)}</p>
                            </div>
                        ))
                    }
                </Section>

                <Section title="Actividad en el período" className="dashboard-section--activity">
                    {areaData.length === 0
                        ? <p className="dashboard-empty">Sin actividad en el período</p>
                        : <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={areaData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                                <defs>
                                    <linearGradient id="gradAreaSupervisor" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={C.primary} stopOpacity={0.35} />
                                        <stop offset="100%" stopColor={C.primary} stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="2 6" stroke={C.grid} />
                                <XAxis dataKey="day" interval="preserveStartEnd" {...axisProps} tick={{ ...axisProps.tick, fontSize: 10 }} />
                                <YAxis allowDecimals={false} {...axisProps} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="cotizaciones"
                                    name="Cotizaciones"
                                    stroke={C.primary}
                                    strokeWidth={2.5}
                                    fill="url(#gradAreaSupervisor)"
                                    dot={false}
                                    activeDot={{ r: 5, fill: C.primary, strokeWidth: 0 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    }
                </Section>
            </div>

            <div className="dashboard-three-grid">
                <Section title="Top operadores" className="dashboard-section--operators">
                    {barData.length === 0
                        ? <p className="dashboard-empty">Sin datos en el período</p>
                        : <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={barData} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="2 4" stroke={C.grid} horizontal={false} />
                                <XAxis
                                    type="number"
                                    domain={[0, maxBar + 1]}
                                    tickCount={Math.min(maxBar + 2, 6)}
                                    allowDecimals={false}
                                    {...axisProps}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={64}
                                    {...axisProps}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--dashboard-cursor-fill)' }} />
                                <Bar dataKey="total" name="Completadas" radius={[0, 8, 8, 0]} maxBarSize={14} fill="transparent">
                                    {barData.map((_, i) => (
                                        <Cell key={i} fill={`url(#supervisorBarGrad${i})`} />
                                    ))}
                                </Bar>
                                <defs>
                                    {barData.map((_, i) => (
                                        <linearGradient key={i} id={`supervisorBarGrad${i}`} x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor={C.primary} stopOpacity={0.5} />
                                            <stop offset="100%" stopColor={C.primary} stopOpacity={1} />
                                        </linearGradient>
                                    ))}
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    }
                </Section>

                <Section title="Cotizaciones por estado" className="dashboard-section--status">
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={quotePie} cx="50%" cy="50%" innerRadius={48} outerRadius={76} paddingAngle={4} dataKey="value" strokeWidth={0}>
                                {quotePie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} formatter={legendFmt} />
                        </PieChart>
                    </ResponsiveContainer>
                </Section>

                <Section title="Estado de flota" className="dashboard-section--fleet">
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie
                                data={fleetPie.length > 0 ? fleetPie : [{ name: 'Sin datos', value: 1, color: C.muted }]}
                                cx="50%" cy="50%"
                                innerRadius={48} outerRadius={76}
                                paddingAngle={fleetPie.length > 1 ? 4 : 0}
                                dataKey="value"
                                strokeWidth={0}
                            >
                                {(fleetPie.length > 0 ? fleetPie : [{ color: C.muted }]).map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} formatter={legendFmt} />
                        </PieChart>
                    </ResponsiveContainer>
                </Section>

            </div>

            <Section title="Eficiencia de flota" className="dashboard-section--efficiency">
                <ResponsiveContainer width="100%" height={180}>
                    <RadialBarChart
                        cx="50%" cy="55%"
                        innerRadius="60%" outerRadius="95%"
                        data={radialData}
                        startAngle={200} endAngle={-20}
                    >
                        <RadialBar
                            dataKey="value"
                            cornerRadius={10}
                            background={{ fill: 'var(--dashboard-radial-track)', cornerRadius: 10 }}
                        />
                        <text
                            x="50%"
                            y="52%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className={`dashboard-radial-value dashboard-radial-value--${effTone}`.trim()}
                        >
                            {eff.toFixed(0)}%
                        </text>
                        <text
                            x="50%"
                            y="66%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="dashboard-radial-label"
                        >
                            REAL / TEÓRICO
                        </text>
                        <Tooltip content={<CustomTooltip />} />
                    </RadialBarChart>
                </ResponsiveContainer>
            </Section>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// OPERADOR VIEW
// ═══════════════════════════════════════════════════════════════════════════
const OperadorDashboard = ({ data }) => {
    const { kpis, my_status, my_weekly, my_recent } = data;

    const pieMine = (my_status || [])
        .filter(r => r.count > 0)
        .map(r => ({
            name: STATUS_LABEL[r.status] || r.status,
            value: r.count,
            color: STATUS_COLORS[r.status] || C.muted,
        }));

    const lineData = (my_weekly || []).map((r, i) => ({
        semana: `S${i + 1}`,
        cotizaciones: r.count,
    }));

    return (
        <div className="dashboard-stack dashboard-stack--operador">
            <div className="dashboard-kpis-grid">
                <KpiCard icon={<FileText size={20} />} label="Mis cotizaciones" value={kpis.total_quotes} color={C.info} />
                <KpiCard icon={<CheckCircle size={20} />} label="Completadas en período" value={kpis.completed_this_month} color={C.success} />
                <KpiCard icon={<DollarSign size={20} />} label="Monto gestionado" value={formatKpi(kpis.revenue_this_month)} color={C.primary} sub="en el período" />
                <KpiCard icon={<AlertTriangle size={20} />} label="Pendientes" value={kpis.pending} color={C.warning} />
            </div>

            <div className="dashboard-feature-grid">
                <Section title="Mis cotizaciones por estado" className="dashboard-section--status">
                    {pieMine.length === 0
                        ? <p className="dashboard-empty">Sin cotizaciones aún</p>
                        : <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={pieMine} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={4} dataKey="value" strokeWidth={0}>
                                    {pieMine.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} formatter={legendFmt} />
                            </PieChart>
                        </ResponsiveContainer>
                    }
                </Section>

                <Section title="Mi actividad semanal (últimas 8 semanas)" className="dashboard-section--weekly">
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={lineData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                            <defs>
                                <linearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={C.info} stopOpacity={0.25} />
                                    <stop offset="100%" stopColor={C.info} stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="2 6" stroke={C.grid} />
                            <XAxis dataKey="semana" {...axisProps} />
                            <YAxis allowDecimals={false} {...axisProps} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="cotizaciones"
                                name="Cotizaciones"
                                stroke={C.info}
                                strokeWidth={2.5}
                                dot={{ fill: C.info, r: 4, strokeWidth: 0 }}
                                activeDot={{ r: 6, fill: C.info, strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </Section>
            </div>

            <Section title="Mis últimas cotizaciones" className="dashboard-section--recent dashboard-section--primary">
                {(my_recent || []).length === 0
                    ? <p className="dashboard-empty dashboard-empty--compact">Sin cotizaciones aún</p>
                    : (
                        <table className="dashboard-table">
                            <thead>
                                <tr>
                                    {['Folio', 'Destino', 'Total', 'Estado'].map(h => (
                                        <th key={h} className={h === 'Total' ? 'dashboard-table__head-cell--right' : h === 'Estado' ? 'dashboard-table__head-cell--center' : ''}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(my_recent || []).map((q, i) => (
                                    <tr key={i}>
                                        <td className="dashboard-table__folio">{q.folio}</td>
                                        <td className="dashboard-table__destination">{q.destination_address}</td>
                                        <td className="dashboard-table__cell--right">{formatMXN(q.total)}</td>
                                        <td className="dashboard-table__cell--center">
                                            <StatusBadge variant={STATUS_VARIANT[q.status] || 'neutral'}>
                                                {STATUS_LABEL[q.status] || q.status}
                                            </StatusBadge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                }
            </Section>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// PERIOD FILTER BAR
// ═══════════════════════════════════════════════════════════════════════════
const PERIODS = [
    { key: 'month', label: 'Este mes' },
    { key: 'week', label: 'Esta semana' },
    { key: 'today', label: 'Hoy' },
    { key: 'year', label: 'Este año' },
    { key: '', label: 'Todo' },
];

const calcDates = (period) => {
    if (!period) return { from: null, to: null };
    const now = new Date();
    const start = new Date();
    if (period === 'week') {
        const day = now.getDay() || 7;
        if (day !== 1) start.setDate(now.getDate() - (day - 1));
    } else if (period === 'month') {
        start.setDate(1);
    } else if (period === 'year') {
        start.setMonth(0, 1);
    }
    return {
        from: start.toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
    };
};

const PeriodBar = ({ value, onChange }) => (
    <div className="dashboard-period-bar">
        {PERIODS.map(p => {
            const active = value === p.key;
            return (
                <button
                    key={p.key === '' ? 'all' : p.key}
                    onClick={() => onChange(p.key)}
                    className={`dashboard-period-bar__button ${active ? 'dashboard-period-bar__button--active' : ''}`.trim()}
                >
                    {p.label}
                </button>
            );
        })}
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
const Dashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [period, setPeriod] = useState('year');

    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    const roleName = (user.role_name || 'OPERADOR').toUpperCase();

    const ROLE_SUBTITLE = {
        ADMIN: 'Vista ejecutiva — métricas globales del negocio',
        SUPERVISOR: 'Vista operativa — seguimiento de flota y operaciones',
        OPERADOR: 'Vista personal — tu actividad y rendimiento',
    };

    const load = useCallback(async (p) => {
        setLoading(true);
        setError(null);
        try {
            const { from, to } = calcDates(p);
            const result = await dashboardService.stats(user.id, roleName, from, to);
            setData(result);
        } catch (err) {
            console.error('Dashboard error:', err);
            setError('No se pudo cargar el panel. Verifica la conexión con el servidor.');
        } finally {
            setLoading(false);
        }
    }, [roleName, user.id]);

    useEffect(() => { load(period); }, [load, period]);

    return (
        <div className="page-shell fade-in">
            <PageHeader
                title="Panel de Control"
                subtitle={ROLE_SUBTITLE[roleName] || 'Resumen de operaciones.'}
            />

            <PeriodBar value={period} onChange={setPeriod} />

            {loading && (
                <div className="dashboard-state">
                    <div className="spinner dashboard-state__icon dashboard-state__icon--spinner" />
                    <p className="dashboard-state__message">Cargando analytics...</p>
                </div>
            )}

            {error && (
                <div className="dashboard-state dashboard-state--error">
                    <AlertTriangle size={28} className="dashboard-state__icon dashboard-state__icon--error" />
                    <p className="dashboard-state__message">{error}</p>
                </div>
            )}

            {!loading && !error && data && (
                <>
                    {roleName === 'ADMIN' && <AdminDashboard data={data} />}
                    {roleName === 'SUPERVISOR' && <SupervisorDashboard data={data} />}
                    {roleName === 'OPERADOR' && <OperadorDashboard data={data} />}
                </>
            )}
        </div>
    );
};

export default Dashboard;
