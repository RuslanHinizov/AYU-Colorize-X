import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Loader2, Zap, Star, GraduationCap, Gift } from 'lucide-react';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    const isStudentEmail = (email) => {
        return email.endsWith('@ayu.edu.kz') || email.endsWith('@yesevi.edu.tr');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError(t('home.registerPasswordMismatch'));
            return;
        }

        if (password.length < 6) {
            setError(t('home.registerPasswordMin'));
            return;
        }

        setLoading(true);

        try {
            await register(email, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.detail || t('home.registerError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex relative overflow-hidden">
            <div className="fixed inset-0 pointer-events-none">
                <div className="orb orb-accent w-[600px] h-[600px] top-0 right-0 opacity-20" />
                <div className="orb orb-primary w-[500px] h-[500px] bottom-0 left-0 opacity-15" />
            </div>

            <div className="hidden lg:flex lg:w-1/2 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-surface via-surface to-background" />
                <div className="relative z-10 flex flex-col justify-center px-16 py-12">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="flex items-center gap-4 mb-16">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-white/10 flex items-center justify-center shadow-xl">
                                    <img src="/LogoAndProFoto/ayu_logo.png" alt="Logo" className="w-10 h-10" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-success to-emerald-400 rounded-lg flex items-center justify-center">
                                    <Zap className="w-3 h-3 text-white" />
                                </div>
                            </div>
                            <div>
                                <h1 className="font-display text-2xl font-bold text-gradient">ColorizeX</h1>
                                <p className="text-xs text-muted font-mono">AYU.COLORIZE</p>
                            </div>
                        </div>
                        <h2 className="font-display text-5xl font-bold mb-6 leading-tight">
                            {t('home.registerTagline1')}<br /><span className="text-gradient">{t('home.registerTagline2')}</span><br />{t('home.registerTagline3')}
                        </h2>
                        <p className="text-muted text-lg max-w-md mb-12">{t('home.registerDesc')}</p>
                        <div className="space-y-4">
                            {[{ text: t('home.registerBenefitFree'), icon: Gift }, { text: t('home.registerBenefitNoCard'), icon: Star }, { text: t('home.registerBenefitStudent'), icon: GraduationCap }].map((b, i) => (
                                <motion.div key={b.text} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center"><b.icon className="w-3 h-3 text-accent" /></div>
                                    <span>{b.text}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
                    <div className="lg:hidden text-center mb-10">
                        <div className="inline-flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-white/10 flex items-center justify-center">
                                <img src="/LogoAndProFoto/ayu_logo.png" alt="Logo" className="w-8 h-8" />
                            </div>
                            <h1 className="font-display text-2xl font-bold text-gradient">ColorizeX</h1>
                        </div>
                    </div>
                    <div className="card p-8">
                        <div className="text-center mb-8">
                            <h2 className="font-display text-2xl font-bold mb-2">{t('auth.createAccount')}</h2>
                            <p className="text-muted text-sm">{t('home.registerSubtitle')}</p>
                        </div>
                        {error && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">{error}</motion.div>}
                        {isStudentEmail(email) && email.length > 10 && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-xl bg-accent/10 border border-accent/20 flex items-center gap-3">
                                <GraduationCap className="w-6 h-6 text-accent" />
                                <div><p className="font-semibold text-accent text-sm">{t('auth.studentBonus')}</p><p className="text-xs text-muted">{t('home.studentBonusCredits')}</p></div>
                            </motion.div>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-muted">{t('auth.email')}</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="email@ornek.com" required />
                                <p className="text-xs text-muted">{t('auth.studentHint')}</p>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-muted">{t('auth.password')}</label>
                                <div className="relative">
                                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="input-field pr-12" placeholder="••••••••" required />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-muted">{t('auth.confirmPassword')}</label>
                                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field" placeholder="••••••••" required />
                            </div>
                            <button type="submit" disabled={loading} className="btn-primary w-full py-4 flex items-center justify-center gap-2">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{t('auth.signUp')}<ArrowRight className="w-5 h-5" /></>}
                            </button>
                        </form>
                        <div className="my-8 flex items-center gap-4"><div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" /><span className="text-xs text-muted font-mono">{t('home.or')}</span><div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" /></div>
                        <p className="text-center text-muted text-sm">{t('auth.hasAccount')} <Link to="/login" className="text-primary font-semibold">{t('auth.signIn')}</Link></p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
