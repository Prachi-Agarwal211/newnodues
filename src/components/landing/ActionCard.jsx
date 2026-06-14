'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

function ActionCard({ title, subtitle, icon: Icon, onClick, index }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
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
  
  // Spring physics configuration - adjusted for device tier
  const springConfig = {
    type: "spring",
    stiffness: deviceTier === 'very-low' ? 200 : deviceTier === 'low' ? 230 : 260,
    damping: deviceTier === 'very-low' ? 25 : deviceTier === 'low' ? 22 : 20
  };
  
  // Animation durations based on device tier
  const animationDuration = deviceTier === 'very-low' ? 0.3 : deviceTier === 'low' ? 0.4 : 0.5;
  const hoverDuration = deviceTier === 'very-low' ? 0.2 : deviceTier === 'low' ? 0.25 : 0.3;
  
  return (
    <motion.button
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
      onClick={onClick}
      className={`
        interactive group relative
        w-full min-h-[280px] sm:min-h-[300px] md:min-h-[320px]
        overflow-hidden text-left
        p-7 sm:p-8 md:p-9
        flex flex-col justify-between
        transition-all duration-300 ease-out
        border backdrop-blur-md rounded-xl
        touch-manipulation
        ${isDark
          ? 'bg-white/[0.035] hover:bg-white/[0.065] border-white/12 shadow-xl hover:shadow-2xl hover:border-white/22'
          : 'bg-gradient-to-br from-gray-50 via-white to-gray-100 hover:from-white hover:via-gray-50 hover:to-white border-black/10 shadow-md hover:shadow-lg hover:border-black/20'
        }
      `}
      style={isDark ? {
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45), inset 0 0 0 1px rgba(255,255,255,0.04)'
      } : {}}
    >
      {/* Animated gradient overlays - DEVICE-AWARE */}
      {deviceTier !== 'very-low' && (
        <motion.div
          className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${
            deviceTier === 'low' ? 'duration-500' : 'duration-700'
          } pointer-events-none ${
            isDark
              ? 'bg-gradient-to-br from-jecrc-red/20 via-transparent to-purple-600/10'
              : 'bg-gradient-to-br from-transparent via-transparent to-jecrc-red/10'
          }`}
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: deviceTier === 'low' ? 0.5 : 0.7 }}
        />
      )}
      
      {/* Top accent line - DEVICE-AWARE GLOW */}
      {deviceTier !== 'very-low' && (
        <motion.div
          className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-jecrc-red to-transparent opacity-0 group-hover:opacity-100"
          style={isDark && deviceTier === 'high' ? {
            boxShadow: '0 0 20px rgba(196, 30, 58, 0.8), 0 0 40px rgba(196, 30, 58, 0.4)'
          } : {}}
          initial={{ scaleX: 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ duration: deviceTier === 'low' ? 0.5 : 0.6, ease: "easeOut" }}
        />
      )}
      
      {/* Corner glow - DEVICE-AWARE */}
      {deviceTier !== 'very-low' && (
        <motion.div
          className={`absolute bottom-0 right-0 w-40 h-40 rounded-full ${
            deviceTier === 'low' ? 'blur-2xl' : 'blur-3xl'
          } opacity-0 group-hover:opacity-100 ${
            isDark ? 'bg-jecrc-red/20' : 'bg-jecrc-red/10'
          }`}
          style={isDark && deviceTier === 'high' ? {
            boxShadow: '0 0 80px rgba(196, 30, 58, 0.4)'
          } : {}}
          initial={{ scale: 0.5, opacity: 0 }}
          whileHover={{ scale: 1, opacity: 1 }}
          transition={{ duration: deviceTier === 'low' ? 0.5 : 0.7 }}
        />
      )}
      
      {/* Content */}
      <div className="relative z-10">
        <motion.div 
          className={`
            relative w-14 h-14 mb-6
            flex items-center justify-center
            rounded-2xl
            transition-all duration-500 ease-spring
            ${isDark
              ? 'bg-white/5 text-white group-hover:bg-gradient-to-br group-hover:from-jecrc-red group-hover:to-jecrc-red-dark group-hover:shadow-neon-red'
              : 'bg-black/5 text-black group-hover:bg-gradient-to-br group-hover:from-jecrc-red group-hover:to-jecrc-red-dark group-hover:text-white group-hover:shadow-lg'
            }
          `}
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
        
        <h2
          className={`font-serif text-2xl sm:text-2xl md:text-3xl mb-2 sm:mb-3 transition-colors duration-300 ${
            isDark ? 'text-white' : 'text-ink-black'
          }`}
          style={isDark ? {
            textShadow: '0 0 30px rgba(255, 255, 255, 0.3), 0 2px 10px rgba(0, 0, 0, 0.8)'
          } : {}}
        >
          {title}
        </h2>
        
        <p
          className={`font-sans text-sm sm:text-base font-medium leading-relaxed transition-colors duration-300 ${
            isDark ? 'text-gray-300 group-hover:text-gray-200' : 'text-gray-700 group-hover:text-gray-800'
          }`}
          style={isDark ? {
            textShadow: '0 0 20px rgba(255, 255, 255, 0.2), 0 2px 8px rgba(0, 0, 0, 0.6)'
          } : {}}
        >
          {subtitle}
        </p>
      </div>

      {/* CTA with animated arrow */}
      <motion.div
        className={`relative z-10 flex items-center gap-3 text-xs font-bold tracking-[0.25em] uppercase transition-colors duration-500
          ${isDark
            ? 'text-gray-400 group-hover:text-jecrc-red-bright'
            : 'text-gray-800 group-hover:text-jecrc-red'
          }`}
        style={isDark ? {
          textShadow: '0 0 15px rgba(255, 255, 255, 0.2)'
        } : {
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
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

// Memoize to prevent unnecessary re-renders (landing page is static)
export default React.memo(ActionCard);