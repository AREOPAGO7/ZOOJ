-- Create chat_viewers table to track who is currently viewing a chat thread
CREATE TABLE IF NOT EXISTS chat_viewers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_viewing BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(thread_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_viewers_thread_id ON chat_viewers(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_viewers_user_id ON chat_viewers(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_viewers_is_viewing ON chat_viewers(is_viewing);
CREATE INDEX IF NOT EXISTS idx_chat_viewers_last_seen ON chat_viewers(last_seen);

-- Enable Row Level Security
ALTER TABLE chat_viewers ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own viewing status and their partner's
CREATE POLICY "Users can view chat viewer status" ON chat_viewers
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT 
        CASE 
          WHEN user1_id = auth.uid() THEN user2_id
          WHEN user2_id = auth.uid() THEN user1_id
        END
      FROM couples 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert/update their own viewing status
CREATE POLICY "Users can manage their own viewing status" ON chat_viewers
  FOR ALL USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_viewers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_chat_viewers_updated_at 
  BEFORE UPDATE ON chat_viewers 
  FOR EACH ROW 
  EXECUTE FUNCTION update_chat_viewers_updated_at();

-- Create function to clean up old viewer records (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_chat_viewers()
RETURNS void AS $$
BEGIN
  DELETE FROM chat_viewers 
  WHERE last_seen < NOW() - INTERVAL '1 hour' 
  AND is_viewing = false;
END;
$$ language 'plpgsql';

-- Create a scheduled job to clean up old records (if pg_cron is available)
-- This would need to be set up separately in Supabase
-- SELECT cron.schedule('cleanup-chat-viewers', '0 * * * *', 'SELECT cleanup_old_chat_viewers();');
