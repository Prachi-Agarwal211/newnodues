import { createClient } from '@supabase/supabase-js';

// Admin client for logging (bypasses RLS)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Audit Logger
 * Records critical system actions for compliance and tracking
 */
export const AuditLogger = {
    ACTIONS: {
        LOGIN: 'LOGIN',
        LOGOUT: 'LOGOUT',
        SUBMIT_FORM: 'SUBMIT_FORM',
        APPROVE_FORM: 'APPROVE_FORM',
        REJECT_FORM: 'REJECT_FORM',
        STUDENT_REAPPLY: 'STUDENT_REAPPLY',
        GENERATE_CERTIFICATE: 'GENERATE_CERTIFICATE',
        UPDATE_SETTINGS: 'UPDATE_SETTINGS',
        DELETE_FILE: 'DELETE_FILE'
    },

    /**
     * Log an action
     * @param {string} action - One of AuditLogger.ACTIONS
     * @param {string} actorId - User ID who performed the action
     * @param {object} details - JSON details about the action
     * @param {string} resourceId - ID of the target resource (e.g., form ID)
     * @param {string} ipAddress - IP address of the actor (optional)
     */
    log: async (action, actorId, details = {}, resourceId = null, ipAddress = null) => {
        try {
            const actorName =
                details.actor_name ||
                details.actorName ||
                details.staffName ||
                details.userName ||
                details.full_name ||
                details.department ||
                details.departmentName ||
                'System';

            // Fire and forget - don't block the main request
            // We manually catch errors here to prevent unhandled rejections
            supabaseAdmin
                .from('audit_logs')
                .insert({
                    action,
                    actor_id: actorId,
                    actor_name: actorName,
                    details,
                    resource_id: resourceId,
                    ip_address: ipAddress,
                    created_at: new Date().toISOString()
                })
                .then(({ error }) => {
                    if (error) console.error('Failed to write audit log:', error);
                });
        } catch (error) {
            console.error('Audit Logger Execution Error:', error);
        }
    }
};
