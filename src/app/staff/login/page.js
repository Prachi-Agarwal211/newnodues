'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import Input from '@/components/ui/Input';
import Link from 'next/link';
import { ArrowLeft, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      // Check Profile Role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profile?.role === 'admin') router.push('/admin');
      else router.push('/staff/dashboard');

      toast.success('Welcome back!');
    } catch (err) {
      setError(err.message);
      toast.error('Login Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper showSupportButton={false}>
      <div className="min-h-screen w-full flex items-center justify-center p-4 relative z-10">

        {/* Back Button */}
        <Link
          href="/"
          className={`absolute top-6 left-6 flex items-center gap-2 transition-colors z-10 px-4 py-2 rounded-full backdrop-blur-sm border
            ${isDark
              ? 'bg-black/40 text-white border-jecrc-red/40 hover:text-jecrc-red-bright hover:bg-black/60'
              : 'bg-white text-jecrc-red border-jecrc-red/40 hover:bg-jecrc-rose/40'
            }`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Home</span>
        </Link>

        <GlassCard className="w-full max-w-md p-8 md:p-10 shadow-2xl relative z-10 transition-all duration-500">
          <div className="text-center mb-8">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 transition-colors duration-500
              ${isDark ? 'bg-jecrc-red/10' : 'bg-jecrc-rose'}`}>
              <Lock className="w-8 h-8 text-jecrc-red" />
            </div>
            <h1 className={`text-3xl font-bold transition-colors duration-500 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Staff Login
            </h1>
            <p className={`mt-2 transition-colors duration-500 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Access the No-Dues Verification Portal
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">

            {error && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3 text-red-600 dark:text-red-400 text-sm animate-shake">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <Input
                label="Email Address"
                name="email"
                type="email"
                required
                startIcon={<Mail className="w-5 h-5" />}
                placeholder="staff@college.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <div className="flex justify-end mb-1">
                <Link href="/staff/forgot-password" className="text-sm text-jecrc-red hover:text-jecrc-red-dark font-medium transition-colors">Forgot Password?</Link>
              </div>
              <Input
                label="Password"
                name="password"
                type="password"
                required
                startIcon={<Lock className="w-5 h-5" />}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 font-bold rounded-xl shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed
                bg-gradient-to-br from-jecrc-red to-jecrc-red-dark text-white hover:shadow-jecrc-red/25
              `}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
            </button>
          </form>
        </GlassCard>
      </div>
    </PageWrapper>
  );
}

export default function StaffLogin() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-jecrc-red/30 border-t-jecrc-red rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
