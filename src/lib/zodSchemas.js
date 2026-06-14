/**
 * Zod Validation Schemas
 * Centralized, type-safe validation for the entire application
 * 
 * Install: npm install zod
 */

import { z } from 'zod';

// ============================================================================
// CUSTOM ERROR MESSAGES
// ============================================================================

const customErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_type) {
    if (issue.expected === 'string') {
      return { message: `${issue.path.join('.')} must be text` };
    }
  }
  if (issue.code === z.ZodIssueCode.too_small) {
    if (issue.type === 'string') {
      return { message: `${issue.path.join('.')} must be at least ${issue.minimum} characters` };
    }
  }
  return { message: ctx.defaultError };
};

z.setErrorMap(customErrorMap);

// ============================================================================
// REUSABLE FIELD SCHEMAS
// ============================================================================

/**
 * Registration Number Schema
 * Format: YYBBBBNNNN (e.g., 21BCON747)
 * YY = Year (2 digits)
 * BBBB = Branch code (2-6 letters)
 * NNNN = Number (3-4 digits)
 */
export const registrationNoSchema = z
  .string()
  .min(8, 'Registration number must be at least 8 characters')
  .max(15, 'Registration number must be at most 15 characters')
  .regex(
    /^[0-9]{2}[A-Z]{2,6}[0-9]{3,4}$/,
    'Invalid format. Expected: YYBBBBNNNN (e.g., 21BCON747)'
  )
  .transform(val => val.toUpperCase().trim());

/**
 * Student Name Schema
 * Only letters, spaces, dots, hyphens, apostrophes
 */
export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be at most 100 characters')
  .regex(
    /^[A-Za-z\s.\-']+$/,
    'Name can only contain letters, spaces, dots, hyphens, and apostrophes'
  )
  .transform(val => val.trim());

/**
 * Email Schema
 * RFC 5322 compliant
 */
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(254, 'Email must be at most 254 characters')
  .transform(val => val.toLowerCase().trim());

/**
 * JECRC College Email Schema
 * Must end with @jecrcuniversity.edu.in or configured domain
 */
export const collegeEmailSchema = (domain = '@jecrcuniversity.edu.in') => z
  .string()
  .email('Invalid email format')
  .refine(
    val => val.toLowerCase().endsWith(domain.toLowerCase()),
    { message: `College email must end with ${domain}` }
  )
  .transform(val => val.toLowerCase().trim());

/**
 * Phone Number Schema
 * Indian format: 10 digits starting with 6-9
 */
export const phoneSchema = z
  .string()
  .regex(/^[6-9][0-9]{9}$/, 'Phone number must be 10 digits starting with 6-9')
  .transform(val => val.trim());

/**
 * Year Schema
 * 4-digit year within reasonable range
 */
const currentYear = new Date().getFullYear();
export const yearSchema = z
  .string()
  .regex(/^\d{4}$/, 'Year must be in YYYY format')
  .refine(
    val => {
      const year = parseInt(val);
      return year >= currentYear - 10 && year <= currentYear + 5;
    },
    { message: `Year must be between ${currentYear - 10} and ${currentYear + 5}` }
  )
  .transform(val => val.trim());

/**
 * UUID Schema
 */
export const uuidSchema = z
  .string()
  .uuid('Invalid ID format')
  .transform(val => val.toLowerCase());

/**
 * URL Schema
 * Only HTTP/HTTPS allowed
 */
export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .refine(
    val => val.startsWith('http://') || val.startsWith('https://'),
    { message: 'URL must start with http:// or https://' }
  );

/**
 * File Size Schema (in bytes)
 */
export const fileSizeSchema = (maxSize = 1 * 1024 * 1024) => z
  .number()
  .max(maxSize, `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);

// ============================================================================
// FORM SCHEMAS
// ============================================================================

/**
 * Student No-Dues Form Submission Schema
 * Used in /api/student POST
 */
export const studentFormSchema = z.object({
  registration_no: registrationNoSchema,
  student_name: nameSchema,
  parent_name: nameSchema.optional().or(z.literal('')).transform(val => val?.trim()),
  personal_email: emailSchema,
  college_email: emailSchema, // Will be validated against domain separately
  contact_no: phoneSchema,
  country_code: z.string().default('+91'),
  admission_year: yearSchema.optional().or(z.literal('')).transform(val => val?.trim()),
  passing_year: yearSchema.optional().or(z.literal('')).transform(val => val?.trim()),
  school: z.string().min(1, 'School is required'), // UUID or Name
  course: z.string().min(1, 'Course is required'), // UUID or Name
  branch: z.string().min(1, 'Branch is required'), // UUID or Name
  alumni_profile_link: urlSchema
});


/**
 * Student Reapplication Schema
 * Used in /api/student/reapply POST
 */
export const reapplySchema = z.object({
  formId: uuidSchema,
  registration_no: registrationNoSchema,
  student_reply_message: z
    .string()
    .min(20, 'Reply message must be at least 20 characters')
    .max(1000, 'Reply message must be at most 1000 characters')
    .transform(val => val.trim())
});

/**
 * Staff Action Schema
 * Used in /api/staff/action POST
 * ✅ SECURITY FIX: userId removed - must be extracted from auth token
 */
export const staffActionSchema = z.object({
  formId: uuidSchema,
  departmentName: z
    .string()
    .min(2, 'Department name is required')
    .max(100, 'Department name too long'),
  action: z.enum(['approve', 'reject', 'pending'], {
    errorMap: () => ({ message: 'Action must be approve, reject, or pending' })
  }),
  reason: z
    .string()
    .min(1, 'Reason must be at least 1 character')
    .max(500, 'Reason must be at most 500 characters')
    .optional()
    .or(z.literal(''))
});

/**
 * Support Ticket Schema
 * Used in /api/support/submit POST
 * ✅ FIX: rollNumber accepts string, null, or undefined
 * - Student: sends "21BCON747" (string)
 * - Department/Admin: sends null
 * - Guest: doesn't send field (undefined)
 */
export const supportTicketSchema = z.object({
  email: emailSchema,
  rollNumber: z.string().nullable().optional(), // ✅ Accepts string | null | undefined
  subject: z.string().max(100, 'Subject too long').optional().or(z.literal('')),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message must be at most 5000 characters')
    .transform(val => val.trim()),
  requesterType: z.enum(['student', 'staff', 'general'], {
    errorMap: () => ({ message: 'Invalid requester type' })
  })
});



/**
 * File Upload Schema
 * Used in /api/upload POST
 */
export const fileUploadSchema = z.object({
  bucket: z.enum(['no-dues-files', 'alumni-screenshots', 'certificates'], {
    errorMap: () => ({ message: 'Invalid bucket name' })
  }),
  folder: z.string().optional().default(''),
  filename: z
    .string()
    .regex(
      /^[a-zA-Z0-9_\-\.]+$/,
      'Filename can only contain letters, numbers, underscores, hyphens, and dots'
    )
});

/**
 * Password Reset Request Schema
 * Used in /api/staff/forgot-password POST
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema
});

/**
 * Password Reset Schema
 * Used in /api/staff/reset-password POST
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number'
    )
});

/**
 * Certificate Generation Schema
 * Used in /api/certificate/generate POST
 */
export const certificateGenerateSchema = z.object({
  formId: uuidSchema
});

/**
 * Certificate Verification Schema
 * Used in /api/certificate/verify POST
 */
export const certificateVerifySchema = z.object({
  formId: uuidSchema,
  qrData: z.string().optional()
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate data against a schema and return formatted errors
 * @param {Object} data - Data to validate
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Object} { success, data, errors }
 */
export function validateWithZod(data, schema) {
  try {
    const parsed = schema.parse(data);
    return {
      success: true,
      data: parsed,
      errors: null
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format errors for easy consumption
      const formattedErrors = {};
      error.errors.forEach(err => {
        const field = err.path.join('.');
        formattedErrors[field] = err.message;
      });

      return {
        success: false,
        data: null,
        errors: formattedErrors
      };
    }

    // Unexpected error
    return {
      success: false,
      data: null,
      errors: { _error: 'Validation failed' }
    };
  }
}

/**
 * Validate data against a schema and throw if invalid
 * Use this in API routes for cleaner code
 * @param {Object} data - Data to validate
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Object} Parsed data
 * @throws {z.ZodError} If validation fails
 */
export function validateOrThrow(data, schema) {
  return schema.parse(data);
}

/**
 * Create a Zod middleware for Next.js API routes
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Middleware function
 */
export function zodMiddleware(schema) {
  return async (request) => {
    try {
      const body = await request.json();
      const parsed = schema.parse(body);
      return { success: true, data: parsed };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return {
          success: false,
          error: firstError.message,
          field: firstError.path.join('.'),
          details: error.errors.reduce((acc, err) => {
            acc[err.path.join('.')] = err.message;
            return acc;
          }, {})
        };
      }
      return {
        success: false,
        error: 'Invalid JSON in request body'
      };
    }
  };
}

// ============================================================================
// EXPORT ALL SCHEMAS
// ============================================================================

export default {
  // Field schemas
  registrationNoSchema,
  nameSchema,
  emailSchema,
  collegeEmailSchema,
  phoneSchema,
  yearSchema,
  uuidSchema,
  urlSchema,
  fileSizeSchema,

  // Form schemas
  studentFormSchema,
  reapplySchema,
  staffActionSchema,
  supportTicketSchema,
  fileUploadSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  certificateGenerateSchema,
  certificateVerifySchema,

  // Helper functions
  validateWithZod,
  validateOrThrow,
  zodMiddleware
};