import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
    Home, Aperture, Film, Wand2, Clock, Cog, Shield,
    LogOut, User, Crown, ChevronRight, Lock, Sparkles, Zap, Scissors
} from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function Sidebar() {
    const { user, logout } = useAuth();
    const { t } = useLanguage();
    const location = useLocation();
    const [hoveredLink, setHoveredLink] = useState(null);

    const links = [
        { name: t('nav.home'),     path: '/',          icon: Home    },
        { name: t('nav.photo'),    path: '/photo',     icon: Aperture },
        { name: t('nav.video'),    path: '/video',     icon: Film    },
        { name: 'AI Enhance',      path: '/enhance',   icon: Wand2   },
        { name: t('nav.bgRemove'), path: '/bg-remove', icon: Scissors },
        { name: t('nav.history'),  path: '/history',   icon: Clock   },
        { name: t('nav.settings'), path: '/settings',  icon: Cog     },
    ];

    if (user?.role === 'ADMIN') {
        links.push({ name: t('nav.admin'), path: '/admin', icon: Shield });
    }

    const isActive = (path) => {
        if (path === '/' && location.pathname === '/') return true;
        if (path !== '/' && location.pathname.startsWith(path)) return true;
        return false;
    };

    const getRoleBadge = (role) => {
        switch (role) {
            case 'ADMIN': return 'bg-danger/20 text-danger border-danger/30';
            case 'PRO': return 'bg-accent/20 text-accent border-accent/30';
            case 'STUDENT': return 'bg-secondary/20 text-secondary border-secondary/30';
            default: return 'bg-primary/20 text-primary border-primary/30';
        }
    };

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 z-50">
                {/* Glass Background */}
                <div className="absolute inset-0 bg-surface/80 backdrop-blur-2xl border-r border-white/[0.08]" />

                {/* Decorative Gradient */}
                <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

                <div className="relative flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6">
                        <Link to="/" className="flex items-center gap-4 group">
                            <div className="relative">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-white/10 group-hover:border-primary/30 transition-all duration-300 shadow-lg shadow-primary/10">
                                    <img
                                        src="/LogoAndProFoto/ayu_logo.png"
                                        alt="Logo"
                                        className="w-9 h-9 object-contain group-hover:scale-110 transition-transform duration-300"
                                    />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-success to-emerald-400 rounded-lg flex items-center justify-center shadow-lg shadow-success/30">
                                    <Zap className="w-3 h-3 text-white" />
                                </div>
                            </div>
                            <div>
                                <h1 className="font-display text-xl font-semibold text-gradient">ColorizeX</h1>
                                <p className="text-[10px] text-muted font-mono tracking-widest">AYU.COLORIZE</p>
                            </div>
                        </Link>
                    </div>

                    {/* Divider */}
                    <div className="mx-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                        {links.map((link) => {
                            const active = isActive(link.path);
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onMouseEnter={() => setHoveredLink(link.path)}
                                    onMouseLeave={() => setHoveredLink(null)}
                                    className={`
                                        relative flex items-center gap-3 px-4 py-3 rounded-xl
                                        transition-all duration-300 group
                                        ${active
                                            ? 'text-foreground'
                                            : 'text-muted hover:text-foreground'
                                        }
                                    `}
                                >
                                    {/* Active Background */}
                                    {active && (
                                        <motion.div
                                            layoutId="sidebar-active-bg"
                                            className="absolute inset-0 bg-gradient-to-r from-primary/15 to-accent/10 rounded-xl border border-primary/20"
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        />
                                    )}

                                    {/* Hover Background */}
                                    {!active && hoveredLink === link.path && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 bg-white/[0.03] rounded-xl"
                                        />
                                    )}

                                    {/* Active Indicator */}
                                    {active && (
                                        <motion.div
                                            layoutId="sidebar-indicator"
                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-r-full shadow-lg shadow-primary/50"
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        />
                                    )}

                                    <div className={`
                                        relative w-9 h-9 rounded-xl flex items-center justify-center
                                        transition-all duration-300
                                        ${active
                                            ? 'bg-gradient-to-br from-primary to-accent text-white shadow-lg shadow-primary/30'
                                            : 'bg-white/[0.05] group-hover:bg-white/[0.08]'
                                        }
                                    `}>
                                        <link.icon className="w-[18px] h-[18px]" />
                                    </div>

                                    <span className="relative font-medium text-sm flex-1">{link.name}</span>

                                    <ChevronRight className={`
                                        w-4 h-4 transition-all duration-300
                                        ${active || hoveredLink === link.path
                                            ? 'opacity-100 translate-x-0'
                                            : 'opacity-0 -translate-x-2'
                                        }
                                    `} />
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Section */}
                    <div className="p-4">
                        {user ? (
                            <div className="space-y-4">
                                {/* User Card */}
                                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-white/10">
                                            <User className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{user.email.split('@')[0]}</p>
                                            <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold rounded-md border ${getRoleBadge(user.role)}`}>
                                                {user.role}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Credits */}
                                    <div className="p-3 rounded-xl bg-background/50 border border-white/[0.05]">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] text-muted font-mono uppercase tracking-wider">{t('common.credits')}</span>
                                            <span className="text-lg font-display font-bold text-gradient">{user.credits}</span>
                                        </div>
                                        <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-primary via-accent to-secondary rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min((user.credits / (user.role === 'ADMIN' ? 1000 : user.role === 'PRO' ? 100 : 10)) * 100, 100)}%` }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Upgrade Button */}
                                {(user.role === 'USER' || user.role === 'STUDENT') && (
                                    <Link
                                        to="/plans"
                                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-accent/20 to-primary/20 border border-accent/30 text-accent hover:from-accent/30 hover:to-primary/30 transition-all group"
                                    >
                                        <Crown className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                        <span className="font-semibold text-sm">{t('nav.upgrade')}</span>
                                        <Sparkles className="w-3 h-3 opacity-60" />
                                    </Link>
                                )}

                                {/* Logout */}
                                <button
                                    onClick={logout}
                                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-muted hover:text-danger hover:bg-danger/10 transition-all text-sm"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>{t('common.logout')}</span>
                                </button>
                            </div>
                        ) : (
                            <Link to="/login" className="btn-primary w-full flex items-center justify-center gap-2">
                                <Lock className="w-4 h-4" />
                                {t('common.login')}
                            </Link>
                        )}
                    </div>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe">
                <div className="mx-4 mb-4 p-2 rounded-2xl bg-surface/90 backdrop-blur-2xl border border-white/10 shadow-2xl">
                    <div className="flex items-center justify-around">
                        {links.slice(0, 5).map((link) => {
                            const active = isActive(link.path);
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`
                                        relative flex flex-col items-center gap-1 p-2 rounded-xl min-w-[56px]
                                        transition-all duration-300
                                        ${active ? 'text-primary' : 'text-muted'}
                                    `}
                                >
                                    {active && (
                                        <motion.div
                                            layoutId="mobile-nav-bg"
                                            className="absolute inset-0 bg-primary/10 rounded-xl"
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                    <div className="relative">
                                        <link.icon className="w-5 h-5" />
                                    </div>
                                    <span className="text-[9px] font-medium">{link.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </nav>
        </>
    );
}
