import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Users,
    Activity,
    Settings,
    LogOut,
    Shield,
    ChevronLeft,
    Menu,
    X,
    Sparkles,
    Home
} from 'lucide-react';

const ADMIN_LINK_CONFIGS = [
    { nameKey: 'admin.nav.dashboard', path: '/admin',          icon: LayoutDashboard },
    { nameKey: 'admin.nav.users',     path: '/admin/users',    icon: Users           },
    { nameKey: 'admin.nav.jobs',      path: '/admin/jobs',     icon: Activity        },
    { nameKey: 'admin.nav.settings',  path: '/admin/settings', icon: Settings        },
];

function SidebarContent({ isActive, sidebarCollapsed, setMobileOpen, user, logout }) {
    const { t } = useLanguage();
    const ADMIN_LINKS = ADMIN_LINK_CONFIGS.map((c) => ({ ...c, name: t(c.nameKey) }));
    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-[rgb(var(--color-border))]">
                <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-secondary))] flex items-center justify-center shadow-lg" style={{ boxShadow: '0 4px 20px rgb(var(--color-primary) / 0.3)' }}>
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[rgb(var(--color-success))] rounded-full border-2 border-[rgb(var(--color-surface))]" />
                    </div>
                    {!sidebarCollapsed && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <h1 className="font-display text-lg font-bold text-gradient">Admin</h1>
                            <p className="text-[11px] text-[rgb(var(--color-text-muted))] flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                {t('admin.nav.adminMode')}
                            </p>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 p-3 space-y-1.5 overflow-y-auto">
                {ADMIN_LINKS.map((link) => {
                    const active = isActive(link.path);
                    return (
                        <Link
                            key={link.path}
                            to={link.path}
                            onClick={() => setMobileOpen(false)}
                            className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 ${
                                active
                                    ? 'bg-[rgb(var(--color-primary)/0.12)] text-[rgb(var(--color-primary))]'
                                    : 'text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text))] hover:bg-[rgb(var(--color-surface-elevated)/0.5)]'
                            } ${sidebarCollapsed ? 'justify-center' : ''}`}
                        >
                            {active && (
                                <motion.div
                                    layoutId="admin-nav-indicator"
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-full bg-gradient-to-b from-[rgb(var(--color-primary))] to-[rgb(var(--color-secondary))]"
                                />
                            )}
                            <div className={`flex-shrink-0 p-2 rounded-lg transition-all duration-300 ${
                                active
                                    ? 'bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-secondary))] text-white shadow-lg'
                                    : 'bg-[rgb(var(--color-surface-elevated)/0.4)] group-hover:bg-[rgb(var(--color-surface-elevated)/0.8)]'
                            }`} style={active ? { boxShadow: '0 4px 16px rgb(var(--color-primary) / 0.3)' } : {}}>
                                <link.icon className="w-[18px] h-[18px]" />
                            </div>
                            {!sidebarCollapsed && (
                                <span className="font-medium text-sm">{link.name}</span>
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* User Info & Footer */}
            <div className="p-3 border-t border-[rgb(var(--color-border))] space-y-2">
                {/* Back to App */}
                <Link
                    to="/"
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text))] hover:bg-[rgb(var(--color-surface-elevated)/0.5)] transition-all ${sidebarCollapsed ? 'justify-center' : ''}`}
                >
                    <div className="p-2 rounded-lg bg-[rgb(var(--color-surface-elevated)/0.4)] group-hover:bg-[rgb(var(--color-surface-elevated)/0.8)] transition-colors">
                        <Home className="w-[18px] h-[18px]" />
                    </div>
                    {!sidebarCollapsed && <span className="text-sm font-medium">Ana Sayfa</span>}
                </Link>

                {/* User */}
                {!sidebarCollapsed && user && (
                    <div className="px-3 py-2.5 rounded-xl bg-[rgb(var(--color-surface-elevated)/0.3)]">
                        <p className="text-xs text-[rgb(var(--color-text-muted))] truncate">{user.email}</p>
                        <p className="text-[10px] text-[rgb(var(--color-primary))] font-medium mt-0.5">{user.role}</p>
                    </div>
                )}

                {/* Logout */}
                <button
                    onClick={logout}
                    className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[rgb(var(--color-danger))] hover:bg-[rgb(var(--color-danger)/0.1)] transition-all ${sidebarCollapsed ? 'justify-center' : ''}`}
                >
                    <div className="p-2 rounded-lg bg-[rgb(var(--color-danger)/0.1)] group-hover:bg-[rgb(var(--color-danger)/0.15)] transition-colors">
                        <LogOut className="w-[18px] h-[18px]" />
                    </div>
                    {!sidebarCollapsed && <span className="text-sm font-medium">{t('common.logout')}</span>}
                </button>
            </div>
        </div>
    );
}

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const isActive = (path) => {
        if (path === '/admin' && location.pathname === '/admin') return true;
        if (path !== '/admin' && location.pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <div className="flex min-h-screen bg-[rgb(var(--color-background))] text-[rgb(var(--color-text))]">
            {/* Background Orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="orb orb-primary w-[500px] h-[500px] -top-64 -left-64 opacity-20" />
                <div className="orb orb-secondary w-[400px] h-[400px] bottom-0 right-0 opacity-15" />
                <div className="orb orb-accent w-[300px] h-[300px] top-1/2 left-1/3 opacity-10" />
            </div>

            {/* Desktop Sidebar */}
            <motion.div
                animate={{ width: sidebarCollapsed ? 80 : 272 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="hidden lg:block fixed h-full z-40 p-3"
            >
                <div className="h-full card !rounded-2xl overflow-hidden relative">
                    <SidebarContent isActive={isActive} sidebarCollapsed={sidebarCollapsed} setMobileOpen={setMobileOpen} user={user} logout={logout} />
                    {/* Collapse Button */}
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="absolute top-5 -right-3 w-6 h-6 rounded-full bg-[rgb(var(--color-surface-elevated))] border border-[rgb(var(--color-border))] flex items-center justify-center text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text))] hover:border-[rgb(var(--color-primary)/0.3)] transition-all shadow-lg z-50"
                    >
                        <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </motion.div>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-40 p-3">
                <div className="card !rounded-xl !p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-secondary))] flex items-center justify-center">
                            <Shield className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-display text-sm font-bold text-gradient">Admin Panel</span>
                    </div>
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="p-2 rounded-lg bg-[rgb(var(--color-surface-elevated)/0.5)] text-[rgb(var(--color-text-muted))]"
                    >
                        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                            onClick={() => setMobileOpen(false)}
                        />
                        <motion.div
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="lg:hidden fixed left-0 top-0 bottom-0 w-[272px] z-50 p-3"
                        >
                            <div className="h-full card !rounded-2xl overflow-hidden">
                                <SidebarContent isActive={isActive} sidebarCollapsed={sidebarCollapsed} setMobileOpen={setMobileOpen} user={user} logout={logout} />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <motion.div
                animate={{ marginLeft: sidebarCollapsed ? 80 : 272 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="flex-1 hidden lg:block"
            >
                <div className="p-6 lg:p-8 relative z-10">
                    <Outlet />
                </div>
            </motion.div>

            {/* Mobile Content */}
            <div className="flex-1 lg:hidden">
                <div className="p-4 pt-20 relative z-10">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
