-- Run this snippet in the Supabase SQL Editor to upgrade your existing database without losing data

ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS "triageClassification" TEXT DEFAULT 'NEW_INCIDENT',
ADD COLUMN IF NOT EXISTS "triageConfidence" DOUBLE PRECISION DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS "duplicateOf" UUID NULL REFERENCES reports(id),
ADD COLUMN IF NOT EXISTS "relatedReportIds" UUID[] DEFAULT ARRAY[]::UUID[],
ADD COLUMN IF NOT EXISTS "clusterKey" TEXT,
ADD COLUMN IF NOT EXISTS "priorityScore" INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS "priorityBand" TEXT DEFAULT 'MEDIUM',
ADD COLUMN IF NOT EXISTS "recommendedAction" TEXT,
ADD COLUMN IF NOT EXISTS "triageReasoning" TEXT,
ADD COLUMN IF NOT EXISTS "caseBrief" JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS "triageSignals" JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS "userOverride" BOOLEAN DEFAULT FALSE;
