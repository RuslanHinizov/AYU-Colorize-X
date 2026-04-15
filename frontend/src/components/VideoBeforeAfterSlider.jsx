import { useState, useRef, useEffect } from 'react';
import { MoveHorizontal, Play, Pause, Volume2, VolumeX, Sparkles } from 'lucide-react';

export default function VideoBeforeAfterSlider({ original, modified }) {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);

    const containerRef = useRef(null);
    const originalVideoRef = useRef(null);
    const modifiedVideoRef = useRef(null);

    const handleMouseDown = () => setIsDragging(true);

    const handleMouseMove = (e) => {
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

    useEffect(() => {
        const handleGlobalMouseUp = () => setIsDragging(false);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        window.addEventListener('touchend', handleGlobalMouseUp);
        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('touchend', handleGlobalMouseUp);
        };
    }, []);

    const togglePlay = () => {
        if (originalVideoRef.current && modifiedVideoRef.current) {
            if (isPlaying) {
                originalVideoRef.current.pause();
                modifiedVideoRef.current.pause();
            } else {
                originalVideoRef.current.play();
                modifiedVideoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = () => {
        if (originalVideoRef.current && modifiedVideoRef.current) {
            originalVideoRef.current.muted = !isMuted;
            modifiedVideoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleTimeUpdate = (e) => {
        const currentTime = e.target.currentTime;
        if (e.target === originalVideoRef.current && modifiedVideoRef.current) {
            if (Math.abs(modifiedVideoRef.current.currentTime - currentTime) > 0.1) {
                modifiedVideoRef.current.currentTime = currentTime;
            }
        } else if (e.target === modifiedVideoRef.current && originalVideoRef.current) {
            if (Math.abs(originalVideoRef.current.currentTime - currentTime) > 0.1) {
                originalVideoRef.current.currentTime = currentTime;
            }
        }
    };

    const handleSeek = (e) => {
        const currentTime = e.target.currentTime;
        if (e.target === originalVideoRef.current && modifiedVideoRef.current) {
            modifiedVideoRef.current.currentTime = currentTime;
        } else if (e.target === modifiedVideoRef.current && originalVideoRef.current) {
            originalVideoRef.current.currentTime = currentTime;
        }
    };

    return (
        <div className="relative w-full h-full group">
            {/* Main Container */}
            <div
                ref={containerRef}
                className="relative w-full h-full select-none overflow-hidden cursor-ew-resize rounded-2xl"
                onMouseMove={handleMouseMove}
                onTouchMove={handleTouchMove}
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
            >
                {/* Modified Video (Background) */}
                <video
                    ref={modifiedVideoRef}
                    src={modified}
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    loop
                    muted={isMuted}
                    onTimeUpdate={handleTimeUpdate}
                    onSeeked={handleSeek}
                />

                {/* Original Video (Foreground - Clipped) */}
                <div
                    className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
                    style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                >
                    <video
                        ref={originalVideoRef}
                        src={original}
                        className="absolute inset-0 w-full h-full object-contain"
                        loop
                        muted={isMuted}
                        onTimeUpdate={handleTimeUpdate}
                        onSeeked={handleSeek}
                    />
                </div>

                {/* Slider Handle */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-violet-500 via-fuchsia-500 to-pink-500 cursor-ew-resize z-10"
                    style={{ left: `${sliderPosition}%` }}
                >
                    {/* Glow Effect */}
                    <div className="absolute inset-0 w-4 -left-2 bg-gradient-to-b from-violet-500/20 via-fuchsia-500/20 to-pink-500/20 blur-md" />
                    
                    {/* Handle Button */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transform transition-all duration-300 group-hover:scale-110">
                        {/* Outer Ring */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 opacity-20 animate-ping" />
                        {/* Inner Circle */}
                        <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30 border border-white/20">
                            <MoveHorizontal className="w-5 h-5 text-white" />
                        </div>
                    </div>
                </div>

                {/* Labels */}
                <div className="absolute top-4 left-4 z-20">
                    <div className="px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
                        <span className="text-sm font-medium text-white/80">Orijinal</span>
                    </div>
                </div>
                <div className="absolute top-4 right-4 z-20">
                    <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500/80 to-fuchsia-500/80 backdrop-blur-md border border-white/20 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-white" />
                        <span className="text-sm font-medium text-white">Renklendirilmiş</span>
                    </div>
                </div>
            </div>

            {/* Video Controls Overlay */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10">
                    <button
                        onClick={togglePlay}
                        className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                    >
                        {isPlaying ? (
                            <Pause className="w-5 h-5 text-white" />
                        ) : (
                            <Play className="w-5 h-5 text-white" />
                        )}
                    </button>
                    <div className="w-px h-6 bg-white/10" />
                    <button
                        onClick={toggleMute}
                        className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                    >
                        {isMuted ? (
                            <VolumeX className="w-5 h-5 text-white/60" />
                        ) : (
                            <Volume2 className="w-5 h-5 text-white" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
