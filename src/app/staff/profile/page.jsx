'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';
import GlassCard from '@/components/ui/GlassCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
    User,
    Mail,
    Building2,
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    TrendingUp,
    Award,
    Target,
    Activity,
    BarChart3
} from 'lucide-react';

export default function StaffProfilePage() {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchMyProfile();
    }, []);

    const fetchMyProfile = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/staff/login');
                return;
            }

            const response = await fetch('/api/staff/profile', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            const result = await response.json();
            if (result.success) {
                setData(result.data);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner text="Loading Your Profile..." />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-ink-black' : 'bg-gray-50'}`}>
                <GlassCard className="p-8 text-center">
                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-500">{error || 'Failed to load profile'}</p>
                    <button
                        onClick={() => router.push('/staff/dashboard')}
                        className="mt-4 px-4 py-2 bg-jecrc-red text-white rounded-lg"
                    >
                        Back to Dashboard
                    </button>
                </GlassCard>
            </div>
        );
    }

    const { profile, stats, comparison, achievements } = data;

    const StatCard = ({ icon: Icon, label, value, subValue, color }) => (
        <GlassCard className="p-4">
            <div className="flex items-start justify-between">
                <div>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{label}</p>
                    <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
                    {subValue && (
                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{subValue}</p>
                    )}
                </div>
                <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
            </div>
        </GlassCard>
    );

    return (
        <div className={`min-h-screen p-6 ${isDark ? 'bg-ink-black' : 'bg-gray-50'}`}>
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div>
                    <h1 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                        <User className="w-6 h-6 text-jecrc-red" />
                        My Profile & Performance
                    </h1>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                        View your performance metrics and achievements
                    </p>
                </div>

                {/* Profile Card */}
                <GlassCard className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-jecrc-red to-red-700 flex items-center justify-center text-white text-2xl font-bold">
                                {profile.full_name?.charAt(0) || '?'}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {profile.full_name}
                            </h2>

                            <div className="mt-3 flex flex-wrap gap-4">
                                <div className="flex items-center gap-2">
                                    <Mail className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                                    <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{profile.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Building2 className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                                    <span className={`px-2 py-0.5 rounded-full text-sm ${isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {profile.department_display}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Rank Badge */}
                        {comparison?.my_rank && (
                            <div className="flex-shrink-0">
                                <div className={`px-4 py-3 rounded-xl text-center ${isDark ? 'bg-purple-500/20' : 'bg-purple-100'
                                    }`}>
                                    <p className={`text-sm ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>Dept Rank</p>
                                    <p className="text-2xl font-bold text-purple-500">
                                        #{comparison.my_rank} <span className="text-sm font-normal">of {comparison.total_staff}</span>
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </GlassCard>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        icon={Activity}
                        label="Total Actions"
                        value={stats.total_actions || 0}
                        color="bg-blue-500"
                    />
                    <StatCard
                        icon={CheckCircle}
                        label="Completed"
                        value={stats.approved || 0}
                        subValue={`${stats.approval_rate || 0}% rate`}
                        color="bg-green-500"
                    />
                    <StatCard
                        icon={XCircle}
                        label="Rejected"
                        value={stats.rejected || 0}
                        color="bg-red-500"
                    />
                    <StatCard
                        icon={Target}
                        label="Pending"
                        value={stats.pending_in_queue || 0}
                        color="bg-orange-500"
                    />
                </div>

                {/* Time-based Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        icon={TrendingUp}
                        label="Today"
                        value={stats.today_actions || 0}
                        color="bg-cyan-500"
                    />
                    <StatCard
                        icon={TrendingUp}
                        label="This Week"
                        value={stats.week_actions || 0}
                        color="bg-indigo-500"
                    />
                    <StatCard
                        icon={TrendingUp}
                        label="This Month"
                        value={stats.month_actions || 0}
                        color="bg-pink-500"
                    />
                    <StatCard
                        icon={Clock}
                        label="Avg Response"
                        value={stats.avg_response_hours ? `${Math.round(stats.avg_response_hours)}h` : 'N/A'}
                        color="bg-purple-500"
                    />
                </div>

                {/* Comparison Card */}
                {comparison && (
                    <GlassCard className="p-6">
                        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            <BarChart3 className="w-5 h-5 text-blue-500" />
                            Department Comparison
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className={`p-4 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Your Avg Response</p>
                                <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {comparison.my_avg_hours ? `${Math.round(comparison.my_avg_hours)} hours` : 'N/A'}
                                </p>
                            </div>
                            <div className={`p-4 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Dept Average</p>
                                <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {comparison.dept_avg_hours ? `${Math.round(comparison.dept_avg_hours)} hours` : 'N/A'}
                                </p>
                            </div>
                        </div>
                        {comparison.faster_than_avg !== null && (
                            <div className={`mt-4 text-center p-3 rounded-lg ${comparison.faster_than_avg
                                    ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                                    : isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                {comparison.faster_than_avg
                                    ? `🚀 You're ${Math.round(((comparison.dept_avg_hours - comparison.my_avg_hours) / comparison.dept_avg_hours) * 100)}% faster than department average!`
                                    : `📈 Room for improvement - department average is ${Math.round(comparison.dept_avg_hours - comparison.my_avg_hours)} hours faster`
                                }
                            </div>
                        )}
                    </GlassCard>
                )}

                {/* Achievements */}
                {achievements && achievements.length > 0 && (
                    <GlassCard className="p-6">
                        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            <Award className="w-5 h-5 text-yellow-500" />
                            My Achievements
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            {achievements.map((badge, index) => (
                                <div
                                    key={index}
                                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${isDark ? 'bg-yellow-500/20' : 'bg-yellow-100'
                                        }`}
                                >
                                    <span className="text-xl">🏆</span>
                                    <div>
                                        <p className={`font-medium ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}>
                                            {badge.badge_name}
                                        </p>
                                        <p className={`text-xs ${isDark ? 'text-yellow-400/70' : 'text-yellow-600'}`}>
                                            {new Date(badge.earned_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                )}

                {/* Back Button */}
                <div className="text-center">
                    <button
                        onClick={() => router.push('/staff/dashboard')}
                        className={`px-6 py-2 rounded-lg font-medium ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
