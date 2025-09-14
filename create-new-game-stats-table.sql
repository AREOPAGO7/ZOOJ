-- Complete game_stats table recreation with all required fields
-- This script will delete the old table and create a new one with all game-specific fields

-- Drop the existing game_stats table if it exists
DROP TABLE IF EXISTS game_stats CASCADE;

-- Create the new game_stats table with all required fields
CREATE TABLE game_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
    player1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    player2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    game_type VARCHAR(50) NOT NULL CHECK (game_type IN ('pong', 'chess', 'connect4', 'uno')),
    is_draw BOOLEAN DEFAULT FALSE,
    is_bot_game BOOLEAN DEFAULT FALSE, -- Distinguishes bot games from human games
    
    -- General game fields
    game_duration INTEGER, -- Game duration in seconds
    player1_score INTEGER DEFAULT 0,
    player2_score INTEGER DEFAULT 0,
    
    -- Connect4 specific fields
    connect4_moves INTEGER,
    connect4_winning_move INTEGER,
    
    -- Chess specific fields
    chess_pieces_captured_player1 INTEGER DEFAULT 0,
    chess_pieces_captured_player2 INTEGER DEFAULT 0,
    chess_checkmate BOOLEAN DEFAULT FALSE,
    chess_stalemate BOOLEAN DEFAULT FALSE,
    
    -- Pong specific fields
    pong_ball_hits_player1 INTEGER DEFAULT 0,
    pong_ball_hits_player2 INTEGER DEFAULT 0,
    pong_longest_rally INTEGER DEFAULT 0,
    
    -- Uno specific fields
    uno_cards_played_player1 INTEGER DEFAULT 0,
    uno_cards_played_player2 INTEGER DEFAULT 0,
    uno_special_cards_used INTEGER DEFAULT 0,
    uno_game_length INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_game_stats_couple_id ON game_stats(couple_id);
CREATE INDEX idx_game_stats_player1_id ON game_stats(player1_id);
CREATE INDEX idx_game_stats_player2_id ON game_stats(player2_id);
CREATE INDEX idx_game_stats_winner_id ON game_stats(winner_id);
CREATE INDEX idx_game_stats_game_type ON game_stats(game_type);
CREATE INDEX idx_game_stats_is_bot_game ON game_stats(is_bot_game);
CREATE INDEX idx_game_stats_created_at ON game_stats(created_at);

-- Create a view for bot game statistics
CREATE OR REPLACE VIEW bot_game_stats_summary AS
SELECT 
    player1_id as user_id,
    COUNT(*) as total_games_played,
    COUNT(CASE WHEN winner_id = player1_id THEN 1 END) as human_wins,
    COUNT(CASE WHEN winner_id = player2_id THEN 1 END) as bot_wins,
    COUNT(CASE WHEN is_draw = TRUE THEN 1 END) as draws,
    COUNT(CASE WHEN game_type = 'pong' THEN 1 END) as pong_games,
    COUNT(CASE WHEN game_type = 'chess' THEN 1 END) as chess_games,
    COUNT(CASE WHEN game_type = 'connect4' THEN 1 END) as connect4_games,
    COUNT(CASE WHEN game_type = 'uno' THEN 1 END) as uno_games,
    MAX(created_at) as last_game_played,
    ROUND(
        (COUNT(CASE WHEN winner_id = player1_id THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
    ) as human_win_rate,
    ROUND(
        (COUNT(CASE WHEN winner_id = player2_id THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
    ) as bot_win_rate
FROM game_stats 
WHERE is_bot_game = TRUE
GROUP BY player1_id;

-- Create a view for couple game statistics (excluding bot games)
CREATE OR REPLACE VIEW couple_game_stats_summary AS
SELECT 
    couple_id,
    player1_id,
    player2_id,
    COUNT(*) as total_games_played,
    COUNT(CASE WHEN winner_id = player1_id THEN 1 END) as player1_wins,
    COUNT(CASE WHEN winner_id = player2_id THEN 1 END) as player2_wins,
    COUNT(CASE WHEN is_draw = TRUE THEN 1 END) as draws,
    COUNT(CASE WHEN game_type = 'pong' THEN 1 END) as pong_games,
    COUNT(CASE WHEN game_type = 'chess' THEN 1 END) as chess_games,
    COUNT(CASE WHEN game_type = 'connect4' THEN 1 END) as connect4_games,
    COUNT(CASE WHEN game_type = 'uno' THEN 1 END) as uno_games,
    MAX(created_at) as last_game_played,
    ROUND(
        (COUNT(CASE WHEN winner_id = player1_id THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
    ) as player1_win_rate,
    ROUND(
        (COUNT(CASE WHEN winner_id = player2_id THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
    ) as player2_win_rate
FROM game_stats 
WHERE is_bot_game = FALSE AND couple_id IS NOT NULL
GROUP BY couple_id, player1_id, player2_id;

-- Create a function to automatically update the updated_at timestamp
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

-- Add RLS (Row Level Security) policies if needed
-- ALTER TABLE game_stats ENABLE ROW LEVEL SECURITY;
