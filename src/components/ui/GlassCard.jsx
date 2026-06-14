'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Clean GlassCard Component
 * Premium styling with proper light/dark mode support
 * Performance optimized - no expensive blur effects
 */

export default function GlassCard({
  children,
  className = "",
  onClick,
  variant = 'default',
  hoverable = true,
  ...props
}) {
  const { theme: currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';

  // Premium styling - elegant surfaces, never flat black. Use subtle glass + depth in dark.
  const getVariantClasses = () => {
    if (isDark) {
      switch (variant) {
        case 'glass':
          return 'bg-white/[0.035] border-white/10 backdrop-blur-xl';
        case 'elegant':
          return 'bg-[#141414] border-white/10';
        case 'premium':
          return 'bg-gradient-to-br from-[#181818] to-[#111111] border-white/10';
        case 'default':
        default:
          return 'bg-[#141414] border-white/8';
      }
    } else {
      switch (variant) {
        case 'glass':
          return 'bg-white/90 border-gray-200';
        case 'elegant':
          return 'bg-white border-gray-200';
        case 'premium':
          return 'bg-gradient-to-br from-white to-gray-50 border-gray-200';
        case 'default':
        default:
          return 'bg-white border-gray-200';
      }
    }
  };

  const cardClasses = `
    relative overflow-hidden rounded-xl p-5
    ${getVariantClasses()}
    ${hoverable ? `hover:shadow-lg hover:scale-[1.002] transition-all duration-300 cursor-pointer ${isDark ? 'hover:bg-white/[0.06] hover:border-white/15' : 'hover:bg-gray-50'}` : ''}
    ${className}
  `;

  return (
    <div
      onClick={onClick}
      className={cardClasses}
      {...props}
    >
      {/* Subtle border accent on hover */}
      <div className={`
        absolute inset-0 rounded-xl border-2 border-transparent
        transition-all duration-300
        ${isDark ? 'hover:border-jecrc-red/20' : 'hover:border-jecrc-red/10'}
        pointer-events-none
      `} />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
