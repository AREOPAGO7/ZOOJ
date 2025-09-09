-- Add is_seen column to pulses table
-- This column tracks whether a pulse has been viewed by the user

ALTER TABLE pulses 
ADD COLUMN is_seen BOOLEAN DEFAULT FALSE;

-- Update existing pulses to mark them as seen (since they were already viewed)
UPDATE pulses 
SET is_seen = TRUE 
WHERE is_read = TRUE;

-- Create index for better performance on is_seen queries
CREATE INDEX idx_pulses_is_seen ON pulses(is_seen);

-- Add comment to the column
COMMENT ON COLUMN pulses.is_seen IS 'Tracks whether the pulse has been viewed by the user';
