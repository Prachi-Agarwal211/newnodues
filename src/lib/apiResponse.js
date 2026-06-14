import { NextResponse } from 'next/server';

/**
 * Standardized API Response Helper
 * Ensures consistent response format across the application
 */
export const ApiResponse = {
    /**
     * Success Response
     * @param {any} data - Payload to return
     * @param {string} message - Success message
     * @param {number} status - HTTP status code (default 200)
     */
    success: (data = null, message = 'Success', status = 200) => {
        return NextResponse.json(
            {
                success: true,
                message,
                data,
                timestamp: new Date().toISOString()
            },
            { status }
        );
    },

    /**
     * Error Response
     * @param {string} message - Error message
     * @param {number} status - HTTP status code (default 500)
     * @param {any} details - Additional error details (optional)
     */
    error: (message = 'Internal Server Error', status = 500, details = null) => {
        // Log 500 errors to console for monitoring
        if (status >= 500) {
            console.error(`[API Error] ${status}: ${message}`, details);
        }

        return NextResponse.json(
            {
                success: false,
                error: message,
                details: process.env.NODE_ENV === 'development' ? details : undefined,
                timestamp: new Date().toISOString()
            },
            { status }
        );
    },

    /**
     * Validation Error Response (400)
     * @param {string} message - Error message
     * @param {object} errors - Zod validation errors
     */
    validationError: (message = 'Validation Failed', errors = null) => {
        return NextResponse.json(
            {
                success: false,
                error: message,
                details: errors,
                timestamp: new Date().toISOString()
            },
            { status: 400 }
        );
    }
};
