import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, Clock, CheckCircle, XCircle, Trash2, RefreshCw, Loader2,
    Search, Eye, X, User, Image, AlertTriangle, Cpu, Sliders, Star, Folder
} from 'lucide-react';
import axios from '../../lib/axios';

export default function AdminJobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedJob, setSelectedJob] = useState(null);

    const fetchJobs = async () => {
        try {
            const res = await axios.get('/admin/jobs');
            setJobs(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch jobs", error);
        }
    };

    useEffect(() => {
        fetchJobs();
        const interval = setInterval(fetchJobs, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleDeleteJob = async (jobId) => {
        if (!confirm("Bu işlemi silmek/durdurmak istediğinize emin misiniz?")) return;
        try {
            await axios.delete(`/admin/jobs/${jobId}`);
            fetchJobs();
            if (selectedJob?.id === jobId) setSelectedJob(null);
        } catch {
            alert("İşlem silinemedi");
        }
    };

    const handleViewDetail = async (jobId) => {
        try {
            const res = await axios.get(`/admin/jobs/${jobId}`);
            setSelectedJob(res.data);
        } catch (error) {
            console.error("Failed to fetch job detail", error);
        }
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'COMPLETED':
                return { color: 'text-[rgb(var(--color-success))]', bg: 'bg-[rgb(var(--color-success)/0.1)]', border: 'border-[rgb(var(--color-success)/0.2)]', icon: CheckCircle, label: 'Tamamlandı' };
            case 'FAILED':
                return { color: 'text-[rgb(var(--color-danger))]', bg: 'bg-[rgb(var(--color-danger)/0.1)]', border: 'border-[rgb(var(--color-danger)/0.2)]', icon: XCircle, label: 'Başarısız' };
            case 'PROCESSING':
                return { color: 'text-[rgb(var(--color-primary))]', bg: 'bg-[rgb(var(--color-primary)/0.1)]', border: 'border-[rgb(var(--color-primary)/0.2)]', icon: Loader2, label: 'İşleniyor' };
            default:
                return { color: 'text-[rgb(var(--color-accent))]', bg: 'bg-[rgb(var(--color-accent)/0.1)]', border: 'border-[rgb(var(--color-accent)/0.2)]', icon: Clock, label: 'Bekliyor' };
        }
    };

    const getTypeLabel = (type) => {
        const labels = {
            COLORIZE: 'Renklendirme',
            VIDEO_COLORIZE: 'Video Renklendirme',
            RESTORE: 'Restorasyon',
            UPSCALE: 'Yükseltme'
        };
        return labels[type] || type;
    };

    const filteredJobs = jobs.filter(j => {
        const matchesStatus = filterStatus === 'all' || j.status === filterStatus;
        const matchesSearch = !search ||
            j.id.includes(search) ||
            j.type.toLowerCase().includes(search.toLowerCase()) ||
            (j.user_email && j.user_email.toLowerCase().includes(search.toLowerCase()));
        return matchesStatus && matchesSearch;
    });

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <div className="spinner w-12 h-12" />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-3xl lg:text-4xl font-bold text-gradient">
                        İşlem Yönetimi
                    </h1>
                    <p className="text-[rgb(var(--color-text-muted))] mt-1 text-sm">Tüm işlemleri izleyin ve yönetin</p>
                </div>
                <button onClick={fetchJobs} className="btn-secondary !py-2 !px-4 !text-sm">
                    <RefreshCw className="w-4 h-4" />
                    Yenile
                </button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].map((status) => {
                    const config = getStatusConfig(status);
                    const count = jobs.filter(j => j.status === status).length;
                    return (
                        <motion.div
                            key={status}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`card !p-4 cursor-pointer transition-all ${filterStatus === status ? 'ring-1 ring-[rgb(var(--color-primary)/0.3)]' : ''}`}
                            onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}
                        >
                            <div className="relative flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${config.bg}`}>
                                    <config.icon className={`w-4 h-4 ${config.color}`} />
                                </div>
                                <div>
                                    <p className="text-xl font-bold">{count}</p>
                                    <p className="text-[10px] text-[rgb(var(--color-text-muted))]">{config.label}</p>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--color-text-muted)/0.5)]" />
                <input
                    type="text"
                    placeholder="ID, tür veya e-posta ile ara..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input-field !pl-10 !pr-4 !text-sm !py-2.5"
                />
            </div>

            {/* Jobs Table */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card !p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-[rgb(var(--color-border))]">
                                <th className="p-4 font-medium text-[rgb(var(--color-text-muted))] text-xs uppercase tracking-wider">ID</th>
                                <th className="p-4 font-medium text-[rgb(var(--color-text-muted))] text-xs uppercase tracking-wider hidden lg:table-cell">Kullanıcı</th>
                                <th className="p-4 font-medium text-[rgb(var(--color-text-muted))] text-xs uppercase tracking-wider">Tür</th>
                                <th className="p-4 font-medium text-[rgb(var(--color-text-muted))] text-xs uppercase tracking-wider">Durum</th>
                                <th className="p-4 font-medium text-[rgb(var(--color-text-muted))] text-xs uppercase tracking-wider hidden md:table-cell">Süre</th>
                                <th className="p-4 font-medium text-[rgb(var(--color-text-muted))] text-xs uppercase tracking-wider hidden lg:table-cell">Oluşturulma</th>
                                <th className="p-4 font-medium text-[rgb(var(--color-text-muted))] text-xs uppercase tracking-wider">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {filteredJobs.map((job, index) => {
                                    const statusConfig = getStatusConfig(job.status);
                                    const StatusIcon = statusConfig.icon;
                                    return (
                                        <motion.tr
                                            key={job.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            transition={{ delay: index * 0.03 }}
                                            className="border-b border-[rgb(var(--color-border)/0.5)] hover:bg-[rgb(var(--color-surface-elevated)/0.3)] transition-colors group cursor-pointer"
                                            onClick={() => handleViewDetail(job.id)}
                                        >
                                            <td className="p-4">
                                                <span className="font-mono text-xs text-[rgb(var(--color-text-muted))] bg-[rgb(var(--color-surface-elevated)/0.4)] px-2 py-1 rounded-md">
                                                    {job.id.slice(0, 8)}...
                                                </span>
                                            </td>
                                            <td className="p-4 hidden lg:table-cell">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-lg bg-[rgb(var(--color-primary)/0.1)] flex items-center justify-center">
                                                        <User className="w-3 h-3 text-[rgb(var(--color-primary))]" />
                                                    </div>
                                                    <span className="text-xs text-[rgb(var(--color-text-muted))] truncate max-w-[150px]">{job.user_email || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="font-medium text-sm">{getTypeLabel(job.type)}</span>
                                            </td>
                                            <td className="p-4">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}`}>
                                                    <StatusIcon className={`w-3.5 h-3.5 ${job.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
                                                    {statusConfig.label}
                                                </div>
                                                {job.status === 'PROCESSING' && job.progress > 0 && (
                                                    <div className="mt-1.5 h-1 bg-[rgb(var(--color-surface-elevated)/0.5)] rounded-full overflow-hidden w-20">
                                                        <div className="h-full bg-[rgb(var(--color-primary))] rounded-full transition-all" style={{ width: `${job.progress}%` }} />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 hidden md:table-cell">
                                                <span className="text-sm text-[rgb(var(--color-text-muted))]">
                                                    {job.processing_time ? `${job.processing_time.toFixed(2)}s` : '-'}
                                                </span>
                                            </td>
                                            <td className="p-4 hidden lg:table-cell">
                                                <span className="text-xs text-[rgb(var(--color-text-muted))]">
                                                    {new Date(job.created_at).toLocaleString('tr-TR')}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleViewDetail(job.id); }}
                                                        className="p-1.5 rounded-lg text-[rgb(var(--color-text-muted)/0.5)] hover:text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-primary)/0.1)] transition-all"
                                                        title="Detay"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteJob(job.id); }}
                                                        className="p-1.5 rounded-lg text-[rgb(var(--color-text-muted)/0.4)] hover:text-[rgb(var(--color-danger))] hover:bg-[rgb(var(--color-danger)/0.1)] transition-all"
                                                        title="Sil/Durdur"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {filteredJobs.length === 0 && (
                    <div className="p-12 text-center">
                        <Activity className="w-10 h-10 text-[rgb(var(--color-text-muted)/0.3)] mx-auto mb-3" />
                        <p className="text-sm text-[rgb(var(--color-text-muted))]">
                            {filterStatus !== 'all' ? `"${getStatusConfig(filterStatus).label}" durumunda işlem yok` : 'Henüz işlem yok'}
                        </p>
                    </div>
                )}
            </motion.div>

            {/* Job Detail Modal */}
            <AnimatePresence>
                {selectedJob && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedJob(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="card !rounded-2xl !p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h3 className="font-display text-xl font-bold">İş Detayı</h3>
                                    <p className="font-mono text-xs text-[rgb(var(--color-text-muted)/0.6)] mt-1">{selectedJob.id}</p>
                                </div>
                                <button onClick={() => setSelectedJob(null)} className="p-1.5 hover:bg-[rgb(var(--color-surface-elevated)/0.5)] rounded-lg transition-colors">
                                    <X className="w-4 h-4 text-[rgb(var(--color-text-muted))]" />
                                </button>
                            </div>

                            {/* Status & Type */}
                            <div className="flex items-center gap-3 mb-6">
                                {(() => {
                                    const sc = getStatusConfig(selectedJob.status);
                                    const SI = sc.icon;
                                    return (
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${sc.bg} ${sc.color} border ${sc.border}`}>
                                            <SI className={`w-4 h-4 ${selectedJob.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
                                            {sc.label}
                                        </div>
                                    );
                                })()}
                                <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[rgb(var(--color-surface-elevated)/0.4)] border border-[rgb(var(--color-border))]">
                                    {getTypeLabel(selectedJob.type)}
                                </span>
                            </div>

                            {/* Progress bar for processing jobs */}
                            {selectedJob.status === 'PROCESSING' && selectedJob.progress > 0 && (
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs text-[rgb(var(--color-text-muted))]">İlerleme</span>
                                        <span className="text-xs font-bold text-[rgb(var(--color-primary))]">{selectedJob.progress}%</span>
                                    </div>
                                    <div className="h-2 bg-[rgb(var(--color-surface-elevated)/0.5)] rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-[rgb(var(--color-primary))] to-[rgb(var(--color-secondary))] rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${selectedJob.progress}%` }}
                                            transition={{ duration: 0.5 }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <InfoItem icon={User} label="Kullanıcı" value={selectedJob.user_email || '-'} />
                                <InfoItem icon={Clock} label="İşlem Süresi" value={selectedJob.processing_time ? `${selectedJob.processing_time.toFixed(2)}s` : '-'} />
                                <InfoItem icon={Cpu} label="Cihaz" value={selectedJob.device || 'Auto'} />
                                <InfoItem icon={Sliders} label="Render Factor" value={selectedJob.render_factor || '-'} />
                                <InfoItem icon={Star} label="Favori" value={selectedJob.is_favorite ? 'Evet' : 'Hayır'} />
                                <InfoItem icon={Folder} label="Koleksiyon" value={selectedJob.collection || '-'} />
                            </div>

                            {/* Dates */}
                            <div className="p-3 rounded-xl bg-[rgb(var(--color-surface-elevated)/0.3)] border border-[rgb(var(--color-border)/0.5)] mb-6">
                                <p className="text-[10px] text-[rgb(var(--color-text-muted)/0.6)] mb-0.5">Oluşturulma</p>
                                <p className="text-xs font-medium">{new Date(selectedJob.created_at).toLocaleString('tr-TR')}</p>
                            </div>

                            {/* Error Message */}
                            {selectedJob.error_message && (
                                <div className="p-4 rounded-xl bg-[rgb(var(--color-danger)/0.08)] border border-[rgb(var(--color-danger)/0.2)] mb-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle className="w-4 h-4 text-[rgb(var(--color-danger))]" />
                                        <span className="text-xs font-semibold text-[rgb(var(--color-danger))]">Hata Mesajı</span>
                                    </div>
                                    <p className="text-xs text-[rgb(var(--color-danger)/0.8)] font-mono break-all">{selectedJob.error_message}</p>
                                </div>
                            )}

                            {/* Input/Output Images */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                {selectedJob.input_path && (
                                    <div>
                                        <p className="text-xs font-medium text-[rgb(var(--color-text-muted))] mb-2">Giriş Dosyası</p>
                                        <div className="rounded-xl overflow-hidden border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-elevated)/0.3)]">
                                            {isImagePath(selectedJob.input_path) ? (
                                                <img
                                                    src={`/api/files/${selectedJob.input_path}`}
                                                    alt="Input"
                                                    className="w-full h-48 object-cover"
                                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                />
                                            ) : null}
                                            <div className={`${isImagePath(selectedJob.input_path) ? 'hidden' : 'flex'} items-center justify-center h-48`}>
                                                <div className="text-center">
                                                    <Image className="w-8 h-8 text-[rgb(var(--color-text-muted)/0.3)] mx-auto mb-2" />
                                                    <p className="text-[10px] text-[rgb(var(--color-text-muted)/0.5)] font-mono break-all px-3">{selectedJob.input_path}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {selectedJob.output_path && (
                                    <div>
                                        <p className="text-xs font-medium text-[rgb(var(--color-text-muted))] mb-2">Çıkış Dosyası</p>
                                        <div className="rounded-xl overflow-hidden border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-elevated)/0.3)]">
                                            {isImagePath(selectedJob.output_path) ? (
                                                <img
                                                    src={`/api/files/${selectedJob.output_path}`}
                                                    alt="Output"
                                                    className="w-full h-48 object-cover"
                                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                />
                                            ) : null}
                                            <div className={`${isImagePath(selectedJob.output_path) ? 'hidden' : 'flex'} items-center justify-center h-48`}>
                                                <div className="text-center">
                                                    <Image className="w-8 h-8 text-[rgb(var(--color-text-muted)/0.3)] mx-auto mb-2" />
                                                    <p className="text-[10px] text-[rgb(var(--color-text-muted)/0.5)] font-mono break-all px-3">{selectedJob.output_path}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedJob(null)}
                                    className="flex-1 py-3 rounded-xl font-medium text-sm bg-[rgb(var(--color-surface-elevated)/0.4)] border border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-surface-elevated)/0.6)] transition-all text-center"
                                >
                                    Kapat
                                </button>
                                <button
                                    onClick={() => { handleDeleteJob(selectedJob.id); }}
                                    className="py-3 px-6 rounded-xl font-medium text-sm bg-[rgb(var(--color-danger)/0.1)] text-[rgb(var(--color-danger))] border border-[rgb(var(--color-danger)/0.2)] hover:bg-[rgb(var(--color-danger)/0.15)] transition-all flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Sil
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function InfoItem({ icon: Icon, label, value }) {
    return (
        <div className="p-3 rounded-xl bg-[rgb(var(--color-surface-elevated)/0.3)] border border-[rgb(var(--color-border)/0.5)]">
            <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3 h-3 text-[rgb(var(--color-text-muted)/0.5)]" />
                <span className="text-[10px] text-[rgb(var(--color-text-muted)/0.6)]">{label}</span>
            </div>
            <p className="text-sm font-medium truncate">{value}</p>
        </div>
    );
}

function isImagePath(path) {
    if (!path) return false;
    return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(path);
}
