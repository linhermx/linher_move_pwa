import React, { useState, useEffect } from 'react';
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

// ── Chart color palette aligned with the design system ───────────────────
const C = {
    primary: '#FF4848',
    success: '#28A745',
    info: '#4A90E2',      // softer blue than #007BFF
    warning: '#FFC107',
    purple: '#9B59B6',
    muted: '#6C757D',
    grid: 'rgba(255,255,255,0.04)',
    axis: 'rgba(255,255,255,0.25)',
    tooltip: '#1a1a1a',
    border: 'rgba(255,255,255,0.08)',
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
        <div style={{
            background: C.tooltip,
            border: `1px solid ${C.border}`,
            borderRadius: '10px',
            padding: '10px 14px',
            fontSize: '12px',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
            {label && <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '6px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>}
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color || 'white', fontWeight: '600', margin: '2px 0' }}>
                    {p.name}: <span style={{ color: 'white' }}>{p.value}</span>
                </p>
            ))}
        </div>
    );
};

// ── Shared legend formatter ────────────────────────────────────────────────
const legendFmt = (v) => (
    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>{v}</span>
);

// ── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, color = C.primary, sub }) => (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
            background: `linear-gradient(135deg, ${color}22 0%, ${color}0a 100%)`,
            border: `1px solid ${color}30`,
            color,
            padding: '13px',
            borderRadius: '14px',
            flexShrink: 0,
        }}>
            {icon}
        </div>
        <div>
            <p style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</p>
            <p style={{ fontSize: '24px', fontWeight: '800', lineHeight: 1, letterSpacing: '-0.5px' }}>{value}</p>
            {sub && <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '3px' }}>{sub}</p>}
        </div>
    </div>
);

// ── Section Card ───────────────────────────────────────────────────────────
const Section = ({ title, children, style }) => (
    <div className="card" style={style}>
        <p style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: '16px' }}>{title}</p>
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
    const effColor = effVal >= 90 ? C.success : effVal >= 70 ? C.warning : C.primary;

    const logTypeColor = { system: C.muted, business: C.info, auth: C.primary, config: C.warning };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
                <KpiCard icon={<DollarSign size={20} />} label="Ingresos del período" value={formatKpi(kpis.revenue)} color={C.success} />
                <KpiCard icon={<FileText size={20} />} label="Total cotizaciones" value={kpis.total_quotes} color={C.info} />
                <KpiCard icon={<CheckCircle size={20} />} label="Tasa de éxito" value={`${kpis.success_rate}%`} color={C.primary} sub="cotizaciones completadas" />
                <KpiCard icon={<Truck size={20} />} label="Vehículos disponibles" value={kpis.available_vehicles} color={C.warning} />
                <KpiCard icon={<Users size={20} />} label="Usuarios activos" value={kpis.active_users} color={C.purple} />
            </div>

            {/* Row 1: Donut + Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                <Section title="Distribución de cotizaciones">
                    {pieData.length === 0
                        ? <p style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Sin datos en el período</p>
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

                <Section title="Top operadores">
                    {barData.length === 0
                        ? <p style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Sin datos en el período</p>
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
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
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
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-lg)' }}>
                <Section title="Actividad en el período">
                    {areaData.length === 0
                        ? <p style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Sin actividad en el período</p>
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

                <Section title="Estado de flota">
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
                    <div style={{ textAlign: 'center', marginTop: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Eficiencia promedio: </span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: effColor }}>{effVal.toFixed(1)}%</span>
                    </div>
                </Section>
            </div>

            {/* Recent logs */}
            <Section title="Actividad reciente del sistema">
                {(recent_logs || []).length === 0
                    ? <p style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Sin registros recientes</p>
                    : (recent_logs || []).map((log, i) => (
                        <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '10px 0',
                            borderBottom: i < recent_logs.length - 1 ? `1px solid ${C.border}` : 'none',
                        }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <span style={{
                                    padding: '2px 8px', borderRadius: '6px', fontSize: '9px',
                                    fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase',
                                    background: `${logTypeColor[log.log_type] || C.primary}18`,
                                    color: logTypeColor[log.log_type] || C.primary,
                                    border: `1px solid ${logTypeColor[log.log_type] || C.primary}30`,
                                }}>
                                    {log.log_type}
                                </span>
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>{log.action}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{log.user_name || 'Sistema'}</span>
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>{formatDate(log.created_at)}</span>
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
    const { kpis, quotations_by_status, fleet_status, fleet_efficiency, pending_quotes } = data;

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

    const eff = parseFloat(fleet_efficiency || 0);
    const effColor = eff >= 90 ? C.success : eff >= 70 ? C.warning : C.primary;
    const radialData = [{ name: 'Eficiencia', value: Math.min(eff, 100), fill: effColor }];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--spacing-md)' }}>
                <KpiCard icon={<Activity size={20} />} label="Cotizaciones activas" value={kpis.active_quotes} color={C.info} />
                <KpiCard icon={<Truck size={20} />} label="Veh\u00edculos en ruta" value={kpis.vehicles_in_route} color={C.primary} />
                <KpiCard icon={<Clock size={20} />} label="Tiempo prom./ruta" value={fmtMin(kpis.avg_route_time)} color={C.warning} sub="cotizaciones completadas" />
            </div>


            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-lg)' }}>
                <Section title="Cotizaciones por estado">
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

                <Section title="Estado de flota">
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

                <Section title="Eficiencia de flota">
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
                                background={{ fill: 'rgba(255,255,255,0.04)', cornerRadius: 10 }}
                            />
                            <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle"
                                style={{ fill: effColor, fontSize: '28px', fontWeight: '800' }}>
                                {eff.toFixed(0)}%
                            </text>
                            <text x="50%" y="66%" textAnchor="middle" dominantBaseline="middle"
                                style={{ fill: 'rgba(255,255,255,0.3)', fontSize: '10px', letterSpacing: '1px' }}>
                                REAL / TEÓRICO
                            </text>
                            <Tooltip content={<CustomTooltip />} />
                        </RadialBarChart>
                    </ResponsiveContainer>
                </Section>
            </div>

            <Section title="Cotizaciones pendientes recientes">
                {(pending_quotes || []).length === 0
                    ? <p style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Sin cotizaciones pendientes</p>
                    : (pending_quotes || []).map((q, i) => (
                        <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '10px 0',
                            borderBottom: i < pending_quotes.length - 1 ? `1px solid ${C.border}` : 'none',
                        }}>
                            <div>
                                <p style={{ fontWeight: '700', fontSize: '13px' }}>{q.folio}</p>
                                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{q.operator}</p>
                            </div>
                            <p style={{ fontWeight: '700', color: C.warning, fontSize: '14px' }}>{formatKpi(q.total)}</p>
                        </div>
                    ))
                }
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

    const getStatusColor = (s) =>
        ({ completada: C.success, pendiente: C.warning, en_proceso: C.info, cancelada: C.muted }[s] || C.muted);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
                <KpiCard icon={<FileText size={20} />} label="Mis cotizaciones" value={kpis.total_quotes} color={C.info} />
                <KpiCard icon={<CheckCircle size={20} />} label="Completadas en período" value={kpis.completed_this_month} color={C.success} />
                <KpiCard icon={<DollarSign size={20} />} label="Monto gestionado" value={formatKpi(kpis.revenue_this_month)} color={C.primary} sub="en el período" />
                <KpiCard icon={<AlertTriangle size={20} />} label="Pendientes" value={kpis.pending} color={C.warning} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--spacing-lg)' }}>
                <Section title="Mis cotizaciones por estado">
                    {pieMine.length === 0
                        ? <p style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Sin cotizaciones aún</p>
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

                <Section title="Mi actividad semanal (últimas 8 semanas)">
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

            <Section title="Mis últimas cotizaciones">
                {(my_recent || []).length === 0
                    ? <p style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Sin cotizaciones aún</p>
                    : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    {['Folio', 'Destino', 'Total', 'Estado'].map(h => (
                                        <th key={h} style={{ textAlign: h === 'Total' ? 'right' : h === 'Estado' ? 'center' : 'left', padding: '6px 0', fontSize: '9px', fontWeight: '700', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(my_recent || []).map((q, i) => (
                                    <tr key={i}>
                                        <td style={{ padding: '11px 0', fontWeight: '700', fontSize: '13px', borderBottom: `1px solid ${C.border}` }}>{q.folio}</td>
                                        <td style={{ padding: '11px 0', color: 'rgba(255,255,255,0.5)', fontSize: '12px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderBottom: `1px solid ${C.border}` }}>{q.destination_address}</td>
                                        <td style={{ padding: '11px 0', textAlign: 'right', fontWeight: '700', fontSize: '13px', borderBottom: `1px solid ${C.border}` }}>{formatMXN(q.total)}</td>
                                        <td style={{ padding: '11px 0', textAlign: 'center', borderBottom: `1px solid ${C.border}` }}>
                                            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', background: `${getStatusColor(q.status)}18`, color: getStatusColor(q.status), border: `1px solid ${getStatusColor(q.status)}30` }}>
                                                {STATUS_LABEL[q.status] || q.status}
                                            </span>
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
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: 'var(--spacing-lg)' }}>
        {PERIODS.map(p => {
            const active = value === p.key;
            return (
                <button
                    key={p.key === '' ? 'all' : p.key}
                    onClick={() => onChange(p.key)}
                    style={{
                        padding: '6px 16px',
                        borderRadius: '20px',
                        border: active ? `1px solid ${C.primary}` : `1px solid rgba(255,255,255,0.1)`,
                        background: active ? `${C.primary}18` : 'rgba(255,255,255,0.03)',
                        color: active ? C.primary : 'rgba(255,255,255,0.45)',
                        fontSize: '12px',
                        fontWeight: active ? '700' : '400',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        letterSpacing: active ? '0.2px' : '0',
                    }}
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
    const [period, setPeriod] = useState('month');

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const roleName = (user.role_name || 'OPERADOR').toUpperCase();

    const ROLE_SUBTITLE = {
        ADMIN: 'Vista ejecutiva — métricas globales del negocio',
        SUPERVISOR: 'Vista operativa — seguimiento de flota y operaciones',
        OPERADOR: 'Vista personal — tu actividad y rendimiento',
    };

    const load = async (p) => {
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
    };

    useEffect(() => { load(period); }, [period]);

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <h1 style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.3px' }}>Panel de Control</h1>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>
                    {ROLE_SUBTITLE[roleName] || 'Resumen de operaciones'}
                </p>
            </div>

            <PeriodBar value={period} onChange={setPeriod} />

            {loading && (
                <div style={{ textAlign: 'center', padding: '80px 0' }}>
                    <div style={{
                        width: '32px', height: '32px',
                        border: `3px solid ${C.primary}20`,
                        borderTopColor: C.primary,
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        margin: '0 auto 12px',
                    }} />
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Cargando analytics...</p>
                </div>
            )}

            {error && (
                <div style={{ textAlign: 'center', padding: '48px 0', color: C.primary }}>
                    <AlertTriangle size={28} style={{ marginBottom: '10px' }} />
                    <p style={{ fontSize: '13px' }}>{error}</p>
                </div>
            )}

            {!loading && !error && data && (
                <>
                    {roleName === 'ADMIN' && <AdminDashboard data={data} />}
                    {roleName === 'SUPERVISOR' && <SupervisorDashboard data={data} />}
                    {roleName === 'OPERADOR' && <OperadorDashboard data={data} />}
                </>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default Dashboard;
