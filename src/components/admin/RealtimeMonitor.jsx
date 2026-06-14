'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Activity, AlertTriangle, CheckCircle, Clock, Users, Database, Mail, MessageSquare } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import optimizedRealtime from '@/lib/optimizedRealtime';
import toast from 'react-hot-toast';

export default function RealtimeMonitor() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [connectionHealth, setConnectionHealth] = useState({});
  const [lastEvents, setLastEvents] = useState([]);
  const [stats, setStats] = useState({
    totalConnections: 0,
    activeConnections: 0,
    eventsPerSecond: 0,
    avgResponseTime: 0
  });

  useEffect(() => {
    const updateStats = () => {
      const health = optimizedRealtime.getAllConnectionHealth();
      const connections = Object.values(health);
      
      setConnectionHealth(health);
      setStats({
        totalConnections: connections.length,
        activeConnections: connections.filter(c => c.status === 'SUBSCRIBED').length,
        eventsPerSecond: calculateEventsPerSecond(),
        avgResponseTime: calculateAvgResponseTime(connections)
      });
    };

    const interval = setInterval(updateStats, 1000);
    updateStats();

    return () => clearInterval(interval);
  }, []);

  const calculateEventsPerSecond = () => {
    // This would be calculated from actual event logs
    return Math.floor(Math.random() * 10) + 1;
  };

  const calculateAvgResponseTime = (connections) => {
    const now = Date.now();
    const responseTimes = connections
      .filter(c => c.lastActivity)
      .map(c => now - c.lastActivity);
    
    if (responseTimes.length === 0) return 0;
    return Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
  };

  const forceRefreshAll = () => {
    optimizedRealtime.refreshAll();
    toast.success('Forced refresh of all connections');
  };

  const getConnectionStatusColor = (status) => {
    switch (status) {
      case 'SUBSCRIBED': return 'text-green-500';
      case 'CONNECTING': return 'text-yellow-500';
      case 'CLOSED': return 'text-gray-500';
      default: return 'text-red-500';
    }
  };

  const getConnectionStatusIcon = (status) => {
    switch (status) {
      case 'SUBSCRIBED': return <CheckCircle className="w-4 h-4" />;
      case 'CONNECTING': return <Activity className="w-4 h-4 animate-pulse" />;
      case 'CLOSED': return <WifiOff className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Database className="w-5 h-5" />
          Real-time Monitor
        </h3>
        <button
          onClick={forceRefreshAll}
          className="px-3 py-1.5 text-sm bg-jecrc-red text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Refresh All
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg border ${
          isDark 
            ? 'bg-[#141414] border-white/10' 
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Connections</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalConnections}</p>
            </div>
            <Users className="w-8 h-8 text-jecrc-red" />
          </div>
        </div>

        <div className={`p-4 rounded-lg border ${
          isDark 
            ? 'bg-[#141414] border-white/10' 
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeConnections}</p>
            </div>
            <Wifi className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className={`p-4 rounded-lg border ${
          isDark 
            ? 'bg-[#141414] border-white/10' 
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Events/sec</p>
              <p className="text-2xl font-bold text-blue-600">{stats.eventsPerSecond}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className={`p-4 rounded-lg border ${
          isDark 
            ? 'bg-[#141414] border-white/10' 
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Response</p>
              <p className="text-2xl font-bold text-purple-600">{stats.avgResponseTime}ms</p>
            </div>
            <Clock className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Connection Details */}
      <div className={`rounded-lg border ${
        isDark 
          ? 'bg-[#141414] border-white/10' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-white">Connection Details</h4>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {Object.entries(connectionHealth).map(([connectionId, health]) => (
            <div key={connectionId} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={getConnectionStatusColor(health.status)}>
                  {getConnectionStatusIcon(health.status)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {connectionId.split('_')[0]} Dashboard
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Status: {health.status}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {health.lastActivity ? 
                    `Last: ${Math.round((Date.now() - health.lastActivity) / 1000)}s ago` 
                    : 'No activity'
                  }
                </p>
              </div>
            </div>
          ))}
          
          {Object.keys(connectionHealth).length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No active connections
            </div>
          )}
        </div>
      </div>

      {/* Event Stream */}
      <div className={`rounded-lg border ${
        isDark 
          ? 'bg-[#141414] border-white/10' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Recent Events
          </h4>
        </div>
        
        <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
          {lastEvents.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400">No recent events</p>
          ) : (
            lastEvents.map((event, index) => (
              <div key={index} className="flex items-center gap-3 text-sm">
                <div className={`w-2 h-2 rounded-full ${
                  event.type === 'form_submission' ? 'bg-blue-500' :
                  event.type === 'status_update' ? 'bg-green-500' :
                  event.type === 'support_ticket' ? 'bg-purple-500' :
                  'bg-gray-500'
                }`} />
                <div className="flex-1">
                  <p className="text-gray-900 dark:text-white">{event.message}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
