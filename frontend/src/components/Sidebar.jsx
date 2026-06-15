import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
    Home, Aperture, Film, Wand2, Clock, Cog, Shield,
    LogOut, User, Crown, ChevronRight, Lock, Sparkles, Zap,
    Scissors, Eraser, Wrench
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Nav groups ────────────────────────────────────────────────────────────────
const useNavGroups = (t, userRole) => {
    const groups = [
        {
            id: 'home',
            label: null, // no label for home
            items: [
                { name: t('nav.home'), path: '/', icon: Home, color: 'from-primary/25 to-primary/5' },
            ],
        },
        {
            id: 'tools',
            label: 'AI Tools',
            items: [
                { name: t('nav.photo'),    path: '/photo',     icon: Aperture, color: 'from-accent/25 to-accent/5'     },
                { name: t('nav.video'),    path: '/video',     icon: Film,     color: 'from-secondary/25 to-secondary/5' },
                { name: 'Enhance',         path: '/enhance',   icon: Wand2,    color: 'from-primary/25 to-primary/5'   },
                { name: t('nav.bgRemove'), path: '/bg-remove', icon: Scissors, color: 'from-success/25 to-success/5'   },
                { name: t('nav.inpaint'),        path: '/inpaint',         icon: Eraser,   color: 'from-accent/25 to-accent/5'   },
                { name: t('nav.damageRestore'), path: '/damage-restore',  icon: Wrench,   color: 'from-warning/25 to-warning/5' },
            ],
        },
        {
            id: 'library',
            label: 'Library',
            items: [
                { name: t('nav.history'),  path: '/history',  icon: Clock, color: 'from-secondary/25 to-secondary/5' },
            ],
        },
        {
            id: 'account',
            label: 'Account',
            items: [
                { name: t('nav.settings'), path: '/settings', icon: Cog,    color: 'from-primary/25 to-primary/5' },
                ...(userRole === 'ADMIN'
                    ? [{ name: 'Admin', path: '/admin', icon: Shield, color: 'from-danger/25 to-danger/5' }]
                    : []),
            ],
        },
    ];
    return groups;
};

// ─── NavItem ───────────────────────────────────────────────────────────────────
function NavItem({ link, active, hovered, onEnter, onLeave }) {
    return (
        <Link
            to={link.path}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                active ? 'text-foreground' : 'text-muted hover:text-foreground'
            }`}
        >
            {/* Active pill background */}
            {active && (
                <motion.div
                    layoutId="sidebar-active-bg"
                    className="absolute inset-0 bg-gradient-to-r from-primary/12 to-accent/8 rounded-xl border border-primary/20"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
            )}

            {/* Hover background */}
            {!active && hovered && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/[0.025] rounded-xl"
                />
            )}

            {/* Left indicator bar */}
            {active && (
                <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-primary to-accent rounded-r-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
            )}

            {/* Icon box */}
            <div className={`relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${
                active
                    ? `bg-gradient-to-br ${link.color} border border-white/10`
                    : 'bg-white/[0.04] group-hover:bg-white/[0.07]'
            }`}>
                <link.icon className={`w-4 h-4 ${active ? 'opacity-100' : 'opacity-60 group-hover:opacity-90'}`} />
            </div>

            {/* Label */}
            <span className="relative text-sm font-medium flex-1 truncate">{link.name}</span>

            {/* Chevron */}
            <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-all duration-200 ${
                active || hovered ? 'opacity-60 translate-x-0' : 'opacity-0 -translate-x-1'
            }`} />
        </Link>
    );
}

// ─── Group label ───────────────────────────────────────────────────────────────
function GroupLabel({ label }) {
    return (
        <div className="flex items-center gap-2 px-3 pt-4 pb-1.5">
            <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.18em] text-muted/40 whitespace-nowrap">
                {label}
            </span>
            <div className="flex-1 h-px bg-white/[0.05]" />
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Sidebar() {
    const { user, logout } = useAuth();
    const { t } = useLanguage();
    const location = useLocation();
    const [hovered, setHovered] = useState(null);

    const groups = useNavGroups(t, user?.role);
    const allLinks = groups.flatMap(g => g.items);

    const isActive = (path) => {
        if (path === '/' && location.pathname === '/') return true;
        if (path !== '/' && location.pathname.startsWith(path)) return true;
        return false;
    };

    const getRoleBadge = (role) => {
        const map = {
            ADMIN:   'bg-danger/15 text-danger border-danger/25',
            PRO:     'bg-accent/15 text-accent border-accent/25',
            STUDENT: 'bg-secondary/15 text-secondary border-secondary/25',
        };
        return map[role] ?? 'bg-primary/15 text-primary border-primary/25';
    };

    return (
        <>
            {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
            <aside className="hidden md:flex flex-col w-60 h-screen fixed left-0 top-0 z-50">
                {/* Glass background */}
                <div className="absolute inset-0 bg-surface/85 backdrop-blur-2xl border-r border-white/[0.07]" />
                {/* Top gradient decoration */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/4 to-transparent pointer-events-none" />

                <div className="relative flex flex-col h-full">

                    {/* ── Logo ── */}
                    <div className="px-4 pt-5 pb-4">
                        <Link to="/" className="flex items-center gap-3 group">
                            <div className="relative shrink-0">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-white/10 group-hover:border-primary/30 transition-all duration-300">
                                    <img
                                        src="/LogoAndProFoto/ayu_logo.png"
                                        alt="Logo"
                                        className="w-6 h-6 object-contain group-hover:scale-110 transition-transform duration-300"
                                    />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-success to-emerald-400 rounded-md flex items-center justify-center">
                                    <Zap className="w-2.5 h-2.5 text-white" />
                                </div>
                            </div>
                            <div className="min-w-0">
                                <h1 className="font-display text-lg font-semibold text-gradient leading-tight">ColorizeX</h1>
                                <p className="text-[9px] text-muted/60 font-mono tracking-widest">AYU.COLORIZE</p>
                            </div>
                        </Link>
                    </div>

                    {/* ── Divider ── */}
                    <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

                    {/* ── Navigation ── */}
                    <nav className="flex-1 px-3 overflow-y-auto scrollbar-none">
                        {groups.map((group) => (
                            <div key={group.id}>
                                {group.label && <GroupLabel label={group.label} />}
                                <div className={group.label ? 'space-y-0.5' : 'pt-3 space-y-0.5'}>
                                    {group.items.map((link) => (
                                        <NavItem
                                            key={link.path}
                                            link={link}
                                            active={isActive(link.path)}
                                            hovered={hovered === link.path}
                                            onEnter={() => setHovered(link.path)}
                                            onLeave={() => setHovered(null)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>

                    {/* ── User section ── */}
                    <div className="p-3 mt-auto">
                        {user ? (
                            <div className="space-y-2">
                                {/* User card */}
                                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                                    {/* Avatar + name */}
                                    <div className="flex items-center gap-2.5 mb-3">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-white/10 shrink-0">
                                            <User className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate leading-tight">{user.email.split('@')[0]}</p>
                                            <span className={`inline-flex items-center px-1.5 py-px text-[8px] font-bold rounded border ${getRoleBadge(user.role)}`}>
                                                {user.role}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Credits */}
                                    <div className="px-2.5 py-2 rounded-xl bg-background/40 border border-white/[0.04]">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[9px] text-muted/70 font-mono uppercase tracking-wider">{t('common.credits')}</span>
                                            <span className="text-base font-display font-bold text-gradient">{user.credits}</span>
                                        </div>
                                        <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-primary via-accent to-secondary rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min((user.credits / (user.role === 'ADMIN' ? 1000 : user.role === 'PRO' ? 100 : 10)) * 100, 100)}%` }}
                                                transition={{ duration: 1, ease: 'easeOut' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Upgrade button (free/student only) */}
                                {(user.role === 'USER' || user.role === 'STUDENT') && (
                                    <Link
                                        to="/plans"
                                        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-gradient-to-r from-accent/15 to-primary/15 border border-accent/25 text-accent hover:from-accent/25 hover:to-primary/25 transition-all text-xs font-semibold group"
                                    >
                                        <Crown className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                                        {t('nav.upgrade')}
                                        <Sparkles className="w-3 h-3 opacity-50" />
                                    </Link>
                                )}

                                {/* Logout */}
                                <button
                                    onClick={logout}
                                    className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-muted/70 hover:text-danger hover:bg-danger/8 transition-all text-xs"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    {t('common.logout')}
                                </button>
                            </div>
                        ) : (
                            <Link to="/login" className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                                <Lock className="w-4 h-4" />
                                {t('common.login')}
                            </Link>
                        )}
                    </div>
                </div>
            </aside>

            {/* ── Mobile Bottom Navigation ──────────────────────────────────── */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
                <div className="mx-3 mb-3 px-2 py-1.5 rounded-2xl bg-surface/95 backdrop-blur-2xl border border-white/[0.09] shadow-2xl">
                    <div className="flex items-center justify-around">
                        {/* Show Home + first 3 tools + History */}
                        {[allLinks[0], allLinks[1], allLinks[2], allLinks[3], allLinks[7]].filter(Boolean).map((link) => {
                            const active = isActive(link.path);
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`relative flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl min-w-[52px] transition-all duration-200 ${
                                        active ? 'text-primary' : 'text-muted/60'
                                    }`}
                                >
                                    {active && (
                                        <motion.div
                                            layoutId="mobile-nav-bg"
                                            className="absolute inset-0 bg-primary/10 rounded-xl"
                                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                    <link.icon className="relative w-5 h-5" />
                                    <span className="relative text-[8px] font-medium truncate max-w-[48px] text-center">{link.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </nav>
        </>
    );
}
