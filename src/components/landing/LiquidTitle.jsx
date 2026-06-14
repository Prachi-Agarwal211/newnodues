'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { useEffect, useState, useRef } from 'react';

/**
 * LiquidTitle - Animated gradient title with liquid flow effect
 * - Animated mesh gradient background
 * - Flowing liquid animation
 * - Enhanced glow effects
 * - Optimized for performance (CSS-only on low-end devices)
 */
export default function LiquidTitle() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [deviceTier, setDeviceTier] = useState('high');
  const [gradientReady, setGradientReady] = useState(false);
  const titleRef = useRef(null);

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

  // Wait for gradient to be ready before applying transparency
  useEffect(() => {
    setGradientReady(false);
    const timer = setTimeout(() => setGradientReady(true), 50);
    return () => clearTimeout(timer);
  }, [theme]); // Reset on theme change

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-2"
    >
      {/* Top Label - MINIMAL SHADOW */}
      <span className={`font-sans text-[10px] md:text-xs font-bold tracking-[0.5em] uppercase transition-colors duration-700 ${isDark ? 'text-jecrc-red-bright' : 'text-jecrc-red-dark'
        }`}
        style={{
          textShadow: isDark
            ? '0 0 6px rgba(196, 30, 58, 0.35)'
            : 'none'
        }}>
        Student Services
      </span>

      {/* Main Title with Chrome Metallic Effect */}
      <div className="relative">
        {/* Pulsing Halo Effect - HIGH END ONLY */}
        {deviceTier === 'high' && (
          <motion.div
            className="absolute inset-0 -z-10"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              background: isDark
                ? 'radial-gradient(ellipse at center, rgba(196,30,58,0.4) 0%, rgba(255,51,102,0.2) 40%, transparent 70%)'
                : 'radial-gradient(ellipse at center, rgba(196,30,58,0.3) 0%, rgba(139,0,0,0.15) 40%, transparent 70%)',
              filter: 'blur(60px)',
              transform: 'translate3d(0,0,0)', // Hardware acceleration
              willChange: 'transform, opacity'
            }}
          />
        )}

        {/* Background Glow Layer - HIGH END ONLY */}
        {deviceTier === 'high' && isDark && (
          <motion.div
            className="absolute inset-0 blur-3xl opacity-50 -z-10"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              background: 'radial-gradient(circle, rgba(196, 30, 58, 0.6) 0%, rgba(255, 51, 102, 0.3) 50%, transparent 100%)',
            }}
          />
        )}

        {/* Chrome Metallic Title Text - FIXED: Only apply transparent when gradient is ready */}
        <h1
          ref={titleRef}
          className={`font-serif text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight relative z-10 transition-all duration-700 ${isDark ? 'text-white' : 'text-gray-900'
            }`}
          style={isDark ? {
            backgroundImage: deviceTier !== 'very-low' && gradientReady
              ? 'linear-gradient(145deg, #ff3366 0%, #ffffff 20%, #ff6b89 30%, #c41e3a 50%, #ff3366 70%, #ffffff 85%, #c41e3a 100%)'
              : undefined,
            backgroundSize: '300% 300%',
            backgroundClip: deviceTier !== 'very-low' && gradientReady ? 'text' : undefined,
            WebkitBackgroundClip: deviceTier !== 'very-low' && gradientReady ? 'text' : undefined,
            WebkitTextFillColor: deviceTier !== 'very-low' && gradientReady ? 'transparent' : undefined,
            filter: deviceTier === 'high'
              ? 'drop-shadow(0 0 18px rgba(255,51,102,0.35)) drop-shadow(0 2px 3px rgba(0,0,0,0.55))'
              : 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.5))',
            animation: deviceTier === 'high' && gradientReady ? 'chrome-shine 6s ease-in-out infinite' : 'none'
          } : {
            backgroundImage: deviceTier !== 'very-low' && gradientReady
              ? 'linear-gradient(145deg, #ffffff 0%, #8b0000 20%, #c41e3a 35%, #1f2937 55%, #c41e3a 70%, #8b0000 85%, #ffffff 100%)'
              : undefined,
            backgroundSize: '300% 300%',
            backgroundClip: deviceTier !== 'very-low' && gradientReady ? 'text' : undefined,
            WebkitBackgroundClip: deviceTier !== 'very-low' && gradientReady ? 'text' : undefined,
            WebkitTextFillColor: deviceTier !== 'very-low' && gradientReady ? 'transparent' : undefined,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            animation: deviceTier === 'high' && gradientReady ? 'chrome-shine 6s ease-in-out infinite' : 'none'
          }}
        >
          NO DUES
        </h1>
      </div>

      {/* Decorative Line with Liquid Flow */}
      <div className="relative h-[1px] w-20 mt-3 overflow-hidden">
        <div className={`absolute inset-0 transition-colors duration-700 ease-smooth ${isDark ? 'bg-white/20' : 'bg-black/10'
          }`}></div>

        {/* Animated Gradient Line */}
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{
            repeat: Infinity,
            duration: deviceTier === 'very-low' ? 3 : 2,
            ease: "linear"
          }}
          className="absolute inset-0"
          style={{
            background: isDark
              ? 'linear-gradient(90deg, transparent 0%, rgba(196, 30, 58, 0.7) 30%, rgba(255, 51, 102, 0.9) 50%, rgba(196, 30, 58, 0.7) 70%, transparent 100%)'
              : 'linear-gradient(90deg, transparent 0%, rgba(196, 30, 58, 0.5) 30%, rgba(196, 30, 58, 0.8) 50%, rgba(196, 30, 58, 0.5) 70%, transparent 100%)',
            boxShadow: isDark && deviceTier === 'high'
              ? '0 0 6px rgba(196, 30, 58, 0.4)'
              : 'none'
          }}
        />
      </div>

    </motion.div>
  );
}