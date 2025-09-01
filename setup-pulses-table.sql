-- Create pulses table for sending quick messages between partners
-- Pulses disappear after 24 hours

CREATE TABLE IF NOT EXISTS public.pulses (
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
CREATE INDEX IF NOT EXISTS idx_pulses_sender_id ON public.pulses(sender_id);
CREATE INDEX IF NOT EXISTS idx_pulses_receiver_id ON public.pulses(receiver_id);
CREATE INDEX IF NOT EXISTS idx_pulses_created_at ON public.pulses(created_at);
CREATE INDEX IF NOT EXISTS idx_pulses_expires_at ON public.pulses(expires_at);

-- Enable Row Level Security
ALTER TABLE public.pulses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can insert pulses to their partner
CREATE POLICY "Users can send pulses to their partner" ON public.pulses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.couples 
      WHERE (user1_id = auth.uid() AND user2_id = receiver_id) 
         OR (user2_id = auth.uid() AND user1_id = receiver_id)
    )
  );

-- Users can view pulses sent to them or by them
CREATE POLICY "Users can view their pulses" ON public.pulses
  FOR SELECT USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

-- Users can update pulses they received (mark as read)
CREATE POLICY "Users can update pulses they received" ON public.pulses
  FOR UPDATE USING (
    receiver_id = auth.uid()
  );

-- Users can delete their own pulses
CREATE POLICY "Users can delete their own pulses" ON public.pulses
  FOR DELETE USING (
    sender_id = auth.uid()
  );

-- Add comments
COMMENT ON TABLE public.pulses IS 'Quick messages (pulses) sent between partners that expire after 24 hours';
COMMENT ON COLUMN public.pulses.emoji IS 'Emoji representing the pulse type';
COMMENT ON COLUMN public.pulses.message IS 'Optional message accompanying the pulse';
COMMENT ON COLUMN public.pulses.expires_at IS 'When the pulse expires (24 hours after creation)';
COMMENT ON COLUMN public.pulses.is_read IS 'Whether the receiver has seen the pulse';
