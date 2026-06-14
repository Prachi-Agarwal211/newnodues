'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Enhanced Theme Toggle Button with Liquid Effects (matches EnhancedSupportButton)
 * - Orbital floating animation
 * - Liquid glow on hover
 * - Pulsing ring animation
 * - Device-tier aware performance
 * - Positioned above support button with proper spacing
 */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [deviceTier, setDeviceTier] = useState('high');

  // Provide default theme during SSR/initial render
  const currentTheme = theme || 'dark';
  const isDark = currentTheme === 'dark';

  useEffect(() => {
    const detectDevice = () => {
      const isMobile = window.innerWidth < 768;
      const isVeryLowEnd = (navigator.deviceMemory && navigator.deviceMemory < 2) ||
        (navigator.connection && navigator.connection.saveData);
      const isLowEnd = isMobile || (navigator.deviceMemory && navigator.deviceMemory < 4);

      if (isVeryLowEnd) {
        setDeviceTier('very-low');
      } else if (isLowEnd) {
        setDeviceTier('low');
      } else {
        setDeviceTier('high');
      }
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  return (
    <motion.button
      onClick={toggleTheme}
      className={`
        fixed bottom-24 right-8 w-14 h-14 rounded-full
        flex items-center justify-center z-50 group
        overflow-visible
        ${isDark
          ? 'bg-[#141414] text-white border border-white/10'
          : 'bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-900'
        }
      `}
      style={{
        boxShadow: isDark
          ? '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.06) inset, 0 1px 0 rgba(255, 255, 255, 0.1) inset'
          : '0 10px 30px rgba(0, 0, 0, 0.15), 0 4px 20px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        // Increased touch target for mobile (invisible padding)
        padding: '8px'
      }}
      initial={{ scale: 0, rotate: -180 }}
      animate={{
        scale: 1,
        rotate: 0,
        y: deviceTier === 'high' ? [0, -8, 0] : 0
      }}
      transition={{
        type: "spring",
        stiffness: 200,
        y: deviceTier === 'high' ? {
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        } : {}
      }}
      whileHover={deviceTier !== 'very-low' ? {
        scale: 1.15,
        rotate: deviceTier === 'high' ? 5 : 0,
        transition: { duration: 0.3 }
      } : {}}
      whileTap={{ scale: 0.95 }}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Pulsing Ring - DEVICE-AWARE */}
      {deviceTier !== 'very-low' && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full border-2 opacity-75"
            style={{
              borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(100, 100, 100, 0.4)'
            }}
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.75, 0, 0.75],
            }}
            transition={{
              duration: deviceTier === 'low' ? 2.5 : 2,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />

          {/* Second Ring - HIGH END ONLY */}
          {deviceTier === 'high' && (
            <motion.div
              className="absolute inset-0 rounded-full border-2"
              style={{
                borderColor: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(100, 100, 100, 0.6)'
              }}
              animate={{
                scale: [1, 1.6, 1],
                opacity: [0.6, 0, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.5
              }}
            />
          )}
        </>
      )}

      {/* Liquid Glow on Hover - HIGH END ONLY */}
      {deviceTier === 'high' && (
        <motion.div
          className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100"
          style={{
            background: isDark
              ? 'radial-gradient(circle, rgba(255, 223, 0, 0.4) 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%)'
              : 'radial-gradient(circle, rgba(196, 30, 58, 0.4) 0%, rgba(255, 182, 193, 0.3) 50%, transparent 100%)',
            filter: 'blur(20px)',
            transform: 'scale(1.5)'
          }}
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Icon with animation */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentTheme}
          initial={{ y: -20, opacity: 0, rotate: -90 }}
          animate={{
            y: 0,
            opacity: 1,
            rotate: 0,
            scale: deviceTier !== 'very-low' ? [1, 1.1, 1] : 1
          }}
          exit={{ y: 20, opacity: 0, rotate: 90 }}
          transition={{
            duration: 0.3,
            ease: "easeOut",
            scale: deviceTier !== 'very-low' ? {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            } : {}
          }}
          className="relative z-10"
        >
          {isDark ? (
            <Sun size={24} className="group-hover:text-yellow-300 transition-colors duration-300" strokeWidth={2} />
          ) : (
            <Moon size={24} className="group-hover:text-jecrc-red transition-colors duration-300" strokeWidth={2} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Shimmer Effect on Icon - HIGH END ONLY */}
      {deviceTier === 'high' && (
        <motion.div
          className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)'
              : 'linear-gradient(135deg, transparent 0%, rgba(196, 30, 58, 0.3) 50%, transparent 100%)',
          }}
          initial={{ opacity: 0, rotate: -45 }}
          whileHover={{ opacity: [0, 1, 0], rotate: 135 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
      )}
    </motion.button>
  );
}