'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useChat(formId, department, readerType = 'student') {
    const [messages, setMessages] = useState([]);
    const [form, setForm] = useState(null);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const [failedMessages, setFailedMessages] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 });

    const channelRef = useRef(null);
    const formIdRef = useRef(formId);
    const departmentRef = useRef(department);
    const readerTypeRef = useRef(readerType);

    // Keep refs updated
    useEffect(() => {
        formIdRef.current = formId;
        departmentRef.current = department;
        readerTypeRef.current = readerType;
    }, [formId, department, readerType]);

    // Fetch initial messages (no auth required for GET)
    const fetchMessages = useCallback(async (loadMore = false) => {
        const currentFormId = formIdRef.current;
        const currentDepartment = departmentRef.current;

        if (!currentFormId || !currentDepartment) return;

        try {
            if (loadMore) {
                setLoadingMore(true);
            } else {
                setLoading(true);
            }

            const offset = loadMore ? pagination.offset + pagination.limit : 0;

            const headers = {};
            if (readerTypeRef.current === 'department') {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) {
                    headers['Authorization'] = `Bearer ${session.access_token}`;
                }
            }

            const response = await fetch(
                `/api/chat/${currentFormId}/${encodeURIComponent(currentDepartment)}?limit=50&offset=${offset}`,
                { headers }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch messages');
            }

            if (loadMore) {
                setMessages(prev => [...(result.data.messages || []), ...prev]);
            } else {
                setMessages(result.data.messages || []);
            }

            setForm(result.data.form);
            setStatus(result.data.status);
            setHasMore(result.data.pagination?.hasMore || false);
            setPagination(result.data.pagination || { total: 0, limit: 50, offset: 0 });
            setError(null);
        } catch (err) {
            console.error('Error fetching messages:', err);
            setError(err.message);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [pagination.offset, pagination.limit]);

    // Mark messages as read
    const markMessagesAsRead = useCallback(async () => {
        const currentFormId = formIdRef.current;
        const currentDepartment = departmentRef.current;
        const currentReaderType = readerTypeRef.current;

        if (!currentFormId || !currentDepartment) return;

        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            if (currentReaderType === 'department') {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    headers['Authorization'] = `Bearer ${session.access_token}`;
                }
            }

            await fetch('/api/chat/mark-read', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    formId: currentFormId,
                    departmentName: currentDepartment,
                    readerType: currentReaderType
                })
            });

            // Dispatch event for unread tracker to update
            window.dispatchEvent(new CustomEvent('chat-marked-read', {
                detail: { formId: currentFormId, departmentName: currentDepartment }
            }));
        } catch (err) {
            console.error('Error marking messages as read:', err);
        }
    }, []);

    // Send a message with retry support
    const sendMessage = useCallback(async (message, senderType, senderName, retryId = null) => {
        const currentFormId = formIdRef.current;
        const currentDepartment = departmentRef.current;

        if (!message?.trim() || !currentFormId || !currentDepartment) return;

        const tempId = retryId || `temp-${Date.now()}`;

        try {
            setSending(true);

            if (retryId) {
                setFailedMessages(prev => prev.filter(m => m.tempId !== retryId));
            }

            const optimisticMessage = {
                id: tempId,
                form_id: currentFormId,
                department_name: currentDepartment,
                sender_type: senderType,
                sender_name: senderName,
                message: message.trim(),
                created_at: new Date().toISOString(),
                is_sending: true
            };

            setMessages(prev => [...prev, optimisticMessage]);

            const headers = {
                'Content-Type': 'application/json'
            };

            if (senderType === 'department') {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    throw new Error('Department staff must be authenticated to send messages');
                }
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const response = await fetch(`/api/chat/${currentFormId}/${encodeURIComponent(currentDepartment)}`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    message,
                    senderType,
                    senderName
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to send message');
            }

            // Replace optimistic message with real one
            setMessages(prev => prev.map(m =>
                m.id === tempId ? { ...result.data, is_sending: false } : m
            ));
            setError(null);

            return result.data;
        } catch (err) {
            console.error('Error sending message:', err);

            setMessages(prev => prev.map(m =>
                m.id === tempId ? { ...m, is_sending: false, is_failed: true } : m
            ));

            setFailedMessages(prev => [...prev, {
                tempId,
                message: message.trim(),
                senderType,
                senderName,
                error: err.message
            }]);

            setError(err.message);
            throw err;
        } finally {
            setSending(false);
        }
    }, []);

    // Retry a failed message
    const retryMessage = useCallback((tempId) => {
        const failed = failedMessages.find(m => m.tempId === tempId);
        if (failed) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
            sendMessage(failed.message, failed.senderType, failed.senderName, tempId);
        }
    }, [failedMessages, sendMessage]);

    // Load more (older) messages
    const loadMoreMessages = useCallback(() => {
        if (hasMore && !loadingMore) {
            fetchMessages(true);
        }
    }, [hasMore, loadingMore, fetchMessages]);

    // Set up realtime subscription - FIXED: Separate effect with proper cleanup
    useEffect(() => {
        if (!formId || !department) return;

        console.log(`🔌 Chat Realtime: Setting up for form=${formId}, dept=${department}`);

        // Initial fetch
        fetchMessages();

        // Create unique channel name with timestamp to ensure fresh subscription
        const channelName = `chat-realtime-${formId}-${department.replace(/\s+/g, '_')}-${Date.now()}`;

        // Subscribe to realtime updates with proper filter
        const channel = supabase
            .channel(channelName)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'no_dues_messages',
                filter: `form_id=eq.${formId}`
            }, (payload) => {
                console.log('📨 New message received via realtime:', payload.new);

                // Only add if for this department
                if (payload.new.department_name === department) {
                    setMessages(prev => {
                        // Check if message already exists (avoid duplicates)
                        const exists = prev.some(m => m.id === payload.new.id);
                        if (exists) {
                            console.log('⏭️ Message already exists, skipping');
                            return prev;
                        }

                        // Remove any optimistic message with same content
                        const filtered = prev.filter(m =>
                            !(m.is_sending && m.message === payload.new.message)
                        );

                        console.log('✅ Adding new message to state');
                        return [...filtered, payload.new];
                    });

                    // Mark as read
                    markMessagesAsRead();
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'no_dues_messages',
                filter: `form_id=eq.${formId}`
            }, (payload) => {
                console.log('📝 Message updated via realtime:', payload.new);

                if (payload.new.department_name === department) {
                    setMessages(prev => prev.map(m =>
                        m.id === payload.new.id ? payload.new : m
                    ));
                }
            })
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`✅ Chat realtime SUBSCRIBED for ${department}`);
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Chat realtime channel error:', err);
                } else if (status === 'TIMED_OUT') {
                    console.error('⏰ Chat realtime timed out');
                } else {
                    console.log(`📡 Chat realtime status: ${status}`);
                }
            });

        channelRef.current = channel;

        return () => {
            console.log(`🧹 Chat Realtime: Cleaning up for ${department}`);
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [formId, department]); // Only depend on formId and department

    return {
        messages,
        form,
        status,
        loading,
        sending,
        error,
        failedMessages,
        hasMore,
        loadingMore,
        sendMessage,
        retryMessage,
        loadMoreMessages,
        markMessagesAsRead,
        refresh: fetchMessages
    };
}
