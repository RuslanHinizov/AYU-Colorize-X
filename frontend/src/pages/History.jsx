import { useState, useEffect } from 'react';
import { API_URL } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Video as VideoIcon, Calendar, Download, Trash2, Search, Cpu, Zap, Clock, Layers, CheckCircle, XCircle, Loader2, Heart, FolderPlus, X, Folder } from 'lucide-react';
import axios from '../lib/axios';

export default function History() {
    const { t } = useLanguage();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [deleting, setDeleting] = useState(null);
    const [collections, setCollections] = useState([]);
    const [showCollectionModal, setShowCollectionModal] = useState(null);
    const [newCollectionName, setNewCollectionName] = useState('');

    useEffect(() => {
        fetchJobs();
        fetchCollections();
    }, []);

    const fetchJobs = async () => {
        try {
            const response = await axios.get(`/jobs/`);
            setJobs(response.data);
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCollections = async () => {
        try {
            const response = await axios.get(`/jobs/collections/list`);
            setCollections(response.data.collections || []);
        } catch (error) {
            console.error('Failed to fetch collections:', error);
        }
    };

    const filteredJobs = jobs.filter(job => {
        if (filter === 'all') return true;
        if (filter === 'photos') return job.type !== 'VIDEO_COLORIZE';
        if (filter === 'videos') return job.type === 'VIDEO_COLORIZE';
        if (filter === 'favorites') return job.is_favorite;
        if (filter.startsWith('collection:')) return (job.collection || '') === filter.replace('collection:', '');
        return true;
    });

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const getStatusIcon = (status) => {
        switch (status) {
            case 'COMPLETED': return <CheckCircle className="w-4 h-4 text-success" />;
            case 'FAILED': return <XCircle className="w-4 h-4 text-danger" />;
            case 'PROCESSING': return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
            default: return null;
        }
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case 'COLORIZE': return 'Renklendirme';
            case 'VIDEO_COLORIZE': return 'Video';
            case 'RESTORE': return 'Restorasyon';
            default: return type;
        }
    };

    async function handleDownload(jobId, type) {
        try {
            const response = await axios.get(`/jobs/${jobId}/download`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `processed_${jobId}.${type === 'VIDEO_COLORIZE' ? 'mp4' : 'jpg'}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download failed:', err);
        }
    }

    async function handleDelete(jobId) {
        if (!confirm(t('common.confirmDelete'))) return;
        setDeleting(jobId);
        try {
            await axios.delete(`/jobs/${jobId}`);
            setJobs(jobs.filter(job => job.id !== jobId));
        } catch (err) {
            console.error('Delete failed:', err);
        } finally {
            setDeleting(null);
        }
    }

    async function toggleFavorite(jobId) {
        try {
            const response = await axios.post(`/jobs/${jobId}/favorite`);
            setJobs(jobs.map(job => job.id === jobId ? { ...job, is_favorite: response.data.is_favorite } : job));
        } catch (err) {
            console.error('Toggle favorite failed:', err);
        }
    }

    async function setCollection(jobId, collectionName) {
        try {
            await axios.put(`/jobs/${jobId}/collection?collection=${collectionName || ''}`);
            setJobs(jobs.map(job => job.id === jobId ? { ...job, collection: collectionName } : job));
            if (collectionName && !collections.includes(collectionName)) setCollections([...collections, collectionName]);
            setShowCollectionModal(null);
            setNewCollectionName('');
        } catch (err) {
            console.error('Set collection failed:', err);
        }
    }

    return (
        <div className="min-h-screen relative">
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="orb orb-primary w-96 h-96 -top-48 -right-48 opacity-20" />
                <div className="orb orb-secondary w-80 h-80 bottom-0 -left-40 opacity-15" />
            </div>

            <div className="relative z-10 p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                        <div>
                            <h1 className="font-display text-3xl font-bold mb-2">{t('history.title')}</h1>
                            <p className="text-muted">{t('history.subtitle')}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm">
                                {[{ id: 'all', label: 'Tümü' }, { id: 'photos', label: 'Fotoğraf' }, { id: 'videos', label: 'Video' }, { id: 'favorites', label: '❤️' }].map((tab) => (
                                    <button key={tab.id} onClick={() => setFilter(tab.id)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === tab.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted hover:text-foreground'}`}>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* Content */}
                    {loading ? (
                        <div className="flex items-center justify-center py-20"><div className="spinner" /></div>
                    ) : filteredJobs.length === 0 ? (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-24 h-24 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-6">
                                <Search className="w-10 h-10 text-muted" />
                            </div>
                            <h3 className="font-display text-xl font-bold mb-2">{t('history.emptyTitle')}</h3>
                            <p className="text-muted">Henüz işlenmiş dosya yok</p>
                        </motion.div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <AnimatePresence mode="popLayout">
                                {filteredJobs.map((job, index) => (
                                    <motion.div key={job.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: index * 0.05 }} className="card group">
                                        {/* Preview */}
                                        <div className="relative aspect-video bg-black/20 rounded-xl overflow-hidden mb-4">
                                            {job.output_path && job.status === 'COMPLETED' ? (
                                                job.type === 'VIDEO_COLORIZE' ? (
                                                    <video src={`${API_URL}/${job.output_path.replace(/\\/g, '/')}`} className="w-full h-full object-cover" />
                                                ) : (
                                                    <img src={`${API_URL}/${job.output_path.replace(/\\/g, '/')}`} alt="Result" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                )
                                            ) : (
                                                <div className="flex items-center justify-center h-full">
                                                    {job.status === 'PROCESSING' ? <Loader2 className="w-8 h-8 text-primary animate-spin" /> : <XCircle className="w-8 h-8 text-danger" />}
                                                </div>
                                            )}

                                            {/* Type Badge */}
                                            <div className="absolute top-3 left-3">
                                                <span className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-xs font-medium flex items-center gap-1">
                                                    {job.type === 'VIDEO_COLORIZE' ? <VideoIcon className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                                                    {getTypeLabel(job.type)}
                                                </span>
                                            </div>

                                            {/* Status */}
                                            <div className="absolute top-3 right-3">
                                                <span className={`px-2 py-1 rounded-lg backdrop-blur-sm text-xs font-medium flex items-center gap-1 ${job.status === 'COMPLETED' ? 'bg-success/20 text-success' : job.status === 'FAILED' ? 'bg-danger/20 text-danger' : 'bg-primary/20 text-primary'}`}>
                                                    {getStatusIcon(job.status)}
                                                    {job.status}
                                                </span>
                                            </div>

                                            {/* Favorite */}
                                            <button onClick={() => toggleFavorite(job.id)} className={`absolute bottom-3 right-3 p-2 rounded-full transition-all ${job.is_favorite ? 'bg-danger text-white' : 'bg-black/50 text-white/70 hover:text-white'}`}>
                                                <Heart className={`w-4 h-4 ${job.is_favorite ? 'fill-current' : ''}`} />
                                            </button>

                                            {job.collection && (
                                                <div className="absolute bottom-3 left-3">
                                                    <span className="px-2 py-1 rounded-lg bg-accent/20 text-accent text-xs flex items-center gap-1"><Folder className="w-3 h-3" />{job.collection}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-xs text-muted">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {formatDate(job.created_at)}
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                                                <div className="flex items-center gap-1.5 text-xs text-muted">
                                                    {job.device === 'gpu' ? <Zap className="w-3.5 h-3.5 text-accent" /> : <Cpu className="w-3.5 h-3.5" />}
                                                    <span>{job.device?.toUpperCase() || 'CPU'}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-muted">
                                                    <Layers className="w-3.5 h-3.5" />
                                                    <span>{job.render_factor || 35}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-muted">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span>{job.processing_time ? `${job.processing_time.toFixed(1)}s` : '-'}</span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2">
                                                {job.status === 'COMPLETED' && (
                                                    <>
                                                        <button onClick={() => handleDownload(job.id, job.type)} className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-2">
                                                            <Download className="w-4 h-4" />
                                                            İndir
                                                        </button>
                                                        <button onClick={() => setShowCollectionModal(job.id)} className="p-2 rounded-xl bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
                                                            <FolderPlus className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                                <button onClick={() => handleDelete(job.id)} disabled={deleting === job.id} className="p-2 rounded-xl bg-danger/10 text-danger hover:bg-danger/20 transition-colors disabled:opacity-50">
                                                    {deleting === job.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* Collection Modal */}
            <AnimatePresence>
                {showCollectionModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCollectionModal(null)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="card p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-display text-lg font-bold">Koleksiyona Ekle</h3>
                                <button onClick={() => setShowCollectionModal(null)} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-5 h-5" /></button>
                            </div>
                            {collections.length > 0 && (
                                <div className="space-y-2 mb-4">
                                    {collections.map(col => (
                                        <button key={col} onClick={() => setCollection(showCollectionModal, col)} className="w-full p-3 rounded-xl bg-white/[0.03] hover:bg-primary/10 text-left transition-colors flex items-center gap-2">
                                            <Folder className="w-4 h-4 text-accent" />{col}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <input type="text" value={newCollectionName} onChange={e => setNewCollectionName(e.target.value)} placeholder="Yeni koleksiyon..." className="input-field flex-1" />
                                <button onClick={() => setCollection(showCollectionModal, newCollectionName)} disabled={!newCollectionName.trim()} className="btn-primary px-4">Ekle</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
