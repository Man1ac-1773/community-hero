-- Civic Watch Hub: Safe Database Reset
-- This drops and recreates your tables to guarantee a clean slate.
-- It DOES NOT touch your user accounts or storage buckets.

DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS reports CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create the `reports` table
CREATE TABLE reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "userId" UUID NOT NULL, -- references auth.users(id)
    "userName" TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    "imageUrl" TEXT,
    description TEXT,
    category TEXT,
    severity TEXT,
    status TEXT DEFAULT 'OPEN',
    "verifiedBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resolvedBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    subscribers TEXT[] DEFAULT ARRAY[]::TEXT[],
    history JSONB DEFAULT '[]'::jsonb,
    "triageClassification" TEXT DEFAULT 'NEW_INCIDENT',
    "triageConfidence" DOUBLE PRECISION DEFAULT 1.0,
    "duplicateOf" UUID NULL REFERENCES reports(id),
    "relatedReportIds" UUID[] DEFAULT ARRAY[]::UUID[],
    "clusterKey" TEXT,
    "priorityScore" INTEGER DEFAULT 50,
    "priorityBand" TEXT DEFAULT 'MEDIUM',
    "recommendedAction" TEXT,
    "triageReasoning" TEXT,
    "caseBrief" JSONB DEFAULT '{}'::jsonb,
    "triageSignals" JSONB DEFAULT '{}'::jsonb,
    "userOverride" BOOLEAN DEFAULT FALSE
);

-- 2. Create the `comments` table
CREATE TABLE comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- references auth.users(id)
    user_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Row Level Security (RLS) Policies
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on reports" ON reports FOR SELECT USING (true);
CREATE POLICY "Allow public read access on comments" ON comments FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert reports" ON reports FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to insert comments" ON comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update their own reports" ON reports FOR UPDATE USING (auth.uid() = "userId");

-- 4. Secure RPC Functions for Array Mutations
CREATE OR REPLACE FUNCTION verify_report(report_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE reports
  SET "verifiedBy" = array_append(COALESCE("verifiedBy", ARRAY[]::TEXT[]), auth.uid()::text),
      history = COALESCE(history, '[]'::jsonb) || jsonb_build_object('type', 'VERIFIED', 'timestamp', NOW(), 'user', auth.uid())
  WHERE id = report_id AND NOT (auth.uid()::text = ANY(COALESCE("verifiedBy", ARRAY[]::TEXT[])));
END;
$$;

CREATE OR REPLACE FUNCTION resolve_report(report_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_length INT;
BEGIN
  UPDATE reports
  SET "resolvedBy" = array_append(COALESCE("resolvedBy", ARRAY[]::TEXT[]), auth.uid()::text),
      history = COALESCE(history, '[]'::jsonb) || jsonb_build_object('type', 'RESOLUTION_VOTE', 'timestamp', NOW(), 'user', auth.uid())
  WHERE id = report_id AND NOT (auth.uid()::text = ANY(COALESCE("resolvedBy", ARRAY[]::TEXT[])))
  RETURNING array_length("resolvedBy", 1) INTO current_length;
  
  IF current_length >= 3 THEN
    UPDATE reports
    SET status = 'RESOLVED',
        history = COALESCE(history, '[]'::jsonb) || jsonb_build_object('type', 'RESOLVED', 'timestamp', NOW(), 'user', 'SYSTEM')
    WHERE id = report_id;
  END IF;
END;
$$;

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

-- Force Supabase to reload its API Schema Cache immediately
NOTIFY pgrst, 'reload schema';
