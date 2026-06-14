'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';

function DataTable({ headers, data, className = '', onRowClick, staggerAnimation = true }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [displayedRows, setDisplayedRows] = useState([]);

  // Stagger row appearance on data change
  useEffect(() => {
    if (!staggerAnimation || data.length === 0) {
      setDisplayedRows(data);
      return;
    }

    // Clear displayed rows first for fresh animation
    setDisplayedRows([]);
    
    // Add rows one by one with delay
    const timeouts = data.map((row, index) => {
      return setTimeout(() => {
        setDisplayedRows(prev => [...prev, row]);
      }, index * 50); // 50ms delay between each row
    });

    // Cleanup timeouts on unmount or data change
    return () => timeouts.forEach(timeout => clearTimeout(timeout));
  }, [data, staggerAnimation]);

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
      <table className={`min-w-full ${className}`}>
        <thead>
          <tr className={`transition-colors duration-700 ${isDark ? 'border-b border-gray-700' : 'border-b border-gray-200'}`}>
            {headers.map((header, index) => (
              <th
                key={index}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium uppercase tracking-wider transition-colors duration-700 ${
                  isDark
                    ? 'bg-[#141414] text-gray-300'
                    : 'bg-gray-50 text-gray-700'
                }`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={`transition-colors duration-700 ${isDark ? 'divide-y divide-gray-700' : 'divide-y divide-gray-200'}`}>
          <AnimatePresence mode="popLayout">
            {displayedRows.map((row, rowIndex) => (
              <motion.tr
                key={row.id || rowIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{
                  duration: 0.3,
                  ease: "easeOut"
                }}
                className={`transition-all duration-300 ${
                  onRowClick ? 'cursor-pointer hover:-translate-y-[2px] hover:shadow-lg' : ''
                } ${
                  isDark
                    ? 'hover:bg-white/[0.04]'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {headers.map((header, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm transition-colors duration-700 ${
                      isDark ? 'text-gray-300' : 'text-gray-900'
                    }`}
                  >
                    {(() => {
                      // Fix: Replace ALL spaces with underscores, not just the first one
                      const key = header.toLowerCase().replace(/\s+/g, '_');
                      return typeof row[key] === 'object' ? row[key] : row[key];
                    })()}
                  </td>
                ))}
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export default React.memo(DataTable, (prevProps, nextProps) => {
  return (
    prevProps.headers === nextProps.headers &&
    prevProps.data === nextProps.data &&
    prevProps.className === nextProps.className &&
    prevProps.onRowClick === nextProps.onRowClick &&
    prevProps.staggerAnimation === nextProps.staggerAnimation
  );
});