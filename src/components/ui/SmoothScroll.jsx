'use client';

import { ReactLenis } from '@studio-freight/react-lenis';

/**
 * SmoothScroll - Wraps the app with Lenis smooth scrolling
 * Provides buttery smooth inertia scrolling like Apple websites
 */
export default function SmoothScroll({ children }) {
  return (
    <ReactLenis 
      root 
      options={{ 
        lerp: 0.15,          // Snappier lerp (was 0.1)
        duration: 0.6,       // Much faster duration (was 1.2)
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1.2, // Slightly faster wheel (was 1)
        touchMultiplier: 1.5, // Reduced for mobile to prevent wild scrolling
        infinite: false,
      }}
    >
      {children}
    </ReactLenis>
  );
}