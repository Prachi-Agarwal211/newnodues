'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Send, X, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';

/**
 * AdminNotificationBell - Bell icon with pending stats and reminder functionality
 * Integrates with admin header for one-click department reminders
 */
export default function AdminNotificationBell({ departmentStats = [], onRefresh }) {
    const [isOpen, setIsOpen] = useState(false);
    const [sending, setSending] = useState({});
    const [sendingAll, setSendingAll] = useState(false);
    const panelRef = useRef(null);

    // Calculate total pending
    const totalPending = departmentStats.reduce((sum, d) => sum + (d.pending_count || 0), 0);
    const departmentsWithPending = departmentStats.filter(d => d.pending_count > 0);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Send reminder to specific department
    const sendReminder = async (departmentName) => {
        setSending(prev => ({ ...prev, [departmentName]: true }));
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const res = await fetch('/api/admin/notify-department', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    departmentName,
                    customMessage: 'Please review pending applications at your earliest convenience.',
                    includeStats: true
                })
            });

            const json = await res.json();
            if (json.success) {
                toast.success(`Admin notification sent to ${departmentName.replace(/_/g, ' ')}!`);
                // Refresh data if prop provided
                if (onRefresh) onRefresh();
            } else {
                throw new Error(json.error || 'Failed to send notification');
            }
        } catch (e) {
            console.error('Admin notification error:', e);
            toast.error(e.message || 'Failed to send notification');
        } finally {
            setSending(prev => ({ ...prev, [departmentName]: false }));
        }
    };

    // Send reminders to ALL departments with pending
    const sendAllReminders = async () => {
        if (departmentsWithPending.length === 0) return;

        setSendingAll(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const res = await fetch('/api/admin/send-reminder', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    departmentName: 'all',
                    departmentStats: departmentsWithPending
                })
            });

            const json = await res.json();
            if (json.success) {
                toast.success(`Reminders sent to ${json.sentCount} departments!`);
                setIsOpen(false);
            } else {
                throw new Error(json.error || 'Failed to send reminders');
            }
        } catch (e) {
            console.error('Send all reminders error:', e);
            toast.error(e.message || 'Failed to send reminders');
        } finally {
            setSendingAll(false);
        }
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-3 min-h-[44px] min-w-[44px] rounded-xl transition-all active:scale-95 ${totalPending > 0
                    ? 'bg-yellow-100 dark:bg-yellow-500/20 border border-yellow-300 dark:border-yellow-500/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-500/30'
                    : 'bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/20'
                    }`}
                title={`${totalPending} pending applications`}
            >
                <Bell className={`w-5 h-5 ${totalPending > 0 ? 'animate-pulse' : ''}`} />

                {/* Badge */}
                {totalPending > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-jecrc-red text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                        {totalPending > 99 ? '99+' : totalPending}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-gray-100 dark:border-white/10 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                                    <h3 className="font-bold text-gray-900 dark:text-white">Pending Applications</h3>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {totalPending} total across {departmentsWithPending.length} departments
                            </p>
                        </div>

                        {/* Department List */}
                        <div className="max-h-64 overflow-y-auto p-2">
                            {departmentsWithPending.length === 0 ? (
                                <div className="p-6 text-center">
                                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">All caught up! No pending applications.</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {departmentsWithPending.map((dept) => (
                                        <div
                                            key={dept.department_name}
                                            className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                        >
                                            <div className="flex-1">
                                                <h4 className="font-medium text-gray-900 dark:text-white capitalize text-sm">
                                                    {dept.department_name.replace(/_/g, ' ')}
                                                </h4>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{dept.pending_count} pending</span>
                                                    {dept.avg_hours && (
                                                        <span>• ~{Math.round(dept.avg_hours)}h avg</span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => sendReminder(dept.department_name)}
                                                disabled={sending[dept.department_name]}
                                                className="p-2 text-jecrc-red hover:bg-jecrc-red/10 rounded-lg transition-colors disabled:opacity-50"
                                                title="Send reminder"
                                            >
                                                {sending[dept.department_name] ? (
                                                    <div className="w-4 h-4 border-2 border-jecrc-red/30 border-t-jecrc-red rounded-full animate-spin" />
                                                ) : (
                                                    <Send className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer - Send All Button */}
                        {departmentsWithPending.length > 0 && (
                            <div className="p-3 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                                <button
                                    onClick={sendAllReminders}
                                    disabled={sendingAll}
                                    className="w-full py-3 bg-jecrc-red hover:bg-jecrc-red-dark text-white rounded-xl font-medium transition-all shadow-lg shadow-jecrc-red/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {sendingAll ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Remind All Departments ({departmentsWithPending.length})
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
