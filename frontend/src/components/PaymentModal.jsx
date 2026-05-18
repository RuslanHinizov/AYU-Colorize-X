import { useEffect, useRef, useState } from 'react';
import { CheckCircle, CreditCard, Shield, Sparkles, X } from 'lucide-react';
import axios from '../lib/axios';
import { motion, AnimatePresence } from 'framer-motion';

let stripePromise;

function loadStripeJs() {
    if (window.Stripe) return Promise.resolve(window.Stripe);
    if (!stripePromise) {
        stripePromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.async = true;
            script.onload = () => resolve(window.Stripe);
            script.onerror = () => reject(new Error('Stripe.js yuklenemedi'));
            document.head.appendChild(script);
        });
    }
    return stripePromise;
}

export default function PaymentModal({ plan, onClose, onSuccess }) {
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState('confirm');
    const [error, setError] = useState('');
    const [cardReady, setCardReady] = useState(false);
    const stripeRef = useRef(null);
    const elementsRef = useRef(null);
    const cardRef = useRef(null);
    const cardMountRef = useRef(null);

    useEffect(() => {
        let cancelled = false;

        async function setupStripe() {
            try {
                const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
                if (!publishableKey) {
                    setError('Stripe publishable key ayarli degil.');
                    return;
                }

                const Stripe = await loadStripeJs();
                if (cancelled) return;

                stripeRef.current = Stripe(publishableKey);
                elementsRef.current = stripeRef.current.elements();
                cardRef.current = elementsRef.current.create('card', {
                    style: {
                        base: {
                            color: '#ffffff',
                            fontFamily: 'Inter, system-ui, sans-serif',
                            fontSize: '16px',
                            '::placeholder': { color: 'rgba(255,255,255,0.45)' },
                        },
                        invalid: { color: '#f87171' },
                    },
                });
                cardRef.current.mount(cardMountRef.current);
                cardRef.current.on('ready', () => setCardReady(true));
                cardRef.current.on('change', (event) => setError(event.error?.message || ''));
            } catch (err) {
                setError(err.message || 'Stripe baslatilamadi.');
            }
        }

        setupStripe();

        return () => {
            cancelled = true;
            if (cardRef.current) {
                cardRef.current.destroy();
                cardRef.current = null;
            }
        };
    }, []);

    const handleUpgrade = async () => {
        setIsLoading(true);
        setError('');

        try {
            if (!stripeRef.current || !cardRef.current || !cardReady) {
                throw new Error('Stripe odeme formu hazir degil.');
            }

            const intent = await axios.post('/payments/create-payment-intent', { plan });
            const result = await stripeRef.current.confirmCardPayment(intent.data.clientSecret, {
                payment_method: { card: cardRef.current },
            });

            if (result.error) {
                throw new Error(result.error.message);
            }
            if (!result.paymentIntent?.id) {
                throw new Error('Stripe odeme sonucu dogrulanamadi.');
            }

            await axios.post('/payments/confirm-payment', {
                payment_intent_id: result.paymentIntent.id,
            });

            setStep('success');
            setTimeout(() => { onSuccess(); }, 1500);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || err.message || 'Odeme basarisiz. Lutfen tekrar deneyin.');
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-violet-500/20 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative glass-card border border-white/10 rounded-3xl w-full max-w-md p-8 overflow-hidden"
            >
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-xl hover:bg-white/5 transition-colors z-10"
                >
                    <X className="w-5 h-5 text-white/40 hover:text-white transition-colors" />
                </button>

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30 mb-4">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="font-display text-3xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                        {plan} Planina Yukselt
                    </h2>
                </div>

                <AnimatePresence mode="wait">
                    {step === 'confirm' && (
                        <motion.div
                            key="confirm"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                        >
                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                                    {error}
                                </div>
                            )}

                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                                <div className="flex items-center gap-3">
                                    <Shield className="w-5 h-5 text-violet-400" />
                                    <span className="text-white/80 text-sm font-medium">Plan Detaylari</span>
                                </div>
                                <p className="text-white/50 text-sm leading-relaxed">
                                    <strong className="text-white/70">{plan}</strong> planina yukseltmek uzeresiniz.
                                    Odeme Stripe test modu ile guvenli sekilde alinacak.
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                                <div className="flex items-center gap-3">
                                    <CreditCard className="w-5 h-5 text-violet-400" />
                                    <span className="text-white/80 text-sm font-medium">Kart Bilgileri</span>
                                </div>
                                <div ref={cardMountRef} className="min-h-[44px] rounded-xl bg-black/20 border border-white/10 px-4 py-3" />
                                <p className="text-xs text-white/40">Stripe test karti: 4242 4242 4242 4242</p>
                            </div>

                            <button
                                onClick={handleUpgrade}
                                disabled={isLoading || !cardReady}
                                className="group relative w-full py-4 rounded-2xl font-bold text-white overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />
                                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <span className="relative">{isLoading ? 'Odeme isleniyor...' : 'Stripe ile Ode'}</span>
                            </button>

                            <button
                                onClick={onClose}
                                className="w-full py-3 text-white/40 hover:text-white/60 transition-colors text-sm"
                            >
                                Vazgec
                            </button>
                        </motion.div>
                    )}

                    {step === 'processing' && (
                        <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-16 space-y-6">
                            <div className="relative">
                                <div className="w-20 h-20 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
                                <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-b-fuchsia-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-bold text-white animate-pulse">Odeme isleniyor...</p>
                                <p className="text-sm text-white/40 mt-2">Lutfen bu pencereyi kapatmayin</p>
                            </div>
                        </motion.div>
                    )}

                    {step === 'success' && (
                        <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-16 space-y-6">
                            <div className="relative">
                                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                                    <CheckCircle className="w-10 h-10 text-white" />
                                </div>
                                <div className="absolute inset-0 w-20 h-20 bg-green-500/20 rounded-full animate-ping" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-2xl font-bold text-white">Odeme Basarili</h3>
                                <p className="text-white/40 mt-2">Webhook sonrasi planiniz guncellenecek.</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
