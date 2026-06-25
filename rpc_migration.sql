-- Run this snippet in the Supabase SQL Editor to safely recreate and fix the RPC functions

-- 1. Verify Report (Fixed NULL handling)
CREATE OR REPLACE FUNCTION verify_report(report_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE reports
  SET "verifiedBy" = array_append(COALESCE("verifiedBy", ARRAY[]::TEXT[]), auth.uid()::text),
      history = COALESCE(history, '[]'::jsonb) || jsonb_build_object('type', 'VERIFIED', 'timestamp', NOW(), 'user', auth.uid())
  WHERE id = report_id 
    AND "userId" != auth.uid()
    AND NOT (auth.uid()::text = ANY(COALESCE("verifiedBy", ARRAY[]::TEXT[])));
END;
$$;

-- 2. Resolve Report Vote (Fixed NULL handling)
CREATE OR REPLACE FUNCTION resolve_report(report_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_length INT;
BEGIN
  -- Append user and history
  UPDATE reports
  SET "resolvedBy" = array_append(COALESCE("resolvedBy", ARRAY[]::TEXT[]), auth.uid()::text),
      history = COALESCE(history, '[]'::jsonb) || jsonb_build_object('type', 'RESOLUTION_VOTE', 'timestamp', NOW(), 'user', auth.uid())
  WHERE id = report_id 
    AND "userId" != auth.uid()
    AND NOT (auth.uid()::text = ANY(COALESCE("resolvedBy", ARRAY[]::TEXT[])))
  RETURNING array_length("resolvedBy", 1) INTO current_length;
  
  -- If threshold reached, mark as RESOLVED
  IF current_length >= 3 THEN
    UPDATE reports
    SET status = 'RESOLVED',
        history = COALESCE(history, '[]'::jsonb) || jsonb_build_object('type', 'RESOLVED', 'timestamp', NOW(), 'user', 'SYSTEM')
    WHERE id = report_id;
  END IF;
END;
$$;

-- 3. Subscribe Report (Fixed NULL handling)
CREATE OR REPLACE FUNCTION subscribe_report(report_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE reports
  SET subscribers = array_append(COALESCE(subscribers, ARRAY[]::TEXT[]), auth.uid()::text)
  WHERE id = report_id AND NOT (auth.uid()::text = ANY(COALESCE(subscribers, ARRAY[]::TEXT[])));
END;
$$;
