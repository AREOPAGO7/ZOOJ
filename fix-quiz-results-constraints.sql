-- Fix quiz_results table constraints and structure
-- Run this in your Supabase SQL editor

-- First, check the current structure of quiz_results table
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'quiz_results' 
ORDER BY ordinal_position;

-- Check existing constraints
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'quiz_results'::regclass;

-- Create the quiz_results table if it doesn't exist, or add missing constraints
CREATE TABLE IF NOT EXISTS quiz_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL,
  couple_id uuid NOT NULL,
  score numeric NOT NULL,
  user1_percent numeric NOT NULL,
  user2_percent numeric NOT NULL,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  weaknesses jsonb NOT NULL DEFAULT '[]'::jsonb,
  computed_at timestamp with time zone DEFAULT now(),
  first_answered_by uuid,
  CONSTRAINT quiz_results_pkey PRIMARY KEY (id),
  CONSTRAINT quiz_results_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
  CONSTRAINT quiz_results_couple_id_fkey FOREIGN KEY (couple_id) REFERENCES couples(id),
  CONSTRAINT quiz_results_first_answered_by_fkey FOREIGN KEY (first_answered_by) REFERENCES profiles(id)
);

-- Add unique constraint for (quiz_id, couple_id) if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'quiz_results_quiz_couple_unique' 
    AND conrelid = 'quiz_results'::regclass
  ) THEN
    ALTER TABLE quiz_results 
    ADD CONSTRAINT quiz_results_quiz_couple_unique 
    UNIQUE (quiz_id, couple_id);
  END IF;
END $$;

-- Enable RLS on quiz_results table
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view quiz results for their couple" ON quiz_results;
DROP POLICY IF EXISTS "Users can insert quiz results for their couple" ON quiz_results;
DROP POLICY IF EXISTS "Users can update quiz results for their couple" ON quiz_results;

-- Create RLS policies for quiz_results table
CREATE POLICY "Users can view quiz results for their couple" ON quiz_results
  FOR SELECT USING (
    couple_id IN (
      SELECT id FROM couples 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert quiz results for their couple" ON quiz_results
  FOR INSERT WITH CHECK (
    couple_id IN (
      SELECT id FROM couples 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

CREATE POLICY "Users can update quiz results for their couple" ON quiz_results
  FOR UPDATE USING (
    couple_id IN (
      SELECT id FROM couples 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- Verify the constraints were created
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'quiz_results'::regclass
ORDER BY conname;

-- Test the table structure
SELECT COUNT(*) as total_quiz_results FROM quiz_results;

-- Test inserting a sample record (replace with real IDs for testing)
-- INSERT INTO quiz_results (quiz_id, couple_id, score, user1_percent, user2_percent) 
-- VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 85.5, 80.0, 90.0)
-- ON CONFLICT (quiz_id, couple_id) DO UPDATE SET 
--   score = EXCLUDED.score,
--   user1_percent = EXCLUDED.user1_percent,
--   user2_percent = EXCLUDED.user2_percent,
--   computed_at = now();
