-- Create game_stats table to store couple game statistics
CREATE TABLE game_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
    game_type VARCHAR(50) NOT NULL, -- 'connect4', 'chess', 'pong', 'uno'
    player1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    player2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Game results
    winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_draw BOOLEAN DEFAULT FALSE,
    game_duration INTEGER, -- in seconds
    
    -- Game-specific stats
    player1_score INTEGER DEFAULT 0,
    player2_score INTEGER DEFAULT 0,
    
    -- Connect4 specific
    connect4_moves INTEGER, -- total moves in the game
    connect4_winning_move INTEGER, -- move number when game ended
    
    -- Chess specific
    chess_pieces_captured_player1 INTEGER DEFAULT 0,
    chess_pieces_captured_player2 INTEGER DEFAULT 0,
    chess_checkmate BOOLEAN DEFAULT FALSE,
    chess_stalemate BOOLEAN DEFAULT FALSE,
    
    -- Pong specific
    pong_ball_hits_player1 INTEGER DEFAULT 0,
    pong_ball_hits_player2 INTEGER DEFAULT 0,
    pong_longest_rally INTEGER DEFAULT 0,
    
    -- Uno specific
    uno_cards_played_player1 INTEGER DEFAULT 0,
    uno_cards_played_player2 INTEGER DEFAULT 0,
    uno_special_cards_used INTEGER DEFAULT 0, -- skip, reverse, draw2, wild, wild4
    uno_game_length INTEGER, -- total cards played
    
    -- Metadata
    game_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    game_ended_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_game_stats_couple_id ON game_stats(couple_id);
CREATE INDEX idx_game_stats_game_type ON game_stats(game_type);
CREATE INDEX idx_game_stats_winner_id ON game_stats(winner_id);
CREATE INDEX idx_game_stats_created_at ON game_stats(created_at);

-- Create a composite index for couple + game type queries
CREATE INDEX idx_game_stats_couple_game_type ON game_stats(couple_id, game_type);

-- Add RLS policies
ALTER TABLE game_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see stats for their own couple
CREATE POLICY "Users can view their couple's game stats" ON game_stats
    FOR SELECT USING (
        couple_id IN (
            SELECT id FROM couples 
            WHERE user1_id = auth.uid() OR user2_id = auth.uid()
        )
    );

-- Policy: Users can insert stats for their own couple
CREATE POLICY "Users can insert game stats for their couple" ON game_stats
    FOR INSERT WITH CHECK (
        couple_id IN (
            SELECT id FROM couples 
            WHERE user1_id = auth.uid() OR user2_id = auth.uid()
        )
    );

-- Policy: Users can update stats for their own couple
CREATE POLICY "Users can update their couple's game stats" ON game_stats
    FOR UPDATE USING (
        couple_id IN (
            SELECT id FROM couples 
            WHERE user1_id = auth.uid() OR user2_id = auth.uid()
        )
    );

-- Policy: Users can delete stats for their own couple
CREATE POLICY "Users can delete their couple's game stats" ON game_stats
    FOR DELETE USING (
        couple_id IN (
            SELECT id FROM couples 
            WHERE user1_id = auth.uid() OR user2_id = auth.uid()
        )
    );

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_game_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_game_stats_updated_at
    BEFORE UPDATE ON game_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_game_stats_updated_at();

-- Create a view for couple game statistics summary
CREATE VIEW couple_game_stats_summary AS
SELECT 
    c.id as couple_id,
    c.user1_id,
    c.user2_id,
    p1.email as player1_email,
    p2.email as player2_email,
    
    -- Overall stats
    COUNT(*) as total_games_played,
    COUNT(CASE WHEN winner_id = c.user1_id THEN 1 END) as player1_wins,
    COUNT(CASE WHEN winner_id = c.user2_id THEN 1 END) as player2_wins,
    COUNT(CASE WHEN is_draw = true THEN 1 END) as draws,
    
    -- Game type breakdown
    COUNT(CASE WHEN game_type = 'connect4' THEN 1 END) as connect4_games,
    COUNT(CASE WHEN game_type = 'chess' THEN 1 END) as chess_games,
    COUNT(CASE WHEN game_type = 'pong' THEN 1 END) as pong_games,
    COUNT(CASE WHEN game_type = 'uno' THEN 1 END) as uno_games,
    
    -- Recent activity
    MAX(created_at) as last_game_played,
    
    -- Win rates
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(CASE WHEN winner_id = c.user1_id THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2)
        ELSE 0 
    END as player1_win_rate,
    
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(CASE WHEN winner_id = c.user2_id THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2)
        ELSE 0 
    END as player2_win_rate

FROM couples c
LEFT JOIN game_stats gs ON c.id = gs.couple_id
LEFT JOIN auth.users p1 ON c.user1_id = p1.id
LEFT JOIN auth.users p2 ON c.user2_id = p2.id
GROUP BY c.id, c.user1_id, c.user2_id, p1.email, p2.email;

-- Create a view for individual game type leaderboards
CREATE VIEW game_leaderboards AS
SELECT 
    game_type,
    couple_id,
    COUNT(*) as games_played,
    COUNT(CASE WHEN winner_id = user1_id THEN 1 END) as player1_wins,
    COUNT(CASE WHEN winner_id = user2_id THEN 1 END) as player2_wins,
    COUNT(CASE WHEN is_draw = true THEN 1 END) as draws,
    MAX(created_at) as last_played,
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(CASE WHEN winner_id = user1_id THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2)
        ELSE 0 
    END as player1_win_rate,
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(CASE WHEN winner_id = user2_id THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2)
        ELSE 0 
    END as player2_win_rate
FROM game_stats
GROUP BY game_type, couple_id, user1_id, user2_id
ORDER BY game_type, games_played DESC, player1_win_rate DESC;
