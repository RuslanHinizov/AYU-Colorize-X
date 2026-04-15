import { useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { Upload, ArrowLeft, Download, Sliders, Cpu, Zap, Layout, SplitSquareHorizontal, Maximize2, Minimize2, Lock, Film, Check, Sparkles, AlertTriangle } from 'lucide-react';
import axios from '../lib/axios';
import VideoBeforeAfterSlider from '../components/VideoBeforeAfterSlider';
import { createPortal } from 'react-dom';
import { useEditorStore } from '../store/editorStore';
import { wsManager } from '../lib/websocket';

function FullscreenPortal({ children, isFullscreen }) {
    if (!isFullscreen) return children;
    return createPortal(<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[9999] bg-background/98 backdrop-blur-xl flex items-center justify-center p-6"><div className="w-full h-full max-w-7xl mx-auto relative flex flex-col">{children}</div></motion.div>, document.body);
}

export default function VideoEditor() {
    const { user, refreshUser } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    const { selectedFile, setSelectedFile, preview, setPreview, result, setResult, jobId, setJobId, isProcessing, setIsProcessing, error, setError, progress, setProgress, device, setDevice, renderFactor, setRenderFactor, viewMode, setViewMode, isFullscreen, setIsFullscreen, resetState } = useEditorStore();

    useEffect(() => { resetState(); }, []);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('video/')) { setError('Lütfen video dosyası yükleyin'); return; }
            setSelectedFile(file); setPreview(URL.createObjectURL(file)); setResult(null); setJobId(null); setError('');
        }
    };

    const handleProcess = async () => {
        if (!selectedFile) return;
        setIsProcessing(true); setError(''); setProgress(0);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            const response = await axios.post(`/jobs/process?type=VIDEO_COLORIZE&render_factor=${renderFactor}&device=${device}`, formData);
            const job = response.data;
            if (job.status === 'COMPLETED') { setResult(`${API_URL}/${job.output_path.replace(/\\/g, '/')}`); setJobId(job.id); setIsProcessing(false); refreshUser(); }
            else if (job.status === 'FAILED') { setError(job.error_message || 'İşlem başarısız'); setIsProcessing(false); }
            else { setJobId(job.id); wsManager.isConnected() ? watchJobWithWebSocket(job.id) : pollJobStatus(job.id); }
        } catch (err) {
            const detail = err.response?.data?.detail;
            if (detail === 'LIMIT_EXCEEDED_VIDEO') { if (confirm(t('common.limitExceededVideo'))) navigate('/plans'); setIsProcessing(false); return; }
            setError(typeof detail === 'string' ? detail : (Array.isArray(detail) ? 'Geçersiz veri (Lütfen tekrar deneyin)' : 'İşlem başarısız')); setIsProcessing(false);
        }
    };

    const watchJobWithWebSocket = (id) => {
        const unsubscribe = wsManager.watchJob(id, (p) => setProgress(p), (outputPath) => { setResult(`${API_URL}/${outputPath.replace(/\\/g, '/')}`); setIsProcessing(false); setProgress(100); refreshUser(); unsubscribe(); }, (e) => { setError(e || 'İşlem başarısız'); setIsProcessing(false); unsubscribe(); });
    };

    const pollJobStatus = async (id) => {
        const interval = setInterval(async () => {
            try {
                const response = await axios.get(`/jobs/${id}`);
                const job = response.data;
                if (job.progress !== undefined) setProgress(job.progress);
                if (job.status === 'COMPLETED') { clearInterval(interval); setResult(`${API_URL}/${job.output_path.replace(/\\/g, '/')}`); setIsProcessing(false); refreshUser(); }
                else if (job.status === 'FAILED') { clearInterval(interval); setError(job.error_message || 'İşlem başarısız'); setIsProcessing(false); }
            } catch { clearInterval(interval); setError('Durum kontrolü başarısız'); setIsProcessing(false); }
        }, 2000);
    };

    const handleDownload = async () => {
        if (!jobId) return;
        try { const response = await axios.get(`/jobs/${jobId}/download`, { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([response.data])); const link = document.createElement('a'); link.href = url; link.setAttribute('download', `colorized_${jobId}.mp4`); document.body.appendChild(link); link.click(); document.body.removeChild(link); } catch (err) { console.error('İndirme başarısız:', err); }
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="orb orb-secondary w-96 h-96 -top-48 -left-48 opacity-30" />
                <div className="orb orb-accent w-80 h-80 top-1/3 -right-40 opacity-20" />
            </div>

            <div className="relative z-10 p-6 lg:p-8">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
                    <button onClick={() => navigate('/')} className="group flex items-center gap-3 text-muted hover:text-foreground transition-all">
                        <div className="w-10 h-10 rounded-xl bg-surface-elevated/50 backdrop-blur-sm border border-white/5 flex items-center justify-center group-hover:border-secondary/30 group-hover:bg-secondary/10 transition-all"><ArrowLeft className="w-4 h-4" /></div>
                        <span className="font-medium">{t('nav.home')}</span>
                    </button>
                    <div className="flex items-center gap-2"><Film className="w-5 h-5 text-secondary" /><span className="font-display text-lg">Video Renklendirme</span></div>
                </motion.div>

                <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-4 xl:col-span-3 space-y-6">
                        {/* Model Info */}
                        <div className="card group">
                            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/5 border border-secondary/20 flex items-center justify-center shadow-lg shadow-secondary/10"><Film className="w-5 h-5 text-secondary" /></div>
                                    <div><h2 className="text-lg font-semibold">Video AI</h2><p className="text-sm text-muted">Temporal tutarlılık modeli</p></div>
                                </div>
                                <div className="p-4 rounded-xl bg-secondary/5 border border-secondary/20">
                                    <p className="text-sm text-muted">Video renklendirme için özel olarak optimize edilmiş AI modeli. Kare kare tutarlılık sağlar.</p>
                                </div>
                            </div>
                        </div>

                        {/* Device Selection */}
                        <div className="card group">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10"><Cpu className="w-5 h-5 text-primary" /></div>
                                    <div><h2 className="text-lg font-semibold">İşlemci</h2><p className="text-sm text-muted">Hesaplama birimi</p></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {[{ id: 'cpu', name: 'CPU', desc: t('editor.cpu'), locked: false }, { id: 'gpu', name: 'GPU', desc: t('editor.gpu'), locked: false }].map((d) => (
                                        <button key={d.id} onClick={() => !d.locked && setDevice(d.id)} disabled={d.locked} className={`relative p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 ${device === d.id ? 'border-primary/50 bg-primary/10 shadow-lg shadow-primary/5' : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'} ${d.locked ? 'opacity-40 cursor-not-allowed' : ''}`}>
                                            {d.locked && <Lock className="absolute top-2 right-2 w-3 h-3 text-muted" />}
                                            {device === d.id && !d.locked && <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />}
                                            <span className={`font-bold text-sm ${device === d.id ? 'text-primary' : ''}`}>{d.name}</span>
                                            <span className="text-[10px] text-muted">{d.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Render Factor */}
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><Sliders className="w-4 h-4 text-accent" /></div><span className="font-medium">{t('editor.renderFactor')}</span></div>
                                <span className="text-lg font-mono font-bold text-accent">{renderFactor}</span>
                            </div>
                            <input type="range" min="10" max="45" value={renderFactor} onChange={(e) => setRenderFactor(parseInt(e.target.value))} className="w-full accent-accent h-2 bg-white/10 rounded-lg appearance-none cursor-pointer" disabled={isProcessing} />
                            <p className="text-xs text-muted mt-3">{t('editor.renderFactorDesc')}</p>
                        </div>

                        {/* Warning */}
                        <div className="card p-4 bg-accent/5 border-accent/20">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-accent">{t('editor.videoWarning')}</p>
                            </div>
                        </div>

                        <AnimatePresence>{error && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-4 bg-danger/10 border-danger/20"><p className="text-sm text-danger">{error}</p></motion.div>}</AnimatePresence>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-8 xl:col-span-9">
                        <div className="card min-h-[400px] max-h-[calc(100vh-100px)] flex flex-col relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-secondary/3 via-transparent to-accent/3 rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                            {!preview ? (
                                <label role="button" aria-label="Video yükle" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.querySelector('input')?.click()} className="relative flex-1 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-secondary/40 hover:bg-secondary/5 transition-all duration-500 group/upload m-2">
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-40 h-40 rounded-full border border-secondary/10 animate-ping opacity-20" style={{ animationDuration: '3s' }} /></div>
                                    <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="relative w-24 h-24 bg-gradient-to-br from-surface-elevated to-surface rounded-3xl flex items-center justify-center mb-8 shadow-2xl border border-white/10">
                                        <Upload className="w-10 h-10 text-muted group-hover/upload:text-secondary transition-colors duration-300" />
                                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-secondary rounded-xl flex items-center justify-center shadow-lg shadow-secondary/30"><Sparkles className="w-4 h-4 text-white" /></div>
                                    </motion.div>
                                    <h3 className="text-2xl font-display font-semibold mb-3 text-gradient">Video Yükle</h3>
                                    <p className="text-muted mb-4 text-center max-w-xs">Siyah beyaz videolarınızı AI ile renklendirin</p>
                                    <div className="flex items-center gap-2 text-xs text-muted/60 font-mono">{['MP4', 'AVI', 'MOV', 'MKV'].map(f => <span key={f} className="px-2 py-1 rounded bg-white/5">{f}</span>)}</div>
                                    <input type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
                                </label>
                            ) : (
                                <div className="relative flex-1 flex flex-col p-2 min-h-0">
                                    <FullscreenPortal isFullscreen={isFullscreen}>
                                        <div className={`flex-1 relative rounded-2xl overflow-hidden bg-black/30 backdrop-blur-sm flex items-center justify-center ${isFullscreen ? 'h-full rounded-none' : 'mb-4'}`}>
                                            {result && (
                                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="absolute top-4 right-4 z-20 flex gap-1 bg-black/60 backdrop-blur-xl p-1.5 rounded-xl border border-white/10 shadow-xl">
                                                    <button onClick={() => setViewMode('slider')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'slider' ? 'bg-secondary text-white shadow-lg shadow-secondary/30' : 'text-muted hover:text-white hover:bg-white/10'}`}><Layout className="w-4 h-4" /></button>
                                                    <button onClick={() => setViewMode('side-by-side')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'side-by-side' ? 'bg-secondary text-white shadow-lg shadow-secondary/30' : 'text-muted hover:text-white hover:bg-white/10'}`}><SplitSquareHorizontal className="w-4 h-4" /></button>
                                                    <div className="w-px bg-white/10 mx-1" />
                                                    <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2.5 rounded-lg text-muted hover:text-white hover:bg-white/10 transition-all">{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
                                                </motion.div>
                                            )}

                                            {result ? (
                                                viewMode === 'slider' ? <div className="absolute inset-0 w-full h-full"><VideoBeforeAfterSlider original={preview} modified={result} /></div> : (
                                                    <div className="grid grid-cols-2 gap-3 w-full h-full p-3">
                                                        <div className="relative"><span className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-white z-10">Orijinal</span><video src={preview} controls className="w-full h-full object-contain rounded-xl" /></div>
                                                        <div className="relative"><span className="absolute top-3 left-3 bg-gradient-to-r from-secondary to-accent px-3 py-1.5 rounded-lg text-xs text-white z-10">Renkli</span><video src={result} controls className="w-full h-full object-contain rounded-xl" /></div>
                                                    </div>
                                                )
                                            ) : <video src={preview} controls className="max-h-full w-full object-contain opacity-60" />}

                                            <AnimatePresence>
                                                {isProcessing && (
                                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-xl flex flex-col items-center justify-center z-30">
                                                        <div className="relative mb-8"><div className="w-24 h-24 rounded-full border-4 border-secondary/20" /><div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-transparent border-t-secondary animate-spin" /><div className="absolute inset-0 flex items-center justify-center"><Film className="w-8 h-8 text-secondary animate-pulse" /></div></div>
                                                        <h3 className="text-2xl font-display font-semibold mb-2 text-gradient">Video Renklendirme</h3>
                                                        <p className="text-muted mb-6">{progress < 30 ? 'Kareler analiz ediliyor...' : progress < 70 ? 'Renklendiriliyor...' : 'Tamamlanıyor...'}</p>
                                                        <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm"><motion.div className="h-full bg-gradient-to-r from-secondary via-accent to-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} /></div>
                                                        <p className="text-sm font-mono text-secondary mt-3">{progress}%</p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </FullscreenPortal>

                                    {!isFullscreen && (
                                        <div className="flex items-center gap-4 mt-auto">
                                            <button onClick={resetState} className="btn-secondary flex-1" disabled={isProcessing}>{t('editor.changeFile')}</button>
                                            {!result ? (
                                                <button onClick={handleProcess} disabled={isProcessing} className="btn-primary flex-[2] flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, rgb(var(--color-secondary)), rgb(var(--color-accent)))' }}><Zap className="w-4 h-4" />{t('editor.startProcessing')}</button>
                                            ) : (
                                                <button onClick={handleDownload} className="btn-primary flex-[2] flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, rgb(34, 197, 94), rgb(16, 185, 129))' }}><Download className="w-4 h-4" />{t('editor.downloadResult')}</button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
