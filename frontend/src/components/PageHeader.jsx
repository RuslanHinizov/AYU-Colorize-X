import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

/**
 * Shared page header used by all tool pages.
 *
 * Props:
 *   icon       — Lucide icon component (rendered as element)
 *   title      — Page title string
 *   subtitle   — Short description (optional)
 *   badge      — Small badge label, e.g. "AI" (optional)
 *   backTo     — Override back link path (default "/")
 *   backLabel  — Override back link label
 *   gradient   — "primary" | "accent" | "secondary" | "success" | "warning" | "danger"
 *   right      — Right slot JSX (optional)
 */

const gradientMap = {
    primary:   'from-primary/30 to-primary/8',
    accent:    'from-accent/30 to-accent/8',
    secondary: 'from-secondary/30 to-secondary/8',
    success:   'from-success/30 to-success/8',
    warning:   'from-warning/30 to-warning/8',
    danger:    'from-danger/30 to-danger/8',
};

const borderMap = {
    primary:   'border-primary/20',
    accent:    'border-accent/20',
    secondary: 'border-secondary/20',
    success:   'border-success/20',
    warning:   'border-warning/20',
    danger:    'border-danger/20',
};

const glowMap = {
    primary:   'shadow-primary/20',
    accent:    'shadow-accent/20',
    secondary: 'shadow-secondary/20',
    success:   'shadow-success/20',
    warning:   'shadow-warning/20',
    danger:    'shadow-danger/20',
};

const badgeMap = {
    primary:   'bg-primary/15 text-primary border-primary/25',
    accent:    'bg-accent/15 text-accent border-accent/25',
    secondary: 'bg-secondary/15 text-secondary border-secondary/25',
    success:   'bg-success/15 text-success border-success/25',
    warning:   'bg-warning/15 text-warning border-warning/25',
    danger:    'bg-danger/15 text-danger border-danger/25',
};

export default function PageHeader({
    icon,
    title,
    subtitle,
    badge,
    backTo = '/',
    backLabel = 'Home',
    gradient = 'primary',
    right,
}) {
    const grad  = gradientMap[gradient] ?? gradientMap.primary;
    const bord  = borderMap[gradient]  ?? borderMap.primary;
    const glow  = glowMap[gradient]    ?? glowMap.primary;
    const badgeCls = badgeMap[gradient] ?? badgeMap.primary;

    return (
        <div className="flex items-start gap-4 mb-6">
            {/* Back link + icon column */}
            <div className="flex flex-col items-center gap-3 shrink-0">
                <Link
                    to={backTo}
                    className="flex items-center gap-1 text-muted/60 hover:text-foreground transition-colors text-xs group"
                >
                    <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    <span>{backLabel}</span>
                </Link>

                {/* Icon box */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${grad} border ${bord} flex items-center justify-center shadow-lg ${glow}`}>
                    {icon}
                </div>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0 pt-7">
                <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-display text-2xl font-bold text-gradient leading-tight">{title}</h1>
                    {badge && (
                        <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeCls}`}>
                            {badge}
                        </span>
                    )}
                </div>
                {subtitle && (
                    <p className="text-muted text-sm mt-0.5">{subtitle}</p>
                )}
            </div>

            {/* Right slot */}
            {right && (
                <div className="shrink-0 pt-7">{right}</div>
            )}
        </div>
    );
}
