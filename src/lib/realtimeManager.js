/**
 * Centralized Realtime Event Manager
 * 
 * This manager handles ALL realtime events across the application to:
 * 1. Batch rapid-fire events (11 status INSERTs become 1 logical event)
 * 2. Deduplicate overlapping refresh requests
 * 3. Coordinate updates across all dashboards
 * 4. Provide connection health monitoring
 * 
 * Architecture:
 * - Single global WebSocket connection shared by all components
 * - Event aggregation with intelligent batching
 * - Subscriber pattern for component updates
 * - Auto-recovery from connection failures
 */

class RealtimeManager {
  constructor() {
    // Event aggregation
    this.eventQueue = [];
    this.batchTimeout = null;
    this.BATCH_WINDOW = 50; // ⚡ OPTIMIZED: 50ms for near-instant feedback (was 300ms)

    // Subscribers for different event types
    this.subscribers = {
      formSubmission: new Set(),      // New form submitted
      departmentAction: new Set(),     // Department approved/rejected
      formCompletion: new Set(),       // All departments approved
      chatMessage: new Set(),          // New chat message
      globalUpdate: new Set()          // Any change (fallback)
    };

    // Connection health
    this.connectionStatus = 'disconnected';
    this.lastEventTime = null;
    this.reconnectAttempts = 0;
    this.MAX_RECONNECT_ATTEMPTS = 5;

    // Deduplication tracking
    this.pendingRefreshes = new Set();
    this.lastRefreshTime = {};
    this.MIN_REFRESH_INTERVAL = 2000; // ✅ OPTIMIZED: 2s prevents refresh spam and race conditions (was 300ms)
  }

  /**
   * Queue an event for batched processing
   */
  queueEvent(eventType, eventData) {
    const event = {
      type: eventType,
      data: eventData,
      timestamp: Date.now(),
      formId: eventData.form_id || eventData.new?.id || eventData.new?.form_id
    };

    this.eventQueue.push(event);
    this.lastEventTime = Date.now();

    // Clear existing timeout and set new one
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.processBatchedEvents();
    }, this.BATCH_WINDOW);
  }

  /**
   * Process all queued events in a single batch
   */
  /**
   * Process all queued events in a single batch
   */
  processBatchedEvents() {
    if (this.eventQueue.length === 0) return;

    console.log(`📦 Processing ${this.eventQueue.length} batched events`);

    // Smart Deduplication: Group by formId
    // If we have 10 updates for the same formId (e.g. 10 depts inserted), we only need 1 notification
    const groupedEvents = this.eventQueue.reduce((acc, event) => {
      const id = event.formId || 'global';
      if (!acc[id]) acc[id] = [];
      acc[id].push(event);
      return acc;
    }, {});

    // For each unique formId, pick the most significant event
    // Priority: completion > submission > status_update > department_update
    const significantEvents = Object.values(groupedEvents).map(group => {
      return group.reduce((prev, current) => {
        // Simple priority check based on event type
        const priority = {
          'formCompletion': 10,
          'formSubmission': 9,
          'formStatusUpdate': 5,
          'departmentStatusUpdate': 3,
          'departmentStatusCreated': 2
        };
        const pCurrent = priority[current.type] || 1;
        const pPrev = priority[prev.type] || 1;

        return pCurrent > pPrev ? current : (current.timestamp > prev.timestamp ? current : prev);
      });
    });

    // Analyze simplified list of significant events
    const analysis = this.analyzeEventBatch(significantEvents);

    // Notify subscribers
    this.notifySubscribers(analysis);

    // Clear the queue
    this.eventQueue = [];
    this.batchTimeout = null;
  }

  /**
   * Analyze a batch of events to determine what actually changed
   */
  analyzeEventBatch(events) {
    const uniqueFormIds = new Set();
    const eventTypes = new Set();
    const departmentActions = new Map(); // department -> action count

    events.forEach(event => {
      if (event.formId) {
        uniqueFormIds.add(event.formId);
      }
      eventTypes.add(event.type);
      console.log('📥 Event batch contains type:', event.type);

      // Track department actions - handle all department-related event types
      if (event.type === 'departmentStatusUpdate' ||
        event.type === 'departmentStatusCreated' ||
        event.type === 'departmentAction' ||
        event.type === 'cascadeRejection') {
        const dept = event.data.new?.department_name || event.data.department_name;
        if (dept) {
          departmentActions.set(dept, (departmentActions.get(dept) || 0) + 1);
        }
      }
    });

    // Create a map of formId -> latestEvent for payload
    // This allows subscribers to optimistically update their local state
    const latestEvents = {};
    events.forEach(event => {
      if (event.formId) {
        latestEvents[event.formId] = event;
      }
    });

    const result = {
      formIds: Array.from(uniqueFormIds),
      eventTypes: Array.from(eventTypes),
      departmentActions,
      latestEvents, // ✅ Added: The actual data for targeted updates
      hasNewSubmission: eventTypes.has('formSubmission'),
      hasCompletion: eventTypes.has('formCompletion'),
      hasDepartmentAction: eventTypes.has('departmentStatusUpdate') ||
        eventTypes.has('departmentStatusCreated') ||
        eventTypes.has('departmentAction') ||
        eventTypes.has('cascadeRejection'),
      hasChatMessage: eventTypes.has('chatMessage'),
      hasCascadeRejection: eventTypes.has('cascadeRejection'),
      eventCount: events.length
    };

    console.log('📊 Event batch analysis:', result);
    return result;
  }

  /**
   * Notify all subscribers with analyzed event data
   */
  notifySubscribers(analysis) {
    const now = Date.now();

    console.log('📢 Notifying subscribers with analysis:', analysis);

    // Notify specific event type subscribers
    if (analysis.hasNewSubmission) {
      console.log('📢 Notifying formSubmission subscribers');
      this.notifySubscriberSet(this.subscribers.formSubmission, analysis, 'formSubmission', now);
    }

    if (analysis.hasDepartmentAction) {
      console.log('📢 Notifying departmentAction subscribers');
      this.notifySubscriberSet(this.subscribers.departmentAction, analysis, 'departmentAction', now);
    }

    if (analysis.hasCompletion) {
      console.log('📢 Notifying formCompletion subscribers');
      this.notifySubscriberSet(this.subscribers.formCompletion, analysis, 'formCompletion', now);
    }

    if (analysis.hasChatMessage) {
      console.log('📢 Notifying chatMessage subscribers');
      this.notifySubscriberSet(this.subscribers.chatMessage, analysis, 'chatMessage', now);
    }

    // Always notify global subscribers
    console.log('📢 Notifying globalUpdate subscribers');
    this.notifySubscriberSet(this.subscribers.globalUpdate, analysis, 'globalUpdate', now);
  }

  /**
   * Determine if a full refresh is needed or if targeted updates suffice
   */
  shouldFullRefresh(eventType) {
    // Only full refresh for major state changes that add/remove rows or change sorting significantly
    const majorChanges = ['formSubmission', 'formCompletion'];
    return majorChanges.includes(eventType);
  }

  /**
   * Notify a specific set of subscribers with deduplication
   */
  notifySubscriberSet(subscriberSet, analysis, subscriberType, now) {
    subscriberSet.forEach(callback => {
      const callbackId = callback._subscriberId || callback.toString();

      // Check if we recently refreshed this subscriber
      const lastRefresh = this.lastRefreshTime[callbackId] || 0;
      if (now - lastRefresh < this.MIN_REFRESH_INTERVAL) {
        console.log(`⏭️ Skipping rapid refresh for ${subscriberType} (${now - lastRefresh}ms since last)`);
        return;
      }

      // Check if refresh is already pending
      if (this.pendingRefreshes.has(callbackId)) {
        console.log(`⏳ Refresh already pending for ${subscriberType}`);
        return;
      }

      // Mark as pending and execute
      this.pendingRefreshes.add(callbackId);
      this.lastRefreshTime[callbackId] = now;

      try {
        Promise.resolve(callback(analysis))
          .finally(() => {
            this.pendingRefreshes.delete(callbackId);
          });
      } catch (error) {
        console.error(`❌ Error in subscriber callback:`, error);
        this.pendingRefreshes.delete(callbackId);
      }
    });
  }

  /**
   * Subscribe to specific event types
   */
  subscribe(eventType, callback) {
    // Generate unique ID for this callback
    const subscriberId = `${eventType}_${Date.now()}_${Math.random()}`;
    callback._subscriberId = subscriberId;

    const subscriberSet = this.subscribers[eventType] || this.subscribers.globalUpdate;
    subscriberSet.add(callback);

    console.log(`✅ Subscribed to ${eventType} events`);

    // Return unsubscribe function
    return () => {
      subscriberSet.delete(callback);
      delete this.lastRefreshTime[subscriberId];
      this.pendingRefreshes.delete(subscriberId);
      console.log(`🔌 Unsubscribed from ${eventType} events`);
    };
  }

  /**
   * Update connection status
   */
  setConnectionStatus(status) {
    const oldStatus = this.connectionStatus;
    this.connectionStatus = status;

    if (oldStatus !== status) {
      console.log(`📡 Realtime connection: ${oldStatus} → ${status}`);

      if (status === 'SUBSCRIBED') {
        this.reconnectAttempts = 0;
      }
    }
  }

  /**
   * Get current connection health
   */
  getConnectionHealth() {
    const now = Date.now();
    const timeSinceLastEvent = this.lastEventTime ? now - this.lastEventTime : null;

    return {
      status: this.connectionStatus,
      lastEventTime: this.lastEventTime,
      timeSinceLastEvent,
      reconnectAttempts: this.reconnectAttempts,
      isHealthy: this.connectionStatus === 'SUBSCRIBED',
      pendingRefreshes: this.pendingRefreshes.size,
      queuedEvents: this.eventQueue.length
    };
  }

  /**
   * Force process any queued events (for cleanup)
   */
  flush() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    this.processBatchedEvents();
  }

  /**
   * Clear all subscribers and reset state
   */
  reset() {
    this.flush();
    Object.values(this.subscribers).forEach(set => set.clear());
    this.pendingRefreshes.clear();
    this.lastRefreshTime = {};
    this.eventQueue = [];
    this.connectionStatus = 'disconnected';
    console.log('🔄 RealtimeManager reset');
  }
}

// Export singleton instance
export const realtimeManager = new RealtimeManager();

// Export class for testing
export { RealtimeManager };