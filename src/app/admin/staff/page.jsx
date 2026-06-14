'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';
import GlassCard from '@/components/ui/GlassCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
    Users,
    Search,
    Filter,
    ArrowLeft,
    ChevronUp,
    ChevronDown,
    Award,
    Clock,
    CheckCircle,
    XCircle
} from 'lucide-react';

export default function StaffDirectoryPage() {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [departments, setDepartments] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: 'stats.total_actions', direction: 'desc' });

    // Fetch staff with stats
    useEffect(() => {
        fetchStaffData();
        fetchDepartments();
    }, []);

    const fetchStaffData = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/admin/login');
                return;
            }

            const response = await fetch('/api/admin/staff?withStats=true', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            const result = await response.json();
            if (result.success) {
                setStaff(result.data || []);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        const { data } = await supabase
            .from('departments')
            .select('name, display_name')
            .eq('is_active', true)
            .order('display_order');
        setDepartments(data || []);
    };

    // Filter and sort staff
    const filteredStaff = staff
        .filter(s => {
            const matchesSearch =
                s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.email?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDept = departmentFilter === 'all' || s.department_name === departmentFilter;
            return matchesSearch && matchesDept;
        })
        .sort((a, b) => {
            const getValue = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj) || 0;
            const aVal = getValue(a, sortConfig.key);
            const bVal = getValue(b, sortConfig.key);

            if (sortConfig.direction === 'asc') {
                return aVal > bVal ? 1 : -1;
            }
            return aVal < bVal ? 1 : -1;
        });

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return null;
        return sortConfig.direction === 'desc' ?
            <ChevronDown className="w-4 h-4 inline" /> :
            <ChevronUp className="w-4 h-4 inline" />;
    };

    // Stats summary
    const totalStaff = staff.length;
    const activeToday = staff.filter(s => {
        const lastAction = s.stats?.last_action_at;
        if (!lastAction) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(lastAction) >= today;
    }).length;
    const avgActions = totalStaff > 0
        ? Math.round(staff.reduce((sum, s) => sum + (s.stats?.total_actions || 0), 0) / totalStaff)
        : 0;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner text="Loading Staff Directory..." />
            </div>
        );
    }

    return (
        <div className={`min-h-screen p-6 ${isDark ? 'bg-ink-black' : 'bg-gray-50'}`}>
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/admin/dashboard')}
                            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'
                                }`}
                        >
                            <ArrowLeft className={isDark ? 'text-white' : 'text-gray-700'} />
                        </button>
                        <div>
                            <h1 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'
                                }`}>
                                <Users className="w-6 h-6 text-jecrc-red" />
                                Staff Directory
                            </h1>
                            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                View and manage department staff performance
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/admin/settings?tab=staff')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all border ${isDark
                                ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            Manage Accounts
                        </button>
                        <button
                            onClick={() => router.push('/admin/staff/leaderboard')}
                            className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg font-medium flex items-center gap-2 hover:shadow-lg transition-shadow"
                        >
                            <Award className="w-4 h-4" />
                            Leaderboard
                        </button>
                    </div>
                </div>

                {/* Stats Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <GlassCard className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Staff</p>
                                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{totalStaff}</p>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Active Today</p>
                                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{activeToday}</p>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-purple-500" />
                            </div>
                            <div>
                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Avg Actions/Staff</p>
                                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{avgActions}</p>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Filters */}
                <GlassCard className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'
                                }`} />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-colors ${isDark
                                    ? 'bg-white/5 border-white/10 text-white placeholder-gray-500'
                                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                                    }`}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Filter className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                            <select
                                value={departmentFilter}
                                onChange={(e) => setDepartmentFilter(e.target.value)}
                                className={`px-4 py-2 rounded-lg border transition-colors ${isDark
                                    ? 'bg-white/5 border-white/10 text-white [&>option]:bg-[#111111]'
                                    : 'bg-white border-gray-200 text-gray-900'
                                    }`}
                            >
                                <option value="all">All Departments</option>
                                {departments.map(d => (
                                    <option key={d.name} value={d.name}>{d.display_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </GlassCard>

                {/* Staff Table */}
                <GlassCard className="overflow-hidden">
                    {error ? (
                        <div className="p-8 text-center text-red-500">{error}</div>
                    ) : filteredStaff.length === 0 ? (
                        <div className="p-8 text-center">
                            <Users className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                {searchTerm || departmentFilter !== 'all' ? 'No staff found matching filters' : 'No staff members yet'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className={isDark ? 'bg-white/5' : 'bg-gray-50'}>
                                    <tr>
                                        <th className={`text-left px-4 py-3 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Staff Member
                                        </th>
                                        <th className={`text-left px-4 py-3 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Department
                                        </th>
                                        <th
                                            className={`text-center px-4 py-3 font-medium cursor-pointer hover:opacity-80 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                                            onClick={() => handleSort('stats.total_actions')}
                                        >
                                            Total Actions <SortIcon columnKey="stats.total_actions" />
                                        </th>
                                        <th
                                            className={`text-center px-4 py-3 font-medium cursor-pointer hover:opacity-80 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                                            onClick={() => handleSort('stats.approval_rate')}
                                        >
                                            Approval Rate <SortIcon columnKey="stats.approval_rate" />
                                        </th>
                                        <th className={`text-center px-4 py-3 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Last Active
                                        </th>
                                        <th className={`text-right px-4 py-3 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStaff.map((member, index) => (
                                        <tr
                                            key={member.id}
                                            className={`border-t ${isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'} transition-colors`}
                                        >
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${index % 4 === 0 ? 'bg-blue-500' :
                                                        index % 4 === 1 ? 'bg-green-500' :
                                                            index % 4 === 2 ? 'bg-purple-500' : 'bg-orange-500'
                                                        }`}>
                                                        {member.full_name?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                            {member.full_name}
                                                        </p>
                                                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                            {member.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`px-3 py-1 rounded-full text-sm ${isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {member.department_display || member.department_name}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {member.stats?.total_actions || 0}
                                                    </span>
                                                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        ({member.stats?.approved || 0}✓ / {member.stats?.rejected || 0}✗)
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`px-2 py-1 rounded text-sm font-medium ${(member.stats?.approval_rate || 0) >= 90
                                                    ? 'bg-green-500/20 text-green-500'
                                                    : (member.stats?.approval_rate || 0) >= 70
                                                        ? 'bg-yellow-500/20 text-yellow-500'
                                                        : 'bg-red-500/20 text-red-500'
                                                    }`}>
                                                    {member.stats?.approval_rate || 0}%
                                                </span>
                                            </td>
                                            <td className={`px-4 py-4 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {member.stats?.last_action_at
                                                    ? new Date(member.stats.last_action_at).toLocaleDateString()
                                                    : 'Never'}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <button
                                                    onClick={() => router.push(`/admin/staff/${member.id}`)}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isDark
                                                        ? 'bg-jecrc-red/20 text-jecrc-red hover:bg-jecrc-red/30'
                                                        : 'bg-jecrc-red/10 text-jecrc-red hover:bg-jecrc-red/20'
                                                        }`}
                                                >
                                                    View Profile
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </GlassCard>
            </div>
        </div>
    );
}
