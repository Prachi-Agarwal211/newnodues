'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [submittedEmail, setSubmittedEmail] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) {
            setError('Please enter your email address');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/staff/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send OTP');
            }

            // Success
            setSubmittedEmail(email.trim());
            setSuccess(true);
            toast.success('OTP sent successfully! Check your email.');
        } catch (err) {
            console.error('Forgot password error:', err);
            setError(err.message);
            toast.error('Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        if (!submittedEmail) return;

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/staff/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: submittedEmail }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to resend OTP');
            }

            toast.success('New OTP sent successfully!');
        } catch (err) {
            setError(err.message);
            toast.error('Failed to resend OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageWrapper>
            <div className="relative z-10 min-h-screen w-full flex items-center justify-center p-4">

                {/* Back Button */}
                <Link
                    href="/staff/login"
                    className="absolute top-6 left-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors z-10"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">Back to Login</span>
                </Link>

                <GlassCard className="w-full max-w-md p-8 md:p-10 shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 mx-auto bg-jecrc-rose dark:bg-jecrc-red/20 rounded-full flex items-center justify-center mb-4">
                            <Mail className="w-8 h-8 text-jecrc-red dark:text-jecrc-red-bright" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reset Password</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            Enter your email to receive a verification code
                        </p>
                    </div>

                    {!success ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        required
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#111111] text-gray-900 dark:text-white focus:ring-2 focus:ring-jecrc-red/40 focus:border-jecrc-red outline-none transition-all"
                                        placeholder="staff@college.edu"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    Must be a registered staff email address
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-jecrc-red hover:bg-jecrc-red-dark text-white font-bold rounded-xl shadow-lg shadow-jecrc-red/20 dark:shadow-neon-red transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Sending OTP...
                                    </>
                                ) : (
                                    'Send Verification Code'
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-3 text-green-600 dark:text-green-400">
                                <CheckCircle className="w-5 h-5 shrink-0" />
                                <div className="text-left">
                                    <p className="font-medium">Verification code sent!</p>
                                    <p className="text-sm mt-1">
                                        We've sent a 6-digit OTP to <strong>{submittedEmail}</strong>.
                                        Check your inbox and spam folder.
                                    </p>
                                </div>
                            </div>

                            <div className="text-center space-y-4">
                                <p className="text-gray-600 dark:text-gray-300">
                                    Please check your email and enter the OTP on the next page to reset your password.
                                </p>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={() => router.push(`/staff/verify-otp?email=${encodeURIComponent(submittedEmail)}`)}
                                        className="w-full py-3.5 bg-jecrc-red hover:bg-jecrc-red-dark text-white font-bold rounded-xl shadow-lg shadow-jecrc-red/20 dark:shadow-neon-red transition-all transform active:scale-[0.98]"
                                    >
                                        Enter OTP Code
                                    </button>

                                    <button
                                        onClick={handleResendOTP}
                                        disabled={loading}
                                        className="w-full py-3 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Resending...
                                            </>
                                        ) : (
                                            'Resend OTP'
                                        )}
                                    </button>

                                    <button
                                        onClick={() => {
                                            setSuccess(false);
                                            setEmail('');
                                        }}
                                        className="text-sm text-jecrc-red hover:text-jecrc-red-dark font-medium"
                                    >
                                        Use different email
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-white/10 text-center">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Remember your password?{' '}
                            <Link href="/staff/login" className="text-jecrc-red hover:text-jecrc-red-dark font-medium">
                                Back to Login
                            </Link>
                        </p>
                    </div>
                </GlassCard>
            </div>
        </PageWrapper>
    );
}