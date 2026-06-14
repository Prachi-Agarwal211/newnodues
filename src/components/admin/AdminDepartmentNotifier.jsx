'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Send, Users, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Admin Department Notification Component
 * Allows admin to send targeted notifications to specific departments
 */
export default function AdminDepartmentNotifier() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState({});
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [customMessage, setCustomMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  // Load departments with pending counts
  const loadDepartments = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/notify-department', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setDepartments(data.departments || []);
      } else {
        setError(data.error || 'Failed to load departments');
      }
    } catch (err) {
      setError(err.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  // Send notification to department
  const sendNotification = async (department) => {
    setSending(prev => ({ ...prev, [department.name]: true }));
    setError('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/notify-department', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          departmentName: department.name,
          customMessage: customMessage.trim() || undefined,
          includeStats: true
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setResults(prev => [{
          id: Date.now(),
          department: department.displayName,
          success: true,
          message: data.message,
          staffNotified: data.staffNotified,
          pendingCount: data.pendingCount,
          timestamp: new Date()
        }, ...prev].slice(0, 5)); // Keep last 5 results
        
        // Refresh departments to update pending counts
        await loadDepartments();
        
        // Reset form
        setSelectedDepartment(null);
        setCustomMessage('');
        setShowMessage(false);
      } else {
        setError(data.error || 'Failed to send notification');
      }
    } catch (err) {
      setError(err.message || 'Failed to send notification');
    } finally {
      setSending(prev => ({ ...prev, [department.name]: false }));
    }
  };

  // Get status icon for department
  const getStatusIcon = (department) => {
    if (department.pendingCount === 0) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (department.pendingCount > 5) {
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    } else {
      return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  // Get status color for department
  const getStatusColor = (department) => {
    if (department.pendingCount === 0) {
      return 'border-green-500 bg-green-50 dark:bg-green-900/20';
    } else if (department.pendingCount > 5) {
      return 'border-red-500 bg-red-50 dark:bg-red-900/20';
    } else {
      return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Department Notifications
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Send targeted notifications to specific departments
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-400">No pending</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-400">1-5 pending</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-400">5+ pending</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-300 text-sm"
        >
          {error}
        </motion.div>
      )}

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((department) => (
          <motion.div
            key={department.name}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`border-2 rounded-xl p-4 transition-all cursor-pointer ${getStatusColor(department)}`}
            onClick={() => setSelectedDepartment(department)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {getStatusIcon(department)}
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {department.displayName}
                </h4>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Users className="w-4 h-4" />
                {department.staffCount}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Pending:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {department.pendingCount}
                </span>
              </div>
              
              {department.canNotify ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    sendNotification(department);
                  }}
                  disabled={sending[department.name]}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {sending[department.name] ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {sending[department.name] ? 'Sending...' : 'Notify'}
                </button>
              ) : (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                  No staff available
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Custom Message Modal */}
      <AnimatePresence>
        {showMessage && selectedDepartment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowMessage(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#141414] rounded-xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Send Custom Message to {selectedDepartment.displayName}
              </h3>
              
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Enter custom message (optional)..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                rows={4}
              />
              
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    sendNotification(selectedDepartment);
                  }}
                  disabled={sending[selectedDepartment.name]}
                  className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {sending[selectedDepartment.name] ? 'Sending...' : 'Send Notification'}
                </button>
                <button
                  onClick={() => {
                    setShowMessage(false);
                    setSelectedDepartment(null);
                    setCustomMessage('');
                  }}
                  className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Notifications</h4>
          <div className="space-y-2">
            {results.map((result) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#141414] rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {result.department}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {result.staffNotified} staff notified • {result.pendingCount} pending
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(result.timestamp).toLocaleTimeString()}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
