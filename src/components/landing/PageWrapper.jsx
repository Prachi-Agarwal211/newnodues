'use client';

import ThemeToggle from './ThemeToggle';
import EnhancedSupportButton from '@/components/landing/EnhancedSupportButton';
import Button from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * PageWrapper - Layout wrapper for pages
 * Note: GlobalBackground is rendered once in ClientProviders to avoid duplication.
 *
 * Includes a persistent floating "Developed and Maintained by" credit button
 * (bottom-right) on pages that use this wrapper.
 */
export default function PageWrapper({ children, showThemeToggle = true, showSupportButton = true, showDeveloperCredit = true }) {
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

        {/* Persistent floating developer credit */}
        {showDeveloperCredit && (
          <a
            href="https://www.reverbex.in"
            target="_blank"
            rel="noreferrer"
            className="fixed bottom-6 right-6 z-40"
          >
            <Button variant="secondary" className="shadow-lg px-5 py-2 text-sm">
              Developed and Maintained by Reverbex Technologies
            </Button>
          </a>
        )}
      </div>
    </>
  );
}
