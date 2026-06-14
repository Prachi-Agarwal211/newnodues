-- ============================================================
-- FIX: Remove in_progress from forms entirely
-- ============================================================
-- 
-- RULE: A form stays "pending" until ALL departments approve
-- or ANY department rejects. There is no "in_progress".
--
-- Statuses: pending | completed | rejected | reapplied
--
-- Run in Supabase SQL Editor
-- ============================================================

-- STEP 1: Fix all existing in_progress forms
UPDATE no_dues_forms SET status = 'pending' WHERE status = 'in_progress';

-- STEP 2: Fix the DB trigger
DROP FUNCTION IF EXISTS public.update_form_status_on_status_change() CASCADE;

CREATE OR REPLACE FUNCTION public.update_form_status_on_status_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    total_depts INTEGER;
    approved_count INTEGER;
    rejected_count INTEGER;
    pending_count INTEGER;
    new_status TEXT;
BEGIN
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'approved'),
        COUNT(*) FILTER (WHERE status = 'rejected'),
        COUNT(*) FILTER (WHERE status = 'pending')
    INTO total_depts, approved_count, rejected_count, pending_count
    FROM no_dues_status
    WHERE form_id = NEW.form_id;

    IF rejected_count > 0 THEN
        new_status := 'rejected';
    ELSIF approved_count = total_depts AND total_depts > 0 THEN
        new_status := 'completed';
    ELSE
        new_status := 'pending';
    END IF;

    UPDATE no_dues_forms
    SET status = new_status, updated_at = NOW()
    WHERE id = NEW.form_id
    AND status != new_status;

    RETURN NEW;
END;
$$;

-- STEP 3: Recreate the trigger
CREATE TRIGGER trigger_update_form_status
    AFTER INSERT OR UPDATE OF status ON public.no_dues_status
    FOR EACH ROW
    EXECUTE FUNCTION public.update_form_status_on_status_change();

-- STEP 4: Fix the stats RPC
DROP FUNCTION IF EXISTS public.get_form_statistics();

CREATE OR REPLACE FUNCTION public.get_form_statistics()
RETURNS TABLE(
    total_applications bigint,
    pending_applications bigint,
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
        COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_applications,
        COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT as rejected_applications,
        COUNT(*) FILTER (WHERE status = 'reapplied')::BIGINT as reapplied_applications
    FROM no_dues_forms;
END;
$$;

-- STEP 5: Verify
SELECT status, COUNT(*) FROM no_dues_forms GROUP BY status;
