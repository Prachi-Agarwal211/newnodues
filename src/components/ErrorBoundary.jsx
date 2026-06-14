'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { 
      hasError: true,
      error: error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error, errorInfo) {
    // Enhanced error logging
    console.error('❌ Error Boundary caught an error:', {
      error,
      errorInfo,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.props.name || 'Unnamed',
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
      url: typeof window !== 'undefined' ? window.location.href : 'SSR'
    });

    this.setState({
      errorInfo,
      error: error,
      hasError: true
    });

    // Report error to monitoring
    this.reportError(error, errorInfo);
  }

  reportError = (error, errorInfo) => {
    try {
      // Google Analytics error tracking
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'exception', {
          description: error.message,
          fatal: false,
          custom_map: {
            component: this.props.name || 'Unknown',
            stack: errorInfo.componentStack?.substring(0, 200) || 'No stack available'
          }
        });
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  handleRetry = () => {
    const { retryCount } = this.state;
    const maxRetries = 3;

    if (retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    } else {
      console.error('Maximum retry attempts reached');
    }
  };

  handleReset = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
  };

  goHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  goBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  render() {
    const { error, errorInfo, retryCount } = this.state;
    const { fallback, showRetry = true, showHome = true, showBack = true } = this.props;
    
    // Simple theme detection without hook for class component
    const isDark = typeof window !== 'undefined' && 
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (this.state.hasError) {
      // Custom fallback component
      if (fallback && typeof fallback === 'function') {
        return fallback(error, errorInfo, this.handleReset);
      }

      return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${
          isDark ? 'bg-[#141414]' : 'bg-gray-50'
        }`}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className={`max-w-lg w-full p-8 rounded-2xl shadow-2xl ${
              isDark 
                ? 'bg-[#1a1a1a] border border-red-500/20' 
                : 'bg-white border border-red-200'
            }`}
          >
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  isDark ? 'bg-red-500/10' : 'bg-red-100'
                }`}
              >
                <AlertTriangle className={`w-8 h-8 ${
                  isDark ? 'text-red-400' : 'text-red-600'
                }`} />
              </motion.div>
            </div>

            {/* Error Title */}
            <h2 className={`text-2xl font-bold text-center mb-4 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Oops! Something went wrong
            </h2>

            {/* Error Message */}
            <div className={`text-center mb-6 p-4 rounded-lg ${
              isDark ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-100 text-gray-600'
            }`}>
              <p className="mb-2">
                {error?.message || 'An unexpected error occurred'}
              </p>
              
              {process.env.NODE_ENV === 'development' && error && (
                <details className="text-left mt-4">
                  <summary className="cursor-pointer font-mono text-sm underline">
                    Technical Details
                  </summary>
                  <div className="mt-2 text-xs font-mono bg-black/5 dark:bg-white/10 p-2 rounded overflow-auto max-h-32">
                    <div><strong>Error:</strong> {error.toString()}</div>
                    {errorInfo && (
                      <div className="mt-2">
                        <strong>Component Stack:</strong>
                        <pre className="whitespace-pre-wrap">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                    {error.stack && (
                      <div className="mt-2">
                        <strong>Stack Trace:</strong>
                        <pre className="whitespace-pre-wrap">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>

            {/* Error ID for support */}
            <div className={`text-center mb-6 text-sm ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Error ID: <code className="font-mono bg-black/10 dark:bg-white/5 px-2 py-1 rounded">
                {this.state.errorId}
              </code>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {showRetry && retryCount < 3 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={this.handleRetry}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isDark
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again {retryCount > 0 && `(${retryCount}/3)`}
                </motion.button>
              )}

              {showBack && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={this.goBack}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isDark
                      ? 'bg-gray-600 hover:bg-gray-700 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Go Back
                </motion.button>
              )}

              {showHome && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={this.goHome}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isDark
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  Home
                </motion.button>
              )}
            </div>

            {/* Retry Limit Message */}
            {retryCount >= 3 && (
              <div className={`text-center mt-4 text-sm ${
                isDark ? 'text-yellow-400' : 'text-yellow-600'
              }`}>
                Maximum retry attempts reached. Please refresh page or contact support.
              </div>
            )}
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized Error Boundaries for different contexts
export const FormErrorBoundary = ({ children, ...props }) => (
  <ErrorBoundary name="FormComponent" {...props}>
    {children}
  </ErrorBoundary>
);

export const DashboardErrorBoundary = ({ children, ...props }) => (
  <ErrorBoundary name="DashboardComponent" {...props}>
    {children}
  </ErrorBoundary>
);

export const APIErrorBoundary = ({ children, ...props }) => (
  <ErrorBoundary 
    name="APIComponent" 
    showRetry={false}
    showHome={true}
    {...props}
  >
    {children}
  </ErrorBoundary>
);

export const StatusTrackerErrorBoundary = ({ children, ...props }) => (
  <ErrorBoundary 
    name="StatusTracker" 
    showRetry={true}
    showBack={true}
    showHome={false}
    {...props}
  >
    {children}
  </ErrorBoundary>
);

// Hook for error handling outside components
export const useErrorHandler = () => {
  const handleError = (error, context = {}) => {
    console.error('❌ Application Error:', { error, context });
    
    // Report to monitoring service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
        custom_map: context
      });
    }
  };

  const handleAsyncError = async (asyncFn, context = {}) => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error, context);
      throw error;
    }
  };

  return { handleError, handleAsyncError };
};

/**
 * withErrorBoundary - HOC to wrap components with error boundary
 * Usage: export default withErrorBoundary(MyComponent);
 */
export function withErrorBoundary(Component) {
  return function WithErrorBoundaryWrapper(props) {
    return (
      <ErrorBoundary>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;
export { ErrorBoundary };