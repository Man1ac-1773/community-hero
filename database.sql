-- Civic Watch Hub: Supabase Setup Script
-- Run this script in the Supabase SQL Editor to initialize your database.

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
    history JSONB DEFAULT '[]'::jsonb
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
-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Allow public read access (Anyone can view reports and comments)
CREATE POLICY "Allow public read access on reports" ON reports FOR SELECT USING (true);
CREATE POLICY "Allow public read access on comments" ON comments FOR SELECT USING (true);

-- Allow authenticated users to insert reports and comments
CREATE POLICY "Allow authenticated users to insert reports" ON reports FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to insert comments" ON comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update ONLY THEIR OWN reports (for location fixes)
CREATE POLICY "Allow authenticated users to update their own reports" ON reports FOR UPDATE USING (auth.uid() = "userId");

-- 4. Secure RPC Functions for Array Mutations
-- Verify Report
CREATE OR REPLACE FUNCTION verify_report(report_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE reports
  SET "verifiedBy" = array_append("verifiedBy", auth.uid()::text),
      history = history || jsonb_build_object('type', 'VERIFIED', 'timestamp', NOW(), 'user', auth.uid())
  WHERE id = report_id AND NOT (auth.uid()::text = ANY("verifiedBy"));
END;
$$;

-- Resolve Report Vote
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
  SET "resolvedBy" = array_append("resolvedBy", auth.uid()::text),
      history = history || jsonb_build_object('type', 'RESOLUTION_VOTE', 'timestamp', NOW(), 'user', auth.uid())
  WHERE id = report_id AND NOT (auth.uid()::text = ANY("resolvedBy"))
  RETURNING array_length("resolvedBy", 1) INTO current_length;
  
  -- If threshold reached, mark as RESOLVED
  IF current_length >= 3 THEN
    UPDATE reports
    SET status = 'RESOLVED',
        history = history || jsonb_build_object('type', 'RESOLVED', 'timestamp', NOW(), 'user', 'SYSTEM')
    WHERE id = report_id;
  END IF;
END;
$$;

-- Subscribe Report
CREATE OR REPLACE FUNCTION subscribe_report(report_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE reports
  SET subscribers = array_append(subscribers, auth.uid()::text)
  WHERE id = report_id AND NOT (auth.uid()::text = ANY(subscribers));
END;
$$;

-- 4. Set up Storage Buckets
-- Create a public bucket named 'reports' for image uploads.
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', true);

-- Storage Policies
CREATE POLICY "Allow public read access on storage" ON storage.objects FOR SELECT USING (bucket_id = 'reports');
CREATE POLICY "Allow authenticated users to upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'reports' AND auth.role() = 'authenticated');
