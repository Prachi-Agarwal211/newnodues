'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const email = searchParams.get('email') || '';
    const token = searchParams.get('token') || '';

    const [formData, setFormData] = useState({
        newPassword: '',
        confirmPassword: '',
    });

    useEffect(() => {
        if (!email || !token) {
            router.push('/staff/forgot-password');
        }
    }, [email, token, router]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const validatePassword = (password) => {
        const errors = [];
        if (password.length < 8) errors.push('At least 8 characters');
        if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
        if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
        if (!/[0-9]/.test(password)) errors.push('One number');
        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (formData.newPassword !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        const validationErrors = validatePassword(formData.newPassword);
        if (validationErrors.length > 0) {
            setError(`Password must contain: ${validationErrors.join(', ')}`);
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/staff/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    resetToken: token,
                    newPassword: formData.newPassword,
                    confirmPassword: formData.confirmPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to reset password');
            }

            setSuccess(true);
            toast.success('Password reset successfully!');

            // Redirect to login after 3 seconds
            setTimeout(() => {
                router.push('/staff/login');
            }, 3000);

        } catch (err) {
            console.error('Reset password error:', err);
            setError(err.message);
            toast.error('Password reset failed');
        } finally {
            setLoading(false);
        }
    };

    if (!email || !token) {
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

    if (success) {
        return (
            <PageWrapper>
                <div className="relative z-10 min-h-screen w-full flex items-center justify-center p-4">
                    <GlassCard className="w-full max-w-md p-8 md:p-10 shadow-2xl">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-500" />
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Password Reset Successfully!</h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-2">
                                Your password has been updated successfully.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                <p className="text-green-700 dark:text-green-300 text-center">
                                    You will be redirected to the login page shortly.
                                </p>
                            </div>

                            <div className="text-center">
                                <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting...</p>
                            </div>

                            <div className="text-center">
                                <Link
                                    href="/staff/login"
                                    className="inline-block px-6 py-3 bg-jecrc-red hover:bg-jecrc-red-dark text-white font-medium rounded-xl shadow-lg shadow-jecrc-red/20 transition-all"
                                >
                                    Go to Login Now
                                </Link>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            <div className="relative z-10 min-h-screen w-full flex items-center justify-center p-4">

                {/* Back Button */}
                <Link
                    href={`/staff/verify-otp?email=${encodeURIComponent(email)}`}
                    className="absolute top-6 left-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors z-10"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">Back</span>
                </Link>

                <GlassCard className="w-full max-w-md p-8 md:p-10 shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 mx-auto bg-jecrc-rose dark:bg-jecrc-red/20 rounded-full flex items-center justify-center mb-4">
                            <Lock className="w-8 h-8 text-jecrc-red dark:text-jecrc-red-bright" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Set New Password</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            Create a new password for your account
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Account: <span className="font-semibold">{email}</span>
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    name="newPassword"
                                    required
                                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#111111] text-gray-900 dark:text-white focus:ring-2 focus:ring-jecrc-red/40 focus:border-jecrc-red outline-none transition-all"
                                    placeholder="••••••••"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                >
                                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            <div className="mt-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Password must contain at least:
                                </p>
                                <ul className="text-xs text-gray-500 dark:text-gray-400 ml-4 list-disc">
                                    <li>8 characters</li>
                                    <li>One uppercase letter</li>
                                    <li>One lowercase letter</li>
                                    <li>One number</li>
                                </ul>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    name="confirmPassword"
                                    required
                                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#111111] text-gray-900 dark:text-white focus:ring-2 focus:ring-jecrc-red/40 focus:border-jecrc-red outline-none transition-all"
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-jecrc-red hover:bg-jecrc-red-dark text-white font-bold rounded-xl shadow-lg shadow-jecrc-red/20 dark:shadow-neon-red transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Resetting Password...
                                </>
                            ) : (
                                'Reset Password'
                            )}
                        </button>
                    </form>

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

export default function ResetPasswordPage() {
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
            <ResetPasswordContent />
        </Suspense>
    );
}