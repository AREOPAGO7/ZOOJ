-- Add mood field to profiles table
-- This script adds a mood field to the existing profiles table

-- Add mood column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mood TEXT DEFAULT 'neutre' CHECK (mood IN ('joyeux', 'content', 'neutre', 'triste', 'enerve'));

-- Update existing profiles to have a default mood if they don't have one
UPDATE profiles SET mood = 'neutre' WHERE mood IS NULL;

-- Add comment to the column
COMMENT ON COLUMN profiles.mood IS 'User mood status: joyeux, content, neutre, triste, enerve';

-- Verify the change
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'mood';
