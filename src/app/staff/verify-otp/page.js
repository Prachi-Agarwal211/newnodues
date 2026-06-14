'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Key, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';

function VerifyOTPContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [resetToken, setResetToken] = useState('');

    const email = searchParams.get('email') || '';
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const otpRefs = [];

    useEffect(() => {
        if (!email) {
            router.push('/staff/forgot-password');
        }
    }, [email, router]);

    const handleOtpChange = (index, value) => {
        if (!/^\d?$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            if (nextInput) nextInput.focus();
        }

        // Clear any previous error when user types
        if (error) {
            setError('');
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    const handleVerify = async () => {
        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            setError('Please enter a valid 6-digit OTP');
            return;
        }

        setVerifying(true);
        setError('');

        try {
            const response = await fetch('/api/staff/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: otpCode }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'OTP verification failed');
            }

            // Success
            setResetToken(data.resetToken);
            setSuccess(true);
            toast.success('OTP verified successfully!');

            // Redirect to reset password page after 1 second
            setTimeout(() => {
                router.push(`/staff/reset-password?email=${encodeURIComponent(email)}&token=${data.resetToken}`);
            }, 1000);

        } catch (err) {
            console.error('Verify OTP error:', err);
            setError(err.message);
            toast.error('OTP verification failed');
        } finally {
            setVerifying(false);
        }
    };

    const handleResendOTP = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/staff/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to resend OTP');
            }

            toast.success('New OTP sent successfully!');
            // Clear OTP fields
            setOtp(['', '', '', '', '', '']);
            const firstInput = document.getElementById('otp-0');
            if (firstInput) firstInput.focus();
        } catch (err) {
            setError(err.message);
            toast.error('Failed to resend OTP');
        } finally {
            setLoading(false);
        }
    };

    if (!email) {
        return (
            <PageWrapper>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
                    </div>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            <div className="relative z-10 min-h-screen w-full flex items-center justify-center p-4">

                {/* Back Button */}
                <Link
                    href="/staff/forgot-password"
                    className="absolute top-6 left-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors z-10"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">Back</span>
                </Link>

                <GlassCard className="w-full max-w-md p-8 md:p-10 shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 mx-auto bg-jecrc-rose dark:bg-jecrc-red/20 rounded-full flex items-center justify-center mb-4">
                            <Key className="w-8 h-8 text-jecrc-red dark:text-jecrc-red-bright" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Verify OTP</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            Enter the 6-digit code sent to{' '}
                            <span className="font-semibold text-jecrc-red">{email}</span>
                        </p>
                    </div>

                    {success ? (
                        <div className="space-y-6">
                            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-3 text-green-600 dark:text-green-400">
                                <CheckCircle className="w-5 h-5 shrink-0" />
                                <div className="text-left">
                                    <p className="font-medium">OTP Verified Successfully!</p>
                                    <p className="text-sm mt-1">
                                        Redirecting to password reset page...
                                    </p>
                                </div>
                            </div>

                            <div className="text-center">
                                <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {error && (
                                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">
                                    6-Digit Verification Code
                                </label>
                                <div className="flex justify-center gap-3 mb-6">
                                    {[0, 1, 2, 3, 4, 5].map((index) => (
                                        <input
                                            key={index}
                                            id={`otp-${index}`}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={otp[index]}
                                            onChange={(e) => handleOtpChange(index, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(index, e)}
                                            className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-[#111111] text-gray-900 dark:text-white focus:border-jecrc-red focus:ring-2 focus:ring-jecrc-red/40 outline-none transition-all"
                                            disabled={verifying}
                                            autoFocus={index === 0}
                                        />
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                    Enter the code exactly as shown in the email
                                </p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleVerify}
                                    disabled={verifying || otp.some(d => d === '')}
                                    className="w-full py-3.5 bg-jecrc-red hover:bg-jecrc-red-dark text-white font-bold rounded-xl shadow-lg shadow-jecrc-red/20 dark:shadow-neon-red transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {verifying ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        'Verify OTP'
                                    )}
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
                            </div>

                            <div className="text-center space-y-4">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Didn't receive the code? Check your spam folder or request a new code.
                                </p>

                                <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                                    <Link
                                        href="/staff/forgot-password"
                                        className="text-sm text-jecrc-red hover:text-jecrc-red-dark font-medium"
                                    >
                                        Use different email
                                    </Link>
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

export default function VerifyOTPPage() {
    return (
        <Suspense fallback={
            <PageWrapper>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-8 h-8 border-4 border-jecrc-red/30 border-t-jecrc-red rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
                    </div>
                </div>
            </PageWrapper>
        }>
            <VerifyOTPContent />
        </Suspense>
    );
}