'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Headphones } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import StudentSupportModal from '@/components/support/StudentSupportModal';
import DepartmentSupportModal from '@/components/support/DepartmentSupportModal';

/**
 * Enhanced Floating Support Button with Liquid Effects
 * - Orbital floating animation
 * - Liquid glow on hover
 * - Magnetic hover effect (follows cursor slightly)
 * - Pulsing ring animation
 * - URL-based modal detection (no auth required)
 */
export default function EnhancedSupportButton() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showModal, setShowModal] = useState(false);
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

  // Determine which modal to show based on current URL path
  const renderModal = () => {
    // Hide on admin pages (admins don't need support button)
    if (pathname.startsWith('/admin')) {
      return null;
    }

    // Show department support on staff pages
    if (pathname.startsWith('/staff')) {
      return <DepartmentSupportModal isOpen={showModal} onClose={() => setShowModal(false)} />;
    }

    // Default: Show student support for all other pages (student pages, public pages, etc.)
    return <StudentSupportModal isOpen={showModal} onClose={() => setShowModal(false)} />;
  };

  // Don't render button at all on admin pages
  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      <motion.button
        onClick={() => setShowModal(true)}
        className={`
          fixed bottom-8 right-8 w-14 h-14 rounded-full 
          flex items-center justify-center z-40 group
          ${isDark
            ? 'bg-gradient-to-br from-jecrc-red to-jecrc-red-dark'
            : 'bg-gradient-to-br from-jecrc-red via-jecrc-red-dark to-red-900'
          }
          text-white overflow-visible
        `}
        style={{
          boxShadow: isDark
            ? '0 10px 35px rgba(196, 30, 58, 0.45), 0 0 50px rgba(196, 30, 58, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
            : '0 10px 30px rgba(196, 30, 58, 0.3), 0 4px 20px rgba(0, 0, 0, 0.2)'
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
        title="Need Support?"
        aria-label="Open support"
      >
        {/* Pulsing Ring - DEVICE-AWARE */}
        {deviceTier !== 'very-low' && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border-2 opacity-75"
              style={{
                borderColor: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.6)'
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
                  borderColor: isDark ? 'rgba(255, 182, 193, 0.6)' : 'rgba(255, 255, 255, 0.8)'
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
                ? 'radial-gradient(circle, rgba(255, 105, 180, 0.6) 0%, rgba(196, 30, 58, 0.4) 50%, transparent 100%)'
                : 'radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(255, 182, 193, 0.4) 50%, transparent 100%)',
              filter: 'blur(20px)',
              transform: 'scale(1.5)'
            }}
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}

        {/* Icon with Pulse Animation */}
        <motion.div
          animate={deviceTier !== 'very-low' ? {
            scale: [1, 1.1, 1],
          } : {}}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Headphones className="w-6 h-6 relative z-10" strokeWidth={2} />
        </motion.div>

        {/* Shimmer Effect on Icon - HIGH END ONLY */}
        {deviceTier === 'high' && (
          <motion.div
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100"
            style={{
              background: 'linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
            }}
            initial={{ opacity: 0, rotate: -45 }}
            whileHover={{ opacity: [0, 1, 0], rotate: 135 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        )}
      </motion.button>

      {renderModal()}
    </>
  );
}