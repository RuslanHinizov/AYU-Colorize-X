import { useState, useEffect } from 'react';
import { motion } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { Save, AlertTriangle, Bell, Shield, Zap, Loader2, CheckCircle } from 'lucide-react';
import axios from '../../lib/axios';

export default function AdminSettings() {
    const [settings, setSettings] = useState({
        maintenance_mode: false,
        announcement: '',
        max_concurrent_jobs: 5
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/admin/system/settings');
            setSettings(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch settings", error);
            setLoading(false);
        }
    };

    useEffect(() => { fetchSettings(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            await axios.post('/admin/system/settings', settings);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            alert("Ayarlar kaydedilemedi");
        }
        setSaving(false);
    };

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <div className="spinner w-12 h-12" />
        </div>
    );

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div>
                <h1 className="font-display text-3xl lg:text-4xl font-bold text-gradient">
                    Sistem Ayarları
                </h1>
                <p className="text-[rgb(var(--color-text-muted))] mt-1 text-sm">Sistem genelinde ayarları yapılandırın</p>
            </div>

            {/* Maintenance Mode */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card !border-[rgb(var(--color-danger)/0.15)]"
            >
                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[rgb(var(--color-danger))] to-[rgb(248,150,113)]" style={{ boxShadow: '0 4px 20px rgb(var(--color-danger) / 0.3)' }}>
                            <AlertTriangle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-display text-lg font-bold">Bakım Modu</h3>
                            <p className="text-[rgb(var(--color-text-muted))] text-xs mt-0.5">Adminler hariç tüm kullanıcı erişimini devre dışı bırak</p>
                        </div>
                    </div>

                    {/* Toggle Switch */}
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input
                            type="checkbox"
                            checked={settings.maintenance_mode}
                            onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-12 h-6 bg-[rgb(var(--color-surface-elevated))] border border-[rgb(var(--color-border))] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-[rgb(var(--color-text-muted))] after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[rgb(var(--color-danger))] peer-checked:to-[rgb(248,150,113)] peer-checked:border-transparent peer-checked:after:bg-white after:shadow-sm"></div>
                    </label>
                </div>

                {settings.maintenance_mode && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 p-3 rounded-xl bg-[rgb(var(--color-danger)/0.08)] border border-[rgb(var(--color-danger)/0.15)]"
                    >
                        <div className="flex items-center gap-2 text-[rgb(var(--color-danger))]">
                            <Shield className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">Bakım modu aktif - Sadece adminler erişebilir</span>
                        </div>
                    </motion.div>
                )}
            </motion.div>

            {/* Announcement */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="card"
            >
                <div className="relative flex items-center gap-4 mb-5">
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-secondary))]" style={{ boxShadow: 'var(--glow-primary)' }}>
                        <Bell className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-display text-lg font-bold">Global Duyuru</h3>
                        <p className="text-[rgb(var(--color-text-muted))] text-xs mt-0.5">Tüm kullanıcılara gösterilecek duyuru mesajı</p>
                    </div>
                </div>

                <div className="relative space-y-2">
                    <input
                        type="text"
                        value={settings.announcement || ''}
                        onChange={(e) => setSettings({ ...settings, announcement: e.target.value })}
                        placeholder="Örn: Bu gece sistem bakımı yapılacaktır..."
                        className="input-field"
                    />
                    <p className="text-[10px] text-[rgb(var(--color-text-muted)/0.5)] flex items-center gap-1.5">
                        <span className="w-1 h-1 bg-[rgb(var(--color-text-muted)/0.3)] rounded-full" />
                        Duyuru çubuğunu gizlemek için boş bırakın
                    </p>
                </div>
            </motion.div>

            {/* Concurrency */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card"
            >
                <div className="relative flex items-center gap-4 mb-5">
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[rgb(var(--color-secondary))] to-[rgb(var(--color-accent))]" style={{ boxShadow: 'var(--glow-secondary)' }}>
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-display text-lg font-bold">Eşzamanlı İşlem Limiti</h3>
                        <p className="text-[rgb(var(--color-text-muted))] text-xs mt-0.5">Aynı anda işlenebilecek maksimum iş sayısı</p>
                    </div>
                </div>

                <div className="relative space-y-3">
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={settings.max_concurrent_jobs}
                            onChange={(e) => setSettings({ ...settings, max_concurrent_jobs: parseInt(e.target.value) })}
                            className="flex-1 h-1.5 bg-[rgb(var(--color-surface-elevated))] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-[rgb(var(--color-secondary))] [&::-webkit-slider-thumb]:to-[rgb(var(--color-accent))] [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer"
                        />
                        <div className="w-14 h-10 rounded-lg bg-[rgb(var(--color-surface-elevated)/0.5)] border border-[rgb(var(--color-border))] flex items-center justify-center">
                            <span className="text-lg font-bold font-mono">{settings.max_concurrent_jobs}</span>
                        </div>
                    </div>
                    <div className="flex justify-between text-[10px] text-[rgb(var(--color-text-muted)/0.5)]">
                        <span>1 (Düşük)</span>
                        <span>10 (Orta)</span>
                        <span>20 (Yüksek)</span>
                    </div>
                </div>
            </motion.div>

            {/* Save Button */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`btn-primary w-full !py-3.5 !text-sm ${saved ? '!bg-[rgb(var(--color-success))]' : ''}`}
                    style={saved ? { background: 'linear-gradient(135deg, rgb(var(--color-success)), rgb(16, 185, 129))', boxShadow: '0 4px 20px rgb(var(--color-success) / 0.3)' } : undefined}
                >
                    {saving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Kaydediliyor...
                        </>
                    ) : saved ? (
                        <>
                            <CheckCircle className="w-4 h-4" />
                            Kaydedildi!
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Değişiklikleri Kaydet
                        </>
                    )}
                </button>
            </motion.div>
        </div>
    );
}
