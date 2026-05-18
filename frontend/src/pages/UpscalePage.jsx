import { useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Cpu, Download, ImagePlus, Lock, Maximize2, Sparkles, Upload, Zap } from 'lucide-react';
import { createPortal } from 'react-dom';
import BeforeAfterSlider from '../components/BeforeAfterSlider';
import { useJobProcessing } from '../hooks/useJobProcessing';
import { useEditorStore } from '../store/editorStore';

function FullscreenPortal({ children, isFullscreen }) {
    if (!isFullscreen) return children;
    return createPortal(<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[9999] bg-background/98 backdrop-blur-xl flex items-center justify-center p-6"><div className="w-full h-full max-w-7xl mx-auto relative flex flex-col">{children}</div></motion.div>, document.body);
}

export default function UpscalePage() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const {
        setSelectedFile, preview, setPreview, result, setResult, setJobId,
        isProcessing, error, setError, progress, device, setDevice, isFullscreen, setIsFullscreen,
        resetState,
    } = useEditorStore();

    const { processJob: handleProcess, downloadJob: handleDownload } = useJobProcessing({
        jobType: 'UPSCALE',
        getParams: () => ({ device }),
        downloadName: (id) => `upscaled_${id}.jpg`,
        onLimitExceeded: (detail) => {
            if (detail !== 'LIMIT_EXCEEDED_PHOTO') return false;
            if (confirm(t('common.limitExceededPhoto'))) navigate('/plans');
            return true;
        },
    });

    useEffect(() => { resetState(); }, [resetState]);

    const setFile = (file) => {
        if (!file.type.startsWith('image/')) {
            setError('Lutfen resim dosyasi yukleyin');
            return;
        }
        setSelectedFile(file);
        setPreview(URL.createObjectURL(file));
        setResult(null);
        setJobId(null);
        setError('');
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) setFile(file);
    };

    const handleDrop = (event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file) setFile(file);
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="orb orb-primary w-96 h-96 -top-48 -left-48 opacity-25" />
                <div className="orb orb-accent w-80 h-80 top-1/3 -right-40 opacity-20" />
            </div>

            <div className="relative z-10 p-6 lg:p-8">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
                    <button onClick={() => navigate('/')} className="group flex items-center gap-3 text-muted hover:text-foreground transition-all">
                        <div className="w-10 h-10 rounded-xl bg-surface-elevated/50 backdrop-blur-sm border border-white/5 flex items-center justify-center group-hover:border-primary/30 group-hover:bg-primary/10 transition-all"><ArrowLeft className="w-4 h-4" /></div>
                        <span className="font-medium">{t('nav.home')}</span>
                    </button>
                    <div className="flex items-center gap-2"><ImagePlus className="w-5 h-5 text-primary" /><span className="font-display text-lg">2x Upscale</span></div>
                </motion.div>

                <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-4 xl:col-span-3 space-y-6">
                        <div className="card group">
                            <div className="relative">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10"><ImagePlus className="w-5 h-5 text-primary" /></div>
                                    <div><h2 className="text-lg font-semibold">Real-ESRGAN</h2><p className="text-sm text-muted">2x kalite artirma</p></div>
                                </div>
                                <p className="text-sm text-muted">Model yoksa sistem kontrollu Lanczos fallback kullanir ve sonuc uretir.</p>
                            </div>
                        </div>

                        <div className="card group">
                            <div className="relative">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/5 border border-secondary/20 flex items-center justify-center shadow-lg shadow-secondary/10"><Cpu className="w-5 h-5 text-secondary" /></div>
                                    <div><h2 className="text-lg font-semibold">Islemci</h2><p className="text-sm text-muted">Hesaplama birimi</p></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {[{ id: 'cpu', name: 'CPU', desc: t('editor.cpu'), locked: false }, { id: 'gpu', name: 'GPU', desc: t('editor.gpu'), locked: false }].map((d) => (
                                        <button key={d.id} onClick={() => !d.locked && setDevice(d.id)} disabled={d.locked} className={`relative p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 ${device === d.id ? 'border-secondary/50 bg-secondary/10 shadow-lg shadow-secondary/5' : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'} ${d.locked ? 'opacity-40 cursor-not-allowed' : ''}`}>
                                            {d.locked && <Lock className="absolute top-2 right-2 w-3 h-3 text-muted" />}
                                            {device === d.id && !d.locked && <Check className="absolute top-2 right-2 w-4 h-4 text-secondary" />}
                                            <span className={`font-bold text-sm ${device === d.id ? 'text-secondary' : ''}`}>{d.name}</span>
                                            <span className="text-[10px] text-muted">{d.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <AnimatePresence>{error && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-4 bg-danger/10 border-danger/20"><p className="text-sm text-danger">{error}</p></motion.div>}</AnimatePresence>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-8 xl:col-span-9">
                        <div className="card min-h-[400px] max-h-[calc(100vh-100px)] flex flex-col relative overflow-hidden group">
                            {!preview ? (
                                <label role="button" aria-label="Foto yukle" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.querySelector('input')?.click()} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} className="relative flex-1 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all duration-500 group/upload m-2">
                                    <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="relative w-24 h-24 bg-gradient-to-br from-surface-elevated to-surface rounded-3xl flex items-center justify-center mb-8 shadow-2xl border border-white/10">
                                        <Upload className="w-10 h-10 text-muted group-hover/upload:text-primary transition-colors duration-300" />
                                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30"><Sparkles className="w-4 h-4 text-white" /></div>
                                    </motion.div>
                                    <h3 className="text-2xl font-display font-semibold mb-3 text-gradient">Foto Yukle</h3>
                                    <p className="text-muted mb-4 text-center max-w-xs">Dusuk cozunurluklu fotograflari 2x buyutun</p>
                                    <div className="flex items-center gap-2 text-xs text-muted/60 font-mono">{['JPG', 'PNG', 'BMP', 'WEBP'].map(f => <span key={f} className="px-2 py-1 rounded bg-white/5">{f}</span>)}</div>
                                    <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                                </label>
                            ) : (
                                <div className="relative flex-1 flex flex-col p-2 min-h-0">
                                    <FullscreenPortal isFullscreen={isFullscreen}>
                                        <div className={`flex-1 relative rounded-2xl overflow-hidden bg-black/30 backdrop-blur-sm flex items-center justify-center ${isFullscreen ? 'h-full rounded-none' : 'mb-4'}`}>
                                            {result && (
                                                <button onClick={() => setIsFullscreen(!isFullscreen)} className="absolute top-4 right-4 z-20 p-2.5 rounded-lg bg-black/60 text-muted hover:text-white hover:bg-white/10 transition-all"><Maximize2 className="w-4 h-4" /></button>
                                            )}
                                            {result ? <div className="absolute inset-0 w-full h-full"><BeforeAfterSlider original={preview} modified={result} /></div> : <img src={preview} alt="Preview" className="max-h-full w-full object-contain opacity-60" />}
                                            <AnimatePresence>
                                                {isProcessing && (
                                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-xl flex flex-col items-center justify-center z-30">
                                                        <div className="relative mb-8"><div className="w-24 h-24 rounded-full border-4 border-primary/20" /><div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-transparent border-t-primary animate-spin" /></div>
                                                        <h3 className="text-2xl font-display font-semibold mb-2 text-gradient">AI Upscale</h3>
                                                        <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm"><motion.div className="h-full bg-gradient-to-r from-primary via-secondary to-accent rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} /></div>
                                                        <p className="text-sm font-mono text-primary mt-3">{progress}%</p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </FullscreenPortal>

                                    {!isFullscreen && (
                                        <div className="flex items-center gap-4 mt-auto">
                                            <button onClick={resetState} className="btn-secondary flex-1" disabled={isProcessing}>{t('editor.changeFile')}</button>
                                            {!result ? (
                                                <button onClick={handleProcess} disabled={isProcessing} className="btn-primary flex-[2] flex items-center justify-center gap-2"><Zap className="w-4 h-4" />{t('editor.startProcessing')}</button>
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
