import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
    Aperture, Film, Wand2, ArrowRight, Sparkles,
    Github, Linkedin, Mail, Zap, Play,
    Scissors, Eraser, Wrench, Clock, CheckCircle, XCircle, Loader2,
    Image as ImageIcon, Video as VideoIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useAuth, API_URL } from '../context/AuthContext';
import axios from '../lib/axios';

export default function Home() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [recentJobs, setRecentJobs] = useState([]);

    useEffect(() => {
        if (!user) return;
        axios.get('/jobs/?limit=3').then(r => setRecentJobs(r.data.slice(0, 3))).catch(() => {});
    }, [user]);

    const colorClasses = {
        primary: {
            glow: 'bg-primary/20',
            iconBg: 'from-primary/20 to-primary/5 border-primary/20',
            iconText: 'text-primary',
            linkText: 'text-primary',
        },
        secondary: {
            glow: 'bg-secondary/20',
            iconBg: 'from-secondary/20 to-secondary/5 border-secondary/20',
            iconText: 'text-secondary',
            linkText: 'text-secondary',
        },
        accent: {
            glow: 'bg-accent/20',
            iconBg: 'from-accent/20 to-accent/5 border-accent/20',
            iconText: 'text-accent',
            linkText: 'text-accent',
        },
        success: {
            glow: 'bg-success/20',
            iconBg: 'from-success/20 to-success/5 border-success/20',
            iconText: 'text-success',
            linkText: 'text-success',
        },
        warning: {
            glow: 'bg-warning/20',
            iconBg: 'from-warning/20 to-warning/5 border-warning/20',
            iconText: 'text-warning',
            linkText: 'text-warning',
        },
    };

    const features = [
        {
            title: t('home.photoCardTitle'),
            description: t('home.photoCardDesc'),
            icon: Aperture,
            path: '/photo',
            color: 'primary',
        },
        {
            title: t('home.videoCardTitle'),
            description: t('home.videoCardDesc'),
            icon: Film,
            path: '/video',
            color: 'secondary',
        },
        {
            title: 'AI Enhance',
            description: t('home.enhanceCardDesc'),
            icon: Wand2,
            path: '/enhance',
            color: 'accent',
        },
        {
            title: t('bgRemove.title') || 'BG Remove',
            description: t('bgRemove.subtitle') || 'Remove or replace image backgrounds instantly',
            icon: Scissors,
            path: '/bg-remove',
            color: 'success',
        },
        {
            title: t('inpaint.title') || 'Object Remover',
            description: t('inpaint.canvasHint') || 'Paint over unwanted objects and AI removes them',
            icon: Eraser,
            path: '/inpaint',
            color: 'warning',
        },
        {
            title: t('damageRestore.title') || 'Photo Repair',
            description: t('damageRestore.desc') || 'Repair tears, scratches and damage in old photos',
            icon: Wrench,
            path: '/damage-restore',
            color: 'primary',
        },
    ];

    const team = [
        {
            name: t('home.backendName'),
            role: t('home.backendRole'),
            image: "/LogoAndProFoto/image.png",
            desc: t('home.backendDesc')
        },
        {
            name: t('home.frontendName'),
            role: t('home.frontendRole'),
            image: "/LogoAndProFoto/NurbekLogo.jpg",
            desc: t('home.frontendDesc')
        },
        {
            name: t('home.researcherName'),
            role: t('home.researcherRole'),
            image: "/LogoAndProFoto/SamatLogo.jpg",
            desc: t('home.researcherDesc')
        }
    ];

    const stats = [
        { value: '10K+', label: t('home.statsPhotos') },
        { value: '99%', label: t('home.statsAccuracy') },
        { value: '<30s', label: t('home.statsSpeed') },
    ];

    return (
        <div className="min-h-screen relative">
            {/* Background Orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="orb orb-primary w-[600px] h-[600px] -top-64 -left-64 opacity-20" />
                <div className="orb orb-secondary w-[500px] h-[500px] top-1/3 -right-64 opacity-15" />
                <div className="orb orb-accent w-[400px] h-[400px] bottom-0 left-1/3 opacity-15" />
            </div>

            {/* Hero Section */}
            <section className="relative min-h-[90vh] flex items-center justify-center px-6 py-20">
                <div className="relative z-10 max-w-5xl mx-auto text-center">
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-sm mb-8"
                    >
                        <Sparkles className="w-4 h-4 text-accent" />
                        <span className="text-sm font-medium">{t('home.heroBadge')}</span>
                    </motion.div>

                    {/* Logo & Title */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="mb-8"
                    >
                        <div className="flex items-center justify-center gap-5 mb-8">
                            <div className="relative">
                                <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-white/10 shadow-2xl shadow-primary/20">
                                    <img
                                        src="/LogoAndProFoto/ayu_logo.png"
                                        alt="Logo"
                                        className="w-20 h-20 object-contain"
                                    />
                                </div>
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                    className="absolute -inset-3 rounded-[2rem] border border-dashed border-primary/20"
                                />
                                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-success to-emerald-400 rounded-xl flex items-center justify-center shadow-lg shadow-success/40">
                                    <Zap className="w-5 h-5 text-white" />
                                </div>
                            </div>
                        </div>

                        <h1 className="font-display text-6xl md:text-7xl font-bold mb-4 tracking-tight">
                            <span className="text-gradient">ColorizeX</span>
                        </h1>
                        <p className="text-xl text-muted font-light tracking-widest font-mono">
                            AYU.COLORIZE
                        </p>
                    </motion.div>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-muted max-w-2xl mx-auto mb-12 leading-relaxed"
                    >
                        {t('home.heroSubtitle')}
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
                    >
                        <Link to="/photo" className="btn-primary px-8 py-4 text-lg flex items-center gap-3">
                            {t('home.getStarted')}
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link to="/presentation" className="btn-secondary px-8 py-4 text-lg flex items-center gap-3">
                            <Play className="w-5 h-5" />
                            {t('home.watchDemo')}
                        </Link>
                    </motion.div>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-center justify-center gap-8 md:gap-16"
                    >
                        {stats.map((stat, i) => (
                            <div key={i} className="text-center">
                                <p className="font-display text-3xl md:text-4xl font-bold text-gradient mb-1">
                                    {stat.value}
                                </p>
                                <p className="text-xs text-muted font-mono uppercase tracking-wider">
                                    {stat.label}
                                </p>
                            </div>
                        ))}
                    </motion.div>
                </div>

                {/* Scroll Indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2"
                >
                    <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2">
                        <motion.div
                            animate={{ y: [0, 8, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="w-1.5 h-1.5 rounded-full bg-primary"
                        />
                    </div>
                </motion.div>
            </section>

            {/* Quick Tools Section */}
            <section className="relative py-20 px-6">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono uppercase tracking-widest text-muted/70 mb-4">
                            <Zap className="w-3 h-3" /> {t('home.chooseToolTitle')}
                        </span>
                        <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
                            {t('home.chooseToolSubtitle')}
                        </h2>
                    </motion.div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {features.map((feature, index) => (
                            <motion.div
                                key={feature.path}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.07 }}
                            >
                                <Link
                                    to={feature.path}
                                    className="card group block h-full relative overflow-hidden hover:-translate-y-1 transition-transform duration-300"
                                >
                                    <div className={`absolute -top-16 -right-16 w-32 h-32 ${colorClasses[feature.color].glow} rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                                    <div className="relative">
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[feature.color].iconBg} border flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                                            <feature.icon className={`w-5 h-5 ${colorClasses[feature.color].iconText}`} />
                                        </div>
                                        <h3 className="font-display text-lg font-bold mb-2 group-hover:text-gradient transition-all">
                                            {feature.title}
                                        </h3>
                                        <p className="text-muted text-sm mb-5 leading-relaxed line-clamp-2">
                                            {feature.description}
                                        </p>
                                        <div className={`flex items-center gap-1.5 text-sm ${colorClasses[feature.color].linkText} font-semibold`}>
                                            <span>{t('home.startLink')}</span>
                                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Recent Activity (logged-in only) */}
            {user && recentJobs.length > 0 && (
                <section className="relative py-12 px-6">
                    <div className="max-w-6xl mx-auto">
                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/5 border border-secondary/20 flex items-center justify-center">
                                        <Clock className="w-4 h-4 text-secondary" />
                                    </div>
                                    <h2 className="font-display text-xl font-bold">{t('history.title')}</h2>
                                </div>
                                <Link to="/history" className="text-xs text-muted/60 hover:text-primary transition-colors flex items-center gap-1 font-medium">
                                    {t('history.all')} <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                            <div className="grid sm:grid-cols-3 gap-4">
                                {recentJobs.map((job, i) => (
                                    <motion.div key={job.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="card !p-3 group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/20 shrink-0">
                                                {job.output_path && job.status === 'COMPLETED' ? (
                                                    job.type === 'VIDEO_COLORIZE'
                                                        ? <VideoIcon className="w-full h-full p-4 text-secondary" />
                                                        : <img src={`${API_URL}/${job.output_path.replace(/\\/g, '/')}`} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        {job.status === 'PROCESSING'
                                                            ? <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                            : <XCircle className="w-5 h-5 text-danger" />}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full border
                                                        ${job.type === 'BG_REMOVE' ? 'bg-success/15 text-success border-success/25' :
                                                          job.type === 'VIDEO_COLORIZE' ? 'bg-secondary/15 text-secondary border-secondary/25' :
                                                          'bg-primary/15 text-primary border-primary/25'}`}>
                                                        {job.type?.replace('_', ' ')}
                                                    </span>
                                                    {job.status === 'COMPLETED' && <CheckCircle className="w-3 h-3 text-success" />}
                                                </div>
                                                <p className="text-xs text-muted truncate">
                                                    {new Date(job.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </section>
            )}

            {/* Team Section */}
            <section className="relative py-24 px-6">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/50 to-transparent" />

                <div className="relative max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
                            {t('home.teamTitle')}
                        </h2>
                        <p className="text-muted text-lg">
                            {t('home.teamSubtitle')}
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {team.map((member, index) => (
                            <motion.div
                                key={member.name}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="card text-center group"
                            >
                                {/* Avatar */}
                                <div className="relative w-32 h-32 mx-auto mb-6">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 rounded-full border border-dashed border-primary/20"
                                    />
                                    <div className="absolute inset-2 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-primary/30 transition-colors shadow-xl">
                                        <img
                                            src={member.image}
                                            alt={member.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    </div>
                                </div>

                                {/* Info */}
                                <h3 className="font-display text-xl font-bold mb-1">{member.name}</h3>
                                <p className="text-primary text-sm font-semibold mb-3">{member.role}</p>
                                <p className="text-muted text-sm mb-6">{member.desc}</p>

                                {/* Social Links */}
                                <div className="flex items-center justify-center gap-2">
                                    {[Github, Linkedin, Mail].map((Icon, i) => (
                                        <a
                                            key={i}
                                            href="#"
                                            className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-muted hover:text-primary hover:bg-primary/10 hover:border-primary/20 transition-all"
                                        >
                                            <Icon className="w-4 h-4" />
                                        </a>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative py-24 px-6">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="card text-center py-16 px-8 relative overflow-hidden"
                    >
                        {/* Background Decoration */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-b from-accent/20 to-transparent rounded-full blur-[100px] -translate-y-1/2" />

                        <div className="relative">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-accent/20">
                                <Sparkles className="w-7 h-7 text-accent" />
                            </div>
                            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                                {t('home.ctaTitle')}
                            </h2>
                            <p className="text-muted text-lg mb-8 max-w-xl mx-auto">
                                {t('home.ctaSubtitle')}
                            </p>
                            <Link to={user ? "/photo" : "/register"} className="btn-primary inline-flex items-center gap-3 px-8 py-4 text-lg">
                                {user ? t('home.ctaButtonUser') : t('home.ctaButtonGuest')}
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>
        </div>
    );
}
