import { useState, useRef, useEffect } from 'react';
import { MoveHorizontal, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function BeforeAfterSlider({
    original,
    modified,
    beforeLabel,
    afterLabel,
    avoidTopRightControls = false,
}) {
    const { t } = useLanguage();
    const resolvedBeforeLabel = beforeLabel ?? t('editor.original');
    const resolvedAfterLabel = afterLabel ?? t('editor.colorized');
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    const handleMouseDown = (e) => {
        if (e.ctrlKey || e.metaKey) {
            setIsPanning(true);
            setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        } else {
            setIsDragging(true);
        }
    };

    const handleMouseMove = (e) => {
        if (isPanning) {
            setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
            return;
        }
        if (!isDragging || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        setSliderPosition((x / rect.width) * 100);
    };

    const handleTouchMove = (e) => {
        if (!isDragging || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width));
        setSliderPosition((x / rect.width) * 100);
    };

    const handleWheel = (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom(prev => Math.min(Math.max(prev + (e.deltaY > 0 ? -0.1 : 0.1), 1), 4));
        }
    };

    const zoomIn = () => setZoom(prev => Math.min(prev + 0.25, 4));
    const zoomOut = () => setZoom(prev => Math.max(prev - 0.25, 1));
    const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

    useEffect(() => {
        const handleGlobalMouseUp = () => { setIsDragging(false); setIsPanning(false); };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        window.addEventListener('touchend', handleGlobalMouseUp);
        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('touchend', handleGlobalMouseUp);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full max-h-[70vh] select-none overflow-hidden cursor-ew-resize group"
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
            onWheel={handleWheel}
        >
            {/* Zoom Controls */}
            <div className="absolute bottom-4 left-4 z-30 flex gap-1 p-1.5 rounded-xl bg-black/70 backdrop-blur-xl border border-white/10 shadow-xl">
                <button onClick={zoomOut} disabled={zoom <= 1} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all">
                    <ZoomOut className="w-4 h-4" />
                </button>
                <span className="px-2 py-2 text-xs text-white/70 font-mono min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={zoomIn} disabled={zoom >= 4} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all">
                    <ZoomIn className="w-4 h-4" />
                </button>
                <button onClick={resetView} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all">
                    <RotateCcw className="w-4 h-4" />
                </button>
            </div>

            {/* Zoom hint */}
            {zoom === 1 && (
                <div className="absolute bottom-4 right-4 z-30 text-xs text-white/50 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/5">
                    Ctrl + Scroll ile yakınlaştır
                </div>
            )}

            {/* Image Container */}
            <div 
                className="absolute inset-0 transition-transform duration-100"
                style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, transformOrigin: 'center center' }}
            >
                {/* Modified Image */}
                <img src={modified} alt="After" className="absolute inset-0 w-full h-full object-contain pointer-events-none" draggable={false} />

                {/* Original Image (Clipped) */}
                <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
                    <img src={original} alt="Before" className="absolute inset-0 w-full h-full object-contain" draggable={false} />
                </div>
            </div>

            {/* Slider Handle */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-white/80 cursor-ew-resize z-10 shadow-[0_0_20px_rgba(0,0,0,0.5)]" style={{ left: `${sliderPosition}%` }}>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-2xl transform transition-transform group-hover:scale-110 border-2 border-white/20">
                    <MoveHorizontal className="w-5 h-5 text-slate-800" />
                </div>
            </div>

            {/* Labels */}
            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-bold pointer-events-none z-20 border border-white/10">
                {resolvedBeforeLabel}
            </div>
            {/* avoidTopRightControls: true -> etiket asagi iner (genis kontrol grubu olan
                sayfalar); 'beside' -> tek tam-ekran dugmesinin soluna, yan yana gecer */}
            <div className={`absolute ${avoidTopRightControls === 'beside' ? 'top-4 right-16' : avoidTopRightControls ? 'top-20 right-4' : 'top-4 right-4'} bg-gradient-to-r from-primary to-accent text-white px-3 py-1.5 rounded-lg text-xs font-bold pointer-events-none z-20 shadow-lg`}>
                {resolvedAfterLabel}
            </div>
        </div>
    );
}
