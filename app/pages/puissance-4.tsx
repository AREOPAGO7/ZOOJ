import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useAuth } from '../../lib/auth';
import AppLayout from '../app-layout';

// Connect 4 game types
type Player = 'red' | 'yellow' | null;
type Board = Player[][];

interface GameState {
  board: Board;
  currentPlayer: Player;
  gameStatus: string;
  gamePhase: 'playing' | 'gameOver';
  winner?: Player;
  lastMove?: { row: number; col: number };
}

// Game constants
const ROWS = 6;
const COLS = 7;
const WIN_LENGTH = 4;

// AsyncStorage functions
const GAME_STATE_KEY = 'connect4_game_state';

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

// Game logic functions
const createEmptyBoard = (): Board => {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
};

const findLowestEmptyRow = (board: Board, col: number): number => {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === null) {
      return row;
    }
  }
  return -1; // Column is full
};

const checkWin = (board: Board, row: number, col: number, player: Player): boolean => {
  if (!player) return false;

  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal \
    [1, -1]   // diagonal /
  ];

  for (const [dx, dy] of directions) {
    let count = 1;

    // Check in positive direction
    for (let i = 1; i < WIN_LENGTH; i++) {
      const newRow = row + i * dx;
      const newCol = col + i * dy;
      if (newRow >= 0 && newRow < ROWS && newCol >= 0 && newCol < COLS && board[newRow][newCol] === player) {
        count++;
      } else {
        break;
      }
    }

    // Check in negative direction
    for (let i = 1; i < WIN_LENGTH; i++) {
      const newRow = row - i * dx;
      const newCol = col - i * dy;
      if (newRow >= 0 && newRow < ROWS && newCol >= 0 && newCol < COLS && board[newRow][newCol] === player) {
        count++;
      } else {
        break;
      }
    }

    if (count >= WIN_LENGTH) {
      return true;
    }
  }

  return false;
};

const isBoardFull = (board: Board): boolean => {
  return board[0].every(cell => cell !== null);
};

const getBotMove = (board: Board): number => {
  // Simple AI: try to win, then block player, then random
  const player = 'red';
  const bot = 'yellow';

  // Check if bot can win
  for (let col = 0; col < COLS; col++) {
    const row = findLowestEmptyRow(board, col);
    if (row !== -1) {
      const newBoard = board.map(r => [...r]);
      newBoard[row][col] = bot;
      if (checkWin(newBoard, row, col, bot)) {
        return col;
      }
    }
  }

  // Check if player can win (block them)
  for (let col = 0; col < COLS; col++) {
    const row = findLowestEmptyRow(board, col);
    if (row !== -1) {
      const newBoard = board.map(r => [...r]);
      newBoard[row][col] = player;
      if (checkWin(newBoard, row, col, player)) {
        return col;
      }
    }
  }

  // Random move
  const availableCols = [];
  for (let col = 0; col < COLS; col++) {
    if (findLowestEmptyRow(board, col) !== -1) {
      availableCols.push(col);
    }
  }
  return availableCols[Math.floor(Math.random() * availableCols.length)];
};

export default function Puissance4Page() {
  const { user, loading } = useAuth();
  const { isProfileComplete, isLoading: profileLoading } = useProfileCompletion();
  const { t } = useLanguage();
  const router = useRouter();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [animatingPiece, setAnimatingPiece] = useState<{ row: number; col: number } | null>(null);
  const animatedValue = useState(new Animated.Value(0))[0];

  // Initialize new game
  const initializeGame = useCallback((): GameState => {
    return {
      board: createEmptyBoard(),
      currentPlayer: 'red',
      gameStatus: t('connect4.yourTurn'),
      gamePhase: 'playing',
    };
  }, [t]);

  // Load game state on mount
  useEffect(() => {
    const loadGame = async () => {
      const savedState = await loadGameState();
      if (savedState) {
        setGameState(savedState);
      } else {
        setGameState(initializeGame());
      }
      setIsLoading(false);
    };
    loadGame();
  }, [initializeGame]);

  // Update game status when language changes
  useEffect(() => {
    if (gameState && !isLoading) {
      const newGameState = { ...gameState };
      
      // Update status messages when language changes
      if (gameState.gameStatus.includes('Votre tour') || gameState.gameStatus.includes('Your turn') || gameState.gameStatus.includes('دورك')) {
        newGameState.gameStatus = t('connect4.yourTurn');
      } else if (gameState.gameStatus.includes('Tour du Bot') || gameState.gameStatus.includes('Bot\'s turn') || gameState.gameStatus.includes('دور البوت')) {
        newGameState.gameStatus = t('connect4.botTurn');
      } else if (gameState.gameStatus.includes('Vous avez gagné') || gameState.gameStatus.includes('You won') || gameState.gameStatus.includes('لقد فزت')) {
        newGameState.gameStatus = t('connect4.youWin');
      } else if (gameState.gameStatus.includes('Le Bot a gagné') || gameState.gameStatus.includes('Bot won') || gameState.gameStatus.includes('البوت فاز')) {
        newGameState.gameStatus = t('connect4.botWins');
      } else if (gameState.gameStatus.includes('Match nul') || gameState.gameStatus.includes('Draw') || gameState.gameStatus.includes('تعادل')) {
        newGameState.gameStatus = t('connect4.draw');
      }
      
      if (newGameState.gameStatus !== gameState.gameStatus) {
        setGameState(newGameState);
      }
    }
  }, [t, gameState, isLoading]);

  // Save game state whenever it changes
  useEffect(() => {
    if (!isLoading && gameState) {
      saveGameState(gameState);
    }
  }, [gameState, isLoading]);

  // Bot turn effect
  useEffect(() => {
    if (!gameState || gameState.gamePhase === 'gameOver' || isLoading) return;
    
    if (gameState.currentPlayer === 'yellow') {
      const timer = setTimeout(() => {
        const botCol = getBotMove(gameState.board);
        makeMove(botCol);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [gameState, isLoading]);

  const makeMove = useCallback((col: number) => {
    if (!gameState || gameState.gamePhase === 'gameOver') return;

    const row = findLowestEmptyRow(gameState.board, col);
    if (row === -1) return; // Column is full

    const newBoard = gameState.board.map(r => [...r]);
    newBoard[row][col] = gameState.currentPlayer;

    // Animate piece drop
    setAnimatingPiece({ row, col });
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setAnimatingPiece(null);
      animatedValue.setValue(0);
    });

    const isWin = checkWin(newBoard, row, col, gameState.currentPlayer);
    const isFull = isBoardFull(newBoard);

    let newGameState: GameState;

    if (isWin) {
      newGameState = {
        ...gameState,
        board: newBoard,
        gamePhase: 'gameOver',
        winner: gameState.currentPlayer,
        gameStatus: gameState.currentPlayer === 'red' ? t('connect4.youWin') : t('connect4.botWins'),
        lastMove: { row, col },
      };
    } else if (isFull) {
      newGameState = {
        ...gameState,
        board: newBoard,
        gamePhase: 'gameOver',
        gameStatus: t('connect4.draw'),
        lastMove: { row, col },
      };
    } else {
      const nextPlayer = gameState.currentPlayer === 'red' ? 'yellow' : 'red';
      newGameState = {
        ...gameState,
        board: newBoard,
        currentPlayer: nextPlayer,
        gameStatus: nextPlayer === 'red' ? t('connect4.yourTurn') : t('connect4.botTurn'),
        lastMove: { row, col },
      };
    }

    setGameState(newGameState);
  }, [gameState, animatedValue]);

  const resetGame = useCallback(() => {
    setGameState(initializeGame());
    clearGameState();
  }, [initializeGame]);

  // Don't render if not authenticated or profile not completed
  if (loading || profileLoading || !user || !isProfileComplete) {
    return null;
  }

  if (isLoading || !gameState) {
    return (
      <AppLayout>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('games.connect4')}</Text>
          <TouchableOpacity onPress={resetGame} style={styles.resetButton}>
            <MaterialCommunityIcons name="refresh" size={24} color="#000000" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.gameContainer}>
          {/* Game Status */}
          <View style={styles.gameInfo}>
            <Text style={styles.statusText}>{gameState.gameStatus}</Text>
            <View style={styles.playerInfo}>
              <View style={styles.playerIndicator}>
                <View style={[styles.playerPiece, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.playerText}>Vous</Text>
              </View>
              <View style={styles.playerIndicator}>
                <View style={[styles.playerPiece, { backgroundColor: '#FCD34D' }]} />
                <Text style={styles.playerText}>{t('connect4.bot')}</Text>
              </View>
            </View>
          </View>
          
          {/* Game Board */}
          <View style={styles.boardContainer}>
            <View style={styles.board}>
              {/* Column headers */}
              <View style={styles.columnHeaders}>
                {Array.from({ length: COLS }, (_, col) => (
                  <TouchableOpacity
                    key={col}
                    style={styles.columnHeader}
                    onPress={() => makeMove(col)}
                    disabled={gameState.currentPlayer !== 'red' || gameState.gamePhase === 'gameOver'}
                  >
                    <MaterialCommunityIcons 
                      name="chevron-down" 
                      size={20} 
                      color={gameState.currentPlayer === 'red' && gameState.gamePhase === 'playing' ? '#3B82F6' : '#9CA3AF'} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Game grid */}
              <View style={styles.grid}>
                {gameState.board.map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.row}>
                    {row.map((cell, colIndex) => (
                      <View key={`${rowIndex}-${colIndex}`} style={styles.cell}>
                        {cell && (
                          <View style={[
                            styles.piece,
                            { backgroundColor: cell === 'red' ? '#EF4444' : '#FCD34D' },
                            animatingPiece?.row === rowIndex && animatingPiece?.col === colIndex && {
                              transform: [{ scale: animatedValue }]
                            }
                          ]} />
                        )}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </View>
          </View>
          
          {/* Game Controls */}
          <View style={styles.controls}>
            {gameState.gamePhase === 'gameOver' && (
              <TouchableOpacity style={styles.newGameButton} onPress={resetGame}>
                <MaterialCommunityIcons name="refresh" size={24} color="#FFFFFF" />
                <Text style={styles.newGameButtonText}>{t('connect4.newGame')}</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              {gameState.gamePhase === 'playing' 
                ? t('connect4.instructions') 
                : "Partie terminée"
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
    marginBottom: 15,
  },
  playerInfo: {
    flexDirection: 'row',
    gap: 30,
  },
  playerIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerPiece: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  playerText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  boardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  board: {
    backgroundColor: '#1E40AF',
    borderRadius: 15,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  columnHeaders: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  columnHeader: {
    width: 40,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  grid: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 2,
  },
  cell: {
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    marginVertical: 2,
  },
  piece: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  newGameButton: {
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
  newGameButtonText: {
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
});
