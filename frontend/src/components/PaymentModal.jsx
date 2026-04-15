import { useState } from 'react';
import { X, Sparkles, CheckCircle, Shield } from 'lucide-react';
import axios from '../lib/axios';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars

export default function PaymentModal({ plan, onClose, onSuccess }) {
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState('confirm');
    const [error, setError] = useState('');

    const handleUpgrade = async () => {
        setIsLoading(true);
        setError('');
        setStep('processing');
        try {
            await axios.post('/auth/demo-upgrade', { role: plan });
            setStep('success');
            setTimeout(() => { onSuccess(); }, 1500);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || 'Yükseltme başarısız. Lütfen tekrar deneyin.');
            setIsLoading(false);
            setStep('confirm');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            {/* Ambient Orbs */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-violet-500/20 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative glass-card border border-white/10 rounded-3xl w-full max-w-md p-8 overflow-hidden"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-xl hover:bg-white/5 transition-colors z-10"
                >
                    <X className="w-5 h-5 text-white/40 hover:text-white transition-colors" />
                </button>

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30 mb-4">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="font-display text-3xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                        {plan} Planına Yükselt
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
                                    <span className="text-white/80 text-sm font-medium">Plan Detayları</span>
                                </div>
                                <p className="text-white/50 text-sm leading-relaxed">
                                    <strong className="text-white/70">{plan}</strong> planına yükseltmek üzeresiniz.
                                    Yeni kredi ve özellikler hesabınıza anında tanımlanacaktır.
                                </p>
                            </div>

                            {/* Upgrade Button */}
                            <button
                                onClick={handleUpgrade}
                                disabled={isLoading}
                                className="group relative w-full py-4 rounded-2xl font-bold text-white overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />
                                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity">
                                    <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white to-transparent" />
                                </div>
                                <span className="relative">Planı Yükselt</span>
                            </button>

                            <button
                                onClick={onClose}
                                className="w-full py-3 text-white/40 hover:text-white/60 transition-colors text-sm"
                            >
                                Vazgeç
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
                                <p className="text-xl font-bold text-white animate-pulse">Yükseltme İşleniyor...</p>
                                <p className="text-sm text-white/40 mt-2">Lütfen bu pencereyi kapatmayın</p>
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
                                <h3 className="text-2xl font-bold text-white">Yükseltme Başarılı!</h3>
                                <p className="text-white/40 mt-2">Yönlendiriliyorsunuz...</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
