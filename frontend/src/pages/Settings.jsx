import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Moon, Sun, Monitor, Globe, HardDrive, Trash2, Save, Flag, Palette,
    Check, Download, Key, Bell, Copy, RefreshCw, Eye, EyeOff, Loader2,
    Shield, Crown, ChevronRight, AlertTriangle, Keyboard, Lock,
    ImageIcon, Zap, Accessibility,
} from 'lucide-react';
import axios from '../lib/axios';

/* ─── sub-components ────────────────────────────────────────────────────────── */
function Toggle({ enabled, onChange, disabled = false, loading = false }) {
    return (
        <button type="button" onClick={() => !disabled && onChange(!enabled)} disabled={disabled}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 focus:outline-none
                ${enabled ? 'bg-primary shadow-lg shadow-primary/30' : 'bg-white/[0.10]'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            <motion.div
                className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center"
                animate={{ left: enabled ? '1.5rem' : '0.125rem' }}
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}>
                {loading && <Loader2 className="w-2.5 h-2.5 text-primary/60 animate-spin" />}
            </motion.div>
        </button>
    );
}

function RowItem({ label, desc, right }) {
    return (
        <div className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
                <p className="text-sm font-medium">{label}</p>
                {desc && <p className="text-xs text-muted mt-0.5 leading-relaxed">{desc}</p>}
            </div>
            <div className="shrink-0">{right}</div>
        </div>
    );
}

function SectionHeader({ Icon, color, iconBg, title, subtitle }) {
    return (
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/[0.05]">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconBg} border flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
                <h2 className="font-semibold text-base">{title}</h2>
                {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
            </div>
        </div>
    );
}

/* ─── Main ──────────────────────────────────────────────────────────────────── */
export default function Settings() {
    const { user }                      = useAuth();
    const { t, language, setLanguage }  = useLanguage();
    const { theme, setTheme }           = useTheme();

    const [activeTab,           setActiveTab]           = useState('appearance');
    const [autoSave,            setAutoSave]            = useState(() => localStorage.getItem('autoSave') !== 'false');
    const [reduceMotion,        setReduceMotion]        = useState(() => localStorage.getItem('reduceMotion') === 'true');
    const [defaultFormat,       setDefaultFormat]       = useState(() => localStorage.getItem('defaultFormat') || 'png');
    const [highQualityPreview,  setHighQualityPreview]  = useState(() => localStorage.getItem('hqPreview') !== 'false');

    const [apiKeyInfo,          setApiKeyInfo]          = useState(null);
    const [showApiKey,          setShowApiKey]          = useState(false);
    const [newApiKey,           setNewApiKey]           = useState(null);
    const [apiKeyLoading,       setApiKeyLoading]       = useState(false);
    const [copySuccess,         setCopySuccess]         = useState(false);

    const [emailNotifications,  setEmailNotifications]  = useState(true);
    const [savingNotif,         setSavingNotif]         = useState(false);

    // Password change
    const [pwCurrent,   setPwCurrent]   = useState('');
    const [pwNew,       setPwNew]       = useState('');
    const [pwConfirm,   setPwConfirm]   = useState('');
    const [pwLoading,   setPwLoading]   = useState(false);
    const [pwMsg,       setPwMsg]       = useState(null); // { ok, text }
    const [showPw,      setShowPw]      = useState(false);

    useEffect(() => { localStorage.setItem('autoSave',     autoSave);          }, [autoSave]);
    useEffect(() => { localStorage.setItem('reduceMotion', reduceMotion);       }, [reduceMotion]);
    useEffect(() => { localStorage.setItem('defaultFormat', defaultFormat);     }, [defaultFormat]);
    useEffect(() => { localStorage.setItem('hqPreview',    highQualityPreview); }, [highQualityPreview]);
    useEffect(() => { fetchApiKeyInfo(); fetchUserSettings(); }, []);

    const fetchApiKeyInfo   = async () => { try { const r = await axios.get('/auth/api-key');  setApiKeyInfo(r.data); }                          catch {} };
    const fetchUserSettings = async () => { try { const r = await axios.get('/auth/settings'); setEmailNotifications(r.data.email_notifications); } catch {} };

    const generateApiKey = async () => {
        if (!confirm(t('settings.generateApiKeyConfirm'))) return;
        setApiKeyLoading(true);
        try { const r = await axios.post('/auth/api-key/generate'); setNewApiKey(r.data.api_key); setShowApiKey(true); fetchApiKeyInfo(); }
        catch (e) { alert(e.response?.data?.detail || 'Error'); }
        finally { setApiKeyLoading(false); }
    };

    const revokeApiKey = async () => {
        if (!confirm(t('settings.revokeApiKeyConfirm'))) return;
        setApiKeyLoading(true);
        try { await axios.delete('/auth/api-key'); setApiKeyInfo({ has_key: false }); setNewApiKey(null); }
        catch (e) { alert(e.response?.data?.detail || 'Error'); }
        finally { setApiKeyLoading(false); }
    };

    const copyApiKey = async () => {
        if (!newApiKey) return;
        await navigator.clipboard.writeText(newApiKey);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2500);
    };

    const updateEmailNotifications = async (value) => {
        setEmailNotifications(value);
        setSavingNotif(true);
        try { await axios.put('/auth/settings', { email_notifications: value }); }
        catch { setEmailNotifications(!value); }
        finally { setSavingNotif(false); }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (pwNew !== pwConfirm) { setPwMsg({ ok: false, text: 'New passwords do not match.' }); return; }
        if (pwNew.length < 8)    { setPwMsg({ ok: false, text: 'Password must be at least 8 characters.' }); return; }
        setPwLoading(true); setPwMsg(null);
        try {
            await axios.put('/auth/change-password', { current_password: pwCurrent, new_password: pwNew });
            setPwMsg({ ok: true, text: 'Password changed successfully!' });
            setPwCurrent(''); setPwNew(''); setPwConfirm('');
        } catch (e) {
            setPwMsg({ ok: false, text: e.response?.data?.detail || 'Failed to change password.' });
        } finally { setPwLoading(false); }
    };

    const handleExport = () => {
        const data = { theme, language, autoSave, reduceMotion, defaultFormat, highQualityPreview, emailNotifications, exportDate: new Date().toISOString() };
        const a = Object.assign(document.createElement('a'), {
            href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })),
            download: 'colorizex-settings.json',
        });
        a.click();
    };

    const handleClearCache = () => {
        if (confirm(t('settings.confirmClear'))) { localStorage.clear(); window.location.reload(); }
    };

    /* ── static data ── */
    const themes = [
        { id: 'light',      name: t('settings.light'),      Icon: Sun,     preview: 'bg-gradient-to-br from-slate-200 to-slate-100' },
        { id: 'dark',       name: t('settings.dark'),       Icon: Moon,    preview: 'bg-gradient-to-br from-slate-900 to-slate-800' },
        { id: 'system',     name: t('settings.auto'),       Icon: Monitor, preview: 'bg-gradient-to-r from-slate-200 to-slate-900'  },
        { id: 'kazakhstan', name: t('settings.kazakhstan'), Icon: Flag,    preview: 'bg-gradient-to-r from-sky-500 to-yellow-400'   },
    ];
    const languages = [
        { id: 'en', name: 'English',  flag: '🇺🇸' },
        { id: 'tr', name: 'Türkçe',   flag: '🇹🇷' },
        { id: 'kz', name: 'Қазақша', flag: '🇰🇿' },
        { id: 'ru', name: 'Русский',  flag: '🇷🇺' },
    ];
    const formats = [
        { id: 'png',  label: 'PNG',  desc: 'Lossless, transparent support' },
        { id: 'jpg',  label: 'JPG',  desc: 'Smaller size, best for photos'  },
        { id: 'webp', label: 'WebP', desc: 'Modern, best compression'       },
    ];
    const shortcuts = [
        { keys: ['Ctrl', 'Z'],  label: 'Undo last action'    },
        { keys: ['Ctrl', 'S'],  label: 'Download result'     },
        { keys: ['F'],          label: 'Fullscreen toggle'   },
        { keys: ['Esc'],        label: 'Close dialog'        },
        { keys: ['←', '→'],    label: 'Before / After slider' },
    ];

    const isPro = user?.role === 'PRO' || user?.role === 'ADMIN';

    const getRoleBadge = (role) => ({
        ADMIN:   'bg-danger/15 text-danger border-danger/25',
        PRO:     'bg-accent/15 text-accent border-accent/25',
        STUDENT: 'bg-secondary/15 text-secondary border-secondary/25',
    }[role] ?? 'bg-primary/15 text-primary border-primary/25');

    const tabs = [
        { id: 'appearance',   label: t('settings.appearance'),         Icon: Palette,  color: 'text-primary'   },
        { id: 'language',     label: t('settings.language'),           Icon: Globe,    color: 'text-secondary' },
        { id: 'notifications',label: t('settings.notificationsTitle'), Icon: Bell,     color: 'text-success'   },
        { id: 'security',     label: t('settings.securityTitle'),      Icon: Lock,     color: 'text-warning'   },
        { id: 'apikey',       label: t('settings.apiKeyTitle'),        Icon: Key,      color: 'text-accent'    },
        { id: 'preferences',  label: t('settings.processing'),         Icon: Save,     color: 'text-primary'   },
        { id: 'data',         label: t('settings.dataManagement'),     Icon: HardDrive,color: 'text-warning'   },
    ];

    /* ─────────────────────────────── render ────────────────────────────────── */
    return (
        <div className="h-screen flex flex-col overflow-hidden relative">
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="orb orb-secondary w-96 h-96 -top-48 -right-48 opacity-20" />
                <div className="orb orb-accent    w-80 h-80 bottom-0 -left-40   opacity-15" />
            </div>

            <div className="relative z-10 flex flex-col h-full p-6 lg:p-8 gap-5">

                {/* ── Page header ── */}
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="shrink-0">
                    <h1 className="font-display text-2xl font-bold text-gradient">{t('settings.title')}</h1>
                    <p className="text-sm text-muted mt-0.5">{t('settings.customizeDesc')}</p>
                </motion.div>

                {/* ── Two-column ── */}
                <div className="flex gap-5 flex-1 min-h-0">

                    {/* ── Left nav ── */}
                    <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}
                        className="w-56 shrink-0 flex flex-col gap-3">

                        {/* Profile card */}
                        {user && (
                            <div className="card p-3.5 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                                <div className="relative flex items-center gap-3">
                                    <div className="relative shrink-0">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
                                            <span className="font-display text-xl font-bold text-gradient">{user.email[0].toUpperCase()}</span>
                                        </div>
                                        <div className={`absolute -bottom-1 -right-1 px-1.5 py-px rounded-md text-[9px] font-bold border leading-tight ${getRoleBadge(user.role)}`}>
                                            {user.role}
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-sm truncate">{user.email.split('@')[0]}</p>
                                        <p className="text-xs text-muted truncate">{user.email}</p>
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="text-[10px] font-mono text-muted/50 uppercase tracking-wider">{t('common.credits')}</span>
                                            <span className="text-sm font-display font-bold text-gradient">{user.credits}</span>
                                        </div>
                                        <div className="h-1 bg-white/[0.06] rounded-full mt-1 overflow-hidden">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-primary via-accent to-secondary rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min((user.credits / (user.role === 'ADMIN' ? 1000 : user.role === 'PRO' ? 100 : 10)) * 100, 100)}%` }}
                                                transition={{ duration: 1.2, ease: 'easeOut' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                {!isPro && (
                                    <Link to="/plans" className="relative mt-3 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-gradient-to-r from-accent/15 to-primary/15 border border-accent/25 text-accent hover:from-accent/25 hover:to-primary/25 transition-all text-xs font-bold">
                                        <Crown className="w-3.5 h-3.5" /> Upgrade to PRO
                                    </Link>
                                )}
                            </div>
                        )}

                        {/* Tab list */}
                        <nav className="card p-2 flex flex-col gap-0.5 overflow-y-auto">
                            {tabs.map(({ id, label, Icon, color }) => (
                                <button key={id} onClick={() => setActiveTab(id)}
                                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left w-full ${
                                        activeTab === id ? 'text-foreground' : 'text-muted hover:text-foreground hover:bg-white/[0.04]'
                                    }`}>
                                    {activeTab === id && (
                                        <motion.div layoutId="settings-active-tab"
                                            className="absolute inset-0 bg-white/[0.06] rounded-xl border border-white/[0.08]"
                                            transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                                    )}
                                    <Icon className={`relative w-4 h-4 shrink-0 ${activeTab === id ? color : ''}`} />
                                    <span className="relative truncate">{label}</span>
                                </button>
                            ))}
                        </nav>
                    </motion.div>

                    {/* ── Right panel ── */}
                    <div className="flex-1 min-w-0 overflow-y-auto">
                        <div className="h-full">
                            <div>

                                {/* ── APPEARANCE ── */}
                                {activeTab === 'appearance' && (
                                    <div className="card">
                                        <SectionHeader Icon={Palette} color="text-primary" iconBg="from-primary/20 to-primary/5 border-primary/20"
                                            title={t('settings.appearance')} subtitle={t('settings.themeSelectDesc')} />
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {themes.map(({ id, name, Icon, preview }) => (
                                                <button key={id} onClick={() => setTheme(id)}
                                                    className={`relative p-3 rounded-xl border transition-all text-left ${
                                                        theme === id ? 'border-primary/50 bg-primary/8 shadow-lg shadow-primary/5'
                                                                     : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                                                    }`}>
                                                    {theme === id && (
                                                        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                                            <Check className="w-3 h-3 text-white" />
                                                        </span>
                                                    )}
                                                    <div className={`w-full h-10 rounded-lg mb-3 ${preview}`} />
                                                    <Icon className={`w-4 h-4 mb-1.5 ${theme === id ? 'text-primary' : 'text-muted'}`} />
                                                    <p className={`font-medium text-sm ${theme === id ? 'text-primary' : ''}`}>{name}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ── LANGUAGE ── */}
                                {activeTab === 'language' && (
                                    <div className="card">
                                        <SectionHeader Icon={Globe} color="text-secondary" iconBg="from-secondary/20 to-secondary/5 border-secondary/20"
                                            title={t('settings.language')} subtitle={t('settings.langSelectDesc')} />
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {languages.map(({ id, name, flag }) => (
                                                <button key={id} onClick={() => setLanguage(id)}
                                                    className={`relative flex flex-col items-center p-5 rounded-xl border transition-all ${
                                                        language === id ? 'border-secondary/50 bg-secondary/8 shadow-lg shadow-secondary/5'
                                                                        : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                                                    }`}>
                                                    {language === id && (
                                                        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-secondary flex items-center justify-center">
                                                            <Check className="w-3 h-3 text-white" />
                                                        </span>
                                                    )}
                                                    <span className="text-3xl mb-2">{flag}</span>
                                                    <p className={`font-semibold text-sm ${language === id ? 'text-secondary' : ''}`}>{name}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ── NOTIFICATIONS ── */}
                                {activeTab === 'notifications' && (
                                    <div className="card">
                                        <SectionHeader Icon={Bell} color="text-success" iconBg="from-success/20 to-success/5 border-success/20"
                                            title={t('settings.notificationsTitle')} subtitle={t('settings.notificationsDesc')} />
                                        <div className="divide-y divide-white/[0.05]">
                                            <RowItem
                                                label={t('settings.emailNotificationsTitle')}
                                                desc={t('settings.emailNotificationsDesc')}
                                                right={<Toggle enabled={emailNotifications} onChange={updateEmailNotifications} loading={savingNotif} />}
                                            />
                                            <RowItem
                                                label={t('settings.processCompleteNotif')}
                                                desc={t('settings.processCompleteNotifDesc')}
                                                right={<Toggle enabled={false} onChange={() => {}} disabled />}
                                            />
                                            <RowItem
                                                label={t('settings.creditWarning')}
                                                desc={t('settings.creditWarningDesc')}
                                                right={<Toggle enabled={true} onChange={() => {}} />}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* ── SECURITY ── */}
                                {activeTab === 'security' && (
                                    <div className="flex flex-col gap-4">
                                        {/* Change password */}
                                        <div className="card">
                                            <SectionHeader Icon={Lock} color="text-warning" iconBg="from-warning/20 to-warning/5 border-warning/20"
                                                title={t('settings.changePassword')} subtitle={t('settings.changePasswordDesc')} />
                                            <form onSubmit={handleChangePassword} className="space-y-3">
                                                {/* Current */}
                                                <div>
                                                    <label className="text-xs font-medium text-muted mb-1.5 block">{t('settings.currentPassword')}</label>
                                                    <div className="relative">
                                                        <input type={showPw ? 'text' : 'password'} value={pwCurrent} onChange={e => setPwCurrent(e.target.value)}
                                                            placeholder="••••••••" required
                                                            className="w-full px-3.5 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all placeholder:text-muted/40 pr-10" />
                                                        <button type="button" onClick={() => setShowPw(v => !v)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors">
                                                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </div>
                                                {/* New */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-xs font-medium text-muted mb-1.5 block">{t('settings.newPassword')}</label>
                                                        <input type={showPw ? 'text' : 'password'} value={pwNew} onChange={e => setPwNew(e.target.value)}
                                                            placeholder={t('settings.atLeast8Chars')} required minLength={8}
                                                            className="w-full px-3.5 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all placeholder:text-muted/40" />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium text-muted mb-1.5 block">{t('settings.confirmPasswordLabel')}</label>
                                                        <input type={showPw ? 'text' : 'password'} value={pwConfirm} onChange={e => setPwConfirm(e.target.value)}
                                                            placeholder={t('settings.enterAgain')} required
                                                            className={`w-full px-3.5 py-2.5 text-sm bg-white/[0.04] border rounded-xl focus:outline-none focus:bg-white/[0.06] transition-all placeholder:text-muted/40 ${
                                                                pwConfirm && pwConfirm !== pwNew ? 'border-danger/50' : 'border-white/[0.08] focus:border-primary/50'
                                                            }`} />
                                                    </div>
                                                </div>

                                                {/* strength bar */}
                                                {pwNew.length > 0 && (
                                                    <div>
                                                        <div className="flex justify-between text-[11px] text-muted mb-1">
                                                            <span>{t('settings.passwordStrength')}</span>
                                                            <span className={pwNew.length >= 12 ? 'text-success' : pwNew.length >= 8 ? 'text-warning' : 'text-danger'}>
                                                                {pwNew.length >= 12 ? t('settings.pwStrong') : pwNew.length >= 8 ? t('settings.pwMedium') : t('settings.pwWeak')}
                                                            </span>
                                                        </div>
                                                        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                                            <motion.div
                                                                className={`h-full rounded-full ${pwNew.length >= 12 ? 'bg-success' : pwNew.length >= 8 ? 'bg-warning' : 'bg-danger'}`}
                                                                animate={{ width: `${Math.min((pwNew.length / 16) * 100, 100)}%` }}
                                                                transition={{ duration: 0.3 }} />
                                                        </div>
                                                    </div>
                                                )}

                                                <AnimatePresence>
                                                    {pwMsg && (
                                                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                            className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
                                                                pwMsg.ok ? 'bg-success/10 border border-success/20 text-success' : 'bg-danger/10 border border-danger/20 text-danger'
                                                            }`}>
                                                            {pwMsg.ok ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                                                            {pwMsg.text}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                <button type="submit" disabled={pwLoading || !pwCurrent || !pwNew || !pwConfirm}
                                                    className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                                                    {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                                    {t('settings.changePasswordBtn')}
                                                </button>
                                            </form>
                                        </div>

                                        {/* Security info */}
                                        <div className="card">
                                            <div className="flex items-center gap-3 mb-4">
                                                <Shield className="w-5 h-5 text-success" />
                                                <h3 className="font-semibold text-sm">{t('settings.accountInfo')}</h3>
                                            </div>
                                            <div className="divide-y divide-white/[0.05]">
                                                <RowItem label={t('settings.emailLabel')} desc={user?.email || '—'} right={
                                                    <span className="px-2 py-1 bg-success/10 text-success border border-success/20 rounded-lg text-xs font-medium">{t('settings.verified')}</span>
                                                } />
                                                <RowItem label={t('settings.roleLabel')} desc={t('settings.accountType')} right={
                                                    <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${
                                                        user?.role === 'ADMIN' ? 'bg-danger/10 text-danger border-danger/20' :
                                                        user?.role === 'PRO'   ? 'bg-accent/10 text-accent border-accent/20' :
                                                                                  'bg-primary/10 text-primary border-primary/20'
                                                    }`}>{user?.role || 'USER'}</span>
                                                } />
                                                <RowItem label={t('settings.session')} desc={t('settings.activeSession')} right={
                                                    <span className="px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-muted">{t('settings.oneActive')}</span>
                                                } />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── API KEY ── */}
                                {activeTab === 'apikey' && (
                                    <div className="card">
                                        <div className="flex items-start justify-between gap-4">
                                            <SectionHeader Icon={Key} color="text-accent" iconBg="from-accent/20 to-accent/5 border-accent/20"
                                                title={t('settings.apiKeyTitle')} subtitle={t('settings.apiKeyDesc')} />
                                            {!isPro && <span className="shrink-0 px-2 py-1 rounded-lg bg-accent/10 text-accent text-xs font-bold border border-accent/20">PRO</span>}
                                        </div>
                                        <div className="mt-1">
                                            {!isPro ? (
                                                <div className="flex items-center gap-3 p-4 rounded-xl bg-accent/5 border border-accent/15">
                                                    <Crown className="w-5 h-5 text-accent shrink-0" />
                                                    <p className="text-sm text-accent/80 flex-1">{t('settings.upgradeForApiDesc')}</p>
                                                    <Link to="/plans" className="shrink-0 text-sm font-bold text-accent flex items-center gap-0.5 hover:underline">
                                                        Upgrade <ChevronRight className="w-4 h-4" />
                                                    </Link>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {apiKeyInfo?.has_key && (
                                                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-sm text-muted">{t('settings.currentApiKey')}</span>
                                                                {apiKeyInfo.created_at && (
                                                                    <span className="text-xs text-muted/40">{new Date(apiKeyInfo.created_at).toLocaleDateString()}</span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <code className="flex-1 p-2.5 rounded-lg bg-background font-mono text-xs text-muted/70 break-all">
                                                                    {showApiKey && newApiKey ? newApiKey : (apiKeyInfo.key || '•'.repeat(40))}
                                                                </code>
                                                                {newApiKey && (
                                                                    <button onClick={() => setShowApiKey(v => !v)} className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors shrink-0">
                                                                        {showApiKey ? <EyeOff className="w-4 h-4 text-muted" /> : <Eye className="w-4 h-4 text-muted" />}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <AnimatePresence>
                                                        {newApiKey && (
                                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                                                className="p-4 rounded-xl bg-success/8 border border-success/20">
                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                    <Shield className="w-4 h-4 text-success" />
                                                                    <span className="text-sm font-semibold text-success">{t('settings.newApiKeyCreated')}</span>
                                                                </div>
                                                                <p className="text-xs text-muted mb-3">{t('settings.copyApiKeyWarning')}</p>
                                                                <div className="flex items-center gap-2">
                                                                    <code className="flex-1 p-2.5 rounded-lg bg-background font-mono text-xs break-all">{newApiKey}</code>
                                                                    <button onClick={copyApiKey} className="p-2.5 rounded-lg bg-success text-white hover:bg-success/90 transition-colors shrink-0">
                                                                        {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                                    </button>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                    <div className="flex gap-2">
                                                        <button onClick={generateApiKey} disabled={apiKeyLoading} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm">
                                                            {apiKeyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                                            {apiKeyInfo?.has_key ? t('settings.regenerateKey') : t('settings.createApiKey')}
                                                        </button>
                                                        {apiKeyInfo?.has_key && (
                                                            <button onClick={revokeApiKey} disabled={apiKeyLoading} className="btn-secondary text-sm text-danger border-danger/20 hover:bg-danger/8">
                                                                {t('settings.revokeKey')}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ── PREFERENCES ── */}
                                {activeTab === 'preferences' && (
                                    <div className="flex flex-col gap-4">
                                        {/* Default export format */}
                                        <div className="card">
                                            <SectionHeader Icon={ImageIcon} color="text-accent" iconBg="from-accent/20 to-accent/5 border-accent/20"
                                                title={t('settings.defaultExportFormat')} subtitle={t('settings.defaultExportFormatDesc')} />
                                            <div className="grid grid-cols-3 gap-3">
                                                {formats.map(({ id, label, desc }) => (
                                                    <button key={id} onClick={() => setDefaultFormat(id)}
                                                        className={`relative p-3 rounded-xl border transition-all text-left ${
                                                            defaultFormat === id ? 'border-accent/50 bg-accent/8 shadow-lg shadow-accent/5'
                                                                                 : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                                                        }`}>
                                                        {defaultFormat === id && (
                                                            <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                                                                <Check className="w-2.5 h-2.5 text-white" />
                                                            </span>
                                                        )}
                                                        <p className={`font-bold text-base mb-1 ${defaultFormat === id ? 'text-accent' : ''}`}>{label}</p>
                                                        <p className="text-xs text-muted leading-relaxed">{desc}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* App prefs */}
                                        <div className="card">
                                            <SectionHeader Icon={Save} color="text-primary" iconBg="from-primary/20 to-primary/5 border-primary/20"
                                                title={t('settings.processing')} subtitle={t('settings.processingConfigDesc')} />
                                            <div className="divide-y divide-white/[0.05]">
                                                <RowItem label={t('settings.autoSave')} desc={t('settings.autoSaveDesc')}
                                                    right={<Toggle enabled={autoSave} onChange={setAutoSave} />} />
                                                <RowItem label={t('settings.highQualityPreview')} desc={t('settings.highQualityPreviewDesc')}
                                                    right={<Toggle enabled={highQualityPreview} onChange={setHighQualityPreview} />} />
                                                <RowItem label={t('settings.reduceMotion')} desc={t('settings.reduceMotionDesc')}
                                                    right={<Toggle enabled={reduceMotion} onChange={setReduceMotion} />} />
                                            </div>
                                        </div>

                                        {/* Keyboard shortcuts */}
                                        <div className="card">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Keyboard className="w-4 h-4 text-muted/60" />
                                                <span className="text-xs font-mono uppercase tracking-[0.15em] text-muted/50">{t('settings.keyboardShortcuts')}</span>
                                            </div>
                                            <div className="space-y-2.5">
                                                {shortcuts.map(({ keys, label }) => (
                                                    <div key={label} className="flex items-center justify-between">
                                                        <span className="text-sm text-muted">{label}</span>
                                                        <div className="flex items-center gap-1">
                                                            {keys.map((k, i) => (
                                                                <span key={i} className="px-2 py-1 rounded-md bg-white/[0.05] border border-white/[0.08] text-xs font-mono text-muted/70 leading-tight">{k}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── DATA & DANGER ── */}
                                {activeTab === 'data' && (
                                    <div className="flex flex-col gap-4">
                                        <div className="card">
                                            <SectionHeader Icon={HardDrive} color="text-warning" iconBg="from-warning/20 to-warning/5 border-warning/20"
                                                title={t('settings.dataManagement')} subtitle={t('settings.localDataDesc')} />
                                            <div className="divide-y divide-white/[0.05]">
                                                <RowItem label={t('settings.exportSettings')} desc={t('settings.exportDesc')} right={
                                                    <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] text-sm font-medium transition-all">
                                                        <Download className="w-4 h-4" /> {t('settings.export')}
                                                    </button>
                                                } />
                                            </div>
                                        </div>

                                        <div className="card border-danger/20 bg-danger/[0.02]">
                                            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-danger/[0.08]">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-danger/20 to-danger/5 border border-danger/20 flex items-center justify-center shrink-0">
                                                    <AlertTriangle className="w-5 h-5 text-danger" />
                                                </div>
                                                <div>
                                                    <h2 className="font-semibold text-base text-danger">{t('settings.dangerZone')}</h2>
                                                    <p className="text-xs text-danger/50 mt-0.5">{t('settings.dangerZoneDesc')}</p>
                                                </div>
                                            </div>
                                            <div className="divide-y divide-danger/[0.06]">
                                                <RowItem label={t('settings.clearCache')} desc={t('settings.clearCacheDesc')} right={
                                                    <button onClick={handleClearCache} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-danger/10 border border-danger/20 text-danger hover:bg-danger/20 text-sm font-semibold transition-all shrink-0">
                                                        <Trash2 className="w-4 h-4" /> {t('settings.clear')}
                                                    </button>
                                                } />
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
