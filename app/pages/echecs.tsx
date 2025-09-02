import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useAuth } from '../../lib/auth';
import AppLayout from '../app-layout';

// Chess piece types
type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
type PieceColor = 'white' | 'black';

interface Piece {
  type: PieceType;
  color: PieceColor;
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
}

interface GameState {
  board: Board;
  currentPlayer: PieceColor;
  gameStatus: string;
  gameHistory: Move[];
  isBotThinking: boolean;
}

// Chess board state
type Board = (Piece | null)[][];

// Initialize empty board
const createEmptyBoard = (): Board => {
  return Array(8).fill(null).map(() => Array(8).fill(null));
};

// Initialize starting position
const initializeBoard = (): Board => {
  const board = createEmptyBoard();
  
  // Black pieces (top)
  board[0] = [
    { type: 'rook', color: 'black' },
    { type: 'knight', color: 'black' },
    { type: 'bishop', color: 'black' },
    { type: 'queen', color: 'black' },
    { type: 'king', color: 'black' },
    { type: 'bishop', color: 'black' },
    { type: 'knight', color: 'black' },
    { type: 'rook', color: 'black' }
  ];
  
  // Black pawns
  for (let col = 0; col < 8; col++) {
    board[1][col] = { type: 'pawn', color: 'black' };
  }
  
  // White pawns
  for (let col = 0; col < 8; col++) {
    board[6][col] = { type: 'pawn', color: 'white' };
  }
  
  // White pieces (bottom)
  board[7] = [
    { type: 'rook', color: 'white' },
    { type: 'knight', color: 'white' },
    { type: 'bishop', color: 'white' },
    { type: 'queen', color: 'white' },
    { type: 'king', color: 'white' },
    { type: 'bishop', color: 'white' },
    { type: 'knight', color: 'white' },
    { type: 'rook', color: 'white' }
  ];
  
  return board;
};

// Get piece symbol
const getPieceSymbol = (piece: Piece): string => {
  const symbols = {
    white: {
      king: '♔',
      queen: '♕',
      rook: '♖',
      bishop: '♗',
      knight: '♘',
      pawn: '♙'
    },
    black: {
      king: '♚',
      queen: '♛',
      rook: '♜',
      bishop: '♝',
      knight: '♞',
      pawn: '♟'
    }
  };
  return symbols[piece.color][piece.type];
};

// Check if position is valid
const isValidPosition = (pos: Position): boolean => {
  return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8;
};

// Get possible moves for a piece
const getPossibleMoves = (board: Board, from: Position): Position[] => {
  const piece = board[from.row][from.col];
  if (!piece) return [];
  
  const moves: Position[] = [];
  const { type, color } = piece;
  
  // Helper function to add move if valid
  const addMove = (row: number, col: number) => {
    const to = { row, col };
    if (isValidPosition(to)) {
      const targetPiece = board[row][col];
      if (!targetPiece || targetPiece.color !== color) {
        moves.push(to);
      }
    }
  };
  
  // Pawn moves
  if (type === 'pawn') {
    const direction = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;
    
    // Forward move
    const forwardRow = from.row + direction;
    if (isValidPosition({ row: forwardRow, col: from.col }) && !board[forwardRow][from.col]) {
      addMove(forwardRow, from.col);
      
      // Double move from starting position
      if (from.row === startRow) {
        const doubleRow = from.row + 2 * direction;
        if (isValidPosition({ row: doubleRow, col: from.col }) && !board[doubleRow][from.col]) {
          addMove(doubleRow, from.col);
        }
      }
    }
    
    // Diagonal captures
    [-1, 1].forEach(colOffset => {
      const captureRow = from.row + direction;
      const captureCol = from.col + colOffset;
      if (isValidPosition({ row: captureRow, col: captureCol })) {
        const targetPiece = board[captureRow][captureCol];
        if (targetPiece && targetPiece.color !== color) {
          addMove(captureRow, captureCol);
        }
      }
    });
  }
  
  // Rook moves
  if (type === 'rook') {
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    directions.forEach(([rowDir, colDir]) => {
      for (let i = 1; i < 8; i++) {
        const newRow = from.row + i * rowDir;
        const newCol = from.col + i * colDir;
        if (!isValidPosition({ row: newRow, col: newCol })) break;
        
        const targetPiece = board[newRow][newCol];
        if (targetPiece) {
          if (targetPiece.color !== color) {
            addMove(newRow, newCol);
          }
          break;
        }
        addMove(newRow, newCol);
      }
    });
  }
  
  // Bishop moves
  if (type === 'bishop') {
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    directions.forEach(([rowDir, colDir]) => {
      for (let i = 1; i < 8; i++) {
        const newRow = from.row + i * rowDir;
        const newCol = from.col + i * colDir;
        if (!isValidPosition({ row: newRow, col: newCol })) break;
        
        const targetPiece = board[newRow][newCol];
        if (targetPiece) {
          if (targetPiece.color !== color) {
            addMove(newRow, newCol);
          }
          break;
        }
        addMove(newRow, newCol);
      }
    });
  }
  
  // Queen moves (combination of rook and bishop)
  if (type === 'queen') {
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
    directions.forEach(([rowDir, colDir]) => {
      for (let i = 1; i < 8; i++) {
        const newRow = from.row + i * rowDir;
        const newCol = from.col + i * colDir;
        if (!isValidPosition({ row: newRow, col: newCol })) break;
        
        const targetPiece = board[newRow][newCol];
        if (targetPiece) {
          if (targetPiece.color !== color) {
            addMove(newRow, newCol);
          }
          break;
        }
        addMove(newRow, newCol);
      }
    });
  }
  
  // King moves
  if (type === 'king') {
    const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    directions.forEach(([rowDir, colDir]) => {
      addMove(from.row + rowDir, from.col + colDir);
    });
  }
  
  // Knight moves
  if (type === 'knight') {
    const moves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
    moves.forEach(([rowOffset, colOffset]) => {
      addMove(from.row + rowOffset, from.col + colOffset);
    });
  }
  
  return moves;
};

// Check if king is in check
const isKingInCheck = (board: Board, color: PieceColor): boolean => {
  // Find king position
  let kingPos: Position | null = null;
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

// Filter moves that would put own king in check
const filterLegalMoves = (board: Board, from: Position, moves: Position[]): Position[] => {
  const piece = board[from.row][from.col];
  if (!piece) return [];
  
  return moves.filter(move => {
    // Make the move
    const newBoard = board.map(row => [...row]);
    newBoard[move.row][move.col] = piece;
    newBoard[from.row][from.col] = null;
    
    // Check if king is in check after this move
    return !isKingInCheck(newBoard, piece.color);
  });
};

// Simple bot AI - random move selection
const getBotMove = (board: Board, color: PieceColor): Move | null => {
  const possibleMoves: Move[] = [];
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        const moves = getPossibleMoves(board, { row, col });
        const legalMoves = filterLegalMoves(board, { row, col }, moves);
        
        legalMoves.forEach(move => {
          possibleMoves.push({
            from: { row, col },
            to: move,
            piece,
            capturedPiece: board[move.row][move.col] || undefined
          });
        });
      }
    }
  }
  
  if (possibleMoves.length === 0) return null;
  
  // Simple strategy: prefer captures and center control
  const scoredMoves = possibleMoves.map(move => {
    let score = Math.random(); // Base random score
    
    // Prefer captures
    if (move.capturedPiece) {
      const pieceValues = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 100 };
      score += pieceValues[move.capturedPiece.type] * 10;
    }
    
    // Prefer center control
    const centerDistance = Math.abs(move.to.row - 3.5) + Math.abs(move.to.col - 3.5);
    score += (7 - centerDistance) * 0.5;
    
    return { move, score };
  });
  
  // Sort by score and pick the best move
  scoredMoves.sort((a, b) => b.score - a.score);
  return scoredMoves[0].move;
};

// AsyncStorage functions
const GAME_STATE_KEY = 'chess_game_state';

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

export default function EchecsPage() {
  const { user, loading } = useAuth();
  const { isProfileComplete, isLoading: profileLoading } = useProfileCompletion();
  const { t } = useLanguage();
  const router = useRouter();
  
  const [board, setBoard] = useState<Board>(initializeBoard());
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<PieceColor>('white');
  const [gameStatus, setGameStatus] = useState<string>('');
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [gameHistory, setGameHistory] = useState<Move[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [animatingPiece, setAnimatingPiece] = useState<{position: Position, piece: Piece} | null>(null);
  const animatedValue = useState(new Animated.Value(0))[0];

  // Load saved game on component mount
  useEffect(() => {
    const loadGame = async () => {
      const savedState = await loadGameState();
      if (savedState) {
        setBoard(savedState.board);
        setCurrentPlayer(savedState.currentPlayer);
        setGameStatus(savedState.gameStatus);
        setGameHistory(savedState.gameHistory);
        setIsBotThinking(savedState.isBotThinking);
      } else {
        // Set initial game status with current language
        setGameStatus(t('chess.yourTurn'));
      }
      setIsLoading(false);
    };
    loadGame();
  }, [t]);

  // Update game status when language changes
  useEffect(() => {
    if (gameStatus && !isLoading) {
      // Update status messages when language changes
      if (gameStatus.includes('Votre tour') || gameStatus.includes('Your turn') || gameStatus.includes('دورك')) {
        setGameStatus(t('chess.yourTurn'));
      } else if (gameStatus.includes('Tour du Bot') || gameStatus.includes('Bot\'s turn') || gameStatus.includes('دور البوت')) {
        setGameStatus(t('chess.botTurn'));
      } else if (gameStatus.includes('Vous avez gagné') || gameStatus.includes('You won') || gameStatus.includes('لقد فزت')) {
        setGameStatus(t('chess.youWin'));
      } else if (gameStatus.includes('Le Bot a gagné') || gameStatus.includes('Bot won') || gameStatus.includes('البوت فاز')) {
        setGameStatus(t('chess.botWins'));
      } else if (gameStatus.includes('Pat') || gameStatus.includes('Stalemate') || gameStatus.includes('تعادل')) {
        setGameStatus(t('chess.stalemate'));
      }
    }
  }, [t, gameStatus, isLoading]);

  // Save game state whenever it changes
  useEffect(() => {
    if (!isLoading) {
      const gameState: GameState = {
        board,
        currentPlayer,
        gameStatus,
        gameHistory,
        isBotThinking
      };
      saveGameState(gameState);
    }
  }, [board, currentPlayer, gameStatus, gameHistory, isBotThinking, isLoading]);

  const makeMove = useCallback((from: Position, to: Position, animated: boolean = true) => {
    const piece = board[from.row][from.col];
    if (!piece || piece.color !== currentPlayer) return false;
    
    const possibleMoves = getPossibleMoves(board, from);
    const legalMoves = filterLegalMoves(board, from, possibleMoves);
    
    const isValidMove = legalMoves.some(move => move.row === to.row && move.col === to.col);
    if (!isValidMove) return false;
    
    if (animated) {
      // Set animating piece for visual feedback
      setAnimatingPiece({ position: to, piece });
      
      // Animate the move
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setAnimatingPiece(null);
        animatedValue.setValue(0);
      });
    }
    
    // Make the move
    const newBoard = board.map(row => [...row]);
    const capturedPiece = newBoard[to.row][to.col];
    newBoard[to.row][to.col] = { ...piece, hasMoved: true };
    newBoard[from.row][from.col] = null;
    
    const move: Move = {
      from,
      to,
      piece,
      capturedPiece: capturedPiece || undefined
    };
    
    setBoard(newBoard);
    setGameHistory(prev => [...prev, move]);
    setSelectedSquare(null);
    
    // Check for checkmate or stalemate
    const nextPlayer: PieceColor = currentPlayer === 'white' ? 'black' : 'white';
    const nextPlayerMoves: Move[] = [];
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const nextPiece = newBoard[row][col];
        if (nextPiece && nextPiece.color === nextPlayer) {
          const moves = getPossibleMoves(newBoard, { row, col });
          const legalMoves = filterLegalMoves(newBoard, { row, col }, moves);
          legalMoves.forEach(move => {
            nextPlayerMoves.push({
              from: { row, col },
              to: move,
              piece: nextPiece,
              capturedPiece: newBoard[move.row][move.col] || undefined
            });
          });
        }
      }
    }
    
    if (nextPlayerMoves.length === 0) {
      if (isKingInCheck(newBoard, nextPlayer)) {
        setGameStatus(currentPlayer === 'white' ? t('chess.youWin') : t('chess.botWins'));
      } else {
        setGameStatus(t('chess.stalemate'));
      }
      return true;
    }
    
    if (isKingInCheck(newBoard, nextPlayer)) {
      setGameStatus(nextPlayer === 'white' ? t('chess.yourTurn') : t('chess.botTurn'));
    } else {
      setGameStatus(nextPlayer === 'white' ? t('chess.yourTurn') : t('chess.botTurn'));
    }
    
    setCurrentPlayer(nextPlayer);
    return true;
  }, [board, currentPlayer]);

  // Bot move after player move
  useEffect(() => {
    if (currentPlayer === 'black' && !isBotThinking && gameStatus.includes('Tour des noirs')) {
      setIsBotThinking(true);
      
      setTimeout(() => {
        const botMove = getBotMove(board, 'black');
        if (botMove) {
          makeMove(botMove.from, botMove.to, false); // Bot moves without animation
        }
        setIsBotThinking(false);
      }, 1000); // 1 second delay for bot thinking
    }
  }, [currentPlayer, board, makeMove, isBotThinking, gameStatus]);

  const handleSquarePress = (row: number, col: number) => {
    if (currentPlayer !== 'white' || isBotThinking) return;
    
    const position = { row, col };
    
    if (selectedSquare) {
      if (selectedSquare.row === row && selectedSquare.col === col) {
        setSelectedSquare(null);
        return;
      }
      
      if (makeMove(selectedSquare, position)) {
        // Move was successful
      } else {
        setSelectedSquare(null);
      }
    } else {
      const piece = board[row][col];
      if (piece && piece.color === currentPlayer) {
        setSelectedSquare(position);
      }
    }
  };

  const resetGame = async () => {
    setBoard(initializeBoard());
    setSelectedSquare(null);
    setCurrentPlayer('white');
    setGameStatus(t('chess.yourTurn'));
    setIsBotThinking(false);
    setGameHistory([]);
    setAnimatingPiece(null);
    await clearGameState();
  };

  const getSquareStyle = (row: number, col: number) => {
    const isLight = (row + col) % 2 === 0;
    const isSelected = selectedSquare && selectedSquare.row === row && selectedSquare.col === col;
    const piece = board[row][col];
    const isHighlighted = selectedSquare && (() => {
      const moves = getPossibleMoves(board, selectedSquare);
      const legalMoves = filterLegalMoves(board, selectedSquare, moves);
      return legalMoves.some(move => move.row === row && move.col === col);
    })();
    
    return [
      styles.square,
      {
        backgroundColor: isLight ? '#F0D9B5' : '#B58863',
      }
    ];
  };

  const getSquareBorderStyle = (row: number, col: number) => {
    const isSelected = selectedSquare && selectedSquare.row === row && selectedSquare.col === col;
    const isHighlighted = selectedSquare && (() => {
      const moves = getPossibleMoves(board, selectedSquare);
      const legalMoves = filterLegalMoves(board, selectedSquare, moves);
      return legalMoves.some(move => move.row === row && move.col === col);
    })();
    
    if (isSelected || isHighlighted) {
      return [
        styles.squareBorder,
        {
          borderColor: isSelected ? '#FFD700' : '#90EE90',
          borderWidth: isSelected ? 3 : 2,
        }
      ];
    }
    return null;
  };

  const screenWidth = Dimensions.get('window').width;
  const boardSize = Math.min(screenWidth - 40, 400);

  // Don't render if not authenticated or profile not completed
  if (loading || profileLoading || !user || !isProfileComplete) {
    return null;
  }

  // Show loading while restoring game
  if (isLoading) {
    return (
      <AppLayout>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <MaterialCommunityIcons name="chevron-left" size={24} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('games.chess')}</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t('chess.loading')}</Text>
          </View>
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
          <Text style={styles.headerTitle}>Échecs</Text>
          <TouchableOpacity onPress={resetGame} style={styles.resetButton}>
            <MaterialCommunityIcons name="refresh" size={24} color="#000000" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.gameContainer}>
          <View style={styles.gameInfo}>
            <Text style={styles.statusText}>{gameStatus}</Text>
            {isBotThinking && (
              <Text style={styles.botThinkingText}>Bot réfléchit...</Text>
            )}
          </View>
          
          <View style={[styles.boardContainer, { width: boardSize, height: boardSize }]}>
            <View style={[styles.board, { width: boardSize, height: boardSize }]}>
            {board.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                {row.map((piece, colIndex) => (
                  <TouchableOpacity
                    key={`${rowIndex}-${colIndex}`}
                    style={getSquareStyle(rowIndex, colIndex)}
                    onPress={() => handleSquarePress(rowIndex, colIndex)}
                    disabled={currentPlayer !== 'white' || isBotThinking}
                  >
                    {getSquareBorderStyle(rowIndex, colIndex) && (
                      <View style={getSquareBorderStyle(rowIndex, colIndex)} />
                    )}
                    {piece && !(animatingPiece && animatingPiece.position.row === rowIndex && animatingPiece.position.col === colIndex) && (
                      <Text style={styles.piece}>
                        {getPieceSymbol(piece)}
                      </Text>
                    )}
                    {animatingPiece && animatingPiece.position.row === rowIndex && animatingPiece.position.col === colIndex && (
                      <Animated.View
                        style={[
                          styles.animatingPiece,
                          {
                            opacity: animatedValue,
                            transform: [
                              {
                                scale: animatedValue.interpolate({
                                  inputRange: [0, 0.5, 1],
                                  outputRange: [0.8, 1.2, 1],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        <Text style={styles.piece}>
                          {getPieceSymbol(animatingPiece.piece)}
                        </Text>
                      </Animated.View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
            </View>
          </View>
          
          <View style={styles.controls}>
            <TouchableOpacity style={styles.newGameButton} onPress={resetGame}>
              <MaterialCommunityIcons name="restart" size={20} color="#FFFFFF" />
              <Text style={styles.newGameButtonText}>{t('chess.reset')}</Text>
            </TouchableOpacity>
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
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  gameContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    justifyContent: 'space-between',
  },
  gameInfo: {
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 5,
  },
  botThinkingText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  boardContainer: {
    marginVertical: 20,
  },
  board: {
    borderWidth: 2,
    borderColor: '#8B4513',
    borderRadius: 8,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    flex: 1,
  },
  square: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
    position: 'relative',
  },
  squareBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 4,
  },
  piece: {
    fontSize: 32,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  animatingPiece: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    marginTop: 20,
    alignItems: 'center',
  },
  newGameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F47CC6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  newGameButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
