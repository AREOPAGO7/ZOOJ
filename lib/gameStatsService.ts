import { supabase } from './supabase';

export interface GameStats {
  couple_id: string;
  game_type: 'connect4' | 'chess' | 'pong' | 'uno';
  player1_id: string;
  player2_id: string;
  winner_id?: string;
  is_draw?: boolean;
  is_bot_game?: boolean;
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

export interface BotGameStats {
  user_id: string;
  total_games_played: number;
  human_wins: number;
  bot_wins: number;
  draws: number;
  pong_games: number;
  chess_games: number;
  connect4_games: number;
  uno_games: number;
  last_game_played: string;
  human_win_rate: number;
  bot_win_rate: number;
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
        console.log('Error saving game stats:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.log('Error saving game stats:', error);
      throw error;
    }
  }

  // Get couple's overall game statistics
  async getCoupleGameStats(coupleId: string): Promise<CoupleGameStats | null> {
    try {
      const { data, error } = await supabase
        .from('couple_game_stats_summary')
        .select('*')
        .eq('couple_id', coupleId);

      if (error) {
        console.log('Error fetching couple game stats:', error);
        return null;
      }

      // If no data found, return null instead of throwing error
      if (!data || data.length === 0) {
        console.log('No couple game stats found for couple:', coupleId);
        return null;
      }

      return data[0]; // Return first (and should be only) result
    } catch (error) {
      console.log('Error fetching couple game stats:', error);
      return null;
    }
  }

  // Get couple bot game statistics (games played as a couple against bot)
  async getCoupleBotGameStats(coupleId: string): Promise<BotGameStats | null> {
    try {
      // Query the game_stats table to get bot games for this couple
      const { data, error } = await supabase
        .from('game_stats')
        .select('*')
        .eq('couple_id', coupleId)
        .eq('is_bot_game', true);

      if (error) {
        console.log('Error fetching couple bot game stats:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return {
          user_id: coupleId, // Using coupleId as identifier
          total_games_played: 0,
          human_wins: 0,
          bot_wins: 0,
          draws: 0,
          pong_games: 0,
          chess_games: 0,
          connect4_games: 0,
          uno_games: 0,
          last_game_played: '',
          human_win_rate: 0,
          bot_win_rate: 0
        };
      }

      // Calculate stats from the raw data
      const totalGames = data.length;
      let humanWins = 0;
      let botWins = 0;
      let draws = 0;
      let pongGames = 0;
      let chessGames = 0;
      let connect4Games = 0;
      let unoGames = 0;
      let lastPlayed = '';

      data.forEach(game => {
        // Count games by type
        switch (game.game_type) {
          case 'pong':
            pongGames++;
            break;
          case 'chess':
            chessGames++;
            break;
          case 'connect4':
            connect4Games++;
            break;
          case 'uno':
            unoGames++;
            break;
        }

        // Determine winner (couple wins if either player1 or player2 wins)
        if (game.is_draw) {
          draws++;
        } else if (game.winner_id === game.player1_id || game.winner_id === game.player2_id) {
          humanWins++; // Couple wins
        } else {
          botWins++;
        }

        // Track last played
        if (!lastPlayed || game.created_at > lastPlayed) {
          lastPlayed = game.created_at;
        }
      });

      const humanWinRate = totalGames > 0 ? Math.round((humanWins / totalGames) * 100) : 0;
      const botWinRate = totalGames > 0 ? Math.round((botWins / totalGames) * 100) : 0;

      return {
        user_id: coupleId, // Using coupleId as identifier
        total_games_played: totalGames,
        human_wins: humanWins,
        bot_wins: botWins,
        draws: draws,
        pong_games: pongGames,
        chess_games: chessGames,
        connect4_games: connect4Games,
        uno_games: unoGames,
        last_game_played: lastPlayed,
        human_win_rate: humanWinRate,
        bot_win_rate: botWinRate
      };
    } catch (error) {
      console.log('Error fetching couple bot game stats:', error);
      return null;
    }
  }

  // Get bot game statistics for a user
  async getBotGameStats(userId: string): Promise<BotGameStats | null> {
    try {
      // Query the game_stats table directly to get bot games
      const { data, error } = await supabase
        .from('game_stats')
        .select('*')
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
        .eq('is_bot_game', true);

      if (error) {
        console.log('Error fetching bot game stats:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return {
          user_id: userId,
          total_games_played: 0,
          human_wins: 0,
          bot_wins: 0,
          draws: 0,
          pong_games: 0,
          chess_games: 0,
          connect4_games: 0,
          uno_games: 0,
          last_game_played: '',
          human_win_rate: 0,
          bot_win_rate: 0
        };
      }

      // Calculate stats from the raw data
      const totalGames = data.length;
      let humanWins = 0;
      let botWins = 0;
      let draws = 0;
      let pongGames = 0;
      let chessGames = 0;
      let connect4Games = 0;
      let unoGames = 0;
      let lastPlayed = '';

      data.forEach(game => {
        // Count games by type
        switch (game.game_type) {
          case 'pong':
            pongGames++;
            break;
          case 'chess':
            chessGames++;
            break;
          case 'connect4':
            connect4Games++;
            break;
          case 'uno':
            unoGames++;
            break;
        }

        // Determine winner
        if (game.is_draw) {
          draws++;
        } else if (game.winner_id === userId) {
          humanWins++;
        } else {
          botWins++;
        }

        // Track last played
        if (!lastPlayed || game.created_at > lastPlayed) {
          lastPlayed = game.created_at;
        }
      });

      const humanWinRate = totalGames > 0 ? Math.round((humanWins / totalGames) * 100) : 0;
      const botWinRate = totalGames > 0 ? Math.round((botWins / totalGames) * 100) : 0;

      return {
        user_id: userId,
        total_games_played: totalGames,
        human_wins: humanWins,
        bot_wins: botWins,
        draws: draws,
        pong_games: pongGames,
        chess_games: chessGames,
        connect4_games: connect4Games,
        uno_games: unoGames,
        last_game_played: lastPlayed,
        human_win_rate: humanWinRate,
        bot_win_rate: botWinRate
      };
    } catch (error) {
      console.log('Error fetching bot game stats:', error);
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
        console.log('Error fetching game leaderboard:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.log('Error fetching game leaderboard:', error);
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
        console.log('Error fetching recent games:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.log('Error fetching recent games:', error);
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
        console.log('Error fetching game type stats:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.log('Error fetching game type stats:', error);
      return [];
    }
  }
}

export const gameStatsService = new GameStatsService();
