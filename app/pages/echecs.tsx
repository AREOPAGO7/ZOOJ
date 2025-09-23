import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useAuth } from '../../lib/auth';
import { GameStats, gameStatsService } from '../../lib/gameStatsService';
import { supabase } from '../../lib/supabase';
import AppLayout from '../app-layout';

// Chess game types
type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
type Color = 'white' | 'black';

interface Piece {
  type: PieceType;
  color: Color;
  hasMoved?: boolean;
}

interface Position {
  row: number;
  col: number;
}

interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  capturedPiece?: Piece;
  isCastling?: boolean;
  isEnPassant?: boolean;
  promotion?: PieceType;
}

interface GameState {
  board: (Piece | null)[][];
  currentPlayer: Color;
  gameStatus: string;
  gamePhase: 'playing' | 'gameOver';
  winner?: Color;
  lastMove?: Move;
  gameStartTime: number;
  movesCount: number;
  piecesCapturedPlayer1: number;
  piecesCapturedPlayer2: number;
  checkmate: boolean;
  stalemate: boolean;
}

// Chess board setup
const createInitialBoard = (): (Piece | null)[][] => {
  const board: (Piece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  
  // Place pieces
  const pieceOrder: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  
  // Black pieces (top)
  for (let col = 0; col < 8; col++) {
    board[0][col] = { type: pieceOrder[col], color: 'black' };
    board[1][col] = { type: 'pawn', color: 'black' };
  }
  
  // White pieces (bottom)
  for (let col = 0; col < 8; col++) {
    board[7][col] = { type: pieceOrder[col], color: 'white' };
    board[6][col] = { type: 'pawn', color: 'white' };
  }
  
  return board;
};

// Get piece symbol for display
const getPieceSymbol = (piece: Piece): string => {
  const symbols = {
    white: {
      king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙'
    },
    black: {
      king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟'
    }
  };
  return symbols[piece.color][piece.type];
};

// Check if position is on board
const isValidPosition = (pos: Position): boolean => {
  return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8;
};

// Get all possible moves for a piece
const getPossibleMoves = (board: (Piece | null)[][], from: Position): Position[] => {
  const piece = board[from.row][from.col];
  if (!piece) return [];
  
  const moves: Position[] = [];
  const { type, color } = piece;
  
  const addMove = (row: number, col: number) => {
    if (isValidPosition({ row, col })) {
      const targetPiece = board[row][col];
      if (!targetPiece || targetPiece.color !== color) {
        moves.push({ row, col });
      }
    }
  };
  
  const addDirectionalMoves = (directions: number[][], maxDistance: number = 7) => {
    directions.forEach(([dRow, dCol]) => {
      for (let i = 1; i <= maxDistance; i++) {
        const newRow = from.row + dRow * i;
        const newCol = from.col + dCol * i;
        
        if (!isValidPosition({ row: newRow, col: newCol })) break;
        
        const targetPiece = board[newRow][newCol];
        if (targetPiece) {
          if (targetPiece.color !== color) {
            moves.push({ row: newRow, col: newCol });
          }
          break;
        }
        moves.push({ row: newRow, col: newCol });
      }
    });
  };
  
  switch (type) {
    case 'pawn':
      const direction = color === 'white' ? -1 : 1;
      const startRow = color === 'white' ? 6 : 1;
      
      // Forward move
      if (isValidPosition({ row: from.row + direction, col: from.col }) && 
          !board[from.row + direction][from.col]) {
        moves.push({ row: from.row + direction, col: from.col });
        
        // Double move from start
        if (from.row === startRow && !board[from.row + 2 * direction][from.col]) {
          moves.push({ row: from.row + 2 * direction, col: from.col });
        }
      }
      
      // Capture moves
      [-1, 1].forEach(dCol => {
        const newRow = from.row + direction;
        const newCol = from.col + dCol;
        if (isValidPosition({ row: newRow, col: newCol })) {
          const targetPiece = board[newRow][newCol];
          if (targetPiece && targetPiece.color !== color) {
            moves.push({ row: newRow, col: newCol });
          }
        }
      });
      break;
      
    case 'rook':
      addDirectionalMoves([[0, 1], [0, -1], [1, 0], [-1, 0]]);
      break;
      
    case 'bishop':
      addDirectionalMoves([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
      break;
      
    case 'queen':
      addDirectionalMoves([[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
      break;
      
    case 'king':
      addDirectionalMoves([[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]], 1);
      break;
      
    case 'knight':
      const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
      knightMoves.forEach(([dRow, dCol]) => {
        addMove(from.row + dRow, from.col + dCol);
      });
      break;
  }
  
  return moves;
};

// Check if king is in check
const isKingInCheck = (board: (Piece | null)[][], color: Color): boolean => {
  let kingPos: Position | null = null;
  
  // Find king
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'king' && piece.color === color) {
        kingPos = { row, col };
        break;
      }
    }
    if (kingPos) break;
  }
  
  if (!kingPos) return false;
  
  // Check if any opponent piece can attack the king
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color !== color) {
        const moves = getPossibleMoves(board, { row, col });
        if (moves.some(move => move.row === kingPos!.row && move.col === kingPos!.col)) {
          return true;
        }
      }
    }
  }
  
  return false;
};

// Get all legal moves for current player
const getAllLegalMoves = (board: (Piece | null)[][], color: Color): Move[] => {
  const moves: Move[] = [];
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        const possibleMoves = getPossibleMoves(board, { row, col });
        
        possibleMoves.forEach(move => {
          // Simulate move to check if it leaves king in check
          const newBoard = board.map(r => r.map(p => p ? { ...p } : null));
          const capturedPiece = newBoard[move.row][move.col];
          newBoard[move.row][move.col] = piece;
          newBoard[row][col] = null;
          
          if (!isKingInCheck(newBoard, color)) {
            moves.push({
              from: { row, col },
              to: move,
              piece,
              capturedPiece: capturedPiece || undefined
            });
          }
        });
      }
    }
  }
  
  return moves;
};

// Check for checkmate or stalemate
const checkGameEnd = (board: (Piece | null)[][], color: Color): { checkmate: boolean; stalemate: boolean } => {
  const legalMoves = getAllLegalMoves(board, color);
  const inCheck = isKingInCheck(board, color);
  
  if (legalMoves.length === 0) {
    return { checkmate: inCheck, stalemate: !inCheck };
  }
  
  return { checkmate: false, stalemate: false };
};

// Simple bot AI - prioritize captures and center control
const getBotMove = (board: (Piece | null)[][], color: Color): Move | null => {
  const legalMoves = getAllLegalMoves(board, color);
  if (legalMoves.length === 0) return null;
  
  // Score moves based on captures and position
  const scoredMoves = legalMoves.map(move => {
    let score = 0;
    
    // Prioritize captures
    if (move.capturedPiece) {
      const pieceValues = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 100 };
      score += pieceValues[move.capturedPiece.type] * 10;
    }
    
    // Center control bonus
    const centerDistance = Math.abs(move.to.row - 3.5) + Math.abs(move.to.col - 3.5);
    score += (7 - centerDistance) * 0.5;
    
    // Avoid moving into danger
    const newBoard = board.map(r => r.map(p => p ? { ...p } : null));
    newBoard[move.to.row][move.to.col] = move.piece;
    newBoard[move.from.row][move.from.col] = null;
    
    if (isKingInCheck(newBoard, color)) {
      score -= 50;
    }
    
    return { move, score };
  });
  
  // Sort by score and pick randomly from top moves
  scoredMoves.sort((a, b) => b.score - a.score);
  const topMoves = scoredMoves.filter(m => m.score === scoredMoves[0].score);
  const randomMove = topMoves[Math.floor(Math.random() * topMoves.length)];
  
  return randomMove.move;
};

export default function EchecsPage() {
  const { user, loading } = useAuth();
  const { isProfileComplete, isLoading: profileLoading } = useProfileCompletion();
  const { t } = useLanguage();
  const { isDarkMode } = useDarkTheme();
  const router = useRouter();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [gameStats, setGameStats] = useState<any>(null);
  const [botGameStats, setBotGameStats] = useState<any>(null);
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Position[]>([]);
  const animatedValue = useState(new Animated.Value(0))[0];

  // Initialize new game
  const initializeGame = useCallback((): GameState => {
    return {
      board: createInitialBoard(),
      currentPlayer: 'white',
      gameStatus: 'Votre tour',
      gamePhase: 'playing',
      gameStartTime: Date.now(),
      movesCount: 0,
      piecesCapturedPlayer1: 0,
      piecesCapturedPlayer2: 0,
      checkmate: false,
      stalemate: false,
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

  // Load bot game statistics for chess
  const loadBotGameStats = useCallback(async () => {
    if (!user) return;
    
    try {
      const botStats = await gameStatsService.getBotGameStats(user.id);
      setBotGameStats(botStats);
    } catch (error) {
      console.error('Error loading bot game stats:', error);
    }
  }, [user]);

  // Initialize game on mount
  useEffect(() => {
    const initialize = async () => {
      await getCoupleId();
      const timer = setTimeout(() => {
        setGameState(initializeGame());
        setIsLoading(false);
      }, 100);
      
      return () => clearTimeout(timer);
    };
    
    initialize();
  }, [initializeGame, getCoupleId]);

  // Load stats when couple ID is available
  useEffect(() => {
    if (coupleId) {
      loadGameStats();
    }
  }, [coupleId, loadGameStats]);

  // Load bot game stats when user is available
  useEffect(() => {
    if (user) {
      loadBotGameStats();
    }
  }, [user, loadBotGameStats]);

  // Save game statistics
  const saveGameStats = useCallback(async (gameState: GameState, couple: any) => {
    if (!couple || !coupleId) return;

    try {
      const gameDuration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);
      const winnerId = gameState.winner === 'white' ? couple.user1_id : 
                      gameState.winner === 'black' ? couple.user2_id : undefined;

      const stats: GameStats = {
        couple_id: coupleId,
        game_type: 'chess',
        player1_id: couple.user1_id,
        player2_id: couple.user2_id,
        winner_id: winnerId,
        is_draw: gameState.winner === undefined,
        is_bot_game: true, // This is a bot game
      };

      await gameStatsService.saveGameStats(stats);
      // Reload stats after saving
      loadGameStats();
      loadBotGameStats();
    } catch (error) {
      console.error('Error saving game stats:', error);
    }
  }, [coupleId, loadGameStats, loadBotGameStats]);

  // Handle square selection
  const handleSquarePress = useCallback((row: number, col: number) => {
    if (!gameState || gameState.gamePhase === 'gameOver' || gameState.currentPlayer !== 'white') return;

    const piece = gameState.board[row][col];
    
    if (selectedSquare) {
      // Try to make a move
      const move = possibleMoves.find(move => move.row === row && move.col === col);
      if (move) {
        makeMove(selectedSquare, move);
      }
      setSelectedSquare(null);
      setPossibleMoves([]);
    } else if (piece && piece.color === 'white') {
      // Select piece
      setSelectedSquare({ row, col });
      const moves = getAllLegalMoves(gameState.board, 'white')
        .filter(m => m.from.row === row && m.from.col === col)
        .map(m => m.to);
      setPossibleMoves(moves);
    }
  }, [gameState, selectedSquare, possibleMoves]);

  // Make a move
  const makeMove = useCallback((from: Position, to: Position) => {
    if (!gameState || gameState.gamePhase === 'gameOver') return;

    const piece = gameState.board[from.row][from.col];
    if (!piece || piece.color !== gameState.currentPlayer) return;

    const newBoard = gameState.board.map(r => r.map(p => p ? { ...p } : null));
    const capturedPiece = newBoard[to.row][to.col];
    
    // Make the move
    newBoard[to.row][to.col] = piece;
    newBoard[from.row][from.col] = null;
    
    // Update piece moved status
    if (piece.type === 'king' || piece.type === 'rook') {
      newBoard[to.row][to.col]!.hasMoved = true;
    }

    const move: Move = {
      from,
      to,
      piece,
      capturedPiece: capturedPiece || undefined
    };

    let newGameState: GameState = {
      ...gameState,
      board: newBoard,
      currentPlayer: gameState.currentPlayer === 'white' ? 'black' : 'white',
      movesCount: gameState.movesCount + 1,
      lastMove: move,
    };

    // Update captured pieces count
    if (capturedPiece) {
      if (gameState.currentPlayer === 'white') {
        newGameState.piecesCapturedPlayer1++;
      } else {
        newGameState.piecesCapturedPlayer2++;
      }
    }

    // Check for game end
    const gameEnd = checkGameEnd(newBoard, newGameState.currentPlayer);
    if (gameEnd.checkmate || gameEnd.stalemate) {
      newGameState.gamePhase = 'gameOver';
      newGameState.checkmate = gameEnd.checkmate;
      newGameState.stalemate = gameEnd.stalemate;
      
      if (gameEnd.checkmate) {
        newGameState.winner = gameState.currentPlayer; // Previous player wins
        newGameState.gameStatus = `${gameState.currentPlayer === 'white' ? 'Blancs' : 'Noirs'} gagnent par échec et mat!`;
      } else {
        newGameState.gameStatus = 'Match nul par pat!';
      }
      
      // Save stats when game ends
      getCoupleId().then(couple => {
        if (couple) {
          saveGameStats(newGameState, couple);
        }
      });
    } else {
      newGameState.gameStatus = newGameState.currentPlayer === 'white' ? 'Votre tour' : 'Tour du Bot';
    }

    setGameState(newGameState);
  }, [gameState, getCoupleId, saveGameStats]);

  // Bot move effect
  useEffect(() => {
    if (!gameState || gameState.gamePhase === 'gameOver' || gameState.currentPlayer !== 'black') return;
    
    const timer = setTimeout(() => {
      const botMove = getBotMove(gameState.board, 'black');
      if (botMove) {
        makeMove(botMove.from, botMove.to);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [gameState, makeMove]);

  const resetGame = useCallback(() => {
    setGameState(initializeGame());
    setSelectedSquare(null);
    setPossibleMoves([]);
  }, [initializeGame]);

  // Don't render if not authenticated or profile not completed
  if (loading || profileLoading || !user || !isProfileComplete) {
    return null;
  }

  if (isLoading || !gameState) {
    return (
      <AppLayout>
        <View className={`flex-1 justify-center items-center ${isDarkMode ? 'bg-dark-bg' : 'bg-background'}`}>
          <Text className={`text-lg ${isDarkMode ? 'text-white' : 'text-textSecondary'}`}>Chargement...</Text>
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
          <Text className={`text-lg font-semibold ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>Échecs</Text>
          <TouchableOpacity onPress={resetGame} style={styles.resetButton}>
            <MaterialCommunityIcons name="refresh" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.gameContainer}>
          {/* Game Status */}
          <View style={styles.gameInfo}>
            <Text className={`text-lg font-semibold text-center mb-4 ${isDarkMode ? 'text-white' : 'text-text'}`}>
              {gameState.gameStatus}
            </Text>
            
            {/* Win/Loss Statistics */}
            {botGameStats && (
              <View style={styles.statsContainer}>
                <Text className={`text-sm font-medium text-center mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Statistiques
                </Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-text'}`}>
                      {botGameStats.human_wins || 0}
                    </Text>
                    <Text className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      Vous
                    </Text>
                  </View>
                  <Text className={`text-lg font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`}>-</Text>
                  <View style={styles.statItem}>
                    <Text className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-text'}`}>
                      {botGameStats.bot_wins || 0}
                    </Text>
                    <Text className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      Bot
                    </Text>
                  </View>
                </View>
              </View>
            )}
            
            <View style={styles.playerInfo}>
              <View style={styles.playerIndicator}>
                <Text style={[styles.playerPiece, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>♔</Text>
                <Text className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-textSecondary'}`}>Vous</Text>
              </View>
              <View style={styles.playerIndicator}>
                <Text style={[styles.playerPiece, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>♚</Text>
                <Text className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-textSecondary'}`}>Bot</Text>
              </View>
            </View>
          </View>
          
          {/* Chess Board */}
          <View style={styles.boardContainer}>
            <View style={styles.board}>
              {gameState.board.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.boardRow}>
                  {row.map((piece, colIndex) => {
                    const isLight = (rowIndex + colIndex) % 2 === 0;
                    const isSelected = selectedSquare?.row === rowIndex && selectedSquare?.col === colIndex;
                    const isPossibleMove = possibleMoves.some(move => move.row === rowIndex && move.col === colIndex);
                    const isLastMove = gameState.lastMove && 
                      ((gameState.lastMove.from.row === rowIndex && gameState.lastMove.from.col === colIndex) ||
                       (gameState.lastMove.to.row === rowIndex && gameState.lastMove.to.col === colIndex));
                    
                    return (
                      <TouchableOpacity
                        key={`${rowIndex}-${colIndex}`}
                        style={[
                          styles.square,
                          {
                            backgroundColor: isLight ? '#F0D9B5' : '#B58863',
                            borderColor: isSelected ? '#FFD700' : isPossibleMove ? '#90EE90' : 'transparent',
                            borderWidth: isSelected ? 3 : isPossibleMove ? 2 : 0,
                          }
                        ]}
                        onPress={() => handleSquarePress(rowIndex, colIndex)}
                      >
                        {piece && (
                          <Text style={[
                            styles.piece,
                            { color: piece.color === 'white' ? '#FFFFFF' : '#000000' }
                          ]}>
                            {getPieceSymbol(piece)}
                          </Text>
                        )}
                        {isPossibleMove && !piece && (
                          <View style={styles.possibleMoveIndicator} />
                        )}
                        {isLastMove && (
                          <View style={styles.lastMoveIndicator} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
          
          {/* Game Controls */}
          <View style={styles.controls}>
            {gameState.gamePhase === 'gameOver' && (
              <TouchableOpacity style={styles.newGameButton} onPress={resetGame}>
                <MaterialCommunityIcons name="refresh" size={24} color="#FFFFFF" />
                <Text style={styles.newGameButtonText}>Nouvelle Partie</Text>
              </TouchableOpacity>
            )}
          </View>

          
          {/* Instructions */}
          <View style={styles.instructions}>
            <Text className={`text-sm text-center italic ${isDarkMode ? 'text-white' : 'text-textSecondary'}`}>
              {gameState.gamePhase === 'playing' 
                ? 'Touchez une pièce pour voir les mouvements possibles' 
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  playerText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  statsContainer: {
    marginBottom: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  boardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  board: {
    width: 360,
    height: 360,
    borderWidth: 2,
    borderColor: '#8B4513',
  },
  boardRow: {
    flexDirection: 'row',
    flex: 1,
  },
  square: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  piece: {
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  possibleMoveIndicator: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,255,0,0.3)',
  },
  lastMoveIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: '#FFD700',
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
    boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)',
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
