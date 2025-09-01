-- Setup Events Table for Automatic Notifications
-- Run this in your Supabase SQL editor

-- Create the events table
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TIME,
  location TEXT,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_couple_id ON events(couple_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_is_deleted ON events(is_deleted);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events table
CREATE POLICY "Users can view events in their couple" ON events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM couples 
      WHERE couples.id = events.couple_id 
      AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can create events in their couple" ON events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM couples 
      WHERE couples.id = events.couple_id 
      AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update events they created" ON events
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete events they created" ON events
  FOR DELETE USING (created_by = auth.uid());

-- Insert some sample events for testing (optional)
-- Replace the couple_id with an actual couple ID from your database
/*
INSERT INTO events (title, description, date, time, location, couple_id, created_by) VALUES
('Dîner romantique', 'Dîner au restaurant Le Petit Bistrot', '2024-12-25', '20:00', 'Le Petit Bistrot, Paris', 'YOUR_COUPLE_ID_HERE', 'YOUR_USER_ID_HERE'),
('Cinéma', 'Film romantique au cinéma', '2024-12-26', '19:30', 'Cinéma Le Rex, Paris', 'YOUR_COUPLE_ID_HERE', 'YOUR_USER_ID_HERE'),
('Promenade', 'Balade dans le parc', '2024-12-27', '15:00', 'Parc des Buttes-Chaumont', 'YOUR_COUPLE_ID_HERE', 'YOUR_USER_ID_HERE');
*/

-- Verify the table was created
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'events'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;
