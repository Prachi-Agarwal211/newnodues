'use client';

import { useRef, useEffect, useState } from 'react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import { ChevronUp, RefreshCw, Paperclip, X, CheckCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ChatBox({
    messages,
    loading,
    sending,
    error,
    onSend,
    onRetry,
    onLoadMore,
    hasMore,
    loadingMore,
    currentUserType, // 'student' | 'department'
    currentUserName,
    rejectionReason,
    departmentName,
    // Typing indicator props
    typingUsers = [],
    onTypingStart,
    onTypingStop,
    // File attachment props
    onFileUpload,
    isConnected = true
}) {
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Handle file selection
    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Check file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('File size must be less than 10MB');
                return;
            }

            // Check file type
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                alert('Only images, PDFs, and text files are allowed');
                return;
            }

            setSelectedFile(file);
        }
    };

    // Handle file upload
    const handleFileUpload = async () => {
        if (!selectedFile || !onFileUpload) return;

        setIsUploading(true);
        try {
            const result = await onFileUpload(selectedFile);
            if (result?.success) {
                setSelectedFile(null);
                // Send message with file attachment
                onSend(`📎 ${selectedFile.name}`, currentUserType, currentUserName, result.fileUrl);
            } else {
                alert(result?.error || 'Failed to upload file');
            }
        } catch (error) {
            alert('Failed to upload file');
        } finally {
            setIsUploading(false);
        }
    };

    if (loading) {
        return (
            <div className={`flex flex-col h-full rounded-xl overflow-hidden border ${isDark ? 'bg-[#141414] border-white/10' : 'bg-white border-gray-200'}`}>
                <div className="px-4 py-3 bg-gradient-to-r from-jecrc-red to-red-600 text-white">
                    <h3 className="font-bold text-lg !text-white">💬 Chat with {departmentName}</h3>
                    <p className="text-xs !text-white/80">Loading messages...</p>
                </div>
                <div className="flex-1 p-4 space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-3 animate-pulse">
                            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full rounded-xl overflow-hidden border shadow-xl ${isDark ? 'bg-[#141414] border-white/10' : 'bg-white border-gray-200'}`}>
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-jecrc-red to-red-600 text-white relative z-10">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-lg !text-white">💬 Chat with {departmentName}</h3>
                        <p className="text-xs !text-white/80 flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-400'}`} />
                            {isConnected ? 'Connected' : 'Disconnected'}
                        </p>
                    </div>
                    {onFileUpload && (
                        <div className="flex items-center gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                onChange={handleFileSelect}
                                accept="image/*,.pdf,.doc,.docx,.txt"
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                title="Attach file"
                            >
                                <Paperclip className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Rejection Reason Banner */}
            {rejectionReason && (
                <div className={`px-4 py-3 border-b ${isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-100'}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                        Rejection Reason:
                    </p>
                    <p className={`text-sm ${isDark ? 'text-red-200' : 'text-red-800'}`}>
                        {rejectionReason}
                    </p>
                </div>
            )}

            {/* Messages Area */}
            <div
                ref={messagesContainerRef}
                className={`flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px] ${isDark ? 'bg-[#111111]/50' : 'bg-gray-50'}`}
            >
                {/* Load More Button */}
                {hasMore && (
                    <div className="flex justify-center mb-4">
                        <button
                            onClick={onLoadMore}
                            disabled={loadingMore}
                            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-full border transition-colors disabled:opacity-50
                                ${isDark
                                    ? 'text-gray-300 bg-[#141414] border-white/10 hover:bg-[#1a1a1a]'
                                    : 'text-gray-700 bg-white border-gray-200 hover:bg-gray-100'
                                }`}
                        >
                            {loadingMore ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Loading...
                                </>
                            ) : (
                                <>
                                    <ChevronUp className="w-4 h-4" />
                                    Load older messages
                                </>
                            )}
                        </button>
                    </div>
                )}

                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <span className="text-2xl">💬</span>
                        </div>
                        <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>No messages yet</p>
                        <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Start the conversation to resolve your issue
                        </p>
                    </div>
                ) : (
                    <>
                        {messages.map((msg) => (
                            <MessageBubble
                                key={msg.id}
                                message={msg}
                                isOwn={msg.sender_type === currentUserType}
                                isSending={msg.is_sending}
                                isFailed={msg.is_failed}
                                onRetry={onRetry ? () => onRetry(msg.id) : undefined}
                            />
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
                <div className={`px-4 py-2 border-t ${isDark ? 'bg-[#141414] border-white/10' : 'bg-gray-100 border-gray-200'}`}>
                    <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <span className="flex gap-1">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                        <span className="italic">
                            {typingUsers.length === 1
                                ? `${typingUsers[0].name} is typing...`
                                : `${typingUsers.map(u => u.name).join(', ')} are typing...`
                            }
                        </span>
                    </div>
                </div>
            )}

            {/* Error Banner */}
            {error && (
                <div className={`px-4 py-2 text-sm flex items-center justify-between ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'}`}>
                    <span>⚠️ {error}</span>
                    <button
                        onClick={() => window.location.reload()}
                        className="text-xs underline hover:no-underline"
                    >
                        Refresh
                    </button>
                </div>
            )}

            {/* Input Area */}
            {/* File Preview */}
            {selectedFile && (
                <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Paperclip className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-blue-700 dark:text-blue-300 truncate">
                                {selectedFile.name}
                            </span>
                            <span className="text-xs text-blue-600 dark:text-blue-400">
                                ({(selectedFile.size / 1024).toFixed(1)} KB)
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleFileUpload}
                                disabled={isUploading}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {isUploading ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    'Upload'
                                )}
                            </button>
                            <button
                                onClick={() => setSelectedFile(null)}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ChatInput
                onSend={(message) => onSend(message, currentUserType, currentUserName)}
                sending={sending}
                placeholder={`Message ${departmentName}...`}
                onTypingStart={onTypingStart}
                onTypingStop={onTypingStop}
                disabled={isUploading}
                selectedFile={selectedFile}
            />
        </div>
    );
}
