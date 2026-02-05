'use client';

import ThemeToggle from './ThemeToggle';
import EnhancedSupportButton from '@/components/landing/EnhancedSupportButton';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * PageWrapper - Layout wrapper for landing pages
 * Note: GlobalBackground is rendered once in ClientProviders to avoid duplication
 */
export default function PageWrapper({ children, showThemeToggle = true, showSupportButton = true }) {
  const { theme } = useTheme();

  // Provide default theme during SSR/initial render (match ThemeProvider default)
  const currentTheme = theme || 'light';
  const isDark = currentTheme === 'dark';

  return (
    <>
      {showThemeToggle && <ThemeToggle />}

      {/* Floating Support Button - Shows on all pages by default */}
      {showSupportButton && <EnhancedSupportButton />}

      <div className={`relative transition-colors duration-700 min-h-screen
        ${isDark ? 'text-white' : 'text-ink-black'
        }`}>
        {children}
      </div>
    </>
  );
}
