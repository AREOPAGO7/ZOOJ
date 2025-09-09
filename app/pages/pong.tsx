import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useAuth } from '../../lib/auth';
import { GameStats, gameStatsService } from '../../lib/gameStatsService';
import { supabase } from '../../lib/supabase';
import AppLayout from '../app-layout';

// Pong game types
interface Position {
  x: number;
  y: number;
}

interface Velocity {
  x: number;
  y: number;
}

interface Paddle {
  position: Position;
  width: number;
  height: number;
  speed: number;
}

interface Ball {
  position: Position;
  velocity: Velocity;
  radius: number;
}

interface GameState {
  playerPaddle: Paddle;
  botPaddle: Paddle;
  ball: Ball;
  playerScore: number;
  botScore: number;
  gameStatus: string;
  isPlaying: boolean;
  gamePhase: 'playing' | 'paused' | 'gameOver';
  winner?: string;
  gameStartTime: number;
  ballHitsPlayer: number;
  ballHitsBot: number;
  longestRally: number;
  currentRally: number;
}

// Game constants
const GAME_WIDTH = Dimensions.get('window').width - 40;
const GAME_HEIGHT = 400;
const PADDLE_WIDTH = 80;
const PADDLE_HEIGHT = 15;
const BALL_RADIUS = 8;
const PADDLE_SPEED = 5;
const BALL_SPEED = 3;
const WIN_SCORE = 5;

// AsyncStorage functions
const GAME_STATE_KEY = 'pong_game_state';

const saveGameState = async (gameState: GameState) => {
  try {
    await AsyncStorage.setItem(GAME_STATE_KEY, JSON.stringify(gameState));
  } catch (error) {
    console.error('Error saving game state:', error);
  }
};

const loadGameState = async (): Promise<GameState | null> => {
  try {
    const savedState = await AsyncStorage.getItem(GAME_STATE_KEY);
    if (savedState) {
      return JSON.parse(savedState);
    }
  } catch (error) {
    console.error('Error loading game state:', error);
  }
  return null;
};

const clearGameState = async () => {
  try {
    await AsyncStorage.removeItem(GAME_STATE_KEY);
  } catch (error) {
    console.error('Error clearing game state:', error);
  }
};

export default function PongPage() {
  const { user, loading } = useAuth();
  const { isProfileComplete, isLoading: profileLoading } = useProfileCompletion();
  const { t } = useLanguage();
  const { isDarkMode } = useDarkTheme();
  const router = useRouter();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [gameStats, setGameStats] = useState<any>(null);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const panGestureRef = useRef<PanGestureHandler>(null);

  // Initialize new game
  const initializeGame = useCallback((): GameState => {
    return {
      playerPaddle: {
        position: { x: GAME_WIDTH / 2 - PADDLE_WIDTH / 2, y: GAME_HEIGHT - PADDLE_HEIGHT - 10 },
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT,
        speed: PADDLE_SPEED,
      },
      botPaddle: {
        position: { x: GAME_WIDTH / 2 - PADDLE_WIDTH / 2, y: 10 },
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT,
        speed: PADDLE_SPEED,
      },
      ball: {
        position: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
        velocity: { x: BALL_SPEED, y: BALL_SPEED },
        radius: BALL_RADIUS,
      },
      playerScore: 0,
      botScore: 0,
      gameStatus: 'Appuyez pour commencer',
      isPlaying: false,
      gamePhase: 'paused',
      gameStartTime: Date.now(),
      ballHitsPlayer: 0,
      ballHitsBot: 0,
      longestRally: 0,
      currentRally: 0,
    };
  }, []);

  // Get couple ID
  const getCoupleId = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data: couple, error } = await supabase
        .from('couples')
        .select('id, user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .single();

      if (couple) {
        setCoupleId(couple.id);
        return couple;
      }
    } catch (error) {
      console.error('Error getting couple ID:', error);
    }
    return null;
  }, [user]);

  // Load game statistics
  const loadGameStats = useCallback(async () => {
    if (!coupleId) return;
    
    try {
      const stats = await gameStatsService.getCoupleGameStats(coupleId);
      setGameStats(stats);
    } catch (error) {
      console.error('Error loading game stats:', error);
    }
  }, [coupleId]);

  // Load game state on mount
  useEffect(() => {
    const loadGame = async () => {
      await getCoupleId();
      const savedState = await loadGameState();
      if (savedState) {
        setGameState(savedState);
      } else {
        setGameState(initializeGame());
      }
      setIsLoading(false);
    };
    loadGame();
  }, [initializeGame, getCoupleId]);

  // Load stats when couple ID is available
  useEffect(() => {
    if (coupleId) {
      loadGameStats();
    }
  }, [coupleId, loadGameStats]);

  // Save game statistics
  const saveGameStats = useCallback(async (gameState: GameState, couple: any) => {
    if (!couple || !coupleId) return;

    try {
      const gameDuration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);
      const winnerId = gameState.winner === 'Vous' ? couple.user1_id : 
                      gameState.winner === 'Bot' ? couple.user2_id : undefined;

      const stats: GameStats = {
        couple_id: coupleId,
        game_type: 'pong',
        player1_id: couple.user1_id,
        player2_id: couple.user2_id,
        winner_id: winnerId,
        is_draw: gameState.winner === undefined,
        game_duration: gameDuration,
        player1_score: gameState.playerScore,
        player2_score: gameState.botScore,
        pong_ball_hits_player1: gameState.ballHitsPlayer,
        pong_ball_hits_player2: gameState.ballHitsBot,
        pong_longest_rally: gameState.longestRally,
      };

      await gameStatsService.saveGameStats(stats);
      // Reload stats after saving
      loadGameStats();
    } catch (error) {
      console.error('Error saving game stats:', error);
    }
  }, [coupleId, loadGameStats]);

  // Save game state whenever it changes
  useEffect(() => {
    if (!isLoading && gameState) {
      saveGameState(gameState);
    }
  }, [gameState, isLoading]);

  // Game loop
  useEffect(() => {
    if (!gameState || !gameState.isPlaying) return;

    const gameLoop = () => {
      setGameState(prevState => {
        if (!prevState || !prevState.isPlaying) return prevState;

        const newState = { ...prevState };
        
        // Update ball position
        newState.ball.position.x += newState.ball.velocity.x;
        newState.ball.position.y += newState.ball.velocity.y;

        // Ball collision with walls
        if (newState.ball.position.x <= newState.ball.radius || 
            newState.ball.position.x >= GAME_WIDTH - newState.ball.radius) {
          newState.ball.velocity.x = -newState.ball.velocity.x;
        }

        // Ball collision with paddles
        const ball = newState.ball;
        const playerPaddle = newState.playerPaddle;
        const botPaddle = newState.botPaddle;

        // Player paddle collision
        if (ball.position.y + ball.radius >= playerPaddle.position.y &&
            ball.position.y - ball.radius <= playerPaddle.position.y + playerPaddle.height &&
            ball.position.x >= playerPaddle.position.x &&
            ball.position.x <= playerPaddle.position.x + playerPaddle.width &&
            ball.velocity.y > 0) {
          ball.velocity.y = -ball.velocity.y;
          // Add some angle based on where the ball hits the paddle
          const hitPos = (ball.position.x - playerPaddle.position.x) / playerPaddle.width;
          ball.velocity.x = (hitPos - 0.5) * 4;
          
          // Track ball hits and rally
          newState.ballHitsPlayer++;
          newState.currentRally++;
          newState.longestRally = Math.max(newState.longestRally, newState.currentRally);
        }

        // Bot paddle collision
        if (ball.position.y - ball.radius <= botPaddle.position.y + botPaddle.height &&
            ball.position.y + ball.radius >= botPaddle.position.y &&
            ball.position.x >= botPaddle.position.x &&
            ball.position.x <= botPaddle.position.x + botPaddle.width &&
            ball.velocity.y < 0) {
          ball.velocity.y = -ball.velocity.y;
          // Add some angle based on where the ball hits the paddle
          const hitPos = (ball.position.x - botPaddle.position.x) / botPaddle.width;
          ball.velocity.x = (hitPos - 0.5) * 4;
          
          // Track ball hits and rally
          newState.ballHitsBot++;
          newState.currentRally++;
          newState.longestRally = Math.max(newState.longestRally, newState.currentRally);
        }

        // Bot AI - follow the ball
        const ballX = ball.position.x;
        const botPaddleCenter = botPaddle.position.x + botPaddle.width / 2;
        if (ballX > botPaddleCenter + 5) {
          botPaddle.position.x = Math.min(GAME_WIDTH - botPaddle.width, botPaddle.position.x + botPaddle.speed);
        } else if (ballX < botPaddleCenter - 5) {
          botPaddle.position.x = Math.max(0, botPaddle.position.x - botPaddle.speed);
        }

        // Scoring
        if (ball.position.y < 0) {
          newState.playerScore++;
          newState.ball = {
            position: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
            velocity: { x: BALL_SPEED, y: BALL_SPEED },
            radius: BALL_RADIUS,
          };
          newState.gameStatus = `Vous: ${newState.playerScore} - Bot: ${newState.botScore}`;
          newState.currentRally = 0; // Reset rally on score
        } else if (ball.position.y > GAME_HEIGHT) {
          newState.botScore++;
          newState.ball = {
            position: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
            velocity: { x: -BALL_SPEED, y: -BALL_SPEED },
            radius: BALL_RADIUS,
          };
          newState.gameStatus = `Vous: ${newState.playerScore} - Bot: ${newState.botScore}`;
          newState.currentRally = 0; // Reset rally on score
        }

        // Check for win condition
        if (newState.playerScore >= WIN_SCORE) {
          newState.gamePhase = 'gameOver';
          newState.winner = 'Vous';
          newState.gameStatus = t('pong.youWin');
          newState.isPlaying = false;
          
          // Save stats when game ends
          getCoupleId().then(couple => {
            if (couple) {
              saveGameStats(newState, couple);
            }
          });
        } else if (newState.botScore >= WIN_SCORE) {
          newState.gamePhase = 'gameOver';
          newState.winner = 'Bot';
          newState.gameStatus = t('pong.botWins');
          newState.isPlaying = false;
          
          // Save stats when game ends
          getCoupleId().then(couple => {
            if (couple) {
              saveGameStats(newState, couple);
            }
          });
        }

        return newState;
      });
    };

    gameLoopRef.current = setInterval(gameLoop, 16); // ~60 FPS

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState?.isPlaying]);

  const startGame = useCallback(() => {
    if (!gameState) return;
    setGameState(prev => prev ? { ...prev, isPlaying: true, gamePhase: 'playing', gameStatus: 'En cours...' } : null);
  }, [gameState]);

  const pauseGame = useCallback(() => {
    if (!gameState) return;
    setGameState(prev => prev ? { ...prev, isPlaying: false, gamePhase: 'paused', gameStatus: t('pong.pause') } : null);
  }, [gameState]);

  const resetGame = useCallback(() => {
    setGameState(initializeGame());
    clearGameState();
  }, [initializeGame]);

  const handlePanGesture = useCallback((event: any) => {
    if (!gameState || !gameState.isPlaying) return;

    const { translationX, absoluteX } = event.nativeEvent;
    
    // Use absoluteX for more accurate positioning
    const touchX = absoluteX - 20; // Account for padding
    const newX = Math.max(0, Math.min(GAME_WIDTH - PADDLE_WIDTH, touchX - PADDLE_WIDTH / 2));
    
    setGameState(prev => prev ? {
      ...prev,
      playerPaddle: {
        ...prev.playerPaddle,
        position: { ...prev.playerPaddle.position, x: newX }
      }
    } : null);
  }, [gameState]);

  // Drag-based paddle control
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartPaddleX, setDragStartPaddleX] = useState(0);

  const handleTouchStart = useCallback((event: any) => {
    if (!gameState || !gameState.isPlaying) return;

    const nativeEvent = event.nativeEvent;
    const touchX = nativeEvent.locationX || nativeEvent.pageX || nativeEvent.clientX || nativeEvent.x;
    
    if (touchX !== undefined && touchX !== null) {
      setIsDragging(true);
      setDragStartX(touchX);
      setDragStartPaddleX(gameState.playerPaddle.position.x);
    }
  }, [gameState]);

  const handleTouchMove = useCallback((event: any) => {
    if (!gameState || !gameState.isPlaying || !isDragging) return;

    const nativeEvent = event.nativeEvent;
    const touchX = nativeEvent.locationX || nativeEvent.pageX || nativeEvent.clientX || nativeEvent.x;
    
    if (touchX !== undefined && touchX !== null) {
      const deltaX = touchX - dragStartX;
      const newX = Math.max(0, Math.min(GAME_WIDTH - PADDLE_WIDTH, dragStartPaddleX + deltaX));
      
      setGameState(prev => prev ? {
        ...prev,
        playerPaddle: {
          ...prev.playerPaddle,
          position: { ...prev.playerPaddle.position, x: newX }
        }
      } : null);
    }
  }, [gameState, isDragging, dragStartX, dragStartPaddleX]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Don't render if not authenticated or profile not completed
  if (loading || profileLoading || !user || !isProfileComplete) {
    return null;
  }

  if (isLoading || !gameState) {
    return (
      <AppLayout>
        <View className={`flex-1 justify-center items-center ${isDarkMode ? 'bg-dark-bg' : 'bg-background'}`}>
          <Text className={`text-lg ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'}`}>Chargement...</Text>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'}`}>
        <View className={`flex-row items-center justify-between pt-5 pb-5 px-5 border-b ${isDarkMode ? 'border-dark-border' : 'border-gray-200'}`}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>
          <Text className={`text-lg font-semibold ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>Pong</Text>
          <TouchableOpacity onPress={resetGame} style={styles.resetButton}>
            <MaterialCommunityIcons name="refresh" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.gameContainer}>
          {/* Game Status */}
          <View style={styles.gameInfo}>
            <Text className={`text-lg font-semibold text-center mb-2 ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>
              {gameState.gameStatus}
            </Text>
            <Text className={`text-base font-medium ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'}`}>
              Vous: {gameState.playerScore} - Bot: {gameState.botScore}
            </Text>
          </View>
          
          {/* Game Area */}
          <View style={styles.gameArea}>
            <View 
              style={styles.gameField}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Bot Paddle */}
              <View
                style={[
                  styles.paddle,
                  styles.botPaddle,
                  {
                    left: gameState.botPaddle.position.x,
                    top: gameState.botPaddle.position.y,
                  }
                ]}
              />
              
              {/* Ball */}
              <View
                style={[
                  styles.ball,
                  {
                    left: gameState.ball.position.x - gameState.ball.radius,
                    top: gameState.ball.position.y - gameState.ball.radius,
                  }
                ]}
              />
              
              {/* Player Paddle */}
              <View
                style={[
                  styles.paddle,
                  styles.playerPaddle,
                  {
                    left: gameState.playerPaddle.position.x,
                    top: gameState.playerPaddle.position.y,
                  }
                ]}
              />
            </View>
          </View>
          
          {/* Game Controls */}
          <View style={styles.controls}>
            {!gameState.isPlaying && gameState.gamePhase !== 'gameOver' && (
              <TouchableOpacity style={styles.startButton} onPress={startGame}>
                <MaterialCommunityIcons name="play" size={24} color="#FFFFFF" />
                <Text style={styles.startButtonText}>{t('pong.start')}</Text>
              </TouchableOpacity>
            )}
            
            {gameState.isPlaying && (
              <TouchableOpacity style={styles.pauseButton} onPress={pauseGame}>
                <MaterialCommunityIcons name="pause" size={24} color="#FFFFFF" />
                <Text style={styles.pauseButtonText}>{t('pong.pause')}</Text>
              </TouchableOpacity>
            )}
            
            {gameState.gamePhase === 'gameOver' && (
              <TouchableOpacity style={styles.startButton} onPress={resetGame}>
                <MaterialCommunityIcons name="refresh" size={24} color="#FFFFFF" />
                <Text style={styles.startButtonText}>{t('pong.newGame')}</Text>
              </TouchableOpacity>
            )}
          </View>

          
          {/* Touch Controls */}
          {gameState.isPlaying && (
            <View style={styles.touchControls}>
              <TouchableOpacity 
                style={styles.touchButton} 
                onPress={() => {
                  setGameState(prev => prev ? {
                    ...prev,
                    playerPaddle: {
                      ...prev.playerPaddle,
                      position: { ...prev.playerPaddle.position, x: Math.max(0, prev.playerPaddle.position.x - 30) }
                    }
                  } : null);
                }}
              >
                <MaterialCommunityIcons name="chevron-left" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              
              <View style={[styles.touchArea, { backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' }]}>
                <Text className={`text-xs font-semibold ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>Zone de contrôle</Text>
                <Text className={`text-xs mt-0.5 ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'}`}>Touchez ici pour déplacer</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.touchButton} 
                onPress={() => {
                  setGameState(prev => prev ? {
                    ...prev,
                    playerPaddle: {
                      ...prev.playerPaddle,
                      position: { ...prev.playerPaddle.position, x: Math.min(GAME_WIDTH - PADDLE_WIDTH, prev.playerPaddle.position.x + 30) }
                    }
                  } : null);
                }}
              >
                <MaterialCommunityIcons name="chevron-right" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Instructions */}
          <View style={styles.instructions}>
            <Text className={`text-sm text-center italic ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'}`}>
              {gameState.isPlaying 
                ? t('pong.instructions') 
                : t('pong.instructions')
              }
            </Text>
          </View>
        </View>
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  resetButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#6B7280',
  },
  gameContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  gameInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  scoreText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  gameArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  gameField: {
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#000000',
    borderRadius: 10,
    position: 'relative',
    borderWidth: 2,
    borderColor: '#374151',
  },
  paddle: {
    position: 'absolute',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  playerPaddle: {
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    backgroundColor: '#3B82F6',
  },
  botPaddle: {
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    backgroundColor: '#EF4444',
  },
  ball: {
    position: 'absolute',
    width: BALL_RADIUS * 2,
    height: BALL_RADIUS * 2,
    borderRadius: BALL_RADIUS,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  controls: {
    alignItems: 'center',
    marginBottom: 20,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pauseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  instructions: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  instructionText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  touchControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    gap: 15,
  },
  touchButton: {
    backgroundColor: '#3B82F6',
    width: 60,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  touchArea: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 120,
  },
  touchAreaText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  touchAreaSubtext: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
});
