import { useState, useEffect, useCallback } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, Download, Zap, Scissors, Sparkles, Check,
    Maximize2, Minimize2, Layout, SplitSquareHorizontal,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DownloadButton from '../components/DownloadButton';
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
    { id: 'color',       labelKey: 'bgRemove.solidColor',    color: null,      preview: 'custom'        },
];

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

export default function BGRemovePage() {
    const { refreshUser } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    const {
        setSelectedFile, preview, setPreview, result, setResult, setJobId,
        isProcessing, error, setError, progress, isFullscreen, setIsFullscreen,
        viewMode, setViewMode, resetState,
    } = useEditorStore();

    const [bgType, setBgType]     = useState('transparent');
    const [bgColor, setBgColor]   = useState('#4f46e5');
    const [rgb, setRgb]           = useState(() => hexToRgb('#4f46e5'));

    const updateRgbChannel = useCallback((channel, value) => {
        const clamped = Math.max(0, Math.min(255, Number(value) || 0));
        const next = { ...rgb, [channel]: clamped };
        setRgb(next);
        setBgColor(rgbToHex(next.r, next.g, next.b));
        setBgType('color');
    }, [rgb]);

    const { processJob: handleProcess, downloadJob: handleDownload, jobId } = useJobProcessing({
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
                <PageHeader
                    icon={<Scissors className="w-6 h-6 text-success" />}
                    title={t('bgRemove.title')}
                    subtitle={t('bgRemove.aiSubtitle')}
                    badge="AI"
                    gradient="success"
                    backLabel={t('nav.home')}
                />

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
                                        {opt.preview === 'checkerboard' ? (
                                            <div className="w-7 h-7 rounded-lg border border-white/20 flex-shrink-0"
                                                style={{ background: 'repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 0 0 / 12px 12px' }} />
                                        ) : opt.preview === 'custom' ? (
                                            <div className="w-7 h-7 rounded-lg border border-white/20 flex-shrink-0 shadow-inner" style={{ backgroundColor: bgColor }} />
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

                            {/* RGB panel — sadece Özel Renk seçildiğinde */}
                            <AnimatePresence>
                                {bgType === 'color' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                                            {/* Renk önizleme + hex */}
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl border border-white/20 shadow-lg flex-shrink-0" style={{ backgroundColor: bgColor }} />
                                                <div className="flex-1">
                                                    <p className="text-[10px] text-muted/60 font-mono uppercase tracking-wider mb-1">HEX</p>
                                                    <input
                                                        type="text"
                                                        value={bgColor}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                                                                setBgColor(val);
                                                                setRgb(hexToRgb(val));
                                                            } else {
                                                                setBgColor(val);
                                                            }
                                                        }}
                                                        maxLength={7}
                                                        className="w-full bg-transparent text-sm font-mono text-foreground border border-white/10 rounded-lg px-2 py-1 focus:outline-none focus:border-accent/40"
                                                        placeholder="#4f46e5"
                                                    />
                                                </div>
                                                {/* Sistem renk seçici */}
                                                <label className="cursor-pointer">
                                                    <div className="w-8 h-8 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all" title="Renk seç">
                                                        <svg className="w-4 h-4 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
                                                            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
                                                        </svg>
                                                    </div>
                                                    <input type="color" value={bgColor}
                                                        onChange={(e) => { setBgColor(e.target.value); setRgb(hexToRgb(e.target.value)); }}
                                                        className="sr-only"
                                                    />
                                                </label>
                                            </div>

                                            {/* R G B inputs */}
                                            {[
                                                { ch: 'r', label: 'R', color: 'rgb(239,68,68)' },
                                                { ch: 'g', label: 'G', color: 'rgb(34,197,94)' },
                                                { ch: 'b', label: 'B', color: 'rgb(99,102,241)' },
                                            ].map(({ ch, label, color }) => (
                                                <div key={ch} className="flex items-center gap-2">
                                                    <span className="text-xs font-mono font-bold w-4 flex-shrink-0" style={{ color }}>{label}</span>
                                                    <input
                                                        type="range"
                                                        min={0} max={255}
                                                        value={rgb[ch]}
                                                        onChange={(e) => updateRgbChannel(ch, e.target.value)}
                                                        className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                                                        style={{ accentColor: color }}
                                                    />
                                                    <input
                                                        type="number"
                                                        min={0} max={255}
                                                        value={rgb[ch]}
                                                        onChange={(e) => updateRgbChannel(ch, e.target.value)}
                                                        className="w-12 bg-white/5 border border-white/10 rounded-lg px-1.5 py-1 text-xs font-mono text-center focus:outline-none focus:border-accent/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
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
                                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="absolute top-4 right-4 z-20 flex gap-1 bg-black/60 backdrop-blur-xl p-1.5 rounded-xl border border-white/10 shadow-xl">
                                                    <button onClick={() => setViewMode('side-by-side')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'side-by-side' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-muted hover:text-white hover:bg-white/10'}`}><Layout className="w-4 h-4" /></button>
                                                    <button onClick={() => setViewMode('slider')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'slider' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-muted hover:text-white hover:bg-white/10'}`}><SplitSquareHorizontal className="w-4 h-4" /></button>
                                                    <div className="w-px bg-white/10 mx-1" />
                                                    <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2.5 rounded-lg text-muted hover:text-white hover:bg-white/10 transition-all">{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
                                                </motion.div>
                                            )}

                                            {result ? (
                                                viewMode === 'slider' ? (
                                                    <div className="absolute inset-0 w-full h-full">
                                                        <BeforeAfterSlider original={preview} modified={result} avoidTopRightControls />
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-3 w-full p-3 items-center h-full overflow-auto">
                                                        <div className="relative"><span className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-white z-10">{t('editor.original')}</span><img src={preview} alt="Original" className="w-full h-auto rounded-xl shadow-2xl" /></div>
                                                        <div className="relative"><span className="absolute top-3 left-3 bg-gradient-to-r from-primary to-accent px-3 py-1.5 rounded-lg text-xs text-white z-10">{t('editor.colorized')}</span><img src={result} alt="Result" className="w-full h-auto rounded-xl shadow-2xl ring-2 ring-accent/20" /></div>
                                                    </div>
                                                )
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
                                                <div className="flex-[2]"><DownloadButton jobId={jobId} filename={`bg_removed_${jobId}`} /></div>
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
