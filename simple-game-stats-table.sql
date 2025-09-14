-- Simple game_stats table - minimal structure
-- Drop the existing table and create a new simple one

DROP TABLE IF EXISTS game_stats CASCADE;

-- Create a simple game_stats table with only essential fields
CREATE TABLE game_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
    player1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    player2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    game_type VARCHAR(20) NOT NULL CHECK (game_type IN ('pong', 'chess', 'connect4', 'uno')),
    is_draw BOOLEAN DEFAULT FALSE,
    is_bot_game BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create simple indexes
CREATE INDEX idx_game_stats_couple_id ON game_stats(couple_id);
CREATE INDEX idx_game_stats_player1_id ON game_stats(player1_id);
CREATE INDEX idx_game_stats_player2_id ON game_stats(player2_id);
CREATE INDEX idx_game_stats_is_bot_game ON game_stats(is_bot_game);

-- Create a simple view for couple game stats
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
