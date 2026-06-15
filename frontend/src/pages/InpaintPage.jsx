import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Maximize2, Minimize2, Layout, SplitSquareHorizontal,
    Sparkles, Upload, Eraser, Zap, Trash2, CheckCircle, Lightbulb,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import PageHeader from '../components/PageHeader';
import DownloadButton from '../components/DownloadButton';
import BeforeAfterSlider from '../components/BeforeAfterSlider';
import { useEditorStore } from '../store/editorStore';
import { useAuth, API_URL } from '../context/AuthContext';
import axios from '../lib/axios';
import { wsManager } from '../lib/websocket';

function FullscreenPortal({ children, isFullscreen }) {
    if (!isFullscreen) return children;
    return createPortal(
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[9999] bg-background/98 backdrop-blur-xl flex items-center justify-center p-6">
            <div className="w-full h-full max-w-7xl mx-auto relative flex flex-col">{children}</div>
        </motion.div>,
        document.body
    );
}

const BRUSH_PRESETS = [10, 20, 40, 60];

export default function InpaintPage() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { refreshUser } = useAuth();

    const {
        selectedFile, setSelectedFile,
        preview, setPreview,
        result, setResult,
        jobId, setJobId,
        isProcessing, setIsProcessing,
        error, setError,
        progress, setProgress,
        isFullscreen, setIsFullscreen,
        viewMode, setViewMode,
        resetState,
    } = useEditorStore();

    const [brushSize, setBrushSize] = useState(30);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasMask, setHasMask] = useState(false);
    const [strokeCount, setStrokeCount] = useState(0);

    const canvasRef = useRef(null);
    const imgRef = useRef(null);
    const lastPos = useRef(null);
    const cleanupRef = useRef(() => {});

    useEffect(() => { resetState(); }, [resetState]);

    useEffect(() => {
        if (!preview) { setHasMask(false); setStrokeCount(0); lastPos.current = null; }
    }, [preview]);

    const setFile = (file) => {
        if (!file.type.startsWith('image/')) { setError(t('editor.imageOnlyError')); return; }
        setSelectedFile(file);
        setPreview(URL.createObjectURL(file));
        setResult(null); setJobId(null); setError('');
        setHasMask(false); setStrokeCount(0);
    };

    const getPos = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const src = e.touches ? e.touches[0] : e;
        return {
            x: (src.clientX - rect.left) * (canvas.width / rect.width),
            y: (src.clientY - rect.top) * (canvas.height / rect.height),
        };
    };

    const startDraw = (e) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        setIsDrawing(true);
        const pos = getPos(e, canvas);
        lastPos.current = pos;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(239,68,68,0.65)';
        ctx.fill();
        setHasMask(true);
        setStrokeCount(c => c + 1);
    };

    const draw = (e) => {
        e.preventDefault();
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const pos = getPos(e, canvas);
        ctx.strokeStyle = 'rgba(239,68,68,0.65)';
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastPos.current = pos;
        setHasMask(true);
    };

    const stopDraw = () => { setIsDrawing(false); lastPos.current = null; };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        setHasMask(false); setStrokeCount(0);
    };

    const getMaskBlob = useCallback(() => new Promise((resolve) => {
        const srcCanvas = canvasRef.current;
        if (!srcCanvas) return resolve(null);
        const out = document.createElement('canvas');
        out.width = srcCanvas.width; out.height = srcCanvas.height;
        const ctx = out.getContext('2d');
        ctx.fillStyle = 'black'; ctx.fillRect(0, 0, out.width, out.height);
        const imgData = srcCanvas.getContext('2d').getImageData(0, 0, srcCanvas.width, srcCanvas.height);
        const maskData = ctx.getImageData(0, 0, out.width, out.height);
        for (let i = 0; i < imgData.data.length; i += 4) {
            if (imgData.data[i + 3] > 10) {
                maskData.data[i] = 255; maskData.data[i + 1] = 255;
                maskData.data[i + 2] = 255; maskData.data[i + 3] = 255;
            }
        }
        ctx.putImageData(maskData, 0, 0);
        out.toBlob(resolve, 'image/png');
    }), []);

    const handleProcess = useCallback(async () => {
        if (!selectedFile || !hasMask) return;
        const maskBlob = await getMaskBlob();
        if (!maskBlob) { setError('Maske oluşturulamadı'); return; }

        setIsProcessing(true); setError(''); setProgress(0);
        cleanupRef.current();

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('mask', maskBlob, 'mask.png');
            const response = await axios.post(`/jobs/process?type=INPAINT&device=gpu`, formData);
            const job = response.data;

            if (job.status === 'COMPLETED') {
                setResult(`${API_URL}/${job.output_path.replace(/\\/g, '/')}`);
                setJobId(job.id); setProgress(100); setIsProcessing(false); refreshUser();
            } else if (job.status === 'FAILED') {
                setError(job.error_message || t('editor.processingFailed')); setIsProcessing(false);
            } else {
                setJobId(job.id);
                const intervalId = window.setInterval(async () => {
                    try {
                        const r = await axios.get(`/jobs/${job.id}`);
                        if (r.data.progress != null) setProgress(r.data.progress);
                        if (r.data.status === 'COMPLETED') {
                            clearInterval(intervalId);
                            setResult(`${API_URL}/${r.data.output_path.replace(/\\/g, '/')}`);
                            setProgress(100); setIsProcessing(false); refreshUser();
                        } else if (r.data.status === 'FAILED') {
                            clearInterval(intervalId);
                            setError(r.data.error_message || t('editor.processingFailed')); setIsProcessing(false);
                        }
                    } catch { clearInterval(intervalId); setError(t('editor.statusCheckFailed')); setIsProcessing(false); }
                }, 2000);

                let unsubWs = () => {};
                if (wsManager.isConnected()) {
                    unsubWs = wsManager.watchJob(job.id,
                        (pct) => setProgress(pct),
                        (outputPath) => { clearInterval(intervalId); setResult(`${API_URL}/${outputPath.replace(/\\/g, '/')}`); setProgress(100); setIsProcessing(false); refreshUser(); },
                        (err) => { clearInterval(intervalId); setError(err || t('editor.processingFailed')); setIsProcessing(false); },
                    );
                }
                cleanupRef.current = () => { clearInterval(intervalId); unsubWs(); };
            }
        } catch (err) {
            setError(err.response?.data?.detail || t('editor.processingFailed'));
            setIsProcessing(false);
        }
    }, [selectedFile, hasMask, getMaskBlob, setIsProcessing, setError, setProgress, setResult, setJobId, refreshUser]);

    useEffect(() => () => cleanupRef.current(), []);

    const stageMsg = progress < 30 ? t('inpaint.stage1')
        : progress < 70 ? t('inpaint.stage2')
        : t('inpaint.stage3');

    const cursorSize = Math.max(12, brushSize / 3);
    const svgCursor = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='${cursorSize * 2}' height='${cursorSize * 2}'><circle cx='${cursorSize}' cy='${cursorSize}' r='${cursorSize - 2}' fill='rgba(239,68,68,0.4)' stroke='white' stroke-width='1.5'/></svg>") ${cursorSize} ${cursorSize}, crosshair`;

    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="orb orb-accent w-96 h-96 -top-48 -left-48 opacity-25" />
                <div className="orb orb-secondary w-80 h-80 top-1/3 -right-40 opacity-20" />
            </div>

            <div className="relative z-10 p-6 lg:p-8">
                <PageHeader
                    icon={<Eraser className="w-6 h-6 text-accent" />}
                    title={t('inpaint.title') || 'Object Remover'}
                    subtitle="LaMa AI · Deep Fill"
                    badge="AI"
                    gradient="accent"
                    backLabel={t('nav.home')}
                />

                <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
                    {/* Left panel */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-4 xl:col-span-3 space-y-6">

                        {/* AI Info */}
                        <div className="card group">
                            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center shadow-lg shadow-accent/10">
                                        <Eraser className="w-5 h-5 text-accent" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold">{t('inpaint.modeRemove') || 'Object Remover'}</h2>
                                        <p className="text-sm text-muted">LaMa Inpainting</p>
                                    </div>
                                </div>
                                <p className="text-sm text-muted leading-relaxed">
                                    {t('inpaint.aiDesc') || 'Kaldırmak istediğiniz nesnenin üzerini kırmızı fırça ile boyayın. AI arka planı otomatik olarak tamamlar.'}
                                </p>
                            </div>
                        </div>

                        {/* Brush card — only when drawing */}
                        {preview && !result && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card group">
                                <div className="absolute inset-0 bg-gradient-to-br from-accent/3 to-transparent rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
                                            <Eraser className="w-4 h-4 text-accent" />
                                        </div>
                                        <span className="font-semibold text-sm">{t('inpaint.brushSize') || 'Fırça Boyutu'}</span>
                                        <span className="ml-auto text-sm font-mono text-accent font-bold">{brushSize}px</span>
                                    </div>

                                    <div className="flex gap-2 mb-3">
                                        {BRUSH_PRESETS.map(s => (
                                            <button key={s} onClick={() => setBrushSize(s)}
                                                className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all ${brushSize === s ? 'border-accent/50 bg-accent/10 text-accent shadow-sm shadow-accent/10' : 'border-white/5 bg-white/[0.02] text-muted hover:border-white/10'}`}
                                            >{s}</button>
                                        ))}
                                    </div>

                                    <input type="range" min={5} max={80} value={brushSize}
                                        onChange={(e) => setBrushSize(Number(e.target.value))}
                                        className="w-full accent-accent mb-4"
                                    />

                                    {hasMask && (
                                        <div className="flex items-center justify-between mb-3 py-2 px-3 rounded-xl bg-accent/5 border border-accent/15">
                                            <span className="text-xs text-muted">{t('inpaint.strokesLabel') || 'Boyanan alan'}</span>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                                                <span className="text-xs font-mono text-accent">{strokeCount} {t('inpaint.strokes') || 'fırça'}</span>
                                            </div>
                                        </div>
                                    )}

                                    <button onClick={clearCanvas} disabled={!hasMask}
                                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-danger/10 hover:border-danger/30 text-muted hover:text-danger transition-all text-sm disabled:opacity-30"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        {t('inpaint.clearCanvas') || 'Temizle'}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Tips */}
                        <div className="card p-4 bg-accent/5 border-accent/20">
                            <div className="flex items-center gap-2 mb-3">
                                <Lightbulb className="w-4 h-4 text-accent shrink-0" />
                                <span className="text-xs font-semibold text-accent">{t('inpaint.tipsTitle') || 'İpuçları'}</span>
                            </div>
                            <div className="space-y-2">
                                {[
                                    t('inpaint.tip1') || 'Nesneyi tamamen kırmızıya boyayın',
                                    t('inpaint.tip2') || 'Kenar piksellerini de dahil edin',
                                    t('inpaint.tip3') || 'Büyük fırça = daha hızlı boyama',
                                ].map((tip, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                        <CheckCircle className="w-3.5 h-3.5 text-accent/60 mt-0.5 shrink-0" />
                                        <span className="text-xs text-muted/80 leading-relaxed">{tip}</span>
                                    </div>
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

                    {/* Right panel */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-8 xl:col-span-9">
                        <div className="card min-h-[400px] max-h-[calc(100vh-100px)] flex flex-col relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-accent/3 via-transparent to-secondary/3 rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                            {!preview ? (
                                <label role="button" tabIndex={0}
                                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.querySelector('input')?.click()}
                                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
                                    onDragOver={(e) => e.preventDefault()}
                                    className="relative flex-1 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-accent/40 hover:bg-accent/5 transition-all duration-500 group/upload m-2"
                                >
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-40 h-40 rounded-full border border-accent/10 animate-ping opacity-20" style={{ animationDuration: '3s' }} />
                                    </div>
                                    <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="relative w-24 h-24 bg-gradient-to-br from-surface-elevated to-surface rounded-3xl flex items-center justify-center mb-8 shadow-2xl border border-white/10">
                                        <Eraser className="w-10 h-10 text-muted group-hover/upload:text-accent transition-colors duration-300" />
                                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/30">
                                            <Sparkles className="w-4 h-4 text-white" />
                                        </div>
                                    </motion.div>
                                    <h3 className="text-2xl font-display font-semibold mb-3 text-gradient">
                                        {t('editor.uploadPhotoTitle') || 'Fotoğraf Yükle'}
                                    </h3>
                                    <p className="text-muted mb-4 text-center max-w-xs text-sm">
                                        {t('inpaint.canvasHint') || 'Kaldırmak istediğiniz nesneyi fırça ile boyayın'}
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
                                                    <button onClick={() => setViewMode('side-by-side')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'side-by-side' ? 'bg-accent text-white shadow-lg shadow-accent/30' : 'text-muted hover:text-white hover:bg-white/10'}`}><Layout className="w-4 h-4" /></button>
                                                    <button onClick={() => setViewMode('slider')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'slider' ? 'bg-accent text-white shadow-lg shadow-accent/30' : 'text-muted hover:text-white hover:bg-white/10'}`}><SplitSquareHorizontal className="w-4 h-4" /></button>
                                                    <div className="w-px bg-white/10 mx-1" />
                                                    <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2.5 rounded-lg text-muted hover:text-white hover:bg-white/10 transition-all">{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
                                                </motion.div>
                                            )}

                                            {result ? (
                                                viewMode === 'slider'
                                                    ? <div className="absolute inset-0 w-full h-full"><BeforeAfterSlider original={preview} modified={result} afterLabel={t('inpaint.modeRemove') || 'Kaldırıldı'} avoidTopRightControls /></div>
                                                    : (
                                                        <div className="grid grid-cols-2 gap-3 w-full p-3 items-center h-full overflow-auto">
                                                            <div className="relative">
                                                                <span className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-white z-10">{t('editor.original') || 'Orijinal'}</span>
                                                                <img src={preview} alt="Original" className="w-full h-auto rounded-xl shadow-2xl" />
                                                            </div>
                                                            <div className="relative">
                                                                <span className="absolute top-3 left-3 bg-gradient-to-r from-accent to-secondary px-3 py-1.5 rounded-lg text-xs text-white z-10">{t('inpaint.modeRemove') || 'Kaldırıldı'}</span>
                                                                <img src={result} alt="Result" className="w-full h-auto rounded-xl shadow-2xl ring-2 ring-accent/20" />
                                                            </div>
                                                        </div>
                                                    )
                                            ) : (
                                                <div className="relative w-full h-full flex items-center justify-center">
                                                    <div className="relative inline-block max-w-full max-h-full">
                                                        {!hasMask && (
                                                            <div className="absolute inset-0 flex items-end justify-center pb-4 z-10 pointer-events-none">
                                                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full text-xs text-white/80">
                                                                    <Eraser className="w-3.5 h-3.5 text-accent" />
                                                                    {t('inpaint.drawHint') || 'Kaldırmak istediğiniz alanı boyayın'}
                                                                </motion.div>
                                                            </div>
                                                        )}
                                                        <img
                                                            ref={imgRef}
                                                            src={preview}
                                                            alt="Source"
                                                            className="max-w-full max-h-[55vh] object-contain rounded-xl select-none"
                                                            onLoad={(e) => {
                                                                const canvas = canvasRef.current;
                                                                if (!canvas) return;
                                                                canvas.width = e.target.naturalWidth;
                                                                canvas.height = e.target.naturalHeight;
                                                            }}
                                                        />
                                                        <canvas
                                                            ref={canvasRef}
                                                            className="absolute inset-0 w-full h-full rounded-xl"
                                                            style={{ touchAction: 'none', cursor: svgCursor }}
                                                            onMouseDown={startDraw} onMouseMove={draw}
                                                            onMouseUp={stopDraw} onMouseLeave={stopDraw}
                                                            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <AnimatePresence>
                                                {isProcessing && (
                                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-xl flex flex-col items-center justify-center z-30">
                                                        <div className="relative mb-8">
                                                            <div className="w-24 h-24 rounded-full border-4 border-accent/20" />
                                                            <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-transparent border-t-accent animate-spin" />
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <Eraser className="w-8 h-8 text-accent animate-pulse" />
                                                            </div>
                                                        </div>
                                                        <h3 className="text-2xl font-display font-semibold mb-2 text-gradient">
                                                            {t('inpaint.processing') || 'Nesne Kaldırılıyor...'}
                                                        </h3>
                                                        <p className="text-muted mb-6 text-sm">{stageMsg}</p>
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
                                            <button onClick={() => { resetState(); setHasMask(false); setStrokeCount(0); }} disabled={isProcessing} className="btn-secondary flex-1">{t('editor.changeFile') || 'Değiştir'}</button>
                                            {!result ? (
                                                <button onClick={handleProcess} disabled={isProcessing || !hasMask}
                                                    className="btn-primary flex-[2] flex items-center justify-center gap-2 disabled:opacity-40"
                                                >
                                                    <Zap className="w-4 h-4" />
                                                    {t('inpaint.removeBtn') || 'Nesneyi Kaldır'}
                                                </button>
                                            ) : (
                                                <div className="flex-[2]">
                                                    <DownloadButton jobId={jobId} filename={`inpaint_${jobId}`} />
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
