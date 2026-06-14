'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * SpotlightCard - Premium card with mouse-follow radial glow effect
 * 
 * Features:
 * - Mouse-follow spotlight effect (red glow in dark mode, gray in light mode)
 * - Smooth opacity transitions
 * - Glass morphism with dynamic borders
 * - Performance optimized with ref-based positioning
 * 
 * @param {React.ReactNode} children - Card content
 * @param {string} className - Additional CSS classes
 * @param {boolean} isDark - Theme mode (defaults to dark)
 */
export default function SpotlightCard({ 
  children, 
  className = "",
  isDark = true 
}) {
  const cardRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePosition({ x, y });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`
        relative overflow-hidden rounded-2xl
        backdrop-blur-md
        transition-all duration-700
        ${isDark 
          ? 'bg-white/[0.035] border border-white/10 hover:border-white/18' 
          : 'bg-white/80 border border-black/10 hover:border-black/20'
        }
        ${className}
      `}
    >
      {/* Spotlight Glow Effect */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: isDark
            ? `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(196, 30, 58, 0.15), transparent 40%)`
            : `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(0, 0, 0, 0.05), transparent 40%)`
        }}
      />

      {/* Content Layer */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Bottom Glow (Subtle ambient) */}
      <div 
        className={`absolute bottom-0 left-0 right-0 h-px transition-opacity duration-700
          ${isHovered ? 'opacity-100' : 'opacity-0'}
          ${isDark 
            ? 'bg-gradient-to-r from-transparent via-jecrc-red/50 to-transparent' 
            : 'bg-gradient-to-r from-transparent via-gray-400/50 to-transparent'
          }`}
      />
    </motion.div>
  );
}