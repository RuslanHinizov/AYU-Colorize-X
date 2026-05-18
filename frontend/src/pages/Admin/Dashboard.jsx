import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Activity, CheckCircle, XCircle, Server, Cpu, HardDrive, Zap,
    TrendingUp, Clock, Wifi, BarChart3, Database, Trash2,
    UserPlus, Ban, Settings, FileText
} from 'lucide-react';
import axios from '../../lib/axios';

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [resources, setResources] = useState(null);
    const [charts, setCharts] = useState(null);
    const [uptime, setUptime] = useState(null);
    const [wsStats, setWsStats] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [statsRes, resourcesRes, chartsRes, uptimeRes, wsRes, logsRes] = await Promise.all([
                axios.get('/admin/stats'),
                axios.get('/admin/system/resources'),
                axios.get('/admin/stats/charts').catch(() => ({ data: null })),
                axios.get('/admin/system/uptime').catch(() => ({ data: null })),
                axios.get('/admin/system/websocket-stats').catch(() => ({ data: { active_connections: 0 } })),
                axios.get('/admin/audit-logs?limit=20').catch(() => ({ data: [] }))
            ]);
            setStats(statsRes.data);
            setResources(resourcesRes.data);
            setCharts(chartsRes.data);
            setUptime(uptimeRes.data);
            setWsStats(wsRes.data);
            setAuditLogs(logsRes.data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch admin stats", error);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleClearCache = async () => {
        try {
            await axios.post('/admin/system/clear-model-cache');
            fetchData();
        } catch (error) {
            console.error("Failed to clear cache", error);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <div className="relative">
                <div className="spinner w-12 h-12" />
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-3xl lg:text-4xl font-bold text-gradient">
                        Dashboard
                    </h1>
                    <p className="text-[rgb(var(--color-text-muted))] mt-1 text-sm">Sistem durumu ve istatistikler</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full badge-success">
                    <Wifi className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Sistem Aktif</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <StatCard title="Toplam Kullanıcı" value={stats.total_users} subtitle={`${stats.active_users} aktif`} icon={Users} color="primary" delay={0} />
                <StatCard title="Toplam İşlem" value={stats.total_jobs} subtitle={`${stats.pending_jobs} bekliyor`} icon={Activity} color="secondary" delay={0.1} />
                <StatCard title="Tamamlanan" value={stats.completed_jobs} subtitle="Başarılı işlemler" icon={CheckCircle} color="success" delay={0.2} />
                <StatCard title="Başarısız" value={stats.failed_jobs} subtitle="Hatalı işlemler" icon={XCircle} color="danger" delay={0.3} />
            </div>

            {/* System Monitoring Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Uptime */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="card">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-xl bg-[rgb(var(--color-success)/0.15)]">
                            <Clock className="w-4 h-4 text-[rgb(var(--color-success))]" />
                        </div>
                        <div>
                            <p className="text-xs text-[rgb(var(--color-text-muted))]">Sunucu Çalışma Süresi</p>
                            <p className="font-bold text-lg">{uptime?.uptime_formatted || '-'}</p>
                        </div>
                    </div>
                    <p className="text-[10px] text-[rgb(var(--color-text-muted)/0.6)]">
                        Başlangıç: {uptime?.started_at ? new Date(uptime.started_at).toLocaleString('tr-TR') : '-'}
                    </p>
                </motion.div>

                {/* WebSocket */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-xl bg-[rgb(var(--color-primary)/0.15)]">
                            <Wifi className="w-4 h-4 text-[rgb(var(--color-primary))]" />
                        </div>
                        <div>
                            <p className="text-xs text-[rgb(var(--color-text-muted))]">WebSocket Bağlantıları</p>
                            <p className="font-bold text-lg">{wsStats?.active_connections || 0}</p>
                        </div>
                    </div>
                    <p className="text-[10px] text-[rgb(var(--color-text-muted)/0.6)]">Anlık aktif bağlantı sayısı</p>
                </motion.div>

                {/* Model Cache */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="card">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-[rgb(var(--color-accent)/0.15)]">
                                <Database className="w-4 h-4 text-[rgb(var(--color-accent))]" />
                            </div>
                            <div>
                                <p className="text-xs text-[rgb(var(--color-text-muted))]">Model Cache</p>
                                <p className="font-bold text-lg">{resources?.model_cache?.loaded_models || 0} model</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClearCache}
                            className="p-2 rounded-lg text-[rgb(var(--color-text-muted)/0.5)] hover:text-[rgb(var(--color-danger))] hover:bg-[rgb(var(--color-danger)/0.1)] transition-all"
                            title="Cache Temizle"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-[10px] text-[rgb(var(--color-text-muted)/0.6)]">
                        Bellek: {resources?.model_cache?.memory_used || '0 MB'}
                    </p>
                </motion.div>
            </div>

            {/* Charts Section */}
            {charts && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Jobs Chart */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-secondary))]">
                                <BarChart3 className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="font-display text-base font-bold">Son 7 Gün - İşlemler</h3>
                                <p className="text-[rgb(var(--color-text-muted))] text-xs">Günlük işlem sayısı</p>
                            </div>
                        </div>
                        <BarChart data={charts.jobs_by_day} color="primary" />
                    </motion.div>

                    {/* Job Type Distribution */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="card">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[rgb(var(--color-secondary))] to-[rgb(var(--color-accent))]">
                                <Activity className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="font-display text-base font-bold">İşlem Türü Dağılımı</h3>
                                <p className="text-[rgb(var(--color-text-muted))] text-xs">Tüm zamanlar</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {charts.type_distribution.map((item) => {
                                const total = charts.type_distribution.reduce((s, i) => s + i.count, 0) || 1;
                                const percent = ((item.count / total) * 100).toFixed(1);
                                const labels = {
                                    COLORIZE: { label: 'Renklendirme', color: 'primary' },
                                    VIDEO_COLORIZE: { label: 'Video Renklendirme', color: 'secondary' },
                                    RESTORE: { label: 'Restorasyon', color: 'accent' },
                                    UPSCALE: { label: 'Yükseltme', color: 'success' }
                                };
                                const config = labels[item.type] || { label: item.type, color: 'primary' };
                                return (
                                    <div key={item.type}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs font-medium">{config.label}</span>
                                            <span className="text-xs text-[rgb(var(--color-text-muted))]">{item.count} ({percent}%)</span>
                                        </div>
                                        <div className="h-2 bg-[rgb(var(--color-surface-elevated)/0.5)] rounded-full overflow-hidden">
                                            <motion.div
                                                className={`h-full rounded-full bg-[rgb(var(--color-${config.color}))]`}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percent}%` }}
                                                transition={{ duration: 1, ease: 'easeOut' }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* System Resources */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="card">
                <div className="relative flex items-center gap-3 mb-8">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-secondary))]" style={{ boxShadow: 'var(--glow-primary)' }}>
                        <Server className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="font-display text-xl font-bold">Sistem Kaynakları</h2>
                        <p className="text-[rgb(var(--color-text-muted))] text-xs">Gerçek zamanlı izleme</p>
                    </div>
                </div>

                <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
                    <ResourceGauge label="CPU Kullanımı" value={resources.cpu} icon={Cpu} />
                    <ResourceGauge label="RAM Kullanımı" value={resources.ram} icon={Activity} />
                    <ResourceGauge label="Disk Kullanımı" value={resources.disk} icon={HardDrive} />
                </div>

                {resources.gpu && resources.gpu.length > 0 && (
                    <div className="relative mt-8 pt-8 border-t border-[rgb(var(--color-border))]">
                        <div className="flex items-center gap-2 mb-6">
                            <Zap className="w-5 h-5 text-[rgb(var(--color-accent))]" />
                            <h3 className="font-display text-lg font-bold">GPU Durumu</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {resources.gpu.map((gpu, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.5 + idx * 0.1 }}
                                    className="relative p-5 rounded-2xl bg-[rgb(var(--color-surface-elevated)/0.4)] border border-[rgb(var(--color-border))] overflow-hidden group hover:border-[rgb(var(--color-accent)/0.3)] transition-all"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--color-accent)/0.05)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative">
                                        <p className="font-bold mb-3">{gpu.name}</p>
                                        <div className="flex justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${gpu.temperature > 80 ? 'bg-[rgb(var(--color-danger))]' : gpu.temperature > 60 ? 'bg-[rgb(var(--color-accent))]' : 'bg-[rgb(var(--color-success))]'}`} />
                                                <span className="text-[rgb(var(--color-text-muted))]">Sıcaklık:</span>
                                                <span className="font-medium">{gpu.temperature}°C</span>
                                            </div>
                                            <div>
                                                <span className="text-[rgb(var(--color-text-muted))]">Bellek:</span>
                                                <span className="font-medium ml-2">{gpu.memory_used} / {gpu.memory_total} MB</span>
                                            </div>
                                        </div>
                                        <div className="mt-3 h-2 bg-[rgb(var(--color-surface)/0.5)] rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-[rgb(var(--color-accent))] to-[rgb(var(--color-primary))] rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(gpu.memory_used / gpu.memory_total) * 100}%` }}
                                                transition={{ duration: 1 }}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Audit Log */}
            {auditLogs.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="card">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-[rgb(var(--color-accent))] to-[rgb(var(--color-danger))]">
                            <FileText className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="font-display text-base font-bold">Son Aktiviteler</h3>
                            <p className="text-[rgb(var(--color-text-muted))] text-xs">Admin işlem günlüğü</p>
                        </div>
                    </div>

                    <div className="space-y-1">
                        {auditLogs.map((log, idx) => (
                            <motion.div
                                key={log.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-[rgb(var(--color-surface-elevated)/0.3)] transition-colors"
                            >
                                <div className={`p-1.5 rounded-lg ${getActionStyle(log.action).bg}`}>
                                    {getActionIcon(log.action)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium">{getActionLabel(log.action)}</span>
                                        {log.target && (
                                            <span className="text-[10px] text-[rgb(var(--color-text-muted))] font-mono truncate max-w-[200px]">{log.target}</span>
                                        )}
                                    </div>
                                    {log.details && (
                                        <p className="text-[10px] text-[rgb(var(--color-text-muted)/0.6)] mt-0.5 truncate">{log.details}</p>
                                    )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-[10px] text-[rgb(var(--color-text-muted)/0.6)]">{log.admin_email}</p>
                                    <p className="text-[10px] text-[rgb(var(--color-text-muted)/0.4)]">
                                        {new Date(log.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
}

// Audit log helpers
function getActionStyle(action) {
    if (action.includes('delete') || action.includes('ban')) return { bg: 'bg-[rgb(var(--color-danger)/0.1)]' };
    if (action.includes('create') || action.includes('activate')) return { bg: 'bg-[rgb(var(--color-success)/0.1)]' };
    if (action.includes('update') || action.includes('change')) return { bg: 'bg-[rgb(var(--color-primary)/0.1)]' };
    return { bg: 'bg-[rgb(var(--color-accent)/0.1)]' };
}

function getActionIcon(action) {
    const cls = "w-3.5 h-3.5";
    if (action.includes('delete')) return <Trash2 className={`${cls} text-[rgb(var(--color-danger))]`} />;
    if (action.includes('ban')) return <Ban className={`${cls} text-[rgb(var(--color-danger))]`} />;
    if (action.includes('create')) return <UserPlus className={`${cls} text-[rgb(var(--color-success))]`} />;
    if (action.includes('activate')) return <CheckCircle className={`${cls} text-[rgb(var(--color-success))]`} />;
    if (action.includes('update') || action.includes('change')) return <Settings className={`${cls} text-[rgb(var(--color-primary))]`} />;
    if (action.includes('cache')) return <Database className={`${cls} text-[rgb(var(--color-accent))]`} />;
    if (action.includes('settings')) return <Settings className={`${cls} text-[rgb(var(--color-secondary))]`} />;
    return <Activity className={`${cls} text-[rgb(var(--color-text-muted))]`} />;
}

function getActionLabel(action) {
    const labels = {
        user_created: 'Kullanıcı Oluşturuldu',
        user_updated: 'Kullanıcı Güncellendi',
        user_deleted: 'Kullanıcı Silindi',
        bulk_ban: 'Toplu Yasaklama',
        bulk_activate: 'Toplu Aktifleştirme',
        bulk_delete: 'Toplu Silme',
        bulk_change_role: 'Toplu Rol Değişikliği',
        job_deleted: 'İş Silindi',
        cache_cleared: 'Cache Temizlendi',
        settings_updated: 'Ayarlar Güncellendi'
    };
    return labels[action] || action;
}


// SVG Bar Chart Component
function BarChart({ data, color }) {
    if (!data || data.length === 0) return null;
    const maxVal = Math.max(...data.map(d => d.count), 1);

    return (
        <div className="relative">
            <svg viewBox="0 0 400 160" className="w-full" preserveAspectRatio="xMidYMid meet">
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map(f => (
                    <line key={f} x1="40" y1={20 + (1 - f) * 120} x2="390" y2={20 + (1 - f) * 120}
                        stroke="rgb(var(--color-border))" strokeWidth="0.5" strokeDasharray="4 4" />
                ))}
                {/* Y-axis labels */}
                {[0, 0.5, 1].map(f => (
                    <text key={f} x="35" y={20 + (1 - f) * 120 + 4} textAnchor="end"
                        className="fill-[rgb(var(--color-text-muted))]" fontSize="9">
                        {Math.round(maxVal * f)}
                    </text>
                ))}
                {/* Bars */}
                {data.map((d, i) => {
                    const barH = (d.count / maxVal) * 120;
                    const x = 45 + i * 50;
                    return (
                        <g key={i}>
                            <motion.rect
                                x={x}
                                y={140 - barH}
                                width="30"
                                height={barH}
                                rx="4"
                                className={`fill-[rgb(var(--color-${color}))]`}
                                initial={{ height: 0, y: 140 }}
                                animate={{ height: barH, y: 140 - barH }}
                                transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                                opacity={0.85}
                            />
                            <text x={x + 15} y={155} textAnchor="middle"
                                className="fill-[rgb(var(--color-text-muted))]" fontSize="9">
                                {d.date}
                            </text>
                            {d.count > 0 && (
                                <motion.text
                                    x={x + 15} y={140 - barH - 5}
                                    textAnchor="middle"
                                    className={`fill-[rgb(var(--color-${color}))]`}
                                    fontSize="10"
                                    fontWeight="bold"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.8 + i * 0.1 }}
                                >
                                    {d.count}
                                </motion.text>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}


function StatCard({ title, value, subtitle, icon: Icon, color, delay }) {
    const colorMap = {
        primary: {
            gradient: 'from-[rgb(var(--color-primary))] to-[rgb(var(--color-secondary))]',
            shadow: 'rgb(var(--color-primary) / 0.3)',
            glow: 'rgb(var(--color-primary) / 0.15)',
        },
        secondary: {
            gradient: 'from-[rgb(var(--color-secondary))] to-[rgb(var(--color-accent))]',
            shadow: 'rgb(var(--color-secondary) / 0.3)',
            glow: 'rgb(var(--color-secondary) / 0.15)',
        },
        success: {
            gradient: 'from-[rgb(var(--color-success))] to-emerald-400',
            shadow: 'rgb(var(--color-success) / 0.3)',
            glow: 'rgb(var(--color-success) / 0.15)',
        },
        danger: {
            gradient: 'from-[rgb(var(--color-danger))] to-orange-400',
            shadow: 'rgb(var(--color-danger) / 0.3)',
            glow: 'rgb(var(--color-danger) / 0.15)',
        },
    };

    const c = colorMap[color];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="card group"
        >
            <div className="relative">
                <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: c.glow }} />
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <p className="text-[rgb(var(--color-text-muted))] text-xs font-medium">{title}</p>
                        <h3 className="text-3xl lg:text-4xl font-bold mt-2">{value}</h3>
                    </div>
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${c.gradient}`} style={{ boxShadow: `0 4px 16px ${c.shadow}` }}>
                        <Icon className="w-5 h-5 text-white" />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-[rgb(var(--color-success))]" />
                    <p className="text-xs text-[rgb(var(--color-text-muted))]">{subtitle}</p>
                </div>
            </div>
        </motion.div>
    );
}

function ResourceGauge({ label, value, icon: Icon }) {
    const circumference = 2 * Math.PI * 48;
    const strokeDashoffset = circumference - (circumference * value) / 100;

    const getColor = (v) => {
        if (v > 80) return { stroke: 'rgb(var(--color-danger))', text: 'text-[rgb(var(--color-danger))]' };
        if (v > 60) return { stroke: 'rgb(var(--color-accent))', text: 'text-[rgb(var(--color-accent))]' };
        return { stroke: 'rgb(var(--color-primary))', text: 'text-[rgb(var(--color-primary))]' };
    };

    const c = getColor(value);

    return (
        <div className="text-center">
            <div className="relative w-28 h-28 mx-auto mb-4">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 112 112">
                    <circle cx="56" cy="56" r="48" stroke="rgb(var(--color-border))" strokeWidth="8" fill="transparent" />
                    <motion.circle
                        cx="56" cy="56" r="48"
                        stroke={c.stroke} strokeWidth="8" fill="transparent" strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Icon className={`w-4 h-4 ${c.text} mb-1`} />
                    <span className={`text-2xl font-bold ${c.text}`}>{Math.round(value)}%</span>
                </div>
            </div>
            <p className="font-medium text-sm text-[rgb(var(--color-text-muted))]">{label}</p>
        </div>
    );
}
