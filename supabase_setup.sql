-- 1. Create the reports table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "imageUrl" TEXT,
    category TEXT,
    severity TEXT,
    description TEXT,
    lat FLOAT8,
    lng FLOAT8,
    status TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "verifiedBy" TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Disable Row Level Security on the reports table for easy hackathon MVP testing
ALTER TABLE public.reports DISABLE ROW LEVEL SECURITY;

-- 3. Create the storage bucket for images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Allow public uploads to the reports bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Allow public uploads to reports bucket' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Allow public uploads to reports bucket" 
        ON storage.objects FOR INSERT 
        TO public 
        WITH CHECK (bucket_id = 'reports');
    END IF;
END
$$;

-- 5. Create the comments table for Discussion Threads
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "reportId" UUID REFERENCES public.reports(id) ON DELETE CASCADE,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Disable RLS for comments for hackathon MVP
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;
