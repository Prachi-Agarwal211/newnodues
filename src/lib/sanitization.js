// Comprehensive input sanitization and validation service
// This ensures all user inputs are safe and properly formatted

/**
 * HTML character entity map for encoding
 * Using String.fromCharCode and explicit entity names to avoid
 * any character encoding issues in source files.
 */
const HTML_ENCODE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
};

/**
 * Reverse entity map for decoding
 */
const HTML_DECODE_MAP = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
};

/**
 * HTML Entity encoding to prevent XSS attacks
 */
export const sanitizeHtml = (input) => {
    if (!input || typeof input !== 'string') return input;

    return input.replace(/[&<>"'\/]/g, (match) => HTML_ENCODE_MAP[match] || match);
};

/**
 * HTML Entity decoding for safe display
 */
export const decodeHtml = (input) => {
    if (!input || typeof input !== 'string') return input;

    return input.replace(/&(?:amp|lt|gt|quot|#x27;|#x2F;);/g, (match) => HTML_DECODE_MAP[match] || match);
};

/**
 * Sanitizes a string by removing potentially dangerous characters
 */
export const sanitizeString = (input, options = {}) => {
    if (!input) return input;

    const {
        allowSpaces = true,
        allowDashes = true,
        allowUnderscores = true,
        allowPeriods = true,
        allowNumbers = true,
        maxLength = 255,
        trim = true
    } = options;

    let sanitized = String(input);

    // Trim if requested
    if (trim) {
        sanitized = sanitized.trim();
    }

    // Remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Build allowed characters pattern
    let allowedChars = 'a-zA-Z';

    if (allowSpaces) allowedChars += ' ';
    if (allowDashes) allowedChars += '-';
    if (allowUnderscores) allowedChars += '_';
    if (allowPeriods) allowedChars += '.';
    if (allowNumbers) allowedChars += '0-9';

    // Remove characters not in allowed set
    const allowedPattern = new RegExp(`[^${allowedChars}]`, 'g');
    sanitized = sanitized.replace(allowedPattern, '');

    // Enforce length limit
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
};

/**
 * Validates and sanitizes a registration number
 */
export const sanitizeRegistrationNumber = (input) => {
    if (!input) return input;

    // Expected format: YYYY[A-Z]XXXX (e.g., 2021A1234)
    const reg = /^[0-9]{4}[A-Z][0-9]{4}$/;

    let sanitized = sanitizeString(input, {
        allowSpaces: false,
        allowDashes: false,
        allowUnderscores: false,
        allowPeriods: false,
        allowNumbers: true,
        maxLength: 10
    });

    // Convert to uppercase
    sanitized = sanitized.toUpperCase();

    // Check format
    if (!reg.test(sanitized)) {
        throw new Error('Invalid registration number format. Expected: YYYY[A-Z]XXXX');
    }

    return sanitized;
};

/**
 * Validates and sanitizes a phone number
 */
export const sanitizePhoneNumber = (input) => {
    if (!input) return input;

    // Remove all non-digit characters
    let sanitized = input.toString().replace(/\D/g, '');

    // Check if it's a valid 10-digit number
    if (sanitized.length !== 10) {
        throw new Error('Phone number must be exactly 10 digits');
    }

    // Check if it doesn't start with 0
    if (sanitized.startsWith('0')) {
        throw new Error('Phone number should not start with 0');
    }

    return sanitized;
};

/**
 * Validates and sanitizes an email address
 */
export const sanitizeEmail = (input) => {
    if (!input) return input;

    let sanitized = String(input).trim().toLowerCase();

    // Strip HTML tags and null bytes
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    sanitized = sanitized.replace(/\0/g, '');

    // Limit length
    if (sanitized.length > 254) {
        sanitized = sanitized.substring(0, 254);
    }

    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(sanitized)) {
        throw new Error('Invalid email address format');
    }

    return sanitized;
};

/**
 * Sanitizes an object recursively
 */
export const sanitizeObject = (obj, schema = {}) => {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = {};

    for (const [key, value] of Object.entries(obj)) {
        if (Object.prototype.hasOwnProperty.call(schema, key)) {
            const fieldSchema = schema[key];
            sanitized[key] = sanitizeField(value, fieldSchema);
        } else {
            // For fields not in schema, apply basic sanitization
            if (typeof value === 'string') {
                sanitized[key] = sanitizeHtml(value);
            } else {
                sanitized[key] = value;
            }
        }
    }

    return sanitized;
};

/**
 * Sanitizes a single field based on its schema
 */
const sanitizeField = (value, schema) => {
    const { type, required, maxLength, allowHtml, customValidator } = schema;

    // Check required fields
    if (required && (value === undefined || value === null || value === '')) {
        throw new Error('Required field is missing');
    }

    if (value === undefined || value === null) {
        return value;
    }

    let sanitized = value;

    // Type-specific sanitization
    switch (type) {
        case 'string':
            sanitized = String(value);
            if (!allowHtml) {
                sanitized = sanitizeHtml(sanitized);
            } else {
                sanitized = sanitizeString(sanitized, { maxLength });
            }
            break;

        case 'number':
            sanitized = Number(value);
            if (isNaN(sanitized)) {
                throw new Error('Invalid number');
            }
            break;

        case 'email':
            sanitized = sanitizeEmail(value);
            break;

        case 'phone':
            sanitized = sanitizePhoneNumber(value);
            break;

        case 'registration':
            sanitized = sanitizeRegistrationNumber(value);
            break;

        case 'boolean':
            sanitized = Boolean(value);
            break;

        case 'date':
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                throw new Error('Invalid date');
            }
            sanitized = date.toISOString();
            break;

        default:
            if (typeof value === 'string') {
                sanitized = sanitizeHtml(value);
            }
    }

    // Apply custom validator if provided
    if (customValidator && typeof customValidator === 'function') {
        customValidator(sanitized);
    }

    return sanitized;
};

/**
 * Prevents SQL injection by parameterizing queries
 * This is a utility function for documenting the approach
 */
export const sanitizeForQuery = (input) => {
    // This should NOT be used to sanitize SQL queries directly
    // Instead, always use parameterized queries with Supabase
    // This function serves as documentation of best practices
    console.warn('Use parameterized queries instead of string sanitization for SQL');
    return input;
};

/**
 * Validates file names for security
 */
export const sanitizeFilename = (input) => {
    if (!input) return input;

    // Remove path traversal attempts
    let sanitized = input.replace(/[\/\\:*?"<>|]/g, '');

    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '');

    // Remove dots at the beginning or end
    sanitized = sanitized.replace(/^\.+/, '').replace(/\.+$/, '');

    // Limit length
    if (sanitized.length > 255) {
        const ext = sanitized.split('.').pop();
        sanitized = sanitized.substring(0, 255 - ext.length - 1) + '.' + ext;
    }

    return sanitized;
};

/**
 * Sanitizes URLs to prevent XSS
 */
export const sanitizeUrl = (input) => {
    if (!input) return input;

    let sanitized = String(input).trim();

    // Check for dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    const lowerInput = sanitized.toLowerCase();

    for (const protocol of dangerousProtocols) {
        if (lowerInput.startsWith(protocol)) {
            throw new Error('Dangerous protocol detected in URL');
        }
    }

    // Basic URL validation
    try {
        new URL(sanitized, 'http://example.com');
    } catch {
        throw new Error('Invalid URL format');
    }

    return sanitized;
};

/**
 * Schema for student form validation
 */
export const studentFormSchema = {
    registration_no: { type: 'registration', required: true },
    student_name: {
        type: 'string',
        required: true,
        maxLength: 100,
        customValidator: (value) => {
            if (value.length < 2) {
                throw new Error('Name must be at least 2 characters long');
            }
        }
    },
    contact_no: { type: 'phone', required: true },
    admission_year: { type: 'string', maxLength: 4 },
    passing_year: { type: 'string', maxLength: 4 },
    school: { type: 'string', required: false, maxLength: 50 },
    course: { type: 'string', required: false, maxLength: 50 },
    branch: { type: 'string', required: false, maxLength: 50 },
    parent_name: {
        type: 'string',
        required: false,
        maxLength: 100,
        customValidator: (value) => {
            if (value && value.length < 2) {
                throw new Error('Parent name must be at least 2 characters long');
            }
        }
    }
};

/**
 * Validates and sanitizes student form data
 */
export const validateStudentForm = (data) => {
    return sanitizeObject(data, studentFormSchema);
};

/**
 * Rate limiting utility to prevent abuse
 */
export const createRateLimiter = (maxAttempts = 5, windowMs = 60000) => {
    const attempts = new Map();

    return {
        check: (identifier) => {
            const now = Date.now();
            const userAttempts = attempts.get(identifier) || [];

            // Remove old attempts outside the window
            const recentAttempts = userAttempts.filter(time => now - time < windowMs);

            if (recentAttempts.length >= maxAttempts) {
                throw new Error('Too many attempts. Please try again later.');
            }

            // Add current attempt
            recentAttempts.push(now);
            attempts.set(identifier, recentAttempts);

            return true;
        },

        reset: (identifier) => {
            attempts.delete(identifier);
        }
    };
};