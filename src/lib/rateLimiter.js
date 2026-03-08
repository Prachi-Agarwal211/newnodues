/**
 * Rate Limiter for API Routes
 * 
 * Prevents abuse by limiting the number of requests from a single IP address.
 * Uses in-memory storage for simplicity (works well for single-instance deployments).
 * 
 * For multi-instance deployments, consider using Redis or a database-backed solution.
 */

// Store for tracking requests: { ip: { count, resetTime } }
const requestStore = new Map();

/**
 * Rate limit configurations for different API endpoints
 */
export const RATE_LIMITS = {
  // Student endpoints - moderate limits
  SUBMIT: {  // Used in /api/student route
    maxRequests: 20, // Increased from 5 to 20 for lab usage
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many form submissions. Please try again in 1 minute.'
  },
  STUDENT_SUBMIT: {  // Alias for consistency
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many form submissions. Please try again in 1 minute.'
  },
  READ: {  // Used in /api/student GET route
    maxRequests: 100, // Increased from 30 to 100 for lab usage
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests. Please try again in 1 minute.'
  },
  STUDENT_REAPPLY: {
    maxRequests: 3,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many reapplication attempts. Please try again in 1 minute.'
  },
  REAPPLY_PER_DEPARTMENT: {
    maxRequests: 5, // 5 reapplications per department
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    message: 'Maximum 5 reapplications allowed per department. Please try again later.'
  },
  REAPPLY_PER_STUDENT: {
    maxRequests: 10, // 10 total reapplications per student
    windowMs: 30 * 24 * 60 * 60 * 1000, // 30 days
    message: 'Maximum 10 reapplications allowed. Please contact administration.'
  },
  REAPPLY_COOLDOWN: {
    maxRequests: 1, // 1 reapplication per cooldown period
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    message: 'Please wait 24 hours between reapplications.'
  },
  STUDENT_EDIT: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many edit requests. Please try again in 1 minute.'
  },
  CHECK_STATUS: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many status checks. Please try again in 1 minute.'
  },

  // Authentication endpoints - stricter limits
  AUTH: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many authentication attempts. Please try again in 1 minute.'
  },

  // Staff endpoints - higher limits
  STAFF_ACTION: {
    maxRequests: 50,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many actions. Please try again in 1 minute.'
  },

  // File upload - stricter limits
  UPLOAD: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many upload attempts. Please try again in 1 minute.'
  },

  // Admin endpoints - higher limits
  ADMIN_STATS: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests. Please try again in 1 minute.'
  },

  // Support endpoints
  SUPPORT_SUBMIT: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many support requests. Please try again in 1 minute.'
  },

  // Certificate generation - very strict
  CERTIFICATE_GENERATE: {
    maxRequests: 2,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many certificate generation requests. Please try again in 1 minute.'
  },

  // Default fallback
  DEFAULT: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests. Please try again in 1 minute.'
  }
};

/**
 * Get client IP address from request
 * Works with Vercel, Render, and other hosting platforms
 */
function getClientIP(request) {
  // Try various headers used by different hosting providers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfIP = request.headers.get('cf-connecting-ip'); // Cloudflare

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (cfIP) {
    return cfIP;
  }

  // Fallback (shouldn't happen in production)
  return 'unknown';
}

/**
 * Clean up expired entries from the store
 * Called periodically to prevent memory leaks
 */
function cleanupStore() {
  const now = Date.now();
  for (const [key, value] of requestStore.entries()) {
    if (now > value.resetTime) {
      requestStore.delete(key);
    }
  }
}

// Lazy cleanup initialization
let cleanupInterval = null;

function ensureCleanup() {
  if (!cleanupInterval && typeof setInterval !== 'undefined') {
    cleanupInterval = setInterval(cleanupStore, 5 * 60 * 1000);
    // Unref if in Node.js to allow process exit
    if (cleanupInterval.unref) cleanupInterval.unref();
  }
}

/**
 * Rate limit middleware for API routes
 * 
 * @param {Request} request - The incoming request
 * @param {Object} config - Rate limit configuration
 * @param {string} [identifier] - Optional unique identifier (e.g., userID) to track instead of IP
 * @returns {Object} { success: boolean, remaining?: number, error?: string }
 * 
 * @example
 * // With User ID (Authenticated)
 * const result = await rateLimit(request, RATE_LIMITS.STAFF_ACTION, user.id);
 * 
 * // Default (IP-based)
 * const result = await rateLimit(request, RATE_LIMITS.SUBMIT);
 */
export async function rateLimit(request, config = RATE_LIMITS.DEFAULT, identifier = null) {
  try {
    ensureCleanup();
    const clientIP = getClientIP(request);
    const now = Date.now();

    // Use identifier (UserId) if provided, otherwise fallback to IP
    // Prefix with type to prevent collisions
    const key = identifier ? `user:${identifier}` : `ip:${clientIP}`;

    // Get or create store entry for this IP
    let record = requestStore.get(key);

    if (!record || now > record.resetTime) {
      // First request or window expired - create new record
      record = {
        count: 1,
        resetTime: now + config.windowMs
      };
      requestStore.set(key, record);

      return {
        success: true,
        remaining: config.maxRequests - 1,
        resetTime: record.resetTime
      };
    }

    // Check if limit exceeded
    if (record.count >= config.maxRequests) {
      const timeUntilReset = Math.ceil((record.resetTime - now) / 1000);

      return {
        success: false,
        error: config.message,
        retryAfter: timeUntilReset,
        resetTime: record.resetTime
      };
    }

    // Increment count
    record.count++;
    requestStore.set(key, record);

    return {
      success: true,
      remaining: config.maxRequests - record.count,
      resetTime: record.resetTime
    };

  } catch (error) {
    console.error('Rate limiter error:', error);
    // On error, allow the request (fail open)
    return { success: true };
  }
}

/**
 * Helper function to add rate limit headers to response
 * 
 * @param {Response} response - The response object
 * @param {Object} rateLimitResult - Result from rateLimit function
 * @returns {Response} Response with added headers
 * 
 * @example
 * const result = await rateLimit(request, RATE_LIMITS.STUDENT_SUBMIT);
 * if (!result.success) {
 *   const response = NextResponse.json({ error: result.error }, { status: 429 });
 *   return addRateLimitHeaders(response, result);
 * }
 */
export function addRateLimitHeaders(response, rateLimitResult) {
  if (!rateLimitResult) return response;

  const headers = new Headers(response.headers);

  if (rateLimitResult.remaining !== undefined) {
    headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  }

  if (rateLimitResult.resetTime) {
    headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
  }

  if (rateLimitResult.retryAfter) {
    headers.set('Retry-After', rateLimitResult.retryAfter.toString());
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * Helper function to create a rate-limited response
 * 
 * @param {string} message - Error message
 * @param {number} retryAfter - Seconds until retry
 * @returns {Response} Response with 429 status
 */
export function createRateLimitResponse(message, retryAfter) {
  return new Response(
    JSON.stringify({
      error: message,
      retryAfter: retryAfter
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString()
      }
    }
  );
}

/**
 * Reset rate limit for a specific IP (useful for testing)
 * 
 * @param {string} ip - IP address to reset
 */
export function resetRateLimit(ip) {
  requestStore.delete(ip);
}

/**
 * Get current rate limit status for an IP
 * 
 * @param {string} ip - IP address to check
 * @returns {Object|null} Current status or null if no record
 */
export function getRateLimitStatus(ip) {
  return requestStore.get(ip) || null;
}

/**
 * Clear all rate limit records (useful for testing)
 */
export function clearAllRateLimits() {
  requestStore.clear();
}

// Export store size for monitoring
export function getStoreSize() {
  return requestStore.size;
}