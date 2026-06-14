'use client';

import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "react-hot-toast";
import GlobalBackground from "@/components/ui/GlobalBackground";
import ScrollProgress from "@/components/ui/ScrollProgress";

/**
 * ClientProviders - Wraps the entire app with context providers
 * Includes global UI elements: Background, Toast notifications, Scroll progress
 */
export default function ClientProviders({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        {/* Global Fixed Background - renders once for entire app */}
        <GlobalBackground />
        
        {/* Scroll Progress Indicator - shows at top of page */}
        <ScrollProgress />
        
        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'dark:bg-[#1a1a1a] dark:text-white dark:border dark:border-white/15',
            style: {
              borderRadius: '10px',
              background: '#1f1f1f',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
            },
            success: {
              iconTheme: {
                primary: '#00FF88',
                secondary: 'black',
              },
            },
          }}
        />
        
        {/* Content container - scrollable above background */}
        <div className="relative z-10">
          {children}
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}