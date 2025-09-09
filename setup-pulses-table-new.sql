-- Create pulses table for real-time messaging between partners
-- This is a fresh implementation with proper structure

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.pulses CASCADE;

-- Create the pulses table
CREATE TABLE public.pulses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  emoji text NOT NULL,
  message text,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '24 hours'),
  is_read boolean DEFAULT false,
  CONSTRAINT pulses_pkey PRIMARY KEY (id),
  CONSTRAINT pulses_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT pulses_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX idx_pulses_sender_id ON public.pulses(sender_id);
CREATE INDEX idx_pulses_receiver_id ON public.pulses(receiver_id);
CREATE INDEX idx_pulses_created_at ON public.pulses(created_at);
CREATE INDEX idx_pulses_expires_at ON public.pulses(expires_at);
CREATE INDEX idx_pulses_is_read ON public.pulses(is_read);

-- Enable Row Level Security (but with permissive policies)
ALTER TABLE public.pulses ENABLE ROW LEVEL SECURITY;

-- Create permissive RLS policies
-- Allow authenticated users to insert pulses
CREATE POLICY "Allow pulse insertion" ON public.pulses
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to select pulses
CREATE POLICY "Allow pulse selection" ON public.pulses
  FOR SELECT 
  TO authenticated
  USING (true);

-- Allow authenticated users to update pulses
CREATE POLICY "Allow pulse updates" ON public.pulses
  FOR UPDATE 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete pulses
CREATE POLICY "Allow pulse deletion" ON public.pulses
  FOR DELETE 
  TO authenticated
  USING (true);

-- Grant permissions
GRANT ALL ON public.pulses TO authenticated;
GRANT ALL ON public.pulses TO anon;

-- Enable real-time for pulses table
ALTER PUBLICATION supabase_realtime ADD TABLE public.pulses;

-- Add comments
COMMENT ON TABLE public.pulses IS 'Real-time messages (pulses) sent between partners that expire after 24 hours';
COMMENT ON COLUMN public.pulses.emoji IS 'Emoji representing the pulse type';
COMMENT ON COLUMN public.pulses.message IS 'Optional message accompanying the pulse';
COMMENT ON COLUMN public.pulses.expires_at IS 'When the pulse expires (24 hours after creation)';
COMMENT ON COLUMN public.pulses.is_read IS 'Whether the receiver has seen the pulse';

-- Test the setup
SELECT 'Pulses table created successfully!' as status;
SELECT 'Real-time enabled for pulses table!' as realtime_status;
