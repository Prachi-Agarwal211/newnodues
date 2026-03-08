'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Enhanced ActionCard with Premium Liquid Effects
 * - Liquid ripple effect on hover (follows mouse)
 * - Animated gradient backgrounds
 * - Enhanced shadows and glows
 * - Text gradient animations
 * - Optimized for 60 FPS performance
 */
function EnhancedActionCard({ title, subtitle, icon: Icon, onClick, index }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const cardRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [magneticOffset, setMagneticOffset] = useState({ x: 0, y: 0 });
  const [gradientReady, setGradientReady] = useState(false);

  // Device capability detection for progressive animation
  const [deviceTier, setDeviceTier] = useState('high');

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

  // Throttled mouse tracking for liquid ripple (16ms = 60 FPS)
  useEffect(() => {
    if (deviceTier === 'very-low' || !cardRef.current) return;

    let rafId = null;
    let lastUpdate = 0;

    const handleMouseMove = (e) => {
      const now = Date.now();
      if (now - lastUpdate < 16) return; // Throttle to 60 FPS

      if (rafId) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        if (!cardRef.current) return; // Guard against unmount
        const rect = cardRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        lastUpdate = now;
      });
    };

    const card = cardRef.current;
    card.addEventListener('mousemove', handleMouseMove);

    return () => {
      // Cancel RAF BEFORE removing listener to prevent leaks
      if (rafId) cancelAnimationFrame(rafId);
      card.removeEventListener('mousemove', handleMouseMove);
    };
  }, [deviceTier]);

  // Spring physics configuration - adjusted for device tier
  const springConfig = {
    type: "spring",
    stiffness: deviceTier === 'very-low' ? 200 : deviceTier === 'low' ? 230 : 260,
    damping: deviceTier === 'very-low' ? 25 : deviceTier === 'low' ? 22 : 20
  };

  // Animation durations based on device tier
  const animationDuration = deviceTier === 'very-low' ? 0.3 : deviceTier === 'low' ? 0.4 : 0.5;
  const hoverDuration = deviceTier === 'very-low' ? 0.2 : deviceTier === 'low' ? 0.25 : 0.3;

  // Magnetic effect - card follows cursor slightly (high-end only)
  useEffect(() => {
    if (deviceTier !== 'high' || !cardRef.current) return;

    const handleGlobalMouseMove = (e) => {
      if (!isHovering) {
        setMagneticOffset({ x: 0, y: 0 });
        return;
      }

      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate distance from card center
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      // Apply subtle magnetic pull (max 12px)
      const magnetStrength = 0.15;
      setMagneticOffset({
        x: Math.max(-12, Math.min(12, deltaX * magnetStrength)),
        y: Math.max(-12, Math.min(12, deltaY * magnetStrength))
      });
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [isHovering, deviceTier]);

  return (
    <motion.button
      ref={cardRef}
      onClick={onClick}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: animationDuration,
        delay: 0.05 + index * (deviceTier === 'very-low' ? 0.05 : 0.08),
        ease: [0.22, 1, 0.36, 1]
      }}
      whileHover={deviceTier !== 'very-low' ? {
        y: deviceTier === 'low' ? -6 : -8,
        scale: deviceTier === 'low' ? 1.01 : 1.02,
        transition: { duration: hoverDuration, ease: "easeOut" }
      } : {}}
      whileTap={deviceTier !== 'very-low' ? {
        scale: 0.98,
        transition: { duration: 0.15 }
      } : {}}
      style={{
        transform: `translate3d(${magneticOffset.x}px, ${magneticOffset.y}px, 0)`,
        transition: isHovering ? 'none' : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
        willChange: 'transform',
        boxShadow: isDark ? (
          isHovering
            ? '0 20px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            : '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
        ) : (
          isHovering
            ? '0 20px 50px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
            : '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
        )
      }}
      className={`
        interactive group relative
        w-full min-h-[320px]
        overflow-hidden text-left
        p-7 sm:p-8 md:p-9
        flex flex-col justify-between
        transition-all duration-300 ease-out
        rounded-2xl
        touch-manipulation
        backdrop-blur-xl
        ${isDark
          ? 'bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/20'
          : 'bg-white/40 hover:bg-white/60 border border-white/50 hover:border-white/70'
        }
      `}
    >
      {/* 1. Liquid Ripple Effect (Mouse Follow) - HIGH END ONLY */}
      {deviceTier === 'high' && isHovering && (
        <motion.div
          className="absolute pointer-events-none rounded-full"
          style={{
            left: mousePosition.x,
            top: mousePosition.y,
            width: '400px',
            height: '400px',
            marginLeft: '-200px',
            marginTop: '-200px',
            background: isDark
              ? 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 20%, transparent 60%)'
              : 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.2) 30%, transparent 60%)',
            filter: 'blur(40px)',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      )}

      {/* 2. Holographic Foil Effect - Rainbow reflection */}
      {deviceTier === 'high' && isHovering && (
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-40 pointer-events-none animate-holographic"
          style={{
            background: isDark
              ? 'linear-gradient(125deg, transparent 0%, rgba(255,255,255,0.05) 20%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 80%, transparent 100%)'
              : 'linear-gradient(125deg, transparent 0%, rgba(255,255,255,0.6) 20%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.6) 80%, transparent 100%)',
            backgroundSize: '200% 200%',
          }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      )}

      {/* 3. Animated Gradient Mesh - DEVICE-AWARE */}
      {deviceTier !== 'very-low' && (
        <motion.div
          className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${deviceTier === 'low' ? 'duration-500' : 'duration-700'
            } pointer-events-none`}
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 40%, rgba(255, 255, 255, 0.05) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, transparent 50%, rgba(255, 255, 255, 0.3) 100%)',
          }}
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: deviceTier === 'low' ? 0.5 : 0.7 }}
        />
      )}

      {/* 4. Animated Metallic Border */}
      {deviceTier === 'high' && isHovering && (
        <motion.div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none animate-border-sweep"
          style={{
            background: isDark
              ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), rgba(255,255,255,0.4), rgba(255,255,255,0.2), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), rgba(255,255,255,0.9), rgba(255,255,255,0.6), transparent)',
            backgroundSize: '200% 100%',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
            padding: '1.5px',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
      )}

      {/* 5. Top Accent Line with Enhanced Glow - DEVICE-AWARE */}
      {deviceTier !== 'very-low' && (
        <motion.div
          className="absolute top-0 left-0 w-full h-[1px] opacity-0 group-hover:opacity-100"
          style={{
            background: isDark
              ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)'
              : 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.9) 50%, transparent 100%)',
            boxShadow: isDark && deviceTier === 'high'
              ? '0 0 8px rgba(255, 255, 255, 0.3)'
              : 'none'
          }}
          initial={{ scaleX: 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ duration: deviceTier === 'low' ? 0.5 : 0.6, ease: "easeOut" }}
        />
      )}

      {/* 6. Corner Glow - DEVICE-AWARE */}
      {deviceTier !== 'very-low' && (
        <motion.div
          className={`absolute bottom-0 right-0 w-40 h-40 rounded-full ${deviceTier === 'low' ? 'blur-2xl' : 'blur-3xl'
            } opacity-0 group-hover:opacity-100 ${isDark ? 'bg-white/10' : 'bg-white/40'
            }`}
          style={isDark && deviceTier === 'high' ? {
            boxShadow: '0 0 40px rgba(255, 255, 255, 0.15)'
          } : {}}
          initial={{ scale: 0.5, opacity: 0 }}
          whileHover={{ scale: 1, opacity: 1 }}
          transition={{ duration: deviceTier === 'low' ? 0.5 : 0.7 }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">
        {/* Enhanced Icon with Liquid Glow */}
        <motion.div
          className={`
            relative w-14 h-14 mb-6
            flex items-center justify-center
            rounded-2xl
            transition-all duration-500 ease-spring
            backdrop-blur-sm
            ${isDark
              ? 'bg-white/10 text-white/80 group-hover:bg-white/20 group-hover:text-white'
              : 'bg-white/60 text-gray-600 group-hover:bg-white/80 group-hover:text-gray-900'
            }
          `}
          style={isHovering && isDark ? {
            boxShadow: '0 0 20px rgba(255, 255, 255, 0.15), inset 0 0 12px rgba(255, 255, 255, 0.05)'
          } : isHovering ? {
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.1)'
          } : {}}
          whileHover={deviceTier !== 'very-low' ? {
            scale: deviceTier === 'low' ? 1.1 : 1.15,
            rotate: deviceTier === 'low' ? 3 : 5,
            transition: springConfig
          } : {}}
        >
          {/* Icon shimmer effect - Skip on very low-end */}
          {deviceTier !== 'very-low' && (
            <motion.div
              className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100"
              initial={{ opacity: 0, scale: 0.8 }}
              whileHover={{ opacity: 1, scale: 1 }}
              transition={{ duration: deviceTier === 'low' ? 0.4 : 0.5 }}
            />
          )}
          <Icon size={24} strokeWidth={1.5} className="relative z-10" />
        </motion.div>

        {/* Enhanced Title with Gradient - FIXED: Only apply transparent when gradient is ready */}
        <h2
          className={`font-serif text-2xl sm:text-2xl md:text-3xl mb-2 sm:mb-3 font-bold transition-all duration-300 ${isDark ? 'text-white' : 'text-gray-900'
            }`}
          style={isDark ? {
            filter: isHovering
              ? 'drop-shadow(0 1px 4px rgba(255, 255, 255, 0.2))'
              : 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.4))'
          } : {
            filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))'
          }}
        >
          {title}
        </h2>

        {/* Enhanced Subtitle - MINIMAL SHADOW */}
        <p
          className={`font-sans text-sm sm:text-base font-medium leading-relaxed transition-all duration-300 ${isDark ? 'text-gray-200 group-hover:text-white' : 'text-gray-600 group-hover:text-gray-800'
            }`}
          style={isDark ? {
            filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5))'
          } : {
            filter: 'none'
          }}
        >
          {subtitle}
        </p>
      </div>

      {/* Enhanced CTA - MINIMAL SHADOW */}
      <motion.div
        className={`relative z-10 flex items-center gap-3 text-xs font-bold tracking-[0.25em] uppercase transition-all duration-300 ${isDark
          ? 'text-gray-400 group-hover:text-white'
          : 'text-gray-500 group-hover:text-gray-700'
          }`}
        style={isDark ? {
          filter: isHovering
            ? 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.2))'
            : 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4))'
        } : {
          filter: 'none'
        }}
        whileHover={{ x: 4 }}
        transition={springConfig}
      >
        <span>Proceed</span>
        <motion.div
          animate={{ x: [0, 4, 0] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
        >
          <ChevronRight size={14} />
        </motion.div>
      </motion.div>
    </motion.button>
  );
}

// Memoize to prevent unnecessary re-renders
export default React.memo(EnhancedActionCard);