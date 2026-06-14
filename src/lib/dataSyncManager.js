/**
 * 🔄 INTELLIGENT DATA SYNCHRONIZATION MANAGER
 * 
 * Provides automatic data synchronization with conflict resolution,
 * optimistic updates, and intelligent caching.
 * 
 * Features:
 * - Automatic conflict detection and resolution
 * - Optimistic updates with rollback
 * - Multi-layer caching strategy
 * - Delta synchronization for efficiency
 * - Background sync with retry logic
 * - Real-time data consistency
 */

import { supabase } from './supabaseClient';

class DataSyncManager {
  constructor() {
    // Data storage
    this.localData = new Map();
    this.pendingUpdates = new Map();
    this.conflictQueue = new Map();
    
    // Caching layers
    this.memoryCache = new Map();
    this.sessionCache = sessionStorage;
    this.persistentCache = localStorage;
    
    // Sync state
    this.syncInProgress = new Map();
    this.lastSyncTime = new Map();
    this.syncQueue = [];
    
    // Configuration
    this.config = {
      CACHE_TTL: 5 * 60 * 1000,        // 5 minutes
      SYNC_RETRY_DELAY: 1000,              // 1 second
      MAX_RETRY_ATTEMPTS: 3,               // 3 retries
      CONFLICT_RESOLUTION: 'latest_wins',   // Conflict strategy
      AUTO_SYNC_INTERVAL: 30000,           // 30 seconds
      OPTIMISTIC_TIMEOUT: 5000             // 5 seconds
    };
    
    // Start background sync
    this.startBackgroundSync();
  }

  /**
   * Get data with intelligent caching
   */
  async getData(type, filters = {}, options = {}) {
    const cacheKey = this.generateCacheKey(type, filters);
    
    // Try memory cache first
    if (this.memoryCache.has(cacheKey)) {
      const cached = this.memoryCache.get(cacheKey);
      if (!this.isExpired(cached)) {
        console.log(`💾 Memory cache hit: ${cacheKey}`);
        return cached.data;
      }
    }
    
    // Try session cache
    const sessionData = this.sessionCache.getItem(cacheKey);
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      if (!this.isExpired(parsed)) {
        console.log(`💾 Session cache hit: ${cacheKey}`);
        this.memoryCache.set(cacheKey, parsed);
        return parsed.data;
      }
    }
    
    // Try persistent cache
    const persistentData = this.persistentCache.getItem(cacheKey);
    if (persistentData) {
      const parsed = JSON.parse(persistentData);
      if (!this.isExpired(parsed)) {
        console.log(`💾 Persistent cache hit: ${cacheKey}`);
        this.memoryCache.set(cacheKey, parsed);
        this.sessionCache.setItem(cacheKey, persistentData);
        return parsed.data;
      }
    }
    
    // Fetch from server
    return this.fetchFromServer(type, filters, options);
  }

  /**
   * Fetch data from server with delta sync
   */
  async fetchFromServer(type, filters = {}, options = {}) {
    const cacheKey = this.generateCacheKey(type, filters);
    
    try {
      console.log(`🌐 Fetching from server: ${type}`);
      
      // Check for delta sync
      const lastSync = this.lastSyncTime.get(cacheKey);
      const params = { ...filters };
      
      if (lastSync && !options.forceRefresh) {
        params.since = lastSync;
        params.delta = true;
      }
      
      // Make API request
      const response = await supabase
        .from(type)
        .select('*', { count: 'exact' })
        .match(params);
      
      if (response.error) {
        throw new Error(`API Error: ${response.error.message}`);
      }
      
      let data = response.data;
      
      // Handle delta response
      if (options.delta && lastSync) {
        const existingData = this.localData.get(cacheKey) || [];
        data = this.mergeDelta(existingData, data);
      }
      
      // Store data
      this.localData.set(cacheKey, data);
      this.updateCache(cacheKey, data);
      this.lastSyncTime.set(cacheKey, Date.now());
      
      console.log(`✅ Data fetched: ${type} (${data.length} items)`);
      return data;
      
    } catch (error) {
      console.error(`❌ Failed to fetch ${type}:`, error);
      
      // Return cached data if available
      const cached = this.memoryCache.get(cacheKey);
      if (cached) {
        console.log(`📦 Using cached data for ${type}`);
        return cached.data;
      }
      
      throw error;
    }
  }

  /**
   * Optimistic update with automatic rollback
   */
  async optimisticUpdate(type, id, updates, options = {}) {
    const cacheKey = this.generateCacheKey(type, {});
    const updateId = `${type}_${id}_${Date.now()}`;
    
    console.log(`⚡ Optimistic update: ${type}/${id}`, updates);
    
    // Store previous state for rollback
    const currentData = this.localData.get(cacheKey) || [];
    const previousItem = currentData.find(item => item.id === id);
    
    // Apply optimistic update immediately
    const updatedData = currentData.map(item => 
      item.id === id ? { ...item, ...updates, _optimistic: true, _updateId: updateId } : item
    );
    
    this.localData.set(cacheKey, updatedData);
    this.updateCache(cacheKey, updatedData);
    
    // Track pending update
    this.pendingUpdates.set(updateId, {
      type,
      id,
      updates,
      previousItem,
      timestamp: Date.now()
    });
    
    try {
      // Send to server
      const { data, error } = await supabase
        .from(type)
        .update(updates)
        .eq('id', id)
        .select();
      
      if (error) {
        throw new Error(`Update failed: ${error.message}`);
      }
      
      // Confirm optimistic update
      const confirmedData = updatedData.map(item => 
        item.id === id ? { ...data[0], _optimistic: false, _updateId: updateId } : item
      );
      
      this.localData.set(cacheKey, confirmedData);
      this.updateCache(cacheKey, confirmedData);
      this.pendingUpdates.delete(updateId);
      
      console.log(`✅ Optimistic update confirmed: ${type}/${id}`);
      return data[0];
      
    } catch (error) {
      console.error(`❌ Optimistic update failed: ${type}/${id}`, error);
      
      // Rollback on failure
      const rollbackData = currentData.map(item => 
        item.id === id ? previousItem : item
      );
      
      this.localData.set(cacheKey, rollbackData);
      this.updateCache(cacheKey, rollbackData);
      this.pendingUpdates.delete(updateId);
      
      // Show error notification
      this.showErrorNotification('Update failed', error.message);
      
      throw error;
    }
  }

  /**
   * Create new item with optimistic update
   */
  async optimisticCreate(type, data, options = {}) {
    const cacheKey = this.generateCacheKey(type, {});
    const createId = `${type}_new_${Date.now()}`;
    
    console.log(`⚡ Optimistic create: ${type}`, data);
    
    // Generate temporary ID
    const tempData = {
      ...data,
      id: `temp_${Date.now()}`,
      _optimistic: true,
      _createId: createId,
      created_at: new Date().toISOString()
    };
    
    // Add to local data immediately
    const currentData = this.localData.get(cacheKey) || [];
    const updatedData = [...currentData, tempData];
    
    this.localData.set(cacheKey, updatedData);
    this.updateCache(cacheKey, updatedData);
    
    // Track pending create
    this.pendingUpdates.set(createId, {
      type,
      data,
      tempData,
      timestamp: Date.now(),
      operation: 'create'
    });
    
    try {
      // Send to server
      const { data: serverData, error } = await supabase
        .from(type)
        .insert(data)
        .select();
      
      if (error) {
        throw new Error(`Create failed: ${error.message}`);
      }
      
      // Replace temp data with server data
      const confirmedData = updatedData.map(item => 
        item._createId === createId ? { ...serverData[0], _optimistic: false } : item
      );
      
      this.localData.set(cacheKey, confirmedData);
      this.updateCache(cacheKey, confirmedData);
      this.pendingUpdates.delete(createId);
      
      console.log(`✅ Optimistic create confirmed: ${type}`);
      return serverData[0];
      
    } catch (error) {
      console.error(`❌ Optimistic create failed: ${type}`, error);
      
      // Rollback on failure
      const rollbackData = currentData.filter(item => item._createId !== createId);
      this.localData.set(cacheKey, rollbackData);
      this.updateCache(cacheKey, rollbackData);
      this.pendingUpdates.delete(createId);
      
      this.showErrorNotification('Create failed', error.message);
      throw error;
    }
  }

  /**
   * Delete item with optimistic update
   */
  async optimisticDelete(type, id, options = {}) {
    const cacheKey = this.generateCacheKey(type, {});
    const deleteId = `${type}_delete_${Date.now()}`;
    
    console.log(`⚡ Optimistic delete: ${type}/${id}`);
    
    // Store previous state for rollback
    const currentData = this.localData.get(cacheKey) || [];
    const previousItem = currentData.find(item => item.id === id);
    
    // Remove from local data immediately
    const updatedData = currentData.filter(item => item.id !== id);
    this.localData.set(cacheKey, updatedData);
    this.updateCache(cacheKey, updatedData);
    
    // Track pending delete
    this.pendingUpdates.set(deleteId, {
      type,
      id,
      previousItem,
      timestamp: Date.now(),
      operation: 'delete'
    });
    
    try {
      // Send to server
      const { error } = await supabase
        .from(type)
        .delete()
        .eq('id', id);
      
      if (error) {
        throw new Error(`Delete failed: ${error.message}`);
      }
      
      this.pendingUpdates.delete(deleteId);
      console.log(`✅ Optimistic delete confirmed: ${type}/${id}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Optimistic delete failed: ${type}/${id}`, error);
      
      // Rollback on failure
      const rollbackData = [...currentData, previousItem];
      this.localData.set(cacheKey, rollbackData);
      this.updateCache(cacheKey, rollbackData);
      this.pendingUpdates.delete(deleteId);
      
      this.showErrorNotification('Delete failed', error.message);
      throw error;
    }
  }

  /**
   * Merge delta updates with existing data
   */
  mergeDelta(existingData, deltaData) {
    const merged = [...existingData];
    
    for (const delta of deltaData) {
      const index = merged.findIndex(item => item.id === delta.id);
      
      if (delta.operation === 'DELETE') {
        // Remove deleted item
        if (index !== -1) {
          merged.splice(index, 1);
        }
      } else if (delta.operation === 'UPDATE') {
        // Update existing item
        if (index !== -1) {
          merged[index] = { ...merged[index], ...delta };
        } else {
          merged.push(delta);
        }
      } else {
        // Add new item
        merged.push(delta);
      }
    }
    
    return merged;
  }

  /**
   * Detect and resolve conflicts
   */
  detectConflict(type, id, localData, serverData) {
    const conflicts = [];
    
    // Compare fields for conflicts
    const fieldsToCompare = this.getFieldsToCompare(type);
    
    for (const field of fieldsToCompare) {
      if (localData[field] !== serverData[field]) {
        conflicts.push({
          field,
          localValue: localData[field],
          serverValue: serverData[field],
          timestamp: Date.now()
        });
      }
    }
    
    return conflicts;
  }

  /**
   * Resolve conflicts using configured strategy
   */
  resolveConflict(conflicts, strategy = this.config.CONFLICT_RESOLUTION) {
    switch (strategy) {
      case 'latest_wins':
        return this.resolveLatestWins(conflicts);
      case 'manual':
        return this.resolveManual(conflicts);
      case 'merge':
        return this.resolveMerge(conflicts);
      default:
        return this.resolveLatestWins(conflicts);
    }
  }

  /**
   * Resolve conflicts by keeping latest version
   */
  resolveLatestWins(conflicts) {
    const resolved = {};
    
    for (const conflict of conflicts) {
      // Use server version (assumed to be latest)
      resolved[conflict.field] = conflict.serverValue;
    }
    
    return resolved;
  }

  /**
   * Resolve conflicts manually (requires user input)
   */
  resolveManual(conflicts) {
    // Queue for manual resolution
    const conflictId = `conflict_${Date.now()}`;
    this.conflictQueue.set(conflictId, conflicts);
    
    // Notify user of conflicts
    this.showConflictNotification(conflictId, conflicts);
    
    return null; // Will be resolved manually
  }

  /**
   * Resolve conflicts by merging changes
   */
  resolveMerge(conflicts) {
    const resolved = {};
    
    for (const conflict of conflicts) {
      // Simple merge strategy - combine non-null values
      if (conflict.localValue && conflict.serverValue) {
        resolved[conflict.field] = conflict.localValue;
      } else {
        resolved[conflict.field] = conflict.localValue || conflict.serverValue;
      }
    }
    
    return resolved;
  }

  /**
   * Get fields to compare for conflict detection
   */
  getFieldsToCompare(type) {
    const fieldMap = {
      'no_dues_forms': ['status', 'student_name', 'registration_no', 'updated_at'],
      'no_dues_status': ['status', 'rejection_reason', 'action_at'],
      'no_dues_messages': ['message', 'read_status', 'updated_at'],
      'support_tickets': ['status', 'priority', 'updated_at']
    };
    
    return fieldMap[type] || ['updated_at', 'status'];
  }

  /**
   * Update cache with new data
   */
  updateCache(cacheKey, data) {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      key: cacheKey
    };
    
    // Update all cache layers
    this.memoryCache.set(cacheKey, cacheEntry);
    this.sessionCache.setItem(cacheKey, JSON.stringify(cacheEntry));
    this.persistentCache.setItem(cacheKey, JSON.stringify(cacheEntry));
  }

  /**
   * Generate cache key from type and filters
   */
  generateCacheKey(type, filters) {
    const filterString = JSON.stringify(filters);
    return `${type}_${btoa(filterString)}`;
  }

  /**
   * Check if cache entry is expired
   */
  isExpired(cacheEntry) {
    return !cacheEntry || 
           (Date.now() - cacheEntry.timestamp > this.config.CACHE_TTL);
  }

  /**
   * Start background synchronization
   */
  startBackgroundSync() {
    setInterval(() => {
      this.performBackgroundSync();
    }, this.config.AUTO_SYNC_INTERVAL);
  }

  /**
   * Perform background synchronization
   */
  async performBackgroundSync() {
    console.log('🔄 Performing background sync');
    
    for (const [cacheKey, lastSync] of this.lastSyncTime.entries()) {
      if (Date.now() - lastSync > this.config.AUTO_SYNC_INTERVAL) {
        try {
          const [type] = cacheKey.split('_');
          await this.getData(type, {}, { backgroundSync: true });
        } catch (error) {
          console.error(`Background sync failed for ${cacheKey}:`, error);
        }
      }
    }
  }

  /**
   * Show error notification
   */
  showErrorNotification(title, message) {
    // Dispatch custom event for UI components to handle
    window.dispatchEvent(new CustomEvent('sync_error', {
      detail: { title, message }
    }));
  }

  /**
   * Show conflict notification
   */
  showConflictNotification(conflictId, conflicts) {
    window.dispatchEvent(new CustomEvent('sync_conflict', {
      detail: { conflictId, conflicts }
    }));
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      pendingUpdates: this.pendingUpdates.size,
      conflicts: this.conflictQueue.size,
      syncInProgress: this.syncInProgress.size,
      lastSyncTimes: Object.fromEntries(this.lastSyncTime),
      cacheSize: this.memoryCache.size
    };
  }

  /**
   * Clear all caches and data
   */
  clearAll() {
    this.localData.clear();
    this.pendingUpdates.clear();
    this.conflictQueue.clear();
    this.memoryCache.clear();
    this.sessionCache.clear();
    this.persistentCache.clear();
    this.lastSyncTime.clear();
    this.syncInProgress.clear();
    
    console.log('🧹 All data and caches cleared');
  }

  /**
   * Export data for backup
   */
  exportData() {
    const exportData = {
      localData: Object.fromEntries(this.localData),
      pendingUpdates: Object.fromEntries(this.pendingUpdates),
      conflicts: Object.fromEntries(this.conflictQueue),
      lastSyncTimes: Object.fromEntries(this.lastSyncTime),
      timestamp: Date.now()
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import data from backup
   */
  importData(backupData) {
    try {
      const data = JSON.parse(backupData);
      
      this.localData = new Map(Object.entries(data.localData || {}));
      this.pendingUpdates = new Map(Object.entries(data.pendingUpdates || {}));
      this.conflictQueue = new Map(Object.entries(data.conflicts || {}));
      this.lastSyncTime = new Map(Object.entries(data.lastSyncTimes || {}));
      
      console.log('📥 Data imported successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to import data:', error);
      return false;
    }
  }
}

// Create singleton instance
const dataSyncManager = new DataSyncManager();

export default dataSyncManager;
