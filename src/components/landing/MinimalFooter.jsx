'use client';

import { useTheme } from '@/contexts/ThemeContext';
import Button from '@/components/ui/Button';
import ScrollReveal from '@/components/ui/ScrollReveal';

/**
 * MinimalFooter - Consistent "Developed and Maintained by" footer
 * Used on public-facing pages. Matches the style introduced on the main landing page.
 */
export default function MinimalFooter() {
  const { theme } = useTheme();
  const currentTheme = theme || 'light';
  const isDark = currentTheme === 'dark';

  return (
    <ScrollReveal animation="fade" delay={0.3}>
      <footer className="mt-auto mb-3 sm:mb-6 flex flex-col items-center gap-3 opacity-80 hover:opacity-100 transition-opacity duration-500">
        <a
          href="https://www.reverbex.in"
          target="_blank"
          rel="noreferrer"
          className="group"
        >
          <Button variant="secondary" className="px-5 py-2 text-sm">
            Developed and Maintained by Reverbex Technologies
          </Button>
        </a>
        <div
          className={`font-sans text-[9px] tracking-[0.3em] uppercase transition-colors duration-700 ease-smooth ${isDark ? 'text-gray-400' : 'text-gray-900'}`}
          style={isDark ? {
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)'
          } : {
            textShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
          }}>
          JECRC University, Jaipur
        </div>
      </footer>
    </ScrollReveal>
  );
}
