import { useState } from 'react';
import { Check, X, Zap, Crown, Star, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import PaymentModal from '../components/PaymentModal';
import api from '../lib/axios';

const planColorClasses = {
    muted: {
        glow: 'bg-muted/20',
        iconBg: 'from-muted/20 to-muted/5 border-muted/20',
        iconText: 'text-muted',
    },
    primary: {
        glow: 'bg-primary/20',
        iconBg: 'from-primary/20 to-primary/5 border-primary/20',
        iconText: 'text-primary',
    },
    accent: {
        glow: 'bg-accent/20',
        iconBg: 'from-accent/20 to-accent/5 border-accent/20',
        iconText: 'text-accent',
    },
};

export default function Plans() {
    const { user, refreshUser } = useAuth();
    const { t } = useLanguage();
    const [selectedPlan, setSelectedPlan] = useState(null);

    const handleUpgrade = (plan) => setSelectedPlan(plan);

    const handlePaymentSuccess = async () => {
        await refreshUser();
        setSelectedPlan(null);
        alert(t('plans.paymentSuccess').replace('{plan}', selectedPlan));
    };

    const handleCancelSubscription = async () => {
        if (!confirm(t('plans.confirmCancel'))) return;
        try {
            await api.post('/auth/cancel-subscription');
            alert(t('common.success'));
            window.location.reload();
        } catch (error) {
            alert(error.response?.data?.detail || t('common.error'));
        }
    };

    const plans = [
        {
            id: 'free',
            name: t('plans.free'),
            price: '₺0',
            period: t('plans.perMonth'),
            icon: Star,
            color: 'muted',
            current: user?.role === 'USER' || user?.role === 'STUDENT',
            features: [
                { name: t('plans.features.standardSpeed'), included: true },
                { name: t('plans.features.cpuOnly'), included: true },
                { name: t('plans.features.maxRes'), included: true },
                { name: t('plans.freeFeatureLimit'), included: true },
                { name: t('plans.features.noBatch'), included: false },
            ]
        },
        {
            id: 'pro',
            name: t('plans.pro'),
            price: '₺299',
            period: t('plans.perMonth'),
            icon: Zap,
            color: 'primary',
            popular: true,
            current: user?.role === 'PRO',
            features: [
                { name: t('plans.features.turboSpeed'), included: true },
                { name: t('plans.features.gpuAccel'), included: true },
                { name: t('plans.features.fullRes'), included: true },
                { name: 'Sınırsız işlem', included: true },
                { name: t('plans.features.prioritySupport'), included: true },
            ]
        },
        {
            id: 'enterprise',
            name: t('plans.enterprise'),
            price: t('plans.custom'),
            period: '',
            icon: Crown,
            color: 'accent',
            current: user?.role === 'ADMIN',
            features: [
                { name: t('plans.features.everythingPro'), included: true },
                { name: t('plans.features.apiAccess'), included: true },
                { name: t('plans.features.batchProcess'), included: true },
                { name: t('plans.features.customModels'), included: true },
                { name: t('plans.features.slaSupport'), included: true },
            ]
        }
    ];

    return (
        <div className="min-h-screen relative flex items-center justify-center">
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="orb orb-primary w-[600px] h-[600px] top-0 left-1/4 opacity-20" />
                <div className="orb orb-accent w-[500px] h-[500px] bottom-0 right-1/4 opacity-15" />
            </div>

            <div className="relative z-10 p-6 lg:p-8 w-full max-w-6xl mx-auto">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-sm mb-6">
                        <Sparkles className="w-4 h-4 text-accent" />
                        <span className="text-sm font-medium">Basit, şeffaf fiyatlandırma</span>
                    </div>
                    <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">{t('plans.title')}</h1>
                    <p className="text-muted text-lg max-w-xl mx-auto">{t('plans.subtitle')}</p>
                </motion.div>

                {/* Plans Grid */}
                <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                    {plans.map((plan, index) => (
                        <motion.div
                            key={plan.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`relative card overflow-hidden ${plan.popular ? 'border-primary/50 shadow-glow' : ''} ${plan.current ? 'ring-2 ring-primary/30' : ''}`}
                        >
                            {/* Popular Badge */}
                            {plan.popular && (
                                <div className="absolute -top-px left-1/2 -translate-x-1/2">
                                    <div className="px-4 py-1.5 rounded-b-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-bold uppercase tracking-wider">
                                        {t('plans.mostPopular')}
                                    </div>
                                </div>
                            )}

                            {/* Current Badge */}
                            {plan.current && (
                                <div className="absolute top-4 right-4">
                                    <span className="px-2 py-1 rounded-lg bg-success/20 text-success text-xs font-bold">Mevcut</span>
                                </div>
                            )}

                            {/* Glow */}
                            <div className={`absolute -top-20 -right-20 w-40 h-40 ${planColorClasses[plan.color].glow} rounded-full blur-[80px] opacity-50`} />

                            <div className="relative pt-8">
                                {/* Icon */}
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${planColorClasses[plan.color].iconBg} flex items-center justify-center mb-6 shadow-lg`}>
                                    <plan.icon className={`w-7 h-7 ${planColorClasses[plan.color].iconText}`} />
                                </div>

                                {/* Name & Price */}
                                <h3 className="font-display text-2xl font-bold mb-2">{plan.name}</h3>
                                <div className="flex items-baseline gap-1 mb-6">
                                    <span className="font-display text-4xl font-bold">{plan.price}</span>
                                    {plan.period && <span className="text-muted">{plan.period}</span>}
                                </div>

                                {/* Features */}
                                <div className="space-y-3 mb-8">
                                    {plan.features.map((feature, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            {feature.included ? (
                                                <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <Check className="w-3 h-3 text-success" />
                                                </div>
                                            ) : (
                                                <div className="w-5 h-5 rounded-full bg-danger/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <X className="w-3 h-3 text-danger/50" />
                                                </div>
                                            )}
                                            <span className={`text-sm ${feature.included ? 'text-foreground' : 'text-muted'}`}>{feature.name}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* CTA */}
                                <button
                                    onClick={() => {
                                        if (plan.current && plan.id === 'pro') handleCancelSubscription();
                                        else if (!plan.current) {
                                            if (plan.id === 'free') handleCancelSubscription();
                                            else if (plan.id === 'pro') handleUpgrade('PRO');
                                            else alert(t('plans.contactSales'));
                                        }
                                    }}
                                    disabled={plan.current && plan.id !== 'pro'}
                                    className={`w-full py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                                        plan.current
                                            ? plan.id === 'pro'
                                                ? 'bg-danger/10 text-danger hover:bg-danger/20'
                                                : 'bg-white/[0.03] text-muted cursor-default'
                                            : plan.popular
                                                ? 'btn-primary'
                                                : 'btn-secondary'
                                    }`}
                                >
                                    {plan.current
                                        ? plan.id === 'pro'
                                            ? t('plans.cancelSubscription')
                                            : t('plans.currentPlan')
                                        : plan.id === 'free'
                                            ? t('plans.downgrade')
                                            : (
                                                <>
                                                    {t('plans.upgradeNow')}
                                                    <ArrowRight className="w-4 h-4" />
                                                </>
                                            )
                                    }
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Footer */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-16 text-center">
                    <p className="text-muted text-sm">{t('plans.guarantee')}</p>
                </motion.div>
            </div>

            {/* Payment Modal */}
            <AnimatePresence>
                {selectedPlan && <PaymentModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} onSuccess={handlePaymentSuccess} />}
            </AnimatePresence>
        </div>
    );
}
