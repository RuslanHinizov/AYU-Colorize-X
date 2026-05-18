import { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, ArrowLeft, Download, Zap, Scissors, Sparkles, Check,
    Maximize2, Minimize2,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import BeforeAfterSlider from '../components/BeforeAfterSlider';
import { useJobProcessing } from '../hooks/useJobProcessing';
import { useEditorStore } from '../store/editorStore';

function FullscreenPortal({ children, isFullscreen }) {
    if (!isFullscreen) return children;
    return createPortal(
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[9999] bg-background/98 backdrop-blur-xl flex items-center justify-center p-6">
            <div className="w-full h-full max-w-7xl mx-auto relative flex flex-col">{children}</div>
        </motion.div>,
        document.body
    );
}

const BG_OPTIONS = (t) => [
    { id: 'transparent', labelKey: 'bgRemove.transparentBg', color: null,      preview: 'checkerboard' },
    { id: 'white',       labelKey: 'bgRemove.whiteBg',       color: '#ffffff', preview: '#ffffff'       },
    { id: 'black',       labelKey: 'bgRemove.blackBg',       color: '#000000', preview: '#000000'       },
    { id: 'color',       labelKey: 'bgRemove.solidColor',    color: null,      preview: 'picker'        },
];

export default function BGRemovePage() {
    const { refreshUser } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    const {
        setSelectedFile, preview, setPreview, result, setResult, setJobId,
        isProcessing, error, setError, progress, isFullscreen, setIsFullscreen,
        resetState,
    } = useEditorStore();

    const [bgType, setBgType]     = useState('transparent');
    const [bgColor, setBgColor]   = useState('#4f46e5');

    const { processJob: handleProcess, downloadJob: handleDownload } = useJobProcessing({
        jobType: 'BG_REMOVE',
        getParams: () => ({
            bg_type:  bgType,
            bg_color: bgType === 'color' ? bgColor : undefined,
        }),
        downloadName: (id) => `bg_removed_${id}.png`,
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

    const handleFileSelect = (e) => { const f = e.target.files[0]; if (f) setFile(f); };
    const handleDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); };

    const bgOptions = BG_OPTIONS(t);

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Background orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="orb orb-secondary w-96 h-96 -top-48 -left-48 opacity-25" />
                <div className="orb orb-accent w-80 h-80 top-1/3 -right-40 opacity-20" />
            </div>

            <div className="relative z-10 p-6 lg:p-8">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
                    <button onClick={() => navigate('/')} className="group flex items-center gap-3 text-muted hover:text-foreground transition-all">
                        <div className="w-10 h-10 rounded-xl bg-surface-elevated/50 backdrop-blur-sm border border-white/5 flex items-center justify-center group-hover:border-secondary/30 group-hover:bg-secondary/10 transition-all">
                            <ArrowLeft className="w-4 h-4" />
                        </div>
                        <span className="font-medium">{t('nav.home')}</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <Scissors className="w-5 h-5 text-secondary" />
                        <span className="font-display text-lg">{t('bgRemove.title')}</span>
                    </div>
                </motion.div>

                <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
                    {/* Sidebar */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-4 xl:col-span-3 space-y-6">

                        {/* AI Info Card */}
                        <div className="card group">
                            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/5 border border-secondary/20 flex items-center justify-center shadow-lg shadow-secondary/10">
                                        <Scissors className="w-5 h-5 text-secondary" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold">{t('bgRemove.aiTitle')}</h2>
                                        <p className="text-sm text-muted">{t('bgRemove.aiSubtitle')}</p>
                                    </div>
                                </div>
                                <p className="text-sm text-muted leading-relaxed">{t('bgRemove.aiDesc')}</p>
                            </div>
                        </div>

                        {/* Background Type Selector */}
                        <div className="card">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                                    <Zap className="w-4 h-4 text-accent" />
                                </div>
                                <span className="font-medium">{t('bgRemove.bgTypeTitle')}</span>
                            </div>

                            <div className="space-y-2">
                                {bgOptions.map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setBgType(opt.id)}
                                        disabled={isProcessing}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                                            bgType === opt.id
                                                ? 'border-accent/50 bg-accent/10'
                                                : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        {/* Color swatch */}
                                        {opt.preview === 'checkerboard' ? (
                                            <div className="w-7 h-7 rounded-lg border border-white/20 flex-shrink-0"
                                                style={{ background: 'repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 0 0 / 12px 12px' }} />
                                        ) : opt.preview === 'picker' ? (
                                            <input
                                                type="color"
                                                value={bgColor}
                                                onChange={(e) => { setBgColor(e.target.value); setBgType('color'); }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0 flex-shrink-0"
                                                style={{ background: 'none' }}
                                            />
                                        ) : (
                                            <div className="w-7 h-7 rounded-lg border border-white/20 flex-shrink-0" style={{ backgroundColor: opt.color }} />
                                        )}
                                        <span className={`text-sm font-medium ${bgType === opt.id ? 'text-accent' : 'text-muted'}`}>
                                            {t(opt.labelKey)}
                                        </span>
                                        {bgType === opt.id && <Check className="w-4 h-4 text-accent ml-auto" />}
                                    </button>
                                ))}
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

                    {/* Main Canvas */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-8 xl:col-span-9">
                        <div className="card min-h-[400px] max-h-[calc(100vh-100px)] flex flex-col relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-secondary/3 via-transparent to-accent/3 rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                            {!preview ? (
                                <label
                                    role="button"
                                    aria-label={t('bgRemove.uploadDesc')}
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.querySelector('input')?.click()}
                                    onDrop={handleDrop}
                                    onDragOver={(e) => e.preventDefault()}
                                    className="relative flex-1 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-secondary/40 hover:bg-secondary/5 transition-all duration-500 group/upload m-2"
                                >
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-40 h-40 rounded-full border border-secondary/10 animate-ping opacity-20" style={{ animationDuration: '3s' }} />
                                    </div>
                                    <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="relative w-24 h-24 bg-gradient-to-br from-surface-elevated to-surface rounded-3xl flex items-center justify-center mb-8 shadow-2xl border border-white/10">
                                        <Upload className="w-10 h-10 text-muted group-hover/upload:text-secondary transition-colors duration-300" />
                                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-secondary rounded-xl flex items-center justify-center shadow-lg shadow-secondary/30">
                                            <Sparkles className="w-4 h-4 text-white" />
                                        </div>
                                    </motion.div>
                                    <h3 className="text-2xl font-display font-semibold mb-3" style={{ backgroundImage: 'linear-gradient(135deg, rgb(var(--color-secondary)), rgb(var(--color-accent)))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                        {t('bgRemove.uploadDesc')}
                                    </h3>
                                    <p className="text-muted mb-4 text-center max-w-xs">{t('bgRemove.subtitle')}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted/60 font-mono">
                                        {['JPG', 'PNG', 'BMP', 'WEBP'].map(f => <span key={f} className="px-2 py-1 rounded bg-white/5">{f}</span>)}
                                    </div>
                                    <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                                </label>
                            ) : (
                                <div className="relative flex-1 flex flex-col p-2 min-h-0">
                                    <FullscreenPortal isFullscreen={isFullscreen}>
                                        <div className={`flex-1 relative rounded-2xl overflow-hidden bg-black/30 backdrop-blur-sm flex items-center justify-center ${isFullscreen ? 'h-full rounded-none' : 'mb-4'}`}>
                                            {result && (
                                                <button onClick={() => setIsFullscreen(!isFullscreen)} className="absolute top-4 right-4 z-20 p-2.5 rounded-lg bg-black/60 text-muted hover:text-white hover:bg-white/10 transition-all">
                                                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                                </button>
                                            )}

                                            {result ? (
                                                <div className="absolute inset-0 w-full h-full">
                                                    <BeforeAfterSlider original={preview} modified={result} />
                                                </div>
                                            ) : (
                                                <img src={preview} alt="Preview" className="max-h-full w-full object-contain opacity-60" />
                                            )}

                                            <AnimatePresence>
                                                {isProcessing && (
                                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-xl flex flex-col items-center justify-center z-30">
                                                        <div className="relative mb-8">
                                                            <div className="w-24 h-24 rounded-full border-4 border-secondary/20" />
                                                            <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-transparent border-t-secondary animate-spin" />
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <Scissors className="w-8 h-8 text-secondary animate-pulse" />
                                                            </div>
                                                        </div>
                                                        <h3 className="text-2xl font-display font-semibold mb-2" style={{ backgroundImage: 'linear-gradient(135deg, rgb(var(--color-secondary)), rgb(var(--color-accent)))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                                            {t('bgRemove.processingTitle')}
                                                        </h3>
                                                        <p className="text-muted mb-6">
                                                            {progress < 40 ? t('bgRemove.analyzing') : progress < 80 ? t('bgRemove.removing') : t('editor.finishing')}
                                                        </p>
                                                        <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                                                            <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} style={{ background: 'linear-gradient(90deg, rgb(var(--color-secondary)), rgb(var(--color-accent)))' }} />
                                                        </div>
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
                                                <button onClick={handleProcess} disabled={isProcessing} className="btn-primary flex-[2] flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, rgb(var(--color-secondary)), rgb(var(--color-accent)))' }}>
                                                    <Scissors className="w-4 h-4" />
                                                    {t('bgRemove.removeBtn')}
                                                </button>
                                            ) : (
                                                <button onClick={handleDownload} className="btn-primary flex-[2] flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, rgb(34,197,94), rgb(16,185,129))' }}>
                                                    <Download className="w-4 h-4" />
                                                    {t('editor.downloadResult')}
                                                </button>
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
