import { useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Maximize2, Minimize2, Layout, SplitSquareHorizontal,
    Sparkles, Upload, Wrench, Zap, CheckCircle, Eye,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import PageHeader from '../components/PageHeader';
import DownloadButton from '../components/DownloadButton';
import BeforeAfterSlider from '../components/BeforeAfterSlider';
import { useEditorStore } from '../store/editorStore';
import { useJobProcessing } from '../hooks/useJobProcessing';

function FullscreenPortal({ children, isFullscreen }) {
    if (!isFullscreen) return children;
    return createPortal(
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[9999] bg-background/98 backdrop-blur-xl flex items-center justify-center p-6">
            <div className="w-full h-full max-w-7xl mx-auto relative flex flex-col">{children}</div>
        </motion.div>,
        document.body
    );
}

const FEATURES = [
    { icon: Eye,          labelKey: 'damageRestore.feat1' },
    { icon: Wrench,       labelKey: 'damageRestore.feat2' },
    { icon: Sparkles,     labelKey: 'damageRestore.feat3' },
    { icon: CheckCircle,  labelKey: 'damageRestore.feat4' },
];

export default function DamageRestorePage() {
    const { t } = useLanguage();
    const navigate = useNavigate();

    const {
        selectedFile, setSelectedFile,
        preview, setPreview,
        result, setResult, setJobId,
        isProcessing, error, setError,
        progress,
        isFullscreen, setIsFullscreen,
        viewMode, setViewMode,
        resetState,
    } = useEditorStore();

    const { processJob: handleProcess, jobId } = useJobProcessing({
        jobType: 'RESTORE_DAMAGE',
        downloadName: (id) => `repaired_${id}`,
        onLimitExceeded: (detail) => {
            if (detail !== 'LIMIT_EXCEEDED_PHOTO') return false;
            if (confirm(t('common.limitExceededPhoto'))) navigate('/plans');
            return true;
        },
    });

    useEffect(() => { resetState(); }, [resetState]);

    const setFile = (file) => {
        if (!file.type.startsWith('image/')) { setError(t('editor.imageOnlyError')); return; }
        setSelectedFile(file);
        setPreview(URL.createObjectURL(file));
        setResult(null);
        setJobId(null);
        setError('');
    };

    const stageMsg = progress < 30 ? t('damageRestore.stage1')
        : progress < 70 ? t('damageRestore.stage2')
        : t('damageRestore.stage3');

    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="orb orb-warning w-96 h-96 -top-48 -left-48 opacity-20" />
                <div className="orb orb-primary w-80 h-80 top-1/3 -right-40 opacity-15" />
            </div>

            <div className="relative z-10 p-6 lg:p-8">
                <PageHeader
                    icon={<Wrench className="w-6 h-6 text-warning" />}
                    title={t('damageRestore.title') || 'Photo Repair'}
                    subtitle="SDXL Inpainting AI"
                    badge="AI"
                    gradient="warning"
                    backLabel={t('nav.home')}
                />

                <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
                    {/* Left panel */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-4 xl:col-span-3 space-y-6">

                        {/* AI Info card */}
                        <div className="card group">
                            <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-warning/20 to-warning/5 border border-warning/20 flex items-center justify-center shadow-lg shadow-warning/10">
                                        <Wrench className="w-5 h-5 text-warning" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold">{t('damageRestore.title') || 'Photo Repair'}</h2>
                                        <p className="text-sm text-muted">Stable Diffusion XL</p>
                                    </div>
                                </div>
                                <p className="text-sm text-muted leading-relaxed">
                                    {t('damageRestore.desc') || 'Eski fotoğraflardaki yırtıkları, çizikleri ve hasarlı alanları otomatik olarak tespit ederek onarır.'}
                                </p>
                            </div>
                        </div>

                        {/* Features card */}
                        <div className="card group">
                            <div className="absolute inset-0 bg-gradient-to-br from-warning/3 to-transparent rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-9 h-9 rounded-xl bg-warning/10 flex items-center justify-center">
                                        <Zap className="w-4 h-4 text-warning" />
                                    </div>
                                    <span className="font-semibold text-sm">{t('damageRestore.featuresTitle') || 'Neler Onarılır?'}</span>
                                </div>
                                <div className="space-y-2.5">
                                    {[
                                        t('damageRestore.feat1') || 'Yırtık ve delik alanlar',
                                        t('damageRestore.feat2') || 'Çizikler ve lekeler',
                                        t('damageRestore.feat3') || 'Soluk ve kaybolmuş bölgeler',
                                        t('damageRestore.feat4') || 'Yaşlanma ve nem hasarı',
                                    ].map((feat, i) => (
                                        <div key={i} className="flex items-center gap-2.5">
                                            <div className="w-5 h-5 rounded-full bg-warning/15 border border-warning/25 flex items-center justify-center shrink-0">
                                                <CheckCircle className="w-3 h-3 text-warning" />
                                            </div>
                                            <span className="text-sm text-muted">{feat}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Tip card */}
                        <div className="card p-4 bg-warning/5 border-warning/20">
                            <div className="flex items-start gap-2">
                                <Sparkles className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                                <p className="text-xs text-muted/80 leading-relaxed">
                                    {t('damageRestore.tip')}
                                </p>
                            </div>
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-4 bg-danger/10 border-danger/20">
                                    <p className="text-sm text-danger">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Right panel */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-8 xl:col-span-9">
                        <div className="card min-h-[400px] max-h-[calc(100vh-100px)] flex flex-col relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-warning/3 via-transparent to-primary/3 rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                            {!preview ? (
                                <label
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.querySelector('input')?.click()}
                                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
                                    onDragOver={(e) => e.preventDefault()}
                                    className="relative flex-1 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-warning/40 hover:bg-warning/5 transition-all duration-500 group/upload m-2"
                                >
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-40 h-40 rounded-full border border-warning/10 animate-ping opacity-20" style={{ animationDuration: '3s' }} />
                                    </div>
                                    <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="relative w-24 h-24 bg-gradient-to-br from-surface-elevated to-surface rounded-3xl flex items-center justify-center mb-8 shadow-2xl border border-white/10">
                                        <Upload className="w-10 h-10 text-muted group-hover/upload:text-warning transition-colors duration-300" />
                                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-warning rounded-xl flex items-center justify-center shadow-lg shadow-warning/30">
                                            <Wrench className="w-4 h-4 text-white" />
                                        </div>
                                    </motion.div>
                                    <h3 className="text-2xl font-display font-semibold mb-3" style={{ backgroundImage: 'linear-gradient(135deg, rgb(234,179,8), rgb(249,115,22))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                        {t('damageRestore.uploadHint') || 'Hasarlı Fotoğraf Yükle'}
                                    </h3>
                                    <p className="text-muted mb-4 text-center max-w-xs text-sm">
                                        {t('damageRestore.desc') || 'Yırtık, çizikli veya soluk fotoğraflarınızı AI ile onarın'}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted/60 font-mono">
                                        {['JPG', 'PNG', 'BMP', 'WEBP'].map(f => <span key={f} className="px-2 py-1 rounded bg-white/5">{f}</span>)}
                                    </div>
                                    <input type="file" accept="image/*" onChange={(e) => { if (e.target.files[0]) setFile(e.target.files[0]); }} className="hidden" />
                                </label>
                            ) : (
                                <div className="relative flex-1 flex flex-col p-2 min-h-0">
                                    <FullscreenPortal isFullscreen={isFullscreen}>
                                        <div className={`flex-1 relative rounded-2xl overflow-hidden bg-black/30 backdrop-blur-sm flex items-center justify-center ${isFullscreen ? 'h-full rounded-none' : 'mb-4'}`}>
                                            {result && (
                                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="absolute top-4 right-4 z-20 flex gap-1 bg-black/60 backdrop-blur-xl p-1.5 rounded-xl border border-white/10 shadow-xl">
                                                    <button onClick={() => setViewMode('side-by-side')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'side-by-side' ? 'bg-warning text-white shadow-lg shadow-warning/30' : 'text-muted hover:text-white hover:bg-white/10'}`}><Layout className="w-4 h-4" /></button>
                                                    <button onClick={() => setViewMode('slider')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'slider' ? 'bg-warning text-white shadow-lg shadow-warning/30' : 'text-muted hover:text-white hover:bg-white/10'}`}><SplitSquareHorizontal className="w-4 h-4" /></button>
                                                    <div className="w-px bg-white/10 mx-1" />
                                                    <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2.5 rounded-lg text-muted hover:text-white hover:bg-white/10 transition-all">{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
                                                </motion.div>
                                            )}

                                            {result ? (
                                                viewMode === 'slider'
                                                    ? <div className="absolute inset-0 w-full h-full"><BeforeAfterSlider original={preview} modified={result} afterLabel={t('damageRestore.title') || 'Repaired'} avoidTopRightControls /></div>
                                                    : (
                                                        <div className="grid grid-cols-2 gap-3 w-full p-3 items-center h-full overflow-auto">
                                                            <div className="relative">
                                                                <span className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-white z-10">{t('editor.original') || 'Orijinal'}</span>
                                                                <img src={preview} alt="Original" className="w-full h-auto rounded-xl shadow-2xl" />
                                                            </div>
                                                            <div className="relative">
                                                                <span className="absolute top-3 left-3 px-3 py-1.5 rounded-lg text-xs text-white z-10" style={{ background: 'linear-gradient(135deg, rgb(234,179,8), rgb(249,115,22))' }}>{t('damageRestore.title') || 'Onarıldı'}</span>
                                                                <img src={result} alt="Repaired" className="w-full h-auto rounded-xl shadow-2xl ring-2 ring-warning/20" />
                                                            </div>
                                                        </div>
                                                    )
                                            ) : (
                                                <img src={preview} alt="Preview" className="max-h-full w-full object-contain opacity-60" />
                                            )}

                                            <AnimatePresence>
                                                {isProcessing && (
                                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-xl flex flex-col items-center justify-center z-30">
                                                        <div className="relative mb-8">
                                                            <div className="w-24 h-24 rounded-full border-4 border-warning/20" />
                                                            <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-transparent border-t-warning animate-spin" />
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <Wrench className="w-8 h-8 text-warning animate-pulse" />
                                                            </div>
                                                        </div>
                                                        <h3 className="text-2xl font-display font-semibold mb-2" style={{ backgroundImage: 'linear-gradient(135deg, rgb(234,179,8), rgb(249,115,22))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                                            {t('damageRestore.processing') || 'Onarılıyor...'}
                                                        </h3>
                                                        <p className="text-muted mb-6 text-sm">{stageMsg}</p>
                                                        <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                                                            <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} style={{ background: 'linear-gradient(90deg, rgb(234,179,8), rgb(249,115,22))' }} />
                                                        </div>
                                                        <p className="text-sm font-mono text-warning mt-3">{progress}%</p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </FullscreenPortal>

                                    {!isFullscreen && (
                                        <div className="flex items-center gap-4 mt-auto">
                                            <button onClick={resetState} disabled={isProcessing} className="btn-secondary flex-1">{t('editor.changeFile') || 'Değiştir'}</button>
                                            {!result ? (
                                                <button
                                                    onClick={handleProcess}
                                                    disabled={isProcessing || !selectedFile}
                                                    className="flex-[2] flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-white disabled:opacity-40 transition-all shadow-lg shadow-warning/20 hover:shadow-warning/30"
                                                    style={{ background: 'linear-gradient(135deg, rgb(234,179,8), rgb(249,115,22))' }}
                                                >
                                                    <Wrench className="w-4 h-4" />
                                                    {t('damageRestore.repairBtn') || 'Fotoğrafı Onar'}
                                                </button>
                                            ) : (
                                                <div className="flex-[2]">
                                                    <DownloadButton jobId={jobId} filename={`repaired_${jobId}`} />
                                                </div>
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
