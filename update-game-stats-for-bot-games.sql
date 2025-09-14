-- Update game_stats table to support bot games
-- Add is_bot_game field to distinguish between human vs human and human vs bot games

-- Add the is_bot_game column
ALTER TABLE game_stats 
ADD COLUMN IF NOT EXISTS is_bot_game BOOLEAN DEFAULT FALSE;

-- Update existing records to mark bot games
-- Assuming player2_id is the bot in single-player games
-- You may need to adjust this logic based on your actual bot identification
UPDATE game_stats 
SET is_bot_game = TRUE 
WHERE player2_id IS NULL OR player2_id = 'bot' OR player2_id LIKE '%bot%';

-- Alternative: If you have a specific bot user ID, use this instead:
-- UPDATE game_stats 
-- SET is_bot_game = TRUE 
-- WHERE player2_id = 'your-bot-user-id-here';

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_game_stats_bot_games ON game_stats(is_bot_game);

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

-- Update the couple_game_stats_summary view to exclude bot games
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
