-- Civic Watch Hub: Supabase Setup Script
-- Run this script in the Supabase SQL Editor to initialize your database.

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

-- Allow authenticated users to update reports (for verification, resolution, location fixes)
CREATE POLICY "Allow authenticated users to update reports" ON reports FOR UPDATE USING (auth.role() = 'authenticated');

-- 4. Set up Storage Buckets
-- Create a public bucket named 'reports' for image uploads.
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', true);

-- Storage Policies
CREATE POLICY "Allow public read access on storage" ON storage.objects FOR SELECT USING (bucket_id = 'reports');
CREATE POLICY "Allow authenticated users to upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'reports' AND auth.role() = 'authenticated');
