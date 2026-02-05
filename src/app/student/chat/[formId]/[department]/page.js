'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChat } from '@/hooks/useChat';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import ChatBox from '@/components/chat/ChatBox';
import { ArrowLeft } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function StudentChatPage() {
    const { formId, department } = useParams();
    const router = useRouter();
    const decodedDepartment = decodeURIComponent(department);
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [studentName, setStudentName] = useState('Student');
    const [pageLoading, setPageLoading] = useState(true);

    const {
        messages,
        form,
        status,
        loading,
        sending,
        error,
        hasMore,
        loadingMore,
        sendMessage,
        retryMessage,
        loadMoreMessages
    } = useChat(formId, decodedDepartment, 'student');

    // Typing indicators
    const { typingUsers, startTyping, stopTyping } = useTypingIndicator(
        formId,
        decodedDepartment,
        'student',
        studentName
    );

    // Get student name from form data (no auth required)
    useEffect(() => {
        if (form?.student_name) {
            setStudentName(form.student_name);
            setPageLoading(false);
        } else if (!loading) {
            setPageLoading(false);
        }
    }, [form, loading]);

    // Show loading while fetching form data
    if (pageLoading && loading) {
        return (
            <PageWrapper>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-spin text-4xl">⟳</div>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mx-auto">
                    {/* Back Button */}
                    <button
                        onClick={() => router.push('/student/check-status')}
                        className={`mb-4 flex items-center gap-2 transition-colors
                            ${status?.status === 'rejected'
                                ? 'text-jecrc-red hover:text-jecrc-red-dark'
                                : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                            }`}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Status
                    </button>

                    {/* Form Info Header */}
                    {form && (
                        <GlassCard className="p-4 mb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="font-bold text-gray-900 dark:text-white">
                                        {form.student_name}
                                    </h2>
                                    <p className={`text-sm font-mono ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {form.registration_no}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${status?.status === 'rejected'
                                        ? (isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-200 text-red-900')
                                        : (isDark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-200 text-yellow-900')
                                        }`}>
                                        {status?.status || 'Pending'}
                                    </span>
                                </div>
                            </div>
                        </GlassCard>
                    )}

                    {/* Chat Box with Typing Indicators */}
                    <ChatBox
                        messages={messages}
                        loading={loading}
                        sending={sending}
                        error={error}
                        onSend={sendMessage}
                        onRetry={retryMessage}
                        onLoadMore={loadMoreMessages}
                        hasMore={hasMore}
                        loadingMore={loadingMore}
                        currentUserType="student"
                        currentUserName={studentName}
                        rejectionReason={status?.rejection_reason}
                        departmentName={decodedDepartment}
                        typingUsers={typingUsers}
                        onTypingStart={startTyping}
                        onTypingStop={stopTyping}
                    />
                </div>
            </div>
        </PageWrapper>
    );
}
