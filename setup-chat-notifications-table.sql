-- Create chat_notifications table specifically for chat message notifications
CREATE TABLE IF NOT EXISTS chat_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL,
  message_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL,
  question_content TEXT,
  sender_name TEXT,
  message_preview TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  is_delivered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_notifications_receiver_id ON chat_notifications(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_notifications_thread_id ON chat_notifications(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_notifications_is_read ON chat_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_chat_notifications_created_at ON chat_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_notifications_sender_receiver ON chat_notifications(sender_id, receiver_id);

-- Enable Row Level Security
ALTER TABLE chat_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see notifications sent to them
CREATE POLICY "Users can view their own chat notifications" ON chat_notifications
  FOR SELECT USING (auth.uid() = receiver_id);

-- RLS Policy: Users can insert notifications (for sending)
CREATE POLICY "Users can insert chat notifications" ON chat_notifications
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- RLS Policy: Users can update their own notifications (for marking as read)
CREATE POLICY "Users can update their own chat notifications" ON chat_notifications
  FOR UPDATE USING (auth.uid() = receiver_id);

-- Create function to clean up old notifications (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_chat_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM chat_notifications 
  WHERE expires_at < NOW();
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at column if it doesn't exist
ALTER TABLE chat_notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger for updated_at
CREATE TRIGGER update_chat_notifications_updated_at 
  BEFORE UPDATE ON chat_notifications 
  FOR EACH ROW 
  EXECUTE FUNCTION update_chat_notifications_updated_at();
