import { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';
import { Moon, Sun, Monitor, Globe, HardDrive, Trash2, Save, Flag, Palette, Check, Download, Key, Bell, Copy, RefreshCw, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import axios from '../lib/axios';

export default function Settings() {
    const { user } = useAuth();
    const { t, language, setLanguage } = useLanguage();
    const { theme, setTheme } = useTheme();
    const [autoSave, setAutoSave] = useState(() => localStorage.getItem('autoSave') !== 'false');
    const [apiKeyInfo, setApiKeyInfo] = useState(null);
    const [showApiKey, setShowApiKey] = useState(false);
    const [newApiKey, setNewApiKey] = useState(null);
    const [apiKeyLoading, setApiKeyLoading] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);

    useEffect(() => { localStorage.setItem('autoSave', autoSave); }, [autoSave]);
    useEffect(() => { fetchApiKeyInfo(); fetchUserSettings(); }, []);

    const fetchApiKeyInfo = async () => { try { const r = await axios.get(`/auth/api-key`); setApiKeyInfo(r.data); } catch {} };
    const fetchUserSettings = async () => { try { const r = await axios.get(`/auth/settings`); setEmailNotifications(r.data.email_notifications); } catch {} };

    const generateApiKey = async () => {
        if (!confirm('Mevcut API anahtarınız değiştirilecek. Devam?')) return;
        setApiKeyLoading(true);
        try { const r = await axios.post(`/auth/api-key/generate`); setNewApiKey(r.data.api_key); setShowApiKey(true); fetchApiKeyInfo(); } catch (e) { alert(e.response?.data?.detail || 'Hata'); }
        finally { setApiKeyLoading(false); }
    };

    const revokeApiKey = async () => {
        if (!confirm('API anahtarınızı iptal etmek istediğinize emin misiniz?')) return;
        setApiKeyLoading(true);
        try { await axios.delete(`/auth/api-key`); setApiKeyInfo({ has_key: false }); setNewApiKey(null); } catch (e) { alert(e.response?.data?.detail || 'Hata'); }
        finally { setApiKeyLoading(false); }
    };

    const copyApiKey = async () => { if (newApiKey) { await navigator.clipboard.writeText(newApiKey); setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); } };

    const updateEmailNotifications = async (value) => {
        setEmailNotifications(value);
        setSavingSettings(true);
        try { await axios.put(`/auth/settings`, { email_notifications: value }); } catch { setEmailNotifications(!value); }
        finally { setSavingSettings(false); }
    };

    const handleExport = () => {
        const settings = { theme, language, autoSave, emailNotifications, exportDate: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'colorizex-settings.json';
        link.click();
    };

    const handleClearCache = () => { if (confirm(t('settings.confirmClear') || 'Tüm yerel verileri silmek istediğinize emin misiniz?')) { localStorage.clear(); window.location.reload(); } };

    const themes = [
        { id: 'light', name: t('settings.light'), icon: Sun, preview: 'bg-slate-100' },
        { id: 'dark', name: t('settings.dark'), icon: Moon, preview: 'bg-slate-900' },
        { id: 'system', name: t('settings.auto'), icon: Monitor, preview: 'bg-gradient-to-r from-slate-100 to-slate-900' },
        { id: 'kazakhstan', name: t('settings.kazakhstan'), icon: Flag, preview: 'bg-gradient-to-r from-blue-600 to-yellow-400' },
    ];

    const languages = [
        { id: 'en', name: 'English', flag: '🇺🇸' },
        { id: 'tr', name: 'Türkçe', flag: '🇹🇷' },
        { id: 'kz', name: 'Қазақша', flag: '🇰🇿' },
        { id: 'ru', name: 'Русский', flag: '🇷🇺' },
    ];

    const isPro = user?.role === 'PRO' || user?.role === 'ADMIN';

    return (
        <div className="min-h-screen relative">
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="orb orb-secondary w-96 h-96 -top-48 -right-48 opacity-20" />
                <div className="orb orb-accent w-80 h-80 bottom-0 -left-40 opacity-15" />
            </div>

            <div className="relative z-10 p-6 lg:p-8">
                <div className="max-w-3xl mx-auto">
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                        <h1 className="font-display text-3xl font-bold mb-2">{t('settings.title')}</h1>
                        <p className="text-muted">ColorizeX deneyiminizi özelleştirin</p>
                    </motion.div>

                    <div className="space-y-6">
                        {/* Appearance */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                                    <Palette className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="font-semibold">{t('settings.appearance')}</h2>
                                    <p className="text-xs text-muted">Tema seçin</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {themes.map((themeOption) => (
                                    <button key={themeOption.id} onClick={() => setTheme(themeOption.id)} className={`relative p-4 rounded-xl border transition-all text-left ${theme === themeOption.id ? 'border-primary/50 bg-primary/5' : 'border-white/5 bg-white/[0.02] hover:border-white/10'}`}>
                                        {theme === themeOption.id && <div className="absolute top-2 right-2"><Check className="w-4 h-4 text-primary" /></div>}
                                        <div className={`w-full h-8 rounded-lg mb-3 ${themeOption.preview}`} />
                                        <themeOption.icon className={`w-5 h-5 mb-2 ${theme === themeOption.id ? 'text-primary' : 'text-muted'}`} />
                                        <p className="font-medium text-sm">{themeOption.name}</p>
                                    </button>
                                ))}
                            </div>
                        </motion.div>

                        {/* Language */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/5 border border-secondary/20 flex items-center justify-center">
                                    <Globe className="w-5 h-5 text-secondary" />
                                </div>
                                <div>
                                    <h2 className="font-semibold">{t('settings.language')}</h2>
                                    <p className="text-xs text-muted">Dil seçin</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {languages.map((lang) => (
                                    <button key={lang.id} onClick={() => setLanguage(lang.id)} className={`relative p-4 rounded-xl border transition-all text-center ${language === lang.id ? 'border-secondary/50 bg-secondary/5' : 'border-white/5 bg-white/[0.02] hover:border-white/10'}`}>
                                        {language === lang.id && <div className="absolute top-2 right-2"><Check className="w-4 h-4 text-secondary" /></div>}
                                        <span className="text-2xl mb-2 block">{lang.flag}</span>
                                        <p className="font-medium text-sm">{lang.name}</p>
                                    </button>
                                ))}
                            </div>
                        </motion.div>

                        {/* Notifications */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-success/20 to-success/5 border border-success/20 flex items-center justify-center">
                                    <Bell className="w-5 h-5 text-success" />
                                </div>
                                <div>
                                    <h2 className="font-semibold">Bildirimler</h2>
                                    <p className="text-xs text-muted">Bildirim tercihlerinizi yönetin</p>
                                </div>
                            </div>
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">E-posta Bildirimleri</h3>
                                    <p className="text-sm text-muted">Uzun işlemler tamamlandığında e-posta alın</p>
                                </div>
                                <button onClick={() => updateEmailNotifications(!emailNotifications)} disabled={savingSettings} className={`relative w-14 h-8 rounded-full transition-colors ${emailNotifications ? 'bg-success' : 'bg-white/10'}`}>
                                    <motion.div className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center" animate={{ left: emailNotifications ? '1.75rem' : '0.25rem' }}>
                                        {savingSettings && <Loader2 className="w-3 h-3 animate-spin text-muted" />}
                                    </motion.div>
                                </button>
                            </div>
                        </motion.div>

                        {/* API Key */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center">
                                    <Key className="w-5 h-5 text-accent" />
                                </div>
                                <div>
                                    <h2 className="font-semibold">API Anahtarı</h2>
                                    <p className="text-xs text-muted">ColorizeX API'ye programatik erişim</p>
                                </div>
                                {!isPro && <span className="ml-auto px-2 py-1 rounded-lg bg-accent/10 text-accent text-xs font-bold">PRO</span>}
                            </div>
                            {isPro ? (
                                <div className="space-y-4">
                                    {apiKeyInfo?.has_key && (
                                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-muted">Mevcut API Anahtarı</span>
                                                <span className="text-xs text-muted">{apiKeyInfo.created_at ? new Date(apiKeyInfo.created_at).toLocaleDateString() : ''}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 p-2 rounded-lg bg-background font-mono text-sm">{showApiKey && newApiKey ? newApiKey : apiKeyInfo.key}</code>
                                                {newApiKey && <button onClick={() => setShowApiKey(!showApiKey)} className="p-2 rounded-lg hover:bg-white/10">{showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>}
                                            </div>
                                        </div>
                                    )}
                                    {newApiKey && (
                                        <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                                            <div className="flex items-center gap-2 mb-2"><Shield className="w-4 h-4 text-success" /><span className="text-sm font-medium text-success">Yeni API Anahtarı Oluşturuldu!</span></div>
                                            <p className="text-xs text-muted mb-3">Bu anahtarı şimdi kopyalayın. Güvenlik nedeniyle tekrar gösterilmeyecek.</p>
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 p-2 rounded-lg bg-background font-mono text-xs break-all">{newApiKey}</code>
                                                <button onClick={copyApiKey} className="p-2 rounded-lg bg-success text-white hover:bg-success/90">{copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex gap-3">
                                        <button onClick={generateApiKey} disabled={apiKeyLoading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                                            {apiKeyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                            {apiKeyInfo?.has_key ? 'Yeniden Oluştur' : 'API Anahtarı Oluştur'}
                                        </button>
                                        {apiKeyInfo?.has_key && <button onClick={revokeApiKey} disabled={apiKeyLoading} className="btn-secondary text-danger hover:bg-danger/10">İptal Et</button>}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center">
                                    <p className="text-muted mb-3">API erişimi için PRO'ya yükseltin</p>
                                    <a href="/plans" className="btn-primary inline-flex items-center gap-2">PRO'ya Yükselt</a>
                                </div>
                            )}
                        </motion.div>

                        {/* Auto Save */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                                    <Save className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="font-semibold">{t('settings.processing')}</h2>
                                    <p className="text-xs text-muted">İşlem davranışını yapılandırın</p>
                                </div>
                            </div>
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">{t('settings.autoSave')}</h3>
                                    <p className="text-sm text-muted">{t('settings.autoSaveDesc')}</p>
                                </div>
                                <button onClick={() => setAutoSave(!autoSave)} className={`relative w-14 h-8 rounded-full transition-colors ${autoSave ? 'bg-primary' : 'bg-white/10'}`}>
                                    <motion.div className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md" animate={{ left: autoSave ? '1.75rem' : '0.25rem' }} />
                                </button>
                            </div>
                        </motion.div>

                        {/* Data Management */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-danger/20 to-danger/5 border border-danger/20 flex items-center justify-center">
                                    <HardDrive className="w-5 h-5 text-danger" />
                                </div>
                                <div>
                                    <h2 className="font-semibold">{t('settings.dataManagement')}</h2>
                                    <p className="text-xs text-muted">Yerel verilerinizi yönetin</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium">{t('settings.exportSettings')}</h3>
                                        <p className="text-sm text-muted">{t('settings.exportDesc')}</p>
                                    </div>
                                    <button onClick={handleExport} className="btn-secondary py-2 px-4 text-sm flex items-center gap-2"><Download className="w-4 h-4" />{t('settings.export')}</button>
                                </div>
                                <div className="p-4 rounded-xl bg-danger/5 border border-danger/20 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-danger">{t('settings.clearCache')}</h3>
                                        <p className="text-sm text-danger/70">{t('settings.clearCacheDesc')}</p>
                                    </div>
                                    <button onClick={handleClearCache} className="px-4 py-2 rounded-xl bg-danger text-white text-sm font-medium hover:bg-danger/90 flex items-center gap-2"><Trash2 className="w-4 h-4" />{t('settings.clear')}</button>
                                </div>
                            </div>
                        </motion.div>

                        {/* Account Info */}
                        {user && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="card bg-white/[0.02]">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Giriş yapılan hesap</p>
                                        <p className="font-semibold">{user.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Plan</p>
                                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${user.role === 'ADMIN' ? 'bg-danger/20 text-danger' : user.role === 'PRO' ? 'bg-accent/20 text-accent' : 'bg-primary/20 text-primary'}`}>{user.role}</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
