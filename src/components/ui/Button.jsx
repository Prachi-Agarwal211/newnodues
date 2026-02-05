'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

export default function Button({
    children,
    variant = 'primary', // primary, secondary, ghost, danger
    size = 'md', // sm, md, lg
    className,
    loading = false,
    disabled = false,
    onClick,
    type = 'button',
    ...props
}) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-300 rounded-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100';

    const variants = {
        primary: cn(
            'text-white hover:shadow-lg hover:shadow-jecrc-red/25 border border-transparent',
            'bg-gradient-to-br from-jecrc-red to-jecrc-red-dark'
        ),
        secondary: cn(
            isDark
                ? 'bg-black text-jecrc-red-bright border-2 border-jecrc-red/60 hover:bg-gray-900'
                : 'bg-white text-jecrc-red border-2 border-jecrc-red/60 hover:bg-jecrc-rose/40',
            'shadow-sm hover:shadow-md'
        ),
        ghost: cn(
            isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'
        ),
        danger: 'bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-red-500/20',
    };

    const sizes = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
    };

    return (
        <button
            type={type}
            className={cn(
                baseStyles,
                variants[variant],
                sizes[size],
                isDark
                    ? 'disabled:opacity-60 disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700'
                    : 'disabled:opacity-60 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300',
                className
            )}
            disabled={disabled || loading}
            onClick={onClick}
            {...props}
        >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {children}
        </button>
    );
}
