'use client';

import { RefreshCw, Check, CheckCheck, AlertCircle, Paperclip, Download } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function MessageBubble({ message, isOwn, isSending, isFailed, onRetry }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatReadTime = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    // Check if message contains file attachment
    const hasFileAttachment = message.message.includes('📎') || message.file_url;
    const fileName = message.file_name || message.message.replace('📎 ', '').trim();
    const fileUrl = message.file_url;

    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
                {/* Sender Name */}
                <p className={`text-xs font-medium mb-1 ${isOwn
                    ? (isDark ? 'text-right text-gray-300' : 'text-right text-gray-900')
                    : (isDark ? 'text-left text-gray-400' : 'text-left text-gray-700')
                    }`}>
                    {message.sender_type === 'department' ? '🏢 ' : '👤 '}
                    {message.sender_name}
                </p>

                {/* Message Bubble */}
                <div className={`px-4 py-2.5 rounded-2xl relative ${isOwn
                    ? isFailed
                        ? 'bg-red-500 text-white rounded-br-md'
                    : isSending
                            ? 'bg-blue-400 text-white rounded-br-md'
                            : 'bg-blue-600 text-white rounded-br-md'
                    : `${isDark
                        ? 'bg-gray-700 text-white border-gray-600'
                        : 'bg-white text-gray-900 border-gray-200'
                      } rounded-bl-md shadow-sm border`
                    }`}>
                    
                    {/* File Attachment */}
                    {hasFileAttachment && fileUrl && (
                        <div className={`mb-2 p-2 rounded-lg ${isOwn ? 'bg-white/10' : (isDark ? 'bg-white/[0.06]' : 'bg-gray-100')}`}>
                            <div className="flex items-center gap-2">
                                <Paperclip className="w-4 h-4" />
                                <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm underline hover:no-underline flex items-center gap-1"
                                >
                                    {fileName}
                                    <Download className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    )}

                    <p className={`text-sm whitespace-pre-wrap break-words leading-relaxed ${isOwn ? 'text-white' : (isDark ? 'text-white' : 'text-gray-900')}`}>
                        {message.message}
                    </p>

                    {/* Sending/Failed indicator */}
                    {isOwn && isSending && (
                        <div className="absolute -bottom-1 -right-1">
                            <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
                        </div>
                    )}
                </div>

                {/* Timestamp and Status */}
                <div className={`flex items-center gap-1.5 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <p className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {isSending ? 'Sending...' : formatTime(message.created_at)}
                    </p>

                    {/* Read receipt indicator for own messages */}
                    {isOwn && !isSending && !isFailed && (
                        <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`} title={message.is_read ? `Read at ${formatReadTime(message.read_at)}` : 'Not read yet'}>
                            {message.is_read ? (
                                <CheckCheck className="w-3 h-3 text-blue-500" />
                            ) : (
                                <Check className="w-3 h-3" />
                            )}
                        </span>
                    )}
                </div>

                {/* Failed message retry button */}
                {isFailed && onRetry && (
                    <button
                        onClick={onRetry}
                        className="mt-2 flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                    >
                        <AlertCircle className="w-3 h-3" />
                        Failed to send.
                        <span className="underline">Tap to retry</span>
                    </button>
                )}
            </div>
        </div>
    );
}
