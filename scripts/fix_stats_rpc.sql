-- FIX: get_form_statistics RPC function
-- Problem: Forms with status 'in_progress' and 'reapplied' were NOT counted in any category.
-- The old RPC only counted 'pending', 'approved'/'completed', and 'rejected'.
-- 'approved' was dead code since no form ever has status 'approved' (trigger only sets
-- pending/in_progress/completed/rejected).
--
-- Run this in Supabase SQL Editor to fix the stats.

DROP FUNCTION IF EXISTS public.get_form_statistics();

CREATE FUNCTION public.get_form_statistics()
RETURNS TABLE(
    total_applications bigint,
    pending_applications bigint,
    in_progress_applications bigint,
    completed_applications bigint,
    rejected_applications bigint,
    reapplied_applications bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_applications,
        COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_applications,
        COUNT(*) FILTER (WHERE status = 'in_progress')::BIGINT as in_progress_applications,
        COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_applications,
        COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT as rejected_applications,
        COUNT(*) FILTER (WHERE status = 'reapplied')::BIGINT as reapplied_applications
    FROM no_dues_forms;
END;
$$;
