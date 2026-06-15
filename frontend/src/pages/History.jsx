import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Image as ImageIcon, Video as VideoIcon, Calendar, Download, Trash2,
    Search, Cpu, Zap, Clock, Layers, CheckCircle, XCircle, Loader2,
    Heart, FolderPlus, X, Folder, Sparkles, ArrowRight,
    Grid3X3, List, BarChart2, Eye, SortDesc,
} from 'lucide-react';
import axios from '../lib/axios';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const TYPE_STYLES = {
    COLORIZE:        { badge: 'bg-primary/15 text-primary border-primary/25',       glow: 'hover:shadow-primary/15'   },
    VIDEO_COLORIZE:  { badge: 'bg-secondary/15 text-secondary border-secondary/25', glow: 'hover:shadow-secondary/15' },
    UPSCALE:         { badge: 'bg-accent/15 text-accent border-accent/25',           glow: 'hover:shadow-accent/15'    },
    RESTORE:         { badge: 'bg-primary/15 text-primary border-primary/25',        glow: 'hover:shadow-primary/15'   },
    RESTORE_DAMAGE:  { badge: 'bg-warning/15 text-warning border-warning/25',        glow: 'hover:shadow-warning/15'   },
    RESTORE_UPSCALE: { badge: 'bg-secondary/15 text-secondary border-secondary/25', glow: 'hover:shadow-secondary/15' },
    BG_REMOVE:       { badge: 'bg-success/15 text-success border-success/25',        glow: 'hover:shadow-success/15'   },
    INPAINT:         { badge: 'bg-accent/15 text-accent border-accent/25',            glow: 'hover:shadow-accent/15'    },
};
const getTypeStyle = (type) => TYPE_STYLES[type] ?? { badge: 'bg-white/10 text-muted border-white/10', glow: '' };

/* ─── main component ─────────────────────────────────────────────────────── */
export default function History() {
    const { t } = useLanguage();

    const [jobs, setJobs]                         = useState([]);
    const [loading, setLoading]                   = useState(true);
    const [filter, setFilter]                     = useState('all');
    const [search, setSearch]                     = useState('');
    const [sortBy, setSortBy]                     = useState('newest');
    const [viewMode, setViewMode]                 = useState('grid');
    const [deleting, setDeleting]                 = useState(null);
    const [collections, setCollections]           = useState([]);
    const [showCollectionModal, setShowCollectionModal] = useState(null);
    const [newCollectionName, setNewCollectionName]     = useState('');
    const [previewJob, setPreviewJob]             = useState(null);

    useEffect(() => { fetchJobs(); fetchCollections(); }, []);

    const fetchJobs = async () => {
        try { const r = await axios.get('/jobs/'); setJobs(r.data); }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const fetchCollections = async () => {
        try { const r = await axios.get('/jobs/collections/list'); setCollections(r.data.collections || []); }
        catch {}
    };

    /* ── computed ── */
    const stats = useMemo(() => ({
        total:          jobs.length,
        completed:      jobs.filter(j => j.status === 'COMPLETED').length,
        favorites:      jobs.filter(j => j.is_favorite).length,
        totalTime:      jobs.reduce((s, j) => s + (j.processing_time || 0), 0),
    }), [jobs]);

    const getTypeLabel = (type) => {
        const map = {
            COLORIZE: t('history.typeColorize'), VIDEO_COLORIZE: t('history.typeVideo'),
            RESTORE: t('history.typeRestore'),   UPSCALE: t('history.typeUpscale'),
            BG_REMOVE: 'BG Remove',              RESTORE_DAMAGE: 'Restore',
            RESTORE_UPSCALE: 'Enhance+',        INPAINT: t('history.typeInpaint'),
        };
        return map[type] ?? type;
    };

    const filteredJobs = useMemo(() => {
        let result = jobs.filter(job => {
            if (filter === 'photos')    return job.type !== 'VIDEO_COLORIZE';
            if (filter === 'videos')    return job.type === 'VIDEO_COLORIZE';
            if (filter === 'favorites') return job.is_favorite;
            if (filter.startsWith('collection:')) return (job.collection || '') === filter.replace('collection:', '');
            return true;
        });
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(j => getTypeLabel(j.type).toLowerCase().includes(q));
        }
        return result.sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
            if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
            if (sortBy === 'type')   return (a.type || '').localeCompare(b.type || '');
            return 0;
        });
    }, [jobs, filter, search, sortBy]);

    const formatDate = (d) => new Date(d).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const getStatusIcon = (status) => {
        if (status === 'COMPLETED')  return <CheckCircle className="w-3.5 h-3.5 text-success" />;
        if (status === 'FAILED')     return <XCircle     className="w-3.5 h-3.5 text-danger"  />;
        if (status === 'PROCESSING') return <Loader2     className="w-3.5 h-3.5 text-primary animate-spin" />;
        return null;
    };

    /* ── actions ── */
    async function handleDownload(jobId, type) {
        try {
            const r = await axios.get(`/jobs/${jobId}/download`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([r.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `processed_${jobId}.${type === 'VIDEO_COLORIZE' ? 'mp4' : 'jpg'}`;
            document.body.appendChild(a); a.click(); a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) { console.error(e); }
    }

    async function handleDelete(jobId) {
        if (!confirm(t('common.confirmDelete'))) return;
        setDeleting(jobId);
        try { await axios.delete(`/jobs/${jobId}`); setJobs(prev => prev.filter(j => j.id !== jobId)); }
        catch {}
        finally { setDeleting(null); }
    }

    async function toggleFavorite(jobId) {
        try {
            const r = await axios.post(`/jobs/${jobId}/favorite`);
            setJobs(prev => prev.map(j => j.id === jobId ? { ...j, is_favorite: r.data.is_favorite } : j));
        } catch {}
    }

    async function setCollection(jobId, name) {
        try {
            await axios.put(`/jobs/${jobId}/collection?collection=${name || ''}`);
            setJobs(prev => prev.map(j => j.id === jobId ? { ...j, collection: name } : j));
            if (name && !collections.includes(name)) setCollections(prev => [...prev, name]);
            setShowCollectionModal(null);
            setNewCollectionName('');
        } catch {}
    }

    /* ─────────────────────────────── render ────────────────────────────────── */
    return (
        <div className="min-h-screen relative">
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="orb orb-primary w-96 h-96 -top-48 -right-48 opacity-20" />
                <div className="orb orb-secondary w-80 h-80 bottom-0 -left-40 opacity-15" />
            </div>

            <div className="relative z-10 p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">

                    {/* ── Header ── */}
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">

                        {/* Title row */}
                        <div className="flex items-start justify-between gap-4 mb-5">
                            <div>
                                <h1 className="font-display text-3xl font-bold text-gradient leading-tight">{t('history.title')}</h1>
                                <p className="text-muted text-sm mt-1">{t('history.subtitle')}</p>
                            </div>
                            {/* View mode toggle */}
                            <div className="flex items-center p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] shrink-0">
                                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'text-muted hover:text-foreground'}`}>
                                    <Grid3X3 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'text-muted hover:text-foreground'}`}>
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Stats chips */}
                        {!loading && jobs.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-5">
                                {[
                                    { icon: BarChart2,    value: stats.total,          label: t('history.all') || 'Total',   cls: 'text-primary  bg-primary/10  border-primary/20'  },
                                    { icon: CheckCircle,  value: stats.completed,       label: 'Done',                         cls: 'text-success  bg-success/10  border-success/20'  },
                                    { icon: Heart,        value: stats.favorites,       label: 'Favs',                         cls: 'text-danger   bg-danger/10   border-danger/20'   },
                                    { icon: Clock,        value: `${(stats.totalTime/60).toFixed(1)}m`, label: 'Time',         cls: 'text-accent   bg-accent/10   border-accent/20'   },
                                ].map(({ icon: Icon, value, label, cls }) => (
                                    <div key={label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${cls}`}>
                                        <Icon className="w-3.5 h-3.5" />
                                        <span className="font-bold">{value}</span>
                                        <span className="opacity-70">{label}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Filter + Search + Sort */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            {/* Filter tabs */}
                            <div className="flex p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] shrink-0">
                                {[
                                    { id: 'all',       label: t('history.all')    },
                                    { id: 'photos',    label: t('history.photos') },
                                    { id: 'videos',    label: t('history.videos') },
                                    { id: 'favorites', label: '❤️'               },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setFilter(tab.id)}
                                        className={`relative px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === tab.id ? 'text-white' : 'text-muted hover:text-foreground'}`}
                                    >
                                        {filter === tab.id && (
                                            <motion.div layoutId="history-filter-pill" className="absolute inset-0 bg-primary rounded-lg shadow-lg shadow-primary/20" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                                        )}
                                        <span className="relative">{tab.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Search */}
                            <div className="relative flex-1 min-w-0">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted/40 pointer-events-none" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search by type…"
                                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm placeholder:text-muted/40 focus:outline-none focus:border-primary/30 transition-colors"
                                />
                            </div>

                            {/* Sort */}
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value)}
                                className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-muted focus:outline-none focus:border-primary/30 cursor-pointer shrink-0"
                            >
                                <option value="newest">Newest</option>
                                <option value="oldest">Oldest</option>
                                <option value="type">By Type</option>
                            </select>
                        </div>
                    </motion.div>

                    {/* ── Content ── */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-28 gap-4">
                            <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                            <p className="text-muted text-sm">Loading…</p>
                        </div>

                    ) : filteredJobs.length === 0 ? (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-28 text-center">
                            <div className="relative mb-6">
                                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 border border-white/[0.06] flex items-center justify-center">
                                    <Search className="w-10 h-10 text-muted/40" />
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-9 h-9 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                                    <Sparkles className="w-4 h-4 text-white" />
                                </div>
                            </div>
                            <h3 className="font-display text-2xl font-bold mb-2">{t('history.emptyTitle')}</h3>
                            <p className="text-muted text-sm mb-6 max-w-xs">{t('history.emptySubtitle')}</p>
                            <Link to="/photo" className="btn-primary inline-flex items-center gap-2 text-sm px-6 py-2.5">
                                <Sparkles className="w-4 h-4" />
                                {t('home.getStarted') || 'Start Processing'}
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </motion.div>

                    ) : viewMode === 'grid' ? (

                        /* ── GRID VIEW ── */
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            <AnimatePresence mode="popLayout">
                                {filteredJobs.map((job, idx) => {
                                    const ts = getTypeStyle(job.type);
                                    return (
                                        <motion.div
                                            key={job.id}
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: idx * 0.04 }}
                                            className={`card group relative overflow-hidden transition-shadow duration-300 shadow-lg ${ts.glow}`}
                                        >
                                            {/* Image preview */}
                                            <div
                                                className="relative aspect-[4/3] bg-black/20 rounded-xl overflow-hidden mb-4 cursor-pointer"
                                                onClick={() => job.status === 'COMPLETED' && setPreviewJob(job)}
                                            >
                                                {job.output_path && job.status === 'COMPLETED' ? (
                                                    job.type === 'VIDEO_COLORIZE'
                                                        ? <video src={`${API_URL}/${job.output_path.replace(/\\/g, '/')}`} className="w-full h-full object-cover" />
                                                        : <img src={`${API_URL}/${job.output_path.replace(/\\/g, '/')}`} alt="Result" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full">
                                                        {job.status === 'PROCESSING'
                                                            ? <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                                            : <XCircle className="w-8 h-8 text-danger/50" />}
                                                    </div>
                                                )}

                                                {/* Top overlays */}
                                                <div className="absolute top-2.5 left-2.5">
                                                    <span className={`px-2 py-0.5 rounded-lg backdrop-blur-sm text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 border ${ts.badge}`}>
                                                        {job.type === 'VIDEO_COLORIZE' ? <VideoIcon className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
                                                        {getTypeLabel(job.type)}
                                                    </span>
                                                </div>
                                                <div className="absolute top-2.5 right-2.5">
                                                    {getStatusIcon(job.status)}
                                                </div>

                                                {/* Hover eye */}
                                                {job.status === 'COMPLETED' && (
                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                                                            <Eye className="w-5 h-5 text-white" />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Favorite btn */}
                                                <button
                                                    onClick={e => { e.stopPropagation(); toggleFavorite(job.id); }}
                                                    className={`absolute bottom-2.5 right-2.5 p-1.5 rounded-full transition-all ${job.is_favorite ? 'bg-danger text-white shadow-lg shadow-danger/30' : 'bg-black/50 text-white/60 hover:text-white hover:bg-black/70'}`}
                                                >
                                                    <Heart className={`w-3.5 h-3.5 ${job.is_favorite ? 'fill-current' : ''}`} />
                                                </button>

                                                {/* Collection badge */}
                                                {job.collection && (
                                                    <div className="absolute bottom-2.5 left-2.5">
                                                        <span className="px-1.5 py-0.5 rounded-lg bg-accent/20 text-accent text-[9px] font-semibold flex items-center gap-1 backdrop-blur-sm border border-accent/25">
                                                            <Folder className="w-2.5 h-2.5" />{job.collection}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Meta row */}
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-1.5 text-xs text-muted">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(job.created_at)}
                                                </div>
                                                {job.processing_time && (
                                                    <div className="flex items-center gap-1 text-xs text-muted">
                                                        <Clock className="w-3 h-3" />
                                                        {job.processing_time.toFixed(1)}s
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-1.5">
                                                {job.status === 'COMPLETED' && (
                                                    <button
                                                        onClick={() => handleDownload(job.id, job.type)}
                                                        className="btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-1.5"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                        {t('history.downloadBtn')}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setShowCollectionModal(job.id)}
                                                    className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-muted hover:text-accent hover:border-accent/30 transition-all"
                                                    title="Add to collection"
                                                >
                                                    <FolderPlus className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(job.id)}
                                                    disabled={deleting === job.id}
                                                    className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-muted hover:text-danger hover:border-danger/30 transition-all disabled:opacity-40"
                                                >
                                                    {deleting === job.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>

                    ) : (

                        /* ── LIST VIEW ── */
                        <div className="space-y-2">
                            <AnimatePresence>
                                {filteredJobs.map((job, idx) => {
                                    const ts = getTypeStyle(job.type);
                                    return (
                                        <motion.div
                                            key={job.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            transition={{ delay: idx * 0.03 }}
                                            className="flex items-center gap-4 p-3 rounded-2xl bg-surface/40 border border-white/[0.06] hover:border-white/[0.1] backdrop-blur-sm transition-all group"
                                        >
                                            {/* Thumb */}
                                            <div
                                                className="w-14 h-14 rounded-xl overflow-hidden bg-black/20 shrink-0 cursor-pointer"
                                                onClick={() => job.status === 'COMPLETED' && setPreviewJob(job)}
                                            >
                                                {job.output_path && job.status === 'COMPLETED' ? (
                                                    <img src={`${API_URL}/${job.output_path.replace(/\\/g, '/')}`} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        {job.status === 'PROCESSING' ? <Loader2 className="w-4 h-4 text-primary animate-spin" /> : <XCircle className="w-4 h-4 text-danger/50" />}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Type */}
                                            <span className={`shrink-0 hidden sm:flex px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider items-center gap-1 border ${ts.badge}`}>
                                                {getTypeLabel(job.type)}
                                            </span>

                                            {/* Date + time */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-foreground/80 truncate">{formatDate(job.created_at)}</p>
                                                {job.processing_time && <p className="text-[10px] text-muted/50 mt-0.5">{job.processing_time.toFixed(1)}s</p>}
                                            </div>

                                            {/* Status icon */}
                                            <div className="shrink-0">{getStatusIcon(job.status)}</div>

                                            {/* Favorite */}
                                            <button
                                                onClick={() => toggleFavorite(job.id)}
                                                className={`shrink-0 p-1.5 rounded-lg transition-all ${job.is_favorite ? 'text-danger' : 'text-muted/30 hover:text-muted'}`}
                                            >
                                                <Heart className={`w-3.5 h-3.5 ${job.is_favorite ? 'fill-current' : ''}`} />
                                            </button>

                                            {/* Hover actions */}
                                            <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {job.status === 'COMPLETED' && (
                                                    <button onClick={() => handleDownload(job.id, job.type)} className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                                                        <Download className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(job.id)} disabled={deleting === job.id} className="p-2 rounded-xl text-muted/40 hover:text-danger hover:bg-danger/10 transition-all">
                                                    {deleting === job.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Image Lightbox ── */}
            <AnimatePresence>
                {previewJob && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/92 backdrop-blur-2xl z-[9999] flex items-center justify-center p-4"
                        onClick={() => setPreviewJob(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.88, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.88, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className="relative max-w-5xl w-full"
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setPreviewJob(null)}
                                className="absolute -top-5 -right-5 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all border border-white/10 backdrop-blur-sm"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <img
                                src={`${API_URL}/${previewJob.output_path.replace(/\\/g, '/')}`}
                                alt="Preview"
                                className="w-full rounded-2xl shadow-2xl"
                            />

                            <div className="flex items-center justify-between mt-4 px-1">
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getTypeStyle(previewJob.type).badge}`}>
                                        {getTypeLabel(previewJob.type)}
                                    </span>
                                    <span className="text-xs text-white/50">{formatDate(previewJob.created_at)}</span>
                                    {previewJob.processing_time && (
                                        <span className="text-xs text-white/40 flex items-center gap-1"><Clock className="w-3 h-3" />{previewJob.processing_time.toFixed(1)}s</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDownload(previewJob.id, previewJob.type)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                                >
                                    <Download className="w-4 h-4" />
                                    {t('history.downloadBtn')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Collection Modal ── */}
            <AnimatePresence>
                {showCollectionModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCollectionModal(null)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="card p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                                        <FolderPlus className="w-4 h-4 text-accent" />
                                    </div>
                                    <h3 className="font-display text-base font-bold">{t('history.addToCollection')}</h3>
                                </div>
                                <button onClick={() => setShowCollectionModal(null)} className="p-1.5 hover:bg-white/10 rounded-xl transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            {collections.length > 0 && (
                                <div className="space-y-1.5 mb-4">
                                    {collections.map(col => (
                                        <button key={col} onClick={() => setCollection(showCollectionModal, col)} className="w-full p-3 rounded-xl bg-white/[0.03] hover:bg-accent/8 border border-transparent hover:border-accent/20 text-left transition-all flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                                                <Folder className="w-3.5 h-3.5 text-accent" />
                                            </div>
                                            <span className="text-sm font-medium">{col}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newCollectionName}
                                    onChange={e => setNewCollectionName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && newCollectionName.trim() && setCollection(showCollectionModal, newCollectionName)}
                                    placeholder={t('history.newCollectionPlaceholder')}
                                    className="input-field flex-1 text-sm"
                                />
                                <button onClick={() => setCollection(showCollectionModal, newCollectionName)} disabled={!newCollectionName.trim()} className="btn-primary px-4 text-sm disabled:opacity-40">
                                    {t('history.addBtn')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
