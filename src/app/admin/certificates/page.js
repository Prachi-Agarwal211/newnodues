'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, CheckCircle, AlertOctagon, RotateCw, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PageWrapper from '@/components/landing/PageWrapper';

export default function CertificateManagementPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [recentFailures, setRecentFailures] = useState([]);

    // Fetch Stats
    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/certificate/stats');
            const data = await res.json();
            if (data.success) {
                setStats(data.stats);
                setRecentFailures(data.recentFailures || []);
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err);
            toast.error('Failed to load certificate statistics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    // Simplified Bulk Generate (for demonstration - normally we'd select rows)
    const handleBulkGenerate = async () => {
        // In a real app, we'd fetch the eligible IDs first or pass a filter.
        // For this demo, we'll ask the user to confirm generating for ALL pending.
        if (!confirm('This will attempt to generate certificates for up to 5 pending eligible students. Continue?')) return;

        setProcessing(true);
        try {
            // 1. Fetch pending eligible IDs (Client-side or via a specialized API)
            // For MVP, we'll hit an endpoint that does this logic, but our bulk-gen expects IDs.
            // Let's assume we pass a flag or fetch them first.
            // To keep it simple: We will not implement the full specialized "fetch eligible" here 
            // without a proper table selection.

            // Alternative: Just show a toast that this feature requires selecting students from the main table.
            toast('Please go to the Applications table to select students for generation.', { icon: 'ℹ️' });

        } catch (err) {
            toast.error(err.message);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-jecrc-red" />
            </div>
        );
    }

    return (
        <PageWrapper>
            <div className="p-6 md:p-8 space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <FileText className="w-8 h-8 text-jecrc-red" />
                            Certificate Management
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Track and manage No Dues certificates
                        </p>
                    </div>
                    <button
                        onClick={fetchStats}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/20 transition-colors"
                    >
                        <RotateCw className="w-4 h-4" />
                        Refresh Data
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Applications"
                        value={stats?.total || 0}
                        icon={<FileText className="w-6 h-6 text-blue-500" />}
                        bg="bg-blue-50 dark:bg-blue-900/20"
                        border="border-blue-200 dark:border-blue-800"
                    />
                    <StatCard
                        title="Generated"
                        value={stats?.generated || 0}
                        icon={<CheckCircle className="w-6 h-6 text-green-500" />}
                        bg="bg-green-50 dark:bg-green-900/20"
                        border="border-green-200 dark:border-green-800"
                    />
                    <StatCard
                        title="Pending Eligible"
                        value={stats?.eligiblePending || 0}
                        icon={<Loader2 className="w-6 h-6 text-yellow-500" />}
                        bg="bg-yellow-50 dark:bg-yellow-900/20"
                        border="border-yellow-200 dark:border-yellow-800"
                    />
                    <StatCard
                        title="Failed/Errors"
                        value={stats?.failed || 0}
                        icon={<AlertOctagon className="w-6 h-6 text-red-500" />}
                        bg="bg-red-50 dark:bg-red-900/20"
                        border="border-red-200 dark:border-red-800"
                    />
                </div>

                {/* Recent Failures */}
                {recentFailures.length > 0 && (
                    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                <AlertOctagon className="w-5 h-5 text-red-500" />
                                Recent Generation Errors
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-white/5">
                            {recentFailures.map((failure) => (
                                <div key={failure.id} className="p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-start justify-between">
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white">
                                            {failure.student_name}
                                            <span className="ml-2 text-xs font-mono text-gray-500 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded">
                                                {failure.registration_no}
                                            </span>
                                        </h4>
                                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                            {failure.certificate_error}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {new Date(failure.updated_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <button className="text-xs px-3 py-1.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded hover:bg-gray-50 dark:hover:bg-white/20 transition-colors">
                                        Retry
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Area */}
                <div className="bg-gradient-to-br from-gray-50 to-white dark:from-white/5 dark:to-transparent border border-gray-200 dark:border-white/10 rounded-xl p-8 text-center">
                    <h3 className="font-bold text-xl mb-2 text-gray-900 dark:text-white">Ready to Generate?</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                        You have {stats?.eligiblePending} students eligible for certificates. Go to the Applications tab to select and generate them.
                    </p>
                    <button
                        disabled={stats?.eligiblePending === 0}
                        className="px-6 py-3 bg-jecrc-red hover:bg-red-700 text-white font-medium rounded-xl shadow-lg shadow-jecrc-red/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Go to Applications List
                    </button>
                </div>

            </div>
        </PageWrapper>
    );
}

function StatCard({ title, value, icon, bg, border }) {
    return (
        <div className={`p-6 rounded-xl border ${bg} ${border} transition-transform hover:scale-[1.02]`}>
            <div className="flex items-start justify-between mb-4">
                <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</h3>
                </div>
                <div className="p-3 bg-white dark:bg-[#111111] rounded-lg">
                    {icon}
                </div>
            </div>
        </div>
    );
}
