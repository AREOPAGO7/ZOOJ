-- Create user_moods table for storing user mood status
CREATE TABLE IF NOT EXISTS user_moods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood_type TEXT NOT NULL CHECK (mood_type IN ('joyeux', 'content', 'neutre', 'triste', 'enerve')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_moods_user_id ON user_moods(user_id);
CREATE INDEX IF NOT EXISTS idx_user_moods_created_at ON user_moods(created_at);

-- Enable Row Level Security
ALTER TABLE user_moods ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own moods and their partner's moods
CREATE POLICY "Users can view their own and partner's moods" ON user_moods
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

-- RLS Policy: Users can only insert their own moods
CREATE POLICY "Users can insert their own moods" ON user_moods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only update their own moods
CREATE POLICY "Users can update their own moods" ON user_moods
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own moods
CREATE POLICY "Users can delete their own moods" ON user_moods
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_moods_updated_at 
  BEFORE UPDATE ON user_moods 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE user_moods IS 'Stores user mood status for the couple app';
COMMENT ON COLUMN user_moods.mood_type IS 'Type of mood: joyeux, content, neutre, triste, enerve';
