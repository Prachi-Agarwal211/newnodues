'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, AlertCircle, ChevronDown } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function Input({
    label,
    name,
    type = 'text',
    value,
    onChange,
    required = false,
    error = '',
    placeholder = '',
    disabled = false,
    className,
    options = [], // For select
    rows = 4, // For textarea
    startIcon,
    endIcon,
    description,
    ...props
}) {
    const [showPassword, setShowPassword] = useState(false);
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const inputType = type === 'password' && showPassword ? 'text' : type;
    const isSelect = type === 'select';
    const isTextarea = type === 'textarea';
    const errorId = error ? `${name}-error` : undefined;

    // Updated design: Full border with JECRC red theme
    const containerClasses = cn(
        "relative w-full rounded-xl transition-all duration-300",
        "border-2",
        isTextarea ? "min-h-[140px]" : "min-h-[62px]",
        error
            ? (isDark ? "border-red-500 bg-red-900/20" : "border-red-500 bg-red-50/50")
            : (isDark
                ? "bg-black border-jecrc-red/50 hover:border-jecrc-red/70 focus-within:border-jecrc-red focus-within:shadow-lg focus-within:shadow-jecrc-red/15"
                : "bg-white border-jecrc-red/50 hover:border-jecrc-red/70 focus-within:border-jecrc-red focus-within:shadow-lg focus-within:shadow-jecrc-red/15"),
        disabled && "opacity-60 cursor-not-allowed"
    );

    const inputBaseClasses = cn(
        "peer w-full pt-6 pb-2 bg-transparent outline-none border-none shadow-none ring-0",
        isDark
            ? "text-white placeholder:text-transparent focus:placeholder:text-gray-500"
            : "text-gray-900 placeholder:text-transparent focus:placeholder:text-gray-400",
        "text-base font-medium",
        startIcon ? "pl-11" : "pl-4",
        (endIcon || type === 'password' || isSelect) ? "pr-11" : "pr-4",
        disabled && "cursor-not-allowed",
        isSelect && "appearance-none cursor-pointer" // Hide default arrow for select
    );

    const shouldFloatLabel = isSelect || (value || value === 0);

    const labelClasses = cn(
        "absolute top-4 text-base transition-all duration-200 pointer-events-none origin-[0]",
        isDark ? "text-gray-500" : "text-gray-400",
        startIcon ? "left-11" : "left-4",
        "peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0",
        "peer-focus:scale-75 peer-focus:-translate-y-5 peer-focus:text-jecrc-red",
        isDark && "peer-focus:text-jecrc-red-bright",
        shouldFloatLabel ? "scale-75 -translate-y-5" : "",
        error && "text-red-500 peer-focus:text-red-500"
    );

    return (
        <div className={cn("w-full group relative mb-5", className)}>
            <div className={containerClasses}>

                {/* Start Icon */}
                {startIcon && (
                    <div className={cn(
                        "absolute left-3 top-6 -translate-y-[2px] transition-colors pointer-events-none",
                        isDark ? "text-gray-500" : "text-gray-400",
                        "peer-focus:text-jecrc-red"
                    )}>
                        {startIcon}
                    </div>
                )}

                {/* Render Element based on type */}
                {isSelect ? (
                    <>
                        <select
                            name={name}
                            value={value}
                            onChange={onChange}
                            required={required}
                            disabled={disabled}
                            className={inputBaseClasses}
                            aria-describedby={errorId}
                            id={name}
                            {...props}
                        >
                            <option value="" disabled className={cn(
                                "text-gray-500",
                                isDark ? "bg-black" : "bg-gray-50"
                            )}>
                                {placeholder}
                            </option>
                            {options.map((option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                    className={cn(
                                        "py-2",
                                        isDark ? "bg-black text-white" : "bg-white text-gray-900"
                                    )}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        {/* Custom Arrow */}
                        <div className={cn(
                            "absolute right-3 top-1/2 translate-y-1 pointer-events-none transition-colors",
                            isDark ? "text-gray-500" : "text-gray-400",
                            "peer-focus:text-jecrc-red"
                        )}>
                            <ChevronDown size={18} />
                        </div>
                    </>
                ) : isTextarea ? (
                    <textarea
                        name={name}
                        value={value}
                        onChange={onChange}
                        required={required}
                        disabled={disabled}
                        placeholder=" "
                        rows={rows}
                        className={cn(inputBaseClasses, "resize-none")}
                        aria-describedby={errorId}
                        id={name}
                        {...props}
                    />
                ) : (
                    <input
                        type={inputType}
                        name={name}
                        value={value}
                        onChange={onChange}
                        required={required}
                        disabled={disabled}
                        placeholder=" "
                        className={inputBaseClasses}
                        aria-describedby={errorId}
                        id={name}
                        {...props}
                    />
                )}

                {/* Floating Label */}
                <label className={labelClasses}>
                    {label} {required && <span className="text-red-500">*</span>}
                </label>

                {/* End Icon or Password Toggle */}
                {type === 'password' ? (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={cn(
                            "absolute right-3 top-1/2 translate-y-1 p-1 bg-transparent transition-colors",
                            isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
                        )}
                        disabled={disabled}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                ) : endIcon ? (
                    <div className={cn(
                        "absolute right-3 top-1/2 translate-y-1 transition-colors pointer-events-none",
                        isDark ? "text-gray-500" : "text-gray-400",
                        "peer-focus:text-jecrc-red"
                    )}>
                        {endIcon}
                    </div>
                ) : null}
            </div>

            {/* Error Message */}
            {error && (
                <div id={errorId} className="absolute -bottom-5 left-0 flex items-center gap-1 text-xs text-red-500 font-medium animate-in slide-in-from-top-1">
                    <AlertCircle size={12} />
                    <span>{error}</span>
                </div>
            )}

            {/* Description / Helper Text */}
            {description && !error && (
                <div className="mt-1 text-[11px] leading-tight text-gray-500 dark:text-gray-400 font-medium px-1 flex items-start gap-1.5 transition-colors group-focus-within:text-jecrc-red">
                    <div className="mt-0.5">
                        <ChevronDown size={10} className="rotate-[-90deg]" />
                    </div>
                    <div>{description}</div>
                </div>
            )}
        </div>
    );
}
