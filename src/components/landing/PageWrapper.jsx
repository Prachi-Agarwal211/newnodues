'use client';

import ThemeToggle from './ThemeToggle';
import EnhancedSupportButton from '@/components/landing/EnhancedSupportButton';
import Button from '@/components/ui/Button';
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

        <a
          href="https://www.reverbex.in"
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-6 right-6 z-40"
        >
          <Button variant="secondary" className="shadow-lg px-4 py-2 text-sm">
            Know the Developers
          </Button>
        </a>
      </div>
    </>
  );
}
