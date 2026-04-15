import { Link } from 'react-router-dom';
import {
    Aperture, Film, Wand2, ArrowRight, Sparkles,
    Github, Linkedin, Mail, Zap, Play
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function Home() {
    const { t } = useLanguage();
    const { user } = useAuth();

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
            title: t('home.restorationCardTitle'),
            description: t('home.restorationCardDesc'),
            icon: Wand2,
            path: '/restore',
            color: 'accent',
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

            {/* Features Section */}
            <section className="relative py-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
                            {t('home.chooseToolTitle')}
                        </h2>
                        <p className="text-muted text-lg max-w-xl mx-auto">
                            {t('home.chooseToolSubtitle')}
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {features.map((feature, index) => (
                            <motion.div
                                key={feature.path}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Link
                                    to={feature.path}
                                    className="card group block h-full relative overflow-hidden"
                                >
                                    {/* Hover Glow */}
                                    <div className={`absolute -top-20 -right-20 w-40 h-40 ${colorClasses[feature.color].glow} rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                                    <div className="relative">
                                        {/* Icon */}
                                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colorClasses[feature.color].iconBg} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-glow transition-all duration-300`}>
                                            <feature.icon className={`w-7 h-7 ${colorClasses[feature.color].iconText}`} />
                                        </div>

                                        {/* Content */}
                                        <h3 className="font-display text-2xl font-bold mb-3 group-hover:text-gradient transition-all">
                                            {feature.title}
                                        </h3>
                                        <p className="text-muted mb-6 leading-relaxed">
                                            {feature.description}
                                        </p>

                                        {/* Link */}
                                        <div className={`flex items-center gap-2 ${colorClasses[feature.color].linkText} font-semibold`}>
                                            <span>{t('home.startLink')}</span>
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

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
