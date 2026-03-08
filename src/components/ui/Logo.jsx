'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * JECRC University Logo Component - Clean & Seamless
 */
export default function Logo({
    size = 'medium',
    className = '',
    priority = false
}) {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Optimized sizes
    const sizeConfig = {
        small: { width: 200, height: 65 },
        medium: { width: 280, height: 90 },
        large: { width: 360, height: 115 },
    };

    const config = sizeConfig[size] || sizeConfig.medium;

    const logoSrc = (mounted && theme === 'dark')
        ? '/assets/logo.png'
        : '/assets/logo light.png';

    return (
        <div className={`flex justify-center items-center mb-8 ${className}`}>
            <div className={`
                glass
                px-4 py-3 rounded-xl
                transition-all duration-300
                hover:scale-[1.02]
                inline-block
            `}>
                <Image
                    src={logoSrc}
                    alt="JECRC University"
                    width={config.width}
                    height={config.height}
                    className={`object-contain transition-all duration-300 ${mounted && theme === 'dark' ? 'logo-dark-mode' : 'logo-light-mode'
                        }`}
                    style={{ width: 'auto', height: 'auto' }}
                    priority={priority}
                />
            </div>
        </div>
    );
}

/**
 * Logo Icon Only - For compact spaces like mobile headers
 */
export function LogoIcon({ className = '' }) {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const logoSrc = (mounted && theme === 'dark')
        ? '/assets/logo.png'
        : '/assets/logo light.png';

    return (
        <div className={`relative flex-shrink-0 ${className}`}>
            <div className="glass px-3 py-2 rounded-lg transition-all duration-300 inline-block">
                <Image
                    src={logoSrc}
                    alt="JECRC"
                    width={160}
                    height={52}
                    className={`object-contain transition-all duration-300 ${mounted && theme === 'dark' ? 'logo-dark-mode' : 'logo-light-mode'
                        }`}
                    style={{ width: 'auto', height: 'auto' }}
                    priority
                />
            </div>
        </div>
    );
}