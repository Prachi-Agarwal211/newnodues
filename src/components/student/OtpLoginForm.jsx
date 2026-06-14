'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, Lock, Loader2, KeyRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import toast from 'react-hot-toast';

export default function OtpLoginForm({ onLoginSuccess }) {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [step, setStep] = useState(1); // 1: Request OTP, 2: Verify OTP
    const [loading, setLoading] = useState(false);
    const [registrationNo, setRegistrationNo] = useState('');
    const [otp, setOtp] = useState('');
    const [sentEmail, setSentEmail] = useState('');
    const [emailType, setEmailType] = useState('');

    // Step 1: Request OTP
    const handleRequestOtp = async (e) => {
        e.preventDefault();
        if (!registrationNo.trim()) return;

        setLoading(true);
        try {
            const res = await fetch('/api/student/auth/request-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registrationNo }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to send OTP');

            setSentEmail(data.email);
            setEmailType(data.emailType);
            toast.success(data.message || 'OTP sent successfully!');
            setStep(2);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (!otp.trim()) return;

        setLoading(true);
        try {
            const res = await fetch('/api/student/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registrationNo, otp }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Verification failed');

            toast.success('Login Successful!');

            // Trigger parent callback to reload or lift state
            if (onLoginSuccess) {
                onLoginSuccess(registrationNo);
            } else {
                // Fallback reload
                window.location.reload();
            }

        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className={`
                    w-full max-w-md 
                    ${isDark 
                        ? 'bg-[#141414] border border-white/10' 
                        : 'bg-white border border-gray-200'
                    }
                    backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8
                `}
            >
                <div className="text-center mb-6 sm:mb-8">
                    <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-jecrc-red to-jecrc-red-dark rounded-2xl flex items-center justify-center shadow-lg shadow-jecrc-red/20 mb-4 transform hover:rotate-3 transition-transform"
                    >
                        <KeyRound className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                    </motion.div>
                    <h2 className={`
                        text-xl sm:text-2xl font-bold mb-2
                        ${isDark ? 'text-white' : 'text-gray-900'}
                    `}>
                        Student Access
                    </h2>
                    <p className={`
                        text-sm
                        ${isDark ? 'text-gray-400' : 'text-gray-500'}
                    `}>
                        {step === 1
                            ? 'Enter your registration number to verify your identity'
                            : `Enter the code sent to your ${emailType === 'personal' ? 'Personal' : 'Registered'} Email`
                        }
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.form
                            key="step1"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onSubmit={handleRequestOtp}
                            className="space-y-5 sm:space-y-6"
                        >
                            <div className="space-y-2">
                                <label className={`
                                    text-sm font-medium ml-1
                                    ${isDark ? 'text-gray-300' : 'text-gray-700'}
                                `}>
                                    Registration Number
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className={`
                                            h-5 w-5 transition-colors
                                            ${isDark ? 'text-gray-500' : 'text-gray-400'}
                                            group-focus-within:text-jecrc-red
                                        `} />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={registrationNo}
                                        onChange={(e) => setRegistrationNo(e.target.value.toUpperCase())}
                                        className={`
                                            block w-full pl-11 pr-4 py-3.5 rounded-xl outline-none transition-all
                                            ${isDark 
                                                ? 'bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-jecrc-red focus:ring-2 focus:ring-red-600/30' 
                                                : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-jecrc-red focus:ring-2 focus:ring-red-600/30'
                                            }
                                        `}
                                        placeholder="e.g. 21BXXXXXX"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`
                                    w-full flex items-center justify-center gap-2 py-3.5 sm:py-4 px-6 rounded-xl text-white
                                    bg-gradient-to-r from-jecrc-red to-jecrc-red-dark 
                                    hover:from-red-600 hover:to-red-700 
                                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-jecrc-red
                                    disabled:opacity-50 disabled:cursor-not-allowed 
                                    transform hover:scale-[1.02] active:scale-[0.98] 
                                    transition-all shadow-lg shadow-jecrc-red/25
                                `}
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <>
                                        <span>Send OTP</span>
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </motion.form>
                    ) : (
                        <motion.form
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onSubmit={handleVerifyOtp}
                            className="space-y-5 sm:space-y-6"
                        >
                            <div className="space-y-2">
                                <label className={`
                                    text-sm font-medium ml-1
                                    ${isDark ? 'text-gray-300' : 'text-gray-700'}
                                `}>
                                    Enter 6-Digit OTP
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className={`
                                            h-5 w-5 transition-colors
                                            ${isDark ? 'text-gray-500' : 'text-gray-400'}
                                            group-focus-within:text-jecrc-red
                                        `} />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        className={`
                                            block w-full pl-11 pr-4 py-3.5 rounded-xl outline-none transition-all
                                            tracking-widest text-lg
                                            ${isDark 
                                                ? 'bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-jecrc-red focus:ring-2 focus:ring-red-600/30' 
                                                : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-jecrc-red focus:ring-2 focus:ring-red-600/30'
                                            }
                                        `}
                                        placeholder="XXXXXX"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`
                                    w-full flex items-center justify-center gap-2 py-3.5 sm:py-4 px-6 rounded-xl text-white
                                    bg-gradient-to-r from-green-600 to-green-700 
                                    hover:from-green-700 hover:to-green-800
                                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600
                                    disabled:opacity-50 disabled:cursor-not-allowed 
                                    transform hover:scale-[1.02] active:scale-[0.98] 
                                    transition-all shadow-lg shadow-green-600/25
                                `}
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Login'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className={`
                                    w-full text-center text-sm transition-colors
                                    ${isDark 
                                        ? 'text-gray-500 hover:text-gray-300' 
                                        : 'text-gray-500 hover:text-gray-700'
                                    }
                                `}
                            >
                                Change Registration Number
                            </button>
                        </motion.form>
                    )}
                </AnimatePresence>

                <div className={`
                    mt-6 sm:mt-8 pt-6 border-t text-center
                    ${isDark ? 'border-white/5' : 'border-gray-100'}
                `}>
                    <p className={`
                        text-xs sm:text-sm max-w-xs mx-auto
                        ${isDark ? 'text-gray-500' : 'text-gray-400'}
                    `}>
                        Please check your personal and college email for the OTP. If you don't receive it within 2 minutes, try again.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
