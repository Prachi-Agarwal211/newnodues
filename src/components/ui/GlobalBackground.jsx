'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Optimized GlobalBackground Component
 * Consolidates functionality from Background.jsx, AuroraBackground.jsx, and FireNebulaBackground.jsx
 * Single, performant background system with theme-aware visuals
 *
 * Performance Features:
 * - CSS-only animations (no JavaScript overhead)
 * - GPU-accelerated transforms
 * - Conditional rendering based on device capabilities
 * - Optimized for mobile devices
 */
export default function GlobalBackground() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLowEnd, setIsLowEnd] = useState(false);
  const [isVeryLowEnd, setIsVeryLowEnd] = useState(false);

  // Prevent hydration mismatch - only render animations after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Detect mobile devices and low-end devices for performance optimization
  useEffect(() => {
    const checkDevice = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      // ✅ PERFORMANCE: Progressive device detection for tiered optimization
      // Very low-end: < 2GB RAM or slow connection
      const veryLowEnd = (typeof navigator !== 'undefined' && navigator.deviceMemory && navigator.deviceMemory < 2) ||
        (typeof navigator !== 'undefined' && navigator.connection && navigator.connection.saveData) ||
        (typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4);

      // Low-end: < 4GB RAM or mobile
      const lowEnd = mobile || (typeof navigator !== 'undefined' && navigator.deviceMemory && navigator.deviceMemory < 4) || veryLowEnd;

      setIsVeryLowEnd(veryLowEnd);
      setIsLowEnd(lowEnd);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);

    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden" style={{ zIndex: -1 }}>
      {/* 1. Base Layer - Prevents white flashes */}
      <div
        className={`absolute inset-0 transition-colors duration-700 z-0 ${isDark ? 'bg-black' : 'bg-white'
          }`}
      />

      {/* 2. JECRC Campus Image (Enhanced Visibility) - Optimized for mobile */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700 z-10"
        style={{
          backgroundImage: "url('/assets/9-1-1536x720.jpg')",
          opacity: isDark
            ? (isMobile ? 0.04 : 0.08)
            : (isMobile ? 0.15 : 0.25),
          mixBlendMode: isDark ? 'screen' : 'multiply',
          filter: isMobile
            ? (isDark ? 'brightness(0.8) contrast(0.9) saturate(0.3) blur(2px)' : 'brightness(1.0) contrast(1.1) saturate(0.8) blur(2px)')
            : (isDark ? 'brightness(0.7) contrast(1.0) saturate(0.3)' : 'brightness(1.0) contrast(1.15) saturate(0.9)'),
          transform: 'translate3d(0,0,0)', // Better GPU acceleration
          willChange: 'opacity'
        }}
      />

      {/* 3. Enhanced Iridescent Gradient Mesh with Morphing - PROGRESSIVE OPTIMIZATION */}
      {!isVeryLowEnd && (
        <div className={`absolute inset-0 transition-opacity duration-700 z-20 ${isDark ? 'opacity-70' : 'opacity-60'
          }`}>
          {/* Top Iridescent Blob with Morphing */}
          <div
            className={`
              absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full
              ${isVeryLowEnd || isLowEnd ? 'animate-blob-slow-simple' : 'animate-morph-blob'}
            `}
            style={{
              background: isDark
                ? 'radial-gradient(ellipse at center, rgba(196,30,58,0.25) 0%, rgba(255,51,102,0.18) 30%, rgba(139,0,139,0.12) 60%, transparent 100%)'
                : 'radial-gradient(ellipse at center, rgba(255,182,193,0.3) 0%, rgba(255,209,217,0.22) 30%, rgba(255,192,203,0.15) 60%, transparent 100%)',
              filter: `blur(${isVeryLowEnd ? '20px' : isLowEnd ? '30px' : isMobile ? '40px' : '60px'})`,
              transform: 'translateZ(0)',
              willChange: isVeryLowEnd || isLowEnd ? 'auto' : 'transform'
            }}
          />

          {/* Top Right Iridescent Blob */}
          <div
            className={`
              absolute top-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full
              ${isVeryLowEnd || isLowEnd ? 'animate-blob-slow-simple animation-delay-2000' : 'animate-morph-blob animation-delay-2000'}
            `}
            style={{
              background: isDark
                ? 'radial-gradient(ellipse at center, rgba(255,51,102,0.22) 0%, rgba(196,30,58,0.18) 30%, rgba(255,182,193,0.10) 60%, transparent 100%)'
                : 'radial-gradient(ellipse at center, rgba(255,192,203,0.28) 0%, rgba(255,182,193,0.20) 30%, rgba(255,209,217,0.12) 60%, transparent 100%)',
              filter: `blur(${isVeryLowEnd ? '20px' : isLowEnd ? '30px' : isMobile ? '40px' : '60px'})`,
              transform: 'translateZ(0)',
              willChange: isVeryLowEnd || isLowEnd ? 'auto' : 'transform',
              animationDelay: '5s'
            }}
          />

          {/* Bottom Blob with Color Shifting - Desktop only */}
          {!isMobile && !isLowEnd && !isVeryLowEnd && (
            <div
              className="absolute bottom-[-20%] left-[10%] w-[50%] h-[50%] rounded-full animate-morph-blob animation-delay-4000"
              style={{
                background: isDark
                  ? 'radial-gradient(ellipse at center, rgba(139,0,139,0.18) 0%, rgba(196,30,58,0.15) 30%, rgba(255,51,102,0.08) 60%, transparent 100%)'
                  : 'radial-gradient(ellipse at center, rgba(219,186,255,0.22) 0%, rgba(255,182,193,0.18) 30%, rgba(255,209,217,0.10) 60%, transparent 100%)',
                filter: 'blur(60px)',
                transform: 'translateZ(0)',
                willChange: 'transform',
                animationDelay: '10s'
              }}
            />
          )}
        </div>
      )}

      {/* 4. Premium Aurora Wave Animation - Smooth flowing ribbons */}
      {!isVeryLowEnd && (
        <div className="absolute inset-0 overflow-hidden z-30" style={{ opacity: isDark ? 0.5 : 0.35 }}>
          {/* Wave 1 - Top flowing ribbon */}
          <div
            className={`absolute top-0 left-0 w-full h-full ${isVeryLowEnd || isLowEnd ? 'animate-aurora-wave-1-simple' : 'animate-aurora-wave-1'
              }`}
            style={{
              background: isDark
                ? 'linear-gradient(90deg, transparent 0%, rgba(196, 30, 58, 0.15) 20%, rgba(255, 105, 180, 0.12) 40%, rgba(196, 30, 58, 0.15) 60%, transparent 80%)'
                : 'linear-gradient(90deg, transparent 0%, rgba(255, 209, 217, 0.2) 20%, rgba(255, 182, 193, 0.18) 40%, rgba(255, 209, 217, 0.2) 60%, transparent 80%)',
              transform: 'translateZ(0) translateY(-50%) rotate(-15deg) scaleY(0.5)',
              transformOrigin: 'center',
              filter: 'blur(30px)',
              willChange: isVeryLowEnd || isLowEnd ? 'auto' : 'transform'
            }}
          />

          {/* Wave 2 - Middle flowing ribbon */}
          <div
            className={`absolute top-1/3 left-0 w-full h-full ${isVeryLowEnd || isLowEnd ? 'animate-aurora-wave-2-simple' : 'animate-aurora-wave-2'
              }`}
            style={{
              background: isDark
                ? 'linear-gradient(90deg, transparent 0%, rgba(139, 0, 139, 0.1) 20%, rgba(196, 30, 58, 0.18) 50%, rgba(255, 105, 180, 0.1) 80%, transparent 100%)'
                : 'linear-gradient(90deg, transparent 0%, rgba(255, 182, 193, 0.22) 20%, rgba(255, 209, 217, 0.25) 50%, rgba(255, 192, 203, 0.18) 80%, transparent 100%)',
              transform: 'translateZ(0) translateY(-50%) rotate(10deg) scaleY(0.6)',
              transformOrigin: 'center',
              filter: 'blur(40px)',
              willChange: isVeryLowEnd || isLowEnd ? 'auto' : 'transform'
            }}
          />

          {/* Wave 3 - Bottom flowing ribbon (Desktop only) */}
          {!isMobile && !isLowEnd && (
            <div
              className="animate-aurora-wave-3"
              style={{
                position: 'absolute',
                top: '60%',
                left: 0,
                width: '100%',
                height: '100%',
                background: isDark
                  ? 'linear-gradient(90deg, transparent 0%, rgba(196, 30, 58, 0.12) 30%, rgba(139, 0, 139, 0.08) 50%, rgba(196, 30, 58, 0.12) 70%, transparent 100%)'
                  : 'linear-gradient(90deg, transparent 0%, rgba(255, 192, 203, 0.15) 30%, rgba(255, 209, 217, 0.2) 50%, rgba(255, 192, 203, 0.15) 70%, transparent 100%)',
                transform: 'translateZ(0) translateY(-50%) rotate(-8deg) scaleY(0.4)',
                transformOrigin: 'center',
                filter: 'blur(35px)',
                willChange: 'transform'
              }}
            />
          )}

          {/* Radial glow accent in center */}
          {!isLowEnd && !isVeryLowEnd && (
            <div
              className="absolute top-1/2 left-1/2 w-[800px] h-[800px] -translate-x-1/2 -translate-y-1/2 animate-pulse-slow"
              style={{
                background: isDark
                  ? 'radial-gradient(circle, rgba(196, 30, 58, 0.15) 0%, rgba(255, 105, 180, 0.08) 30%, transparent 60%)'
                  : 'radial-gradient(circle, rgba(255, 209, 217, 0.2) 0%, rgba(255, 182, 193, 0.12) 30%, transparent 60%)',
                filter: 'blur(60px)',
                transform: 'translateZ(0)'
              }}
            />
          )}
        </div>
      )}

      {/* 5. Caustic Light Patterns - Desktop Only */}
      {!isMobile && !isLowEnd && !isVeryLowEnd && (
        <div className="absolute inset-0 z-35 mix-blend-overlay opacity-10">
          <div
            className="absolute inset-0 animate-caustic"
            style={{
              background: isDark
                ? 'radial-gradient(ellipse 800px 600px at 30% 40%, rgba(196,30,58,0.15) 0%, transparent 50%), radial-gradient(ellipse 600px 800px at 70% 60%, rgba(255,51,102,0.1) 0%, transparent 50%)'
                : 'radial-gradient(ellipse 800px 600px at 30% 40%, rgba(255,182,193,0.2) 0%, transparent 50%), radial-gradient(ellipse 600px 800px at 70% 60%, rgba(255,209,217,0.15) 0%, transparent 50%)',
              filter: 'blur(80px)',
              transform: 'translateZ(0)',
            }}
          />
        </div>
      )}

      {/* 6. Prismatic Light Rays - High-End Only */}
      {!isVeryLowEnd && !isLowEnd && !isMobile && (
        <div className="absolute inset-0 z-36 mix-blend-screen opacity-5">
          <div
            className="absolute top-0 left-1/4 w-[1px] h-full animate-prismatic"
            style={{
              background: isDark
                ? 'linear-gradient(180deg, transparent 0%, rgba(196,30,58,0.3) 30%, rgba(255,51,102,0.5) 50%, rgba(196,30,58,0.3) 70%, transparent 100%)'
                : 'linear-gradient(180deg, transparent 0%, rgba(255,182,193,0.4) 30%, rgba(196,30,58,0.6) 50%, rgba(255,182,193,0.4) 70%, transparent 100%)',
              filter: 'blur(20px)',
              transform: 'rotate(-15deg)',
              transformOrigin: 'top',
            }}
          />
          <div
            className="absolute top-0 right-1/3 w-[1px] h-full animate-prismatic"
            style={{
              background: isDark
                ? 'linear-gradient(180deg, transparent 0%, rgba(255,51,102,0.4) 30%, rgba(196,30,58,0.6) 50%, rgba(255,51,102,0.4) 70%, transparent 100%)'
                : 'linear-gradient(180deg, transparent 0%, rgba(255,209,217,0.5) 30%, rgba(196,30,58,0.7) 50%, rgba(255,209,217,0.5) 70%, transparent 100%)',
              filter: 'blur(25px)',
              transform: 'rotate(12deg)',
              transformOrigin: 'top',
              animationDelay: '2s'
            }}
          />
        </div>
      )}

      {/* 7. Subtle Grid Overlay - Desktop only, skip on low-end and very low-end */}
      {!isMobile && !isLowEnd && !isVeryLowEnd && (
        <div
          className={`absolute inset-0 bg-center transition-opacity duration-700 z-40 ${isDark ? 'opacity-5' : 'opacity-10'
            }`}
          style={{
            backgroundImage: "url('/grid.svg')",
            backgroundSize: '30px 30px',
            maskImage: 'linear-gradient(180deg, white, rgba(255, 255, 255, 0))',
            transform: 'translateZ(0)'
          }}
        />
      )}

      {/* 8. Subtle grain texture for depth */}
      <div
        className="absolute inset-0 opacity-[0.015] mix-blend-overlay z-50"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
          transform: 'translateZ(0)'
        }}
      />
    </div>
  );
}