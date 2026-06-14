'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';
import GlassCard from '@/components/ui/GlassCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
    ArrowLeft,
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
    Activity
} from 'lucide-react';

export default function StaffProfilePage({ params }) {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const unwrappedParams = use(params);
    const staffId = unwrappedParams.id;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchStaffProfile();
    }, [staffId]);

    const fetchStaffProfile = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/admin/login');
                return;
            }

            const response = await fetch(`/api/admin/staff/${staffId}`, {
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
                <LoadingSpinner text="Loading Staff Profile..." />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-ink-black' : 'bg-gray-50'}`}>
                <GlassCard className="p-8 text-center">
                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-500">{error || 'Staff member not found'}</p>
                    <button
                        onClick={() => router.push('/admin/staff')}
                        className="mt-4 px-4 py-2 bg-jecrc-red text-white rounded-lg"
                    >
                        Back to Directory
                    </button>
                </GlassCard>
            </div>
        );
    }

    const { profile, stats, recentActivity, achievements, pendingInQueue } = data;

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
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header with Back Button */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/admin/staff')}
                        className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'
                            }`}
                    >
                        <ArrowLeft className={isDark ? 'text-white' : 'text-gray-700'} />
                    </button>
                    <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Staff Profile
                    </h1>
                </div>

                {/* Profile Header Card */}
                <GlassCard className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                            {profile.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt={profile.full_name}
                                    className="w-24 h-24 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-jecrc-red to-red-700 flex items-center justify-center text-white text-3xl font-bold">
                                    {profile.full_name?.charAt(0) || '?'}
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {profile.full_name}
                            </h2>
                            <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {profile.designation || profile.department_display}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-4">
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
                                <div className="flex items-center gap-2">
                                    <Calendar className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                                    <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                                        Joined {new Date(profile.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            {/* Status Badge */}
                            <div className="mt-4">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${profile.is_active
                                        ? 'bg-green-500/20 text-green-500'
                                        : 'bg-red-500/20 text-red-500'
                                    }`}>
                                    {profile.is_active ? '✅ Active' : '❌ Inactive'}
                                </span>
                            </div>
                        </div>

                        {/* Pending Badge */}
                        <div className="flex-shrink-0">
                            <div className={`px-4 py-3 rounded-xl text-center ${isDark ? 'bg-orange-500/20' : 'bg-orange-100'
                                }`}>
                                <p className={`text-sm ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>In Queue</p>
                                <p className="text-3xl font-bold text-orange-500">{pendingInQueue}</p>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* Performance Stats Grid */}
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
                        value={stats.total_approved || 0}
                        subValue={`${stats.approval_rate || 0}% rate`}
                        color="bg-green-500"
                    />
                    <StatCard
                        icon={XCircle}
                        label="Rejected"
                        value={stats.total_rejected || 0}
                        color="bg-red-500"
                    />
                    <StatCard
                        icon={Clock}
                        label="Avg Response"
                        value={stats.avg_response_hours ? `${Math.round(stats.avg_response_hours)}h` : 'N/A'}
                        color="bg-purple-500"
                    />
                </div>

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
                        icon={Target}
                        label="SLA Compliance"
                        value={stats.sla_compliance_rate ? `${stats.sla_compliance_rate}%` : 'N/A'}
                        color="bg-amber-500"
                    />
                </div>

                {/* Achievements */}
                {achievements && achievements.length > 0 && (
                    <GlassCard className="p-6">
                        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            <Award className="w-5 h-5 text-yellow-500" />
                            Achievements
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

                {/* Recent Activity */}
                <GlassCard className="p-6">
                    <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        <Activity className="w-5 h-5 text-blue-500" />
                        Recent Activity
                    </h3>

                    {(!recentActivity || recentActivity.length === 0) ? (
                        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>No recent activity</p>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {recentActivity.map((action, index) => (
                                <div
                                    key={index}
                                    className={`flex items-center gap-4 p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${action.status === 'approved' ? 'bg-green-500/20' : 'bg-red-500/20'
                                        }`}>
                                        {action.status === 'approved' ? (
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-red-500" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className={isDark ? 'text-white' : 'text-gray-900'}>
                                            <span className="font-medium">{action.status === 'approved' ? 'Completed' : 'Rejected'}</span>
                                            {' - '}
                                            {action.no_dues_forms?.student_name} ({action.no_dues_forms?.registration_no})
                                        </p>
                                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {action.no_dues_forms?.course} • {action.no_dues_forms?.branch}
                                        </p>
                                    </div>
                                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {action.action_at ? new Date(action.action_at).toLocaleString() : ''}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </GlassCard>
            </div>
        </div>
    );
}
