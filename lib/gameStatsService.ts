import { supabase } from './supabase';

export interface GameStats {
  couple_id: string;
  game_type: 'connect4' | 'chess' | 'pong' | 'uno';
  player1_id: string;
  player2_id: string;
  winner_id?: string;
  is_draw?: boolean;
  game_duration?: number;
  player1_score?: number;
  player2_score?: number;
  
  // Connect4 specific
  connect4_moves?: number;
  connect4_winning_move?: number;
  
  // Chess specific
  chess_pieces_captured_player1?: number;
  chess_pieces_captured_player2?: number;
  chess_checkmate?: boolean;
  chess_stalemate?: boolean;
  
  // Pong specific
  pong_ball_hits_player1?: number;
  pong_ball_hits_player2?: number;
  pong_longest_rally?: number;
  
  // Uno specific
  uno_cards_played_player1?: number;
  uno_cards_played_player2?: number;
  uno_special_cards_used?: number;
  uno_game_length?: number;
}

export interface CoupleGameStats {
  couple_id: string;
  player1_id: string;
  player2_id: string;
  player1_email: string;
  player2_email: string;
  total_games_played: number;
  player1_wins: number;
  player2_wins: number;
  draws: number;
  connect4_games: number;
  chess_games: number;
  pong_games: number;
  uno_games: number;
  last_game_played: string;
  player1_win_rate: number;
  player2_win_rate: number;
}

export interface GameLeaderboard {
  game_type: string;
  couple_id: string;
  games_played: number;
  player1_wins: number;
  player2_wins: number;
  draws: number;
  last_played: string;
  player1_win_rate: number;
  player2_win_rate: number;
}

class GameStatsService {
  // Save game statistics
  async saveGameStats(stats: GameStats) {
    try {
      const { data, error } = await supabase
        .from('game_stats')
        .insert([stats])
        .select()
        .single();

      if (error) {
        console.error('Error saving game stats:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error saving game stats:', error);
      throw error;
    }
  }

  // Get couple's overall game statistics
  async getCoupleGameStats(coupleId: string): Promise<CoupleGameStats | null> {
    try {
      const { data, error } = await supabase
        .from('couple_game_stats_summary')
        .select('*')
        .eq('couple_id', coupleId)
        .single();

      if (error) {
        console.error('Error fetching couple game stats:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching couple game stats:', error);
      return null;
    }
  }

  // Get leaderboard for specific game type
  async getGameLeaderboard(gameType: string): Promise<GameLeaderboard[]> {
    try {
      const { data, error } = await supabase
        .from('game_leaderboards')
        .select('*')
        .eq('game_type', gameType)
        .order('games_played', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching game leaderboard:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching game leaderboard:', error);
      return [];
    }
  }

  // Get recent games for a couple
  async getRecentGames(coupleId: string, limit: number = 10) {
    try {
      const { data, error } = await supabase
        .from('game_stats')
        .select(`
          *,
          player1:player1_id,
          player2:player2_id,
          winner:winner_id
        `)
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent games:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching recent games:', error);
      return [];
    }
  }

  // Get game statistics for specific game type
  async getGameTypeStats(coupleId: string, gameType: string) {
    try {
      const { data, error } = await supabase
        .from('game_stats')
        .select('*')
        .eq('couple_id', coupleId)
        .eq('game_type', gameType)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching game type stats:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching game type stats:', error);
      return [];
    }
  }
}

export const gameStatsService = new GameStatsService();
