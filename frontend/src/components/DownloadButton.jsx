/**
 * DownloadButton — format seçimi ile indirme bileşeni
 *
 * Props:
 *   jobId       — işlenmiş işin ID'si (endpoint: /jobs/{jobId}/download)
 *   filename    — kayıt dosya adı (uzantısız), örn: "colorized_abc123"
 *   className   — wrapper sınıfı (varsayılan tam genişlik)
 *
 * Kullanım:
 *   <DownloadButton jobId={jobId} filename={`colorized_${jobId}`} />
 */
import { useState } from 'react';
import { Download, Check, Loader2 } from 'lucide-react';
import axios from '../lib/axios';

const FORMATS = [
    { id: 'png',  label: 'PNG',  mime: 'image/png',  quality: undefined, desc: 'Şeffaflık destekler' },
    { id: 'jpg',  label: 'JPG',  mime: 'image/jpeg', quality: 0.92,       desc: 'Küçük dosya boyutu' },
    { id: 'webp', label: 'WebP', mime: 'image/webp', quality: 0.90,       desc: 'En iyi sıkıştırma'  },
];

export default function DownloadButton({ jobId, filename, className = 'w-full' }) {
    const [format,  setFormat]  = useState(() => localStorage.getItem('defaultFormat') || 'png');
    const [loading, setLoading] = useState(false);
    const [done,    setDone]    = useState(false);

    const handleFormatChange = (fmt) => {
        setFormat(fmt);
        localStorage.setItem('defaultFormat', fmt);
    };

    const handleDownload = async () => {
        if (!jobId || loading) return;
        setLoading(true);
        setDone(false);

        try {
            // 1. Sunucudan blob al
            const response = await axios.get(`/jobs/${jobId}/download`, { responseType: 'blob' });
            const srcBlob  = new Blob([response.data]);
            const srcUrl   = URL.createObjectURL(srcBlob);

            const fmt = FORMATS.find(f => f.id === format) || FORMATS[0];

            // 2. Seçili format PNG ise doğrudan indir (dönüşüm yok)
            if (format === 'png') {
                triggerDownload(srcUrl, `${filename || 'result'}.png`);
                URL.revokeObjectURL(srcUrl);
                flash();
                return;
            }

            // 3. JPG / WebP → Canvas ile dönüştür
            const img = new Image();
            img.onload = () => {
                const canvas    = document.createElement('canvas');
                canvas.width    = img.naturalWidth;
                canvas.height   = img.naturalHeight;
                const ctx       = canvas.getContext('2d');

                // JPG şeffaflığı desteklemez — beyaz arka plan ekle
                if (format === 'jpg') {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(srcUrl);

                canvas.toBlob((outBlob) => {
                    const outUrl = URL.createObjectURL(outBlob);
                    triggerDownload(outUrl, `${filename || 'result'}.${format === 'jpg' ? 'jpg' : 'webp'}`);
                    setTimeout(() => URL.revokeObjectURL(outUrl), 5000);
                    flash();
                }, fmt.mime, fmt.quality);
            };
            img.onerror = () => {
                // Dönüştürme başarısız → orijinal blob'u indir
                triggerDownload(srcUrl, `${filename || 'result'}`);
                URL.revokeObjectURL(srcUrl);
                flash();
            };
            img.src = srcUrl;

        } catch (err) {
            console.error('Download failed:', err);
            setLoading(false);
        }
    };

    function triggerDownload(url, name) {
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function flash() {
        setLoading(false);
        setDone(true);
        setTimeout(() => setDone(false), 2200);
    }

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {/* Format pill seçici */}
            <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-muted/50 uppercase tracking-wider shrink-0">Format</span>
                <div className="flex items-center gap-1 ml-1">
                    {FORMATS.map(f => (
                        <button
                            key={f.id}
                            type="button"
                            title={f.desc}
                            onClick={() => handleFormatChange(f.id)}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold border transition-all ${
                                format === f.id
                                    ? 'bg-success/15 border-success/40 text-success shadow-sm shadow-success/10'
                                    : 'bg-white/[0.04] border-white/[0.08] text-muted hover:text-foreground hover:border-white/[0.15]'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* İndirme butonu */}
            <button
                type="button"
                onClick={handleDownload}
                disabled={!jobId || loading}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, rgb(34,197,94), rgb(16,185,129))' }}
            >
                {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Dönüştürülüyor…</>
                ) : done ? (
                    <><Check className="w-4 h-4" /> İndirildi!</>
                ) : (
                    <><Download className="w-4 h-4" /> Sonucu İndir · <span className="font-mono uppercase text-[11px]">{format}</span></>
                )}
            </button>
        </div>
    );
}
