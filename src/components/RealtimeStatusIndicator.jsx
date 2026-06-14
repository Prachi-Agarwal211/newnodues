'use client';

import { useState, useEffect } from 'react';
import { realtimeService } from '@/lib/supabaseRealtime';
import { realtimeManager } from '@/lib/realtimeManager';

/**
 * Realtime Connection Status Indicator
 * 
 * Shows current realtime connection health in the UI
 * Provides manual reconnect option if connection fails
 */
export function RealtimeStatusIndicator() {
  const [status, setStatus] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    // Update status every 2 seconds
    const interval = setInterval(() => {
      const currentStatus = realtimeService.getStatus();
      setStatus(currentStatus);
    }, 2000);

    // Get initial status
    setStatus(realtimeService.getStatus());

    // Add connection health monitoring
    const healthCheck = setInterval(() => {
      const status = realtimeService.getStatus();
      if (status.status !== 'SUBSCRIBED' && status.subscriberCount > 0) {
        console.warn('⚠️ Realtime connection lost, attempting to reconnect...');
        realtimeService.forceReconnect();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      clearInterval(interval);
      clearInterval(healthCheck);
    };
  }, []);

  if (!status) return null;

  const getStatusColor = () => {
    switch (status.status) {
      case 'SUBSCRIBED':
        return 'bg-green-500';
      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
        return 'bg-red-500';
      case 'CLOSED':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'SUBSCRIBED':
        return 'Live';
      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
        return 'Error';
      case 'CLOSED':
        return 'Disconnected';
      default:
        return 'Connecting...';
    }
  };

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      await realtimeService.forceReconnect();
      setTimeout(() => setIsReconnecting(false), 2000);
    } catch (error) {
      console.error('Reconnect failed:', error);
      setIsReconnecting(false);
    }
  };

  const formatTimeSince = (timestamp) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Main Status Badge */}
      <div
        className="flex items-center gap-2 bg-white dark:bg-[#1a1a1a] rounded-lg shadow-lg px-3 py-2 cursor-pointer hover:shadow-xl transition-shadow"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${status.status === 'SUBSCRIBED' ? 'animate-pulse' : ''}`} />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {getStatusText()}
        </span>
        {status.subscriberCount > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({status.subscriberCount})
          </span>
        )}
      </div>

      {/* Detailed Status Panel */}
      {showDetails && (
        <div className="absolute bottom-full right-0 mb-2 w-80 bg-white dark:bg-[#1a1a1a] rounded-lg shadow-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Realtime Connection
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(false);
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span className={`font-medium ${status.status === 'SUBSCRIBED' ? 'text-green-600' : 'text-red-600'}`}>
                {status.status}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Subscribers:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {status.subscriberCount}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Last Event:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatTimeSince(status.managerHealth.lastEventTime)}
              </span>
            </div>

            {status.reconnectAttempts > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Reconnect Attempts:</span>
                <span className="font-medium text-orange-600">
                  {status.reconnectAttempts}
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Pending Refreshes:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {status.managerHealth.pendingRefreshes}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Queued Events:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {status.managerHealth.queuedEvents}
              </span>
            </div>
          </div>

          {/* Reconnect Button */}
          {status.status !== 'SUBSCRIBED' && (
            <button
              onClick={handleReconnect}
              disabled={isReconnecting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {isReconnecting ? 'Reconnecting...' : 'Reconnect Now'}
            </button>
          )}

          {/* Health Indicator */}
          <div className={`text-xs text-center p-2 rounded ${status.managerHealth.isHealthy
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}>
            {status.managerHealth.isHealthy
              ? '✓ Connection healthy'
              : '⚠ Connection issues detected'}
          </div>

          {/* Debug Info (Development Only) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                Debug Info
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 dark:bg-[#141414] rounded overflow-auto max-h-40">
                {JSON.stringify(status, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Minimal Status Dot (for compact display)
 */
export function RealtimeStatusDot() {
  const [isHealthy, setIsHealthy] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      const status = realtimeService.getStatus();
      setIsHealthy(status.status === 'SUBSCRIBED');
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        }`}
      title={isHealthy ? 'Realtime: Connected' : 'Realtime: Disconnected'}
    />
  );
}