import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle,
    Download,
    Layout,
    Maximize2,
    Minimize2,
    Sparkles,
    SplitSquareHorizontal,
    Upload,
    Wand2,
    Zap,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DownloadButton from '../components/DownloadButton';
import { createPortal } from 'react-dom';
import BeforeAfterSlider from '../components/BeforeAfterSlider';
import { useJobProcessing } from '../hooks/useJobProcessing';
import { useEditorStore } from '../store/editorStore';

const ENHANCE_MODE_CONFIGS = [
    { id: 'restore',         jobType: 'RESTORE', accent: 'accent'     },
    { id: 'upscale',         jobType: 'UPSCALE', accent: 'primary'    },
    { id: 'restore_upscale', jobType: 'RESTORE', accent: 'secondary'  },
];

function FullscreenPortal({ children, isFullscreen }) {
    if (!isFullscreen) return children;
    return createPortal(
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[9999] bg-background/98 backdrop-blur-xl flex items-center justify-center p-6">
            <div className="w-full h-full max-w-7xl mx-auto relative flex flex-col">{children}</div>
        </motion.div>,
        document.body,
    );
}

function normalizeInitialMode(initialMode, queryMode) {
    const candidate = (queryMode || initialMode || 'restore').replace('-', '_');
    return ENHANCE_MODE_CONFIGS.some((mode) => mode.id === candidate) ? candidate : 'restore';
}

export default function EnhancePage({ initialMode = 'restore' }) {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [selectedMode, setSelectedMode] = useState(() => normalizeInitialMode(initialMode, searchParams.get('mode')));
    const {
        setSelectedFile,
        preview,
        setPreview,
        result,
        setResult,
        setJobId,
        isProcessing,
        error,
        setError,
        progress,
        viewMode,
        setViewMode,
        isFullscreen,
        setIsFullscreen,
        resetState,
        upscaleScale,
        setUpscaleScale,
    } = useEditorStore();

    const ENHANCE_MODES = useMemo(() => [
        { ...ENHANCE_MODE_CONFIGS[0], title: t('enhance.restoreTitle'),        subtitle: t('enhance.restoreSubtitle')        },
        { ...ENHANCE_MODE_CONFIGS[1], title: t('enhance.upscaleTitle'),         subtitle: t('enhance.upscaleSubtitle')         },
        { ...ENHANCE_MODE_CONFIGS[2], title: t('enhance.restoreUpscaleTitle'),  subtitle: t('enhance.restoreUpscaleSubtitle')  },
    ], [t]);

    const mode = useMemo(
        () => ENHANCE_MODES.find((item) => item.id === selectedMode) || ENHANCE_MODES[0],
        [selectedMode, ENHANCE_MODES],
    );

    const { processJob: handleProcess, downloadJob: handleDownload, jobId } = useJobProcessing({
        jobType: mode.jobType,
        getParams: () => ({
            device: 'cpu',
            enhance_mode: selectedMode,
            scale: upscaleScale,
        }),
        downloadName: (id) => `enhanced_${selectedMode}_${id}.jpg`,
        onLimitExceeded: (detail) => {
            if (detail !== 'LIMIT_EXCEEDED_PHOTO') return false;
            if (confirm(t('common.limitExceededPhoto'))) navigate('/plans');
            return true;
        },
    });

    useEffect(() => { resetState(); }, [resetState]);

    const setFile = (file) => {
        if (!file.type.startsWith('image/')) {
            setError(t('editor.imageOnlyError'));
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

    const changeMode = (nextMode) => {
        if (isProcessing) return;
        setSelectedMode(nextMode);
        setResult(null);
        setJobId(null);
        setError('');
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="orb orb-accent w-96 h-96 -top-48 -left-48 opacity-24" />
                <div className="orb orb-primary w-80 h-80 top-1/3 -right-40 opacity-18" />
            </div>

            <div className="relative z-10 p-6 lg:p-8">
                <PageHeader
                    icon={<Sparkles className="w-6 h-6 text-accent" />}
                    title="AI Enhance"
                    subtitle="CodeFormer + Real-ESRGAN"
                    badge="AI"
                    gradient="accent"
                    backLabel={t('nav.home')}
                />

                <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-4 xl:col-span-3 space-y-6">
                        <div className="card group">
                            <div className="relative">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-primary/10 border border-accent/20 flex items-center justify-center shadow-lg shadow-accent/10">
                                        <Wand2 className="w-5 h-5 text-accent" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold">Local AI</h2>
                                        <p className="text-sm text-muted">CodeFormer + Real-ESRGAN</p>
                                    </div>
                                </div>
                                <p className="text-sm text-muted leading-relaxed">
                                    {t('enhance.localAiDesc')}
                                </p>
                            </div>
                        </div>

                        <div className="card group">
                            <div className="relative">
                                <h2 className="text-lg font-semibold mb-4">{t('enhance.modeTitle')}</h2>
                                <div className="space-y-3">
                                    {ENHANCE_MODES.map((item) => {
                                        const active = item.id === selectedMode;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => changeMode(item.id)}
                                                disabled={isProcessing}
                                                className={`w-full text-left p-4 rounded-xl border transition-all ${active ? 'border-accent/50 bg-accent/10 shadow-lg shadow-accent/5' : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'}`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center ${active ? 'bg-accent text-white' : 'bg-white/[0.06] text-muted'}`}>
                                                        <Sparkles className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm">{item.title}</p>
                                                        <p className="text-xs text-muted mt-1">{item.subtitle}</p>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Scale selector — only for upscale modes */}
                                {(selectedMode === 'upscale' || selectedMode === 'restore_upscale') && (
                                    <div className="mt-4 pt-4 border-t border-white/5">
                                        <h2 className="text-sm font-semibold mb-3 text-muted">{t('enhance.scaleLabel')}</h2>
                                        <div className="flex gap-2">
                                            {[4, 8, 16].map((s) => (
                                                <button
                                                    key={s}
                                                    onClick={() => setUpscaleScale(s)}
                                                    disabled={isProcessing}
                                                    className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${upscaleScale === s ? 'border-primary/50 bg-primary/10 text-primary shadow-lg shadow-primary/5' : 'border-white/5 bg-white/[0.02] text-muted hover:border-white/10'}`}
                                                >
                                                    {s}×
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted mt-2">
                                            {upscaleScale === 16 ? t('enhance.scale16xDesc') : upscaleScale === 8 ? t('enhance.scale8xDesc') : t('enhance.scale4xDesc')}
                                        </p>
                                        <AnimatePresence>
                                            {upscaleScale >= 8 && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="mt-3 p-3 rounded-xl bg-warning/10 border border-warning/30 flex items-start gap-2"
                                                >
                                                    <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                                                    <p className="text-xs text-warning leading-relaxed">
                                                        {upscaleScale === 16 ? t('enhance.scale16xWarning') : t('enhance.scale8xWarning')}
                                                    </p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}
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

                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-8 xl:col-span-9">
                        <div className="card min-h-[400px] max-h-[calc(100vh-100px)] flex flex-col relative overflow-hidden group">
                            {!preview ? (
                                <label role="button" aria-label={t('enhance.uploadTitle')} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.querySelector('input')?.click()} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} className="relative flex-1 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-accent/40 hover:bg-accent/5 transition-all duration-500 group/upload m-2">
                                    <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="relative w-24 h-24 bg-gradient-to-br from-surface-elevated to-surface rounded-3xl flex items-center justify-center mb-8 shadow-2xl border border-white/10">
                                        <Upload className="w-10 h-10 text-muted group-hover/upload:text-accent transition-colors duration-300" />
                                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/30">
                                            <Wand2 className="w-4 h-4 text-white" />
                                        </div>
                                    </motion.div>
                                    <h3 className="text-2xl font-display font-semibold mb-3 text-gradient">{t('enhance.uploadTitle')}</h3>
                                    <p className="text-muted mb-4 text-center max-w-xs">{t('enhance.uploadModeDesc').replace('{mode}', mode.title)}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted/60 font-mono">
                                        {['JPG', 'PNG', 'BMP', 'WEBP'].map((format) => <span key={format} className="px-2 py-1 rounded bg-white/5">{format}</span>)}
                                    </div>
                                    <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                                </label>
                            ) : (
                                <div className="relative flex-1 flex flex-col p-2 min-h-0">
                                    <FullscreenPortal isFullscreen={isFullscreen}>
                                        <div className={`flex-1 relative rounded-2xl overflow-hidden bg-black/30 backdrop-blur-sm flex items-center justify-center ${isFullscreen ? 'h-full rounded-none' : 'mb-4'}`}>
                                            {result && (
                                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="absolute top-4 right-4 z-40 flex gap-1 bg-black/60 backdrop-blur-xl p-1.5 rounded-xl border border-white/10 shadow-xl">
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewMode('slider')}
                                                        aria-label={t('enhance.sliderView')}
                                                        title={t('enhance.sliderView')}
                                                        className={`p-2.5 rounded-lg transition-all ${viewMode === 'slider' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-muted hover:text-white hover:bg-white/10'}`}
                                                    >
                                                        <Layout className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewMode('side-by-side')}
                                                        aria-label={t('enhance.sideBySideView')}
                                                        title={t('enhance.sideBySideView')}
                                                        className={`p-2.5 rounded-lg transition-all ${viewMode === 'side-by-side' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-muted hover:text-white hover:bg-white/10'}`}
                                                    >
                                                        <SplitSquareHorizontal className="w-4 h-4" />
                                                    </button>
                                                    <div className="w-px bg-white/10 mx-1" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsFullscreen(!isFullscreen)}
                                                        aria-label={isFullscreen ? t('enhance.exitFullscreen') : t('enhance.fullscreen')}
                                                        title={isFullscreen ? t('enhance.exitFullscreen') : t('enhance.fullscreen')}
                                                        className="p-2.5 rounded-lg text-muted hover:text-white hover:bg-white/10 transition-all"
                                                    >
                                                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                                    </button>
                                                </motion.div>
                                            )}
                                            {result ? (
                                                viewMode === 'slider' ? (
                                                    <div className="absolute inset-0 w-full h-full">
                                                        <BeforeAfterSlider original={preview} modified={result} afterLabel={mode.title} avoidTopRightControls />
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 w-full p-3 items-center h-full overflow-auto">
                                                        <div className="relative">
                                                            <span className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-white z-10">{t('editor.original')}</span>
                                                            <img src={preview} alt="Original" className="w-full h-auto rounded-xl shadow-2xl" />
                                                        </div>
                                                        <div className="relative">
                                                            <span className="absolute top-3 left-3 bg-gradient-to-r from-primary to-accent px-3 py-1.5 rounded-lg text-xs text-white z-10">{mode.title}</span>
                                                            <img src={result} alt="Enhanced" className="w-full h-auto rounded-xl shadow-2xl ring-2 ring-primary/20" />
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
                                                            <div className="w-24 h-24 rounded-full border-4 border-accent/20" />
                                                            <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-transparent border-t-accent animate-spin" />
                                                            <div className="absolute inset-0 flex items-center justify-center"><Sparkles className="w-8 h-8 text-accent animate-pulse" /></div>
                                                        </div>
                                                        <h3 className="text-2xl font-display font-semibold mb-2 text-gradient">{mode.title}</h3>
                                                        <p className="text-muted mb-6">{progress < 35 ? t('enhance.preparingModel') : progress < 80 ? t('enhance.processingPhoto') : t('enhance.preparingResult')}</p>
                                                        <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                                                            <motion.div className="h-full bg-gradient-to-r from-accent via-primary to-secondary rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
                                                        </div>
                                                        <p className="text-sm font-mono text-accent mt-3">{progress}%</p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </FullscreenPortal>

                                    {!isFullscreen && (
                                        <div className="flex items-center gap-4 mt-auto">
                                            <button onClick={resetState} className="btn-secondary flex-1" disabled={isProcessing}>{t('editor.changeFile')}</button>
                                            {!result ? (
                                                <button onClick={handleProcess} disabled={isProcessing} className="btn-primary flex-[2] flex items-center justify-center gap-2">
                                                    <Zap className="w-4 h-4" />
                                                    {mode.title}
                                                </button>
                                            ) : (
                                                <div className="flex-[2]"><DownloadButton jobId={jobId} filename={`enhanced_${jobId}`} /></div>
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
