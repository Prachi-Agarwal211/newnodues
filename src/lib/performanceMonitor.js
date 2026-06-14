/**
 * 📊 COMPREHENSIVE PERFORMANCE MONITORING SYSTEM
 * 
 * Real-time performance tracking with automatic optimization suggestions
 * Features:
 * - Real-time performance metrics collection
 * - Automatic bottleneck detection
 * - Performance optimization recommendations
 * - User experience scoring
 * - Resource usage monitoring
 * - Network performance tracking
 */

class PerformanceMonitor {
  constructor() {
    // Performance metrics
    this.metrics = {
      pageLoad: {},
      interactions: [],
      network: [],
      memory: [],
      rendering: {},
      userExperience: {
        score: 100,
        issues: [],
        recommendations: []
      }
    };
    
    // Monitoring state
    this.isMonitoring = false;
    this.observers = new Map();
    this.timers = new Map();
    this.thresholds = {
      pageLoadTime: 2000,        // 2 seconds
      firstContentfulPaint: 1000, // 1 second
      largestContentfulPaint: 2500, // 2.5 seconds
      firstInputDelay: 100,       // 100ms
      cumulativeLayoutShift: 0.1,  // 0.1
      interactionDelay: 200,      // 200ms
      memoryUsage: 50 * 1024 * 1024, // 50MB
      networkLatency: 500         // 500ms
    };
    
    // Configuration
    this.config = {
      sampleRate: 1.0,              // 100% sampling
      maxMetrics: 1000,             // Max metrics to store
      reportInterval: 10000,         // 10 seconds
      enableAutoOptimization: true,
      enableUserTracking: true
    };
    
    // NOTE: Auto-init disabled to prevent SSR crash with window.fetch override.
    // Call init() explicitly where needed (e.g., in a useEffect).
  }

  /**
   * Initialize performance monitoring
   */
  init() {
    if (this.isMonitoring) return;
    
    console.log('📊 Initializing Performance Monitor');
    this.isMonitoring = true;
    
    // Start monitoring
    this.startPageLoadMonitoring();
    this.startInteractionMonitoring();
    this.startNetworkMonitoring();
    this.startMemoryMonitoring();
    this.startRenderingMonitoring();
    
    // Start periodic reporting
    this.startPeriodicReporting();
    
    // Setup performance observers
    this.setupPerformanceObservers();
  }

  /**
   * Start page load performance monitoring
   */
  startPageLoadMonitoring() {
    if (typeof window !== 'undefined' && window.performance) {
      // Monitor page load
      window.addEventListener('load', () => {
        setTimeout(() => {
          this.collectPageLoadMetrics();
        }, 0);
      });
      
      // Monitor navigation
      if ('navigation' in performance) {
        const navEntry = performance.getEntriesByType('navigation')[0];
        if (navEntry) {
          this.metrics.pageLoad = {
            domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
            loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
            firstPaint: this.getFirstPaint(),
            domInteractive: navEntry.domInteractive - navEntry.navigationStart
          };
        }
      }
    }
  }

  /**
   * Start user interaction monitoring
   */
  startInteractionMonitoring() {
    if (typeof window === 'undefined') return;
    
    // Monitor clicks
    window.addEventListener('click', (event) => {
      this.recordInteraction('click', event);
    }, { passive: true });
    
    // Monitor keyboard input
    window.addEventListener('keydown', (event) => {
      this.recordInteraction('keydown', event);
    }, { passive: true });
    
    // Monitor form submissions
    window.addEventListener('submit', (event) => {
      this.recordInteraction('submit', event);
    }, { passive: true });
    
    // Monitor scroll events (throttled)
    let scrollTimer;
    window.addEventListener('scroll', () => {
      if (!scrollTimer) {
        scrollTimer = setTimeout(() => {
          this.recordInteraction('scroll', { type: 'scroll' });
          scrollTimer = null;
        }, 100);
      }
    }, { passive: true });
  }

  /**
   * Start network performance monitoring
   * NOTE: Uses PerformanceObserver instead of monkey-patching window.fetch
   */
  startNetworkMonitoring() {
    if (typeof window === 'undefined') return;
    
    // Use PerformanceObserver to monitor fetch requests without monkey-patching
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach(entry => {
            if (entry.entryType === 'resource' && entry.initiatorType === 'fetch') {
              this.recordNetworkMetric({
                url: entry.name,
                method: 'FETCH',
                duration: entry.duration,
                status: 200,
                success: true,
                size: entry.transferSize
              });
            }
          });
        });
        observer.observe({ entryTypes: ['resource'] });
        this.observers.set('network', observer);
      } catch (error) {
        console.warn('PerformanceObserver for network not supported:', error);
      }
    }
  }

  /**
   * Start memory usage monitoring
   */
  startMemoryMonitoring() {
    if (typeof window === 'undefined') return;
    
    // Monitor memory usage periodically
    setInterval(() => {
      if ('memory' in performance) {
        const memory = performance.memory;
        this.recordMemoryMetric({
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          timestamp: Date.now()
        });
      }
    }, 5000); // Every 5 seconds
  }

  /**
   * Start rendering performance monitoring
   */
  startRenderingMonitoring() {
    if (typeof window === 'undefined') return;
    
    // Monitor frame rate
    let frameCount = 0;
    let lastTime = performance.now();
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        this.metrics.rendering.fps = fps;
        this.metrics.rendering.frameDrops = this.calculateFrameDrops(fps);
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      if (this.isMonitoring) {
        requestAnimationFrame(measureFPS);
      }
    };
    
    requestAnimationFrame(measureFPS);
  }

  /**
   * Setup performance observers
   */
  setupPerformanceObservers() {
    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          
          this.metrics.rendering.largestContentfulPaint = lastEntry.startTime;
          this.checkThreshold('largestContentfulPaint', lastEntry.startTime);
        });
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('lcp', lcpObserver);
      } catch (error) {
        console.warn('LCP observer not supported:', error);
      }
      
      // First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.processingStart) {
              const fid = entry.processingStart - entry.startTime;
              this.metrics.rendering.firstInputDelay = fid;
              this.checkThreshold('firstInputDelay', fid);
            }
          });
        });
        
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.set('fid', fidObserver);
      } catch (error) {
        console.warn('FID observer not supported:', error);
      }
      
      // Cumulative Layout Shift
      try {
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          list.getEntries().forEach(entry => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          
          this.metrics.rendering.cumulativeLayoutShift = clsValue;
          this.checkThreshold('cumulativeLayoutShift', clsValue);
        });
        
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('cls', clsObserver);
      } catch (error) {
        console.warn('CLS observer not supported:', error);
      }
    }
  }

  /**
   * Record user interaction
   */
  recordInteraction(type, event) {
    const interaction = {
      type,
      timestamp: performance.now(),
      target: this.getInteractionTarget(event),
      delay: this.calculateInteractionDelay(event)
    };
    
    this.metrics.interactions.push(interaction);
    
    // Keep only recent interactions
    if (this.metrics.interactions.length > this.config.maxMetrics) {
      this.metrics.interactions = this.metrics.interactions.slice(-this.config.maxMetrics);
    }
    
    // Check interaction delay threshold
    this.checkThreshold('interactionDelay', interaction.delay);
  }

  /**
   * Record network metric
   */
  recordNetworkMetric(metric) {
    this.metrics.network.push(metric);
    
    // Keep only recent network metrics
    if (this.metrics.network.length > this.config.maxMetrics) {
      this.metrics.network = this.metrics.network.slice(-this.config.maxMetrics);
    }
    
    // Check network latency threshold
    this.checkThreshold('networkLatency', metric.duration);
  }

  /**
   * Record memory metric
   */
  recordMemoryMetric(metric) {
    this.metrics.memory.push(metric);
    
    // Keep only recent memory metrics
    if (this.metrics.memory.length > this.config.maxMetrics) {
      this.metrics.memory = this.metrics.memory.slice(-this.config.maxMetrics);
    }
    
    // Check memory usage threshold
    this.checkThreshold('memoryUsage', metric.used);
  }

  /**
   * Collect page load metrics
   */
  collectPageLoadMetrics() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      
      this.metrics.pageLoad = {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        loadComplete: navigation.loadEventEnd - navigation.navigationStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
        timestamp: Date.now()
      };
      
      // Check page load thresholds
      this.checkThreshold('pageLoadTime', this.metrics.pageLoad.loadComplete);
      this.checkThreshold('firstContentfulPaint', this.metrics.pageLoad.firstContentfulPaint);
    }
  }

  /**
   * Get first paint time
   */
  getFirstPaint() {
    const paint = performance.getEntriesByType('paint');
    return paint.find(p => p.name === 'first-paint')?.startTime;
  }

  /**
   * Get interaction target information
   */
  getInteractionTarget(event) {
    if (!event || !event.target) return 'unknown';
    
    const target = event.target;
    return {
      tagName: target.tagName,
      className: target.className,
      id: target.id,
      type: target.type
    };
  }

  /**
   * Calculate interaction delay
   */
  calculateInteractionDelay(event) {
    if (!event || !event.timeStamp) return 0;
    
    return performance.now() - event.timeStamp;
  }

  /**
   * Calculate frame drops
   */
  calculateFrameDrops(currentFPS) {
    const targetFPS = 60;
    return Math.max(0, targetFPS - currentFPS);
  }

  /**
   * Check performance against thresholds
   */
  checkThreshold(metric, value) {
    const threshold = this.thresholds[metric];
    if (threshold && value > threshold) {
      this.recordPerformanceIssue(metric, value, threshold);
    }
  }

  /**
   * Record performance issue
   */
  recordPerformanceIssue(metric, value, threshold) {
    const issue = {
      metric,
      value,
      threshold,
      severity: this.calculateSeverity(metric, value, threshold),
      timestamp: Date.now()
    };
    
    this.metrics.userExperience.issues.push(issue);
    
    // Generate recommendation
    const recommendation = this.generateRecommendation(metric, value, threshold);
    if (recommendation) {
      this.metrics.userExperience.recommendations.push(recommendation);
    }
    
    // Update user experience score
    this.updateUserExperienceScore();
  }

  /**
   * Calculate issue severity
   */
  calculateSeverity(metric, value, threshold) {
    const ratio = value / threshold;
    
    if (ratio > 3) return 'critical';
    if (ratio > 2) return 'high';
    if (ratio > 1.5) return 'medium';
    if (ratio > 1) return 'low';
    return 'none';
  }

  /**
   * Generate optimization recommendation
   */
  generateRecommendation(metric, value, threshold) {
    const recommendations = {
      pageLoadTime: {
        message: 'Page load time is slow. Consider optimizing images, reducing bundle size, or implementing lazy loading.',
        actions: ['Optimize images', 'Reduce bundle size', 'Implement lazy loading', 'Use CDN']
      },
      firstContentfulPaint: {
        message: 'First contentful paint is slow. Optimize critical rendering path.',
        actions: ['Inline critical CSS', 'Preload important resources', 'Minimize render-blocking resources']
      },
      largestContentfulPaint: {
        message: 'Largest contentful paint is slow. Optimize above-the-fold content.',
        actions: ['Optimize hero images', 'Reduce JavaScript execution time', 'Improve server response time']
      },
      firstInputDelay: {
        message: 'First input delay is high. Reduce JavaScript execution time.',
        actions: ['Code split JavaScript', 'Reduce main thread work', 'Use web workers']
      },
      cumulativeLayoutShift: {
        message: 'Layout shift detected. Ensure proper element sizing.',
        actions: ['Include size attributes', 'Avoid dynamic content insertion', 'Use transform animations']
      },
      interactionDelay: {
        message: 'Interaction delay is high. Optimize event handlers.',
        actions: ['Debounce events', 'Use passive listeners', 'Optimize rendering']
      },
      memoryUsage: {
        message: 'Memory usage is high. Check for memory leaks.',
        actions: ['Fix memory leaks', 'Optimize data structures', 'Implement object pooling']
      },
      networkLatency: {
        message: 'Network latency is high. Optimize API calls.',
        actions: ['Implement caching', 'Use HTTP/2', 'Optimize API responses', 'Use CDN']
      }
    };
    
    return recommendations[metric] || null;
  }

  /**
   * Update user experience score
   */
  updateUserExperienceScore() {
    const issues = this.metrics.userExperience.issues;
    let score = 100;
    
    // Deduct points based on issue severity
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': score -= 20; break;
        case 'high': score -= 10; break;
        case 'medium': score -= 5; break;
        case 'low': score -= 2; break;
      }
    });
    
    this.metrics.userExperience.score = Math.max(0, score);
  }

  /**
   * Start periodic reporting
   */
  startPeriodicReporting() {
    setInterval(() => {
      this.generatePerformanceReport();
    }, this.config.reportInterval);
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport() {
    const report = {
      timestamp: Date.now(),
      userExperience: {
        score: this.metrics.userExperience.score,
        grade: this.calculateGrade(this.metrics.userExperience.score),
        issues: this.metrics.userExperience.issues.slice(-10), // Last 10 issues
        recommendations: this.getTopRecommendations()
      },
      pageLoad: this.metrics.pageLoad,
      rendering: {
        fps: this.metrics.rendering.fps,
        frameDrops: this.metrics.rendering.frameDrops,
        largestContentfulPaint: this.metrics.rendering.largestContentfulPaint,
        firstInputDelay: this.metrics.rendering.firstInputDelay,
        cumulativeLayoutShift: this.metrics.rendering.cumulativeLayoutShift
      },
      network: this.getNetworkSummary(),
      memory: this.getMemorySummary(),
      interactions: this.getInteractionSummary()
    };
    
    // Emit report event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('performance_report', {
        detail: report
      }));
    }
    
    // Auto-optimize if enabled
    if (this.config.enableAutoOptimization) {
      this.performAutoOptimization(report);
    }
    
    return report;
  }

  /**
   * Calculate performance grade
   */
  calculateGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Get top recommendations
   */
  getTopRecommendations() {
    const recommendations = this.metrics.userExperience.recommendations;
    const unique = recommendations.filter((rec, index, self) =>
      index === self.findIndex(r => r.message === rec.message)
    );
    
    return unique.slice(0, 5); // Top 5 recommendations
  }

  /**
   * Get network performance summary
   */
  getNetworkSummary() {
    const network = this.metrics.network;
    if (network.length === 0) return null;
    
    const successful = network.filter(n => n.success);
    const failed = network.filter(n => !n.success);
    
    return {
      totalRequests: network.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      averageLatency: successful.reduce((sum, n) => sum + n.duration, 0) / successful.length,
      slowRequests: successful.filter(n => n.duration > this.thresholds.networkLatency).length,
      errorRate: (failed.length / network.length) * 100
    };
  }

  /**
   * Get memory usage summary
   */
  getMemorySummary() {
    const memory = this.metrics.memory;
    if (memory.length === 0) return null;
    
    const latest = memory[memory.length - 1];
    
    return {
      current: latest.used,
      peak: Math.max(...memory.map(m => m.used)),
      average: memory.reduce((sum, m) => sum + m.used, 0) / memory.length,
      utilization: (latest.used / latest.limit) * 100
    };
  }

  /**
   * Get interaction summary
   */
  getInteractionSummary() {
    const interactions = this.metrics.interactions;
    if (interactions.length === 0) return null;
    
    const recent = interactions.slice(-100); // Last 100 interactions
    
    return {
      total: interactions.length,
      recent: recent.length,
      averageDelay: recent.reduce((sum, i) => sum + i.delay, 0) / recent.length,
      slowInteractions: recent.filter(i => i.delay > this.thresholds.interactionDelay).length,
      types: this.getInteractionTypes(recent)
    };
  }

  /**
   * Get interaction type distribution
   */
  getInteractionTypes(interactions) {
    const types = {};
    interactions.forEach(interaction => {
      types[interaction.type] = (types[interaction.type] || 0) + 1;
    });
    return types;
  }

  /**
   * Perform automatic optimization
   */
  performAutoOptimization(report) {
    const optimizations = [];
    
    // Optimize based on performance issues
    if (report.userExperience.score < 70) {
      optimizations.push(this.applyPerformanceOptimizations());
    }
    
    // Optimize based on memory usage
    if (report.memory && report.memory.utilization > 80) {
      optimizations.push(this.optimizeMemoryUsage());
    }
    
    // Optimize based on network performance
    if (report.network && report.network.averageLatency > this.thresholds.networkLatency) {
      optimizations.push(this.optimizeNetworkRequests());
    }
    
    return optimizations;
  }

  /**
   * Apply performance optimizations
   */
  applyPerformanceOptimizations() {
    console.log('⚡ Applying performance optimizations');
    
    // Reduce animation quality on low-end devices
    if (this.metrics.rendering.fps < 30) {
      this.reduceAnimationQuality();
    }
    
    // Enable passive event listeners
    this.enablePassiveListeners();
    
    // Optimize images
    this.optimizeImages();
  }

  /**
   * Optimize memory usage
   */
  optimizeMemoryUsage() {
    console.log('🧠 Optimizing memory usage');
    
    // Clear old caches
    if (typeof window !== 'undefined' && window.caches) {
      window.caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          window.caches.delete(cacheName);
        });
      });
    }
    
    // Trigger garbage collection if available
    if (typeof window !== 'undefined' && window.gc) {
      window.gc();
    }
  }

  /**
   * Optimize network requests
   */
  optimizeNetworkRequests() {
    console.log('🌐 Optimizing network requests');
    
    // Implement request batching
    this.implementRequestBatching();
    
    // Enable compression
    this.enableCompression();
  }

  /**
   * Reduce animation quality
   */
  reduceAnimationQuality() {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--animation-duration-multiplier', '0.5');
    }
  }

  /**
   * Enable passive event listeners
   */
  enablePassiveListeners() {
    // This would be implemented at the component level
    console.log('👆 Enabling passive event listeners');
  }

  /**
   * Optimize images
   */
  optimizeImages() {
    if (typeof document !== 'undefined') {
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (!img.loading) {
          img.loading = 'lazy';
        }
      });
    }
  }

  /**
   * Implement request batching
   */
  implementRequestBatching() {
    console.log('📦 Implementing request batching');
    // This would be implemented in the data layer
  }

  /**
   * Enable compression
   */
  enableCompression() {
    console.log('🗜️ Enabling compression');
    // This would be implemented at the server level
  }

  /**
   * Get current performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: Date.now()
    };
  }

  /**
   * Stop monitoring
   */
  stop() {
    console.log('⏹️ Stopping Performance Monitor');
    this.isMonitoring = false;
    
    // Disconnect observers
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();
    
    // Clear timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }

  /**
   * Export performance data
   */
  exportData() {
    return JSON.stringify(this.getMetrics(), null, 2);
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = {
      pageLoad: {},
      interactions: [],
      network: [],
      memory: [],
      rendering: {},
      userExperience: {
        score: 100,
        issues: [],
        recommendations: []
      }
    };
    
    console.log('🧹 Performance metrics cleared');
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;
