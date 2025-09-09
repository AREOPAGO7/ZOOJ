-- Remove user_id column since notifications are global
ALTER TABLE public.daily_question_notifications 
DROP COLUMN user_id;

-- Make couple_id nullable since global notifications don't need a specific couple
ALTER TABLE public.daily_question_notifications 
ALTER COLUMN couple_id DROP NOT NULL;

-- Add a comment to explain the global nature
COMMENT ON TABLE public.daily_question_notifications IS 'Global daily question notifications visible to all users';
