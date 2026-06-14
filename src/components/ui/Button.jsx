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
                ? 'bg-white/[0.035] text-white border border-white/15 hover:bg-white/[0.07] hover:border-jecrc-red/50 hover:text-white shadow-sm'
                : 'bg-white text-jecrc-red border-2 border-jecrc-red/60 hover:bg-jecrc-rose/40',
            'shadow-sm hover:shadow-md'
        ),
        ghost: cn(
            isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'
        ),
        danger: 'bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-red-500/20',
        outline: cn(
            isDark
                ? 'bg-transparent text-gray-300 border border-white/20 hover:bg-white/10 hover:text-white'
                : 'bg-transparent text-gray-700 border border-gray-300 hover:bg-gray-100 hover:text-gray-900',
        ),
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
                    ? 'disabled:opacity-60 disabled:bg-[#1a1a1a] disabled:text-gray-500 disabled:border-white/10'
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
