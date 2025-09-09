import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useAuth } from '../../lib/auth';
import AppLayout from '../app-layout';

// Uno card types
type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
type CardValue = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';

interface Card {
  id: string;
  color: CardColor;
  value: CardValue;
  points: number;
}

interface Player {
  id: string;
  name: string;
  hand: Card[];
  isBot: boolean;
}

interface GameState {
  deck: Card[];
  discardPile: Card[];
  players: Player[];
  currentPlayerIndex: number;
  direction: 1 | -1;
  gameStatus: string;
  lastPlayedCard: Card | null;
  drawCount: number;
  gamePhase: 'playing' | 'gameOver';
  winner: Player | null;
  gameStartTime: number;
  cardsPlayedPlayer1: number;
  cardsPlayedPlayer2: number;
  specialCardsUsed: number;
  totalCardsPlayed: number;
}

// Create a full Uno deck
const createDeck = (): Card[] => {
  const deck: Card[] = [];
  const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
  const values: CardValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];
  
  // Add colored cards (2 of each except 0)
  colors.forEach(color => {
    values.forEach(value => {
      const count = value === '0' ? 1 : 2;
      for (let i = 0; i < count; i++) {
        deck.push({
          id: `${color}-${value}-${i}`,
          color,
          value,
          points: ['skip', 'reverse', 'draw2'].includes(value) ? 20 : parseInt(value) || 0
        });
      }
    });
  });
  
  // Add wild cards (4 of each)
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: `wild-${i}`,
      color: 'wild',
      value: 'wild',
      points: 50
    });
    deck.push({
      id: `wild4-${i}`,
      color: 'wild',
      value: 'wild4',
      points: 50
    });
  }
  
  return deck;
};

// Shuffle deck
const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Deal cards to players
const dealCards = (deck: Card[], players: Player[]): { deck: Card[], players: Player[] } => {
  const newDeck = [...deck];
  const newPlayers = players.map(player => ({
    ...player,
    hand: []
  }));
  
  // Deal 7 cards to each player
  for (let i = 0; i < 7; i++) {
    newPlayers.forEach(player => {
      if (newDeck.length > 0) {
        const card = newDeck.pop()!;
        player.hand.push(card);
      }
    });
  }
  
  return { deck: newDeck, players: newPlayers };
};

// Check if a card can be played
const canPlayCard = (card: Card, lastCard: Card | null, currentColor: CardColor): boolean => {
  if (!lastCard) return true;
  
  // Wild cards can always be played
  if (card.color === 'wild') return true;
  
  // Same color
  if (card.color === currentColor) return true;
  
  // Same value
  if (card.value === lastCard.value) return true;
  
  return false;
};

// Get playable cards from hand
const getPlayableCards = (hand: Card[], lastCard: Card | null, currentColor: CardColor): Card[] => {
  return hand.filter(card => canPlayCard(card, lastCard, currentColor));
};

// Get current color (for wild cards)
const getCurrentColor = (lastCard: Card | null): CardColor => {
  if (!lastCard) return 'red';
  return lastCard.color === 'wild' ? 'red' : lastCard.color;
};

// Calculate hand points
const calculateHandPoints = (hand: Card[]): number => {
  return hand.reduce((total, card) => total + card.points, 0);
};

// Get card display symbol
const getCardSymbol = (card: Card): string => {
  if (card.color === 'wild') {
    return card.value === 'wild' ? '★' : '+4';
  }
  
  const valueSymbols = {
    '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
    '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
    'skip': '⏭', 'reverse': '↻', 'draw2': '+2'
  };
  
  return valueSymbols[card.value];
};

// Get card color for styling
const getCardColor = (card: Card): string => {
  const colors = {
    red: '#EF4444',
    blue: '#3B82F6',
    green: '#10B981',
    yellow: '#F59E0B',
    wild: '#8B5CF6'
  };
  return colors[card.color];
};

// Simple bot AI
const getBotMove = (player: Player, lastCard: Card | null, currentColor: CardColor): { card: Card | null, color?: CardColor } => {
  const playableCards = getPlayableCards(player.hand, lastCard, currentColor);
  
  if (playableCards.length === 0) {
    return { card: null }; // Draw card
  }
  
  // Strategy: prefer high-value cards, then special cards, then numbers
  const sortedCards = playableCards.sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    if (a.value === 'wild4') return -1;
    if (b.value === 'wild4') return 1;
    if (a.value === 'wild') return -1;
    if (b.value === 'wild') return 1;
    return 0;
  });
  
  const selectedCard = sortedCards[0];
  
  // If it's a wild card, choose a random color
  if (selectedCard.color === 'wild') {
    const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    return { card: selectedCard, color: randomColor };
  }
  
  return { card: selectedCard };
};

// AsyncStorage functions
const GAME_STATE_KEY = 'uno_game_state';

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

// Mobile-style Swipeable Card Display Component
const SwipeableCardDisplay = ({ cards, onCardPress, getCardStyle, getCardSymbol, currentPlayer, lastPlayedCard }: {
  cards: Card[];
  onCardPress: (card: Card) => void;
  getCardStyle: (card: Card) => any;
  getCardSymbol: (card: Card) => string;
  currentPlayer: Player;
  lastPlayedCard: Card | null;
}) => {
  const [scrollOffset, setScrollOffset] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = 90; // 85 + 5 margin for bigger player cards
  const maxVisibleCards = Math.floor((screenWidth - 30) / cardWidth);
  const totalWidth = cards.length * cardWidth;
  const maxScroll = Math.max(0, totalWidth - (screenWidth - 30));

  const handleScroll = (event: any) => {
    setScrollOffset(event.nativeEvent.contentOffset.x);
  };

  const scrollToCard = (index: number) => {
    const targetOffset = index * cardWidth;
    scrollViewRef.current?.scrollTo({ x: targetOffset, animated: true });
  };

  const getCurrentCardIndex = () => {
    return Math.round(scrollOffset / cardWidth);
  };

  return (
    <View style={styles.swipeableContainer}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        style={styles.cardScrollView}
        decelerationRate="fast"
        snapToInterval={cardWidth}
        snapToAlignment="start"
        bounces={false}
        alwaysBounceHorizontal={false}
        scrollEnabled={true}
      >
        {cards.map((card, index) => {
          const isPlayable = !currentPlayer.isBot && canPlayCard(card, lastPlayedCard, getCurrentColor(lastPlayedCard));
          return (
            <TouchableOpacity
              key={card.id}
              style={[styles.playerCard, { backgroundColor: getCardColor(card) }]}
              onPress={() => onCardPress(card)}
              disabled={currentPlayer.isBot}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                  <Text style={[styles.cardText, styles.cardTextSmall]}>{getCardSymbol(card)}</Text>
                </View>
                <View style={styles.cardCenter}>
                  <Text style={[styles.cardText, styles.cardTextLarge]}>{getCardSymbol(card)}</Text>
                </View>
                <View style={styles.cardBottom}>
                  <Text style={[styles.cardText, styles.cardTextSmall]}>{getCardSymbol(card)}</Text>
                </View>
              </View>
              {isPlayable && <View style={styles.playableIndicator} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      
      {/* Navigation dots */}
      {cards.length > maxVisibleCards && (
        <View style={styles.navigationDots}>
          {Array.from({ length: Math.ceil(cards.length / maxVisibleCards) }, (_, i) => {
            const isActive = Math.floor(getCurrentCardIndex() / maxVisibleCards) === i;
            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  isActive && styles.activeDot
                ]}
              />
            );
          })}
        </View>
      )}
      
      {/* Quick navigation buttons */}
      {cards.length > maxVisibleCards && (
        <View style={styles.quickNav}>
          <TouchableOpacity
            style={[styles.navButton, scrollOffset <= 0 && styles.navButtonDisabled]}
            onPress={() => scrollToCard(0)}
            disabled={scrollOffset <= 0}
          >
            <MaterialCommunityIcons name="chevron-double-left" size={16} color={scrollOffset <= 0 ? "#9CA3AF" : "#374151"} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.navButton, scrollOffset <= 0 && styles.navButtonDisabled]}
            onPress={() => scrollToCard(Math.max(0, getCurrentCardIndex() - 1))}
            disabled={scrollOffset <= 0}
          >
            <MaterialCommunityIcons name="chevron-left" size={16} color={scrollOffset <= 0 ? "#9CA3AF" : "#374151"} />
          </TouchableOpacity>
          
          <Text style={styles.cardCounter}>
            {getCurrentCardIndex() + 1} / {cards.length}
          </Text>
          
          <TouchableOpacity
            style={[styles.navButton, scrollOffset >= maxScroll && styles.navButtonDisabled]}
            onPress={() => scrollToCard(Math.min(cards.length - 1, getCurrentCardIndex() + 1))}
            disabled={scrollOffset >= maxScroll}
          >
            <MaterialCommunityIcons name="chevron-right" size={16} color={scrollOffset >= maxScroll ? "#9CA3AF" : "#374151"} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.navButton, scrollOffset >= maxScroll && styles.navButtonDisabled]}
            onPress={() => scrollToCard(cards.length - 1)}
            disabled={scrollOffset >= maxScroll}
          >
            <MaterialCommunityIcons name="chevron-double-right" size={16} color={scrollOffset >= maxScroll ? "#9CA3AF" : "#374151"} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default function UnoPage() {
  const { user, loading } = useAuth();
  const { isProfileComplete, isLoading: profileLoading } = useProfileCompletion();
  const { t } = useLanguage();
  const router = useRouter();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [animatingCard, setAnimatingCard] = useState<Card | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [gameStats, setGameStats] = useState<any>(null);
  const animatedValue = useState(new Animated.Value(0))[0];

  // Initialize new game
  const initializeGame = useCallback((): GameState => {
    const deck = shuffleDeck(createDeck());
    const players: Player[] = [
      { id: 'player', name: 'Vous', hand: [], isBot: false },
      { id: 'bot', name: 'Bot', hand: [], isBot: true }
    ];
    
    const { deck: newDeck, players: newPlayers } = dealCards(deck, players);
    
    // Start with a non-special card
    let startCard = newDeck.pop()!;
    while (['skip', 'reverse', 'draw2', 'wild', 'wild4'].includes(startCard.value)) {
      newDeck.unshift(startCard);
      startCard = newDeck.pop()!;
    }
    
    return {
      deck: newDeck,
      discardPile: [startCard],
      players: newPlayers,
      currentPlayerIndex: 0,
      direction: 1,
      gameStatus: t('uno.yourTurn'),
      lastPlayedCard: startCard,
      drawCount: 0,
      gamePhase: 'playing',
      winner: null,
      gameStartTime: Date.now(),
      cardsPlayedPlayer1: 0,
      cardsPlayedPlayer2: 0,
      specialCardsUsed: 0,
      totalCardsPlayed: 0,
    };
  }, [t]);

  // Load saved game on component mount
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

  // Save game state whenever it changes
  useEffect(() => {
    if (!isLoading && gameState) {
      saveGameState(gameState);
    }
  }, [gameState, isLoading]);

  // Bot turn logic
  useEffect(() => {
    if (!gameState || gameState.gamePhase === 'gameOver' || isLoading) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.isBot && gameState.gamePhase === 'playing') {
      const timer = setTimeout(() => {
        // Bot turn logic inline to avoid dependency issues
        const currentColor = getCurrentColor(gameState.lastPlayedCard);
        const botMove = getBotMove(currentPlayer, gameState.lastPlayedCard, currentColor);
        
        if (botMove.card) {
          // Call playCard directly
          const card = botMove.card;
          const wildColor = botMove.color;
          
          if (!canPlayCard(card, gameState.lastPlayedCard, currentColor)) {
            return;
          }
          
          // Animate card play
          setAnimatingCard(card);
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setAnimatingCard(null);
            animatedValue.setValue(0);
          });
          
          // Update game state
          const newGameState = { ...gameState };
          
          // Remove card from player's hand
          const playerIndex = newGameState.players.findIndex(p => p.id === currentPlayer.id);
          newGameState.players[playerIndex].hand = currentPlayer.hand.filter(c => c.id !== card.id);
          
          // Add to discard pile
          const playedCard = { ...card };
          if (wildColor && card.color === 'wild') {
            playedCard.color = wildColor;
          }
          newGameState.discardPile.push(playedCard);
          newGameState.lastPlayedCard = playedCard;
          
          // Handle special cards
          let nextPlayerIndex = newGameState.currentPlayerIndex;
          let newStatus = '';
          
          if (card.value === 'skip') {
            nextPlayerIndex = (nextPlayerIndex + newGameState.direction + newGameState.players.length) % newGameState.players.length;
            newStatus = 'Tour sauté !';
          } else if (card.value === 'reverse') {
            newGameState.direction *= -1;
            newStatus = 'Sens inversé !';
          } else if (card.value === 'draw2') {
            newGameState.drawCount += 2;
            newStatus = '+2 cartes !';
          } else if (card.value === 'wild4') {
            newGameState.drawCount += 4;
            newStatus = '+4 cartes !';
          }
          
          // Check for win condition
          if (newGameState.players[playerIndex].hand.length === 0) {
            newGameState.gamePhase = 'gameOver';
            newGameState.winner = newGameState.players[playerIndex];
            newGameState.gameStatus = `${newGameState.players[playerIndex].name} gagne !`;
          } else {
            // Move to next player
            nextPlayerIndex = (nextPlayerIndex + newGameState.direction + newGameState.players.length) % newGameState.players.length;
            newGameState.currentPlayerIndex = nextPlayerIndex;
            
            if (!newStatus) {
              const nextPlayer = newGameState.players[nextPlayerIndex];
              newStatus = nextPlayer.isBot ? t('uno.botTurn') : t('uno.yourTurn');
            }
            newGameState.gameStatus = newStatus;
          }
          
          setGameState(newGameState);
          setSelectedCard(null);
        } else {
          // Bot draws a card
          const newGameState = { ...gameState };
          if (newGameState.deck.length === 0) {
            // Reshuffle discard pile
            const lastCard = newGameState.discardPile.pop();
            newGameState.deck = shuffleDeck(newGameState.discardPile);
            newGameState.discardPile = lastCard ? [lastCard] : [];
          }
          
          const drawnCard = newGameState.deck.pop()!;
          newGameState.players[newGameState.currentPlayerIndex].hand.push(drawnCard);
          
          // Move to next player
          newGameState.currentPlayerIndex = (newGameState.currentPlayerIndex + newGameState.direction + newGameState.players.length) % newGameState.players.length;
          const nextPlayer = newGameState.players[newGameState.currentPlayerIndex];
          newGameState.gameStatus = nextPlayer.isBot ? t('uno.botTurn') : t('uno.yourTurn');
          
          setGameState(newGameState);
        }
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [gameState, isLoading, animatedValue]);

  const playCard = useCallback((card: Card, wildColor?: CardColor) => {
    if (!gameState) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const currentColor = getCurrentColor(gameState.lastPlayedCard);
    
    if (!canPlayCard(card, gameState.lastPlayedCard, currentColor)) {
      return;
    }
    
    // Animate card play
    setAnimatingCard(card);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setAnimatingCard(null);
      animatedValue.setValue(0);
    });
    
    // Update game state
    const newGameState = { ...gameState };
    
    // Remove card from player's hand
    const playerIndex = newGameState.players.findIndex(p => p.id === currentPlayer.id);
    newGameState.players[playerIndex].hand = currentPlayer.hand.filter(c => c.id !== card.id);
    
    // Add to discard pile
    const playedCard = { ...card };
    if (wildColor && card.color === 'wild') {
      playedCard.color = wildColor;
    }
    newGameState.discardPile.push(playedCard);
    newGameState.lastPlayedCard = playedCard;
    
    // Handle special cards
    let nextPlayerIndex = newGameState.currentPlayerIndex;
    let newStatus = '';
    
    if (card.value === 'skip') {
      nextPlayerIndex = (nextPlayerIndex + newGameState.direction + newGameState.players.length) % newGameState.players.length;
      newStatus = 'Tour sauté !';
    } else if (card.value === 'reverse') {
      newGameState.direction *= -1;
      newStatus = 'Sens inversé !';
    } else if (card.value === 'draw2') {
      newGameState.drawCount += 2;
      newStatus = '+2 cartes !';
    } else if (card.value === 'wild4') {
      newGameState.drawCount += 4;
      newStatus = '+4 cartes !';
    }
    
    // Check for win condition
    if (newGameState.players[playerIndex].hand.length === 0) {
      newGameState.gamePhase = 'gameOver';
      newGameState.winner = newGameState.players[playerIndex];
      newGameState.gameStatus = `${newGameState.players[playerIndex].name} gagne !`;
    } else {
      // Move to next player
      nextPlayerIndex = (nextPlayerIndex + newGameState.direction + newGameState.players.length) % newGameState.players.length;
      newGameState.currentPlayerIndex = nextPlayerIndex;
      
      if (!newStatus) {
        const nextPlayer = newGameState.players[nextPlayerIndex];
        newStatus = nextPlayer.isBot ? t('uno.botTurn') : t('uno.yourTurn');
      }
      newGameState.gameStatus = newStatus;
    }
    
    setGameState(newGameState);
    setSelectedCard(null);
  }, [gameState, animatedValue]);

  const drawCard = useCallback(() => {
    if (!gameState) return;
    
    const newGameState = { ...gameState };
    const currentPlayer = newGameState.players[newGameState.currentPlayerIndex];
    
    // Draw cards
    const cardsToDraw = Math.max(1, newGameState.drawCount);
    newGameState.drawCount = 0;
    
    for (let i = 0; i < cardsToDraw; i++) {
      if (newGameState.deck.length === 0) {
        // Reshuffle discard pile (except last card)
        const lastCard = newGameState.discardPile.pop()!;
        newGameState.deck = shuffleDeck(newGameState.discardPile);
        newGameState.discardPile = [lastCard];
      }
      
      if (newGameState.deck.length > 0) {
        const card = newGameState.deck.pop()!;
        const playerIndex = newGameState.players.findIndex(p => p.id === currentPlayer.id);
        newGameState.players[playerIndex].hand.push(card);
      }
    }
    
    // Move to next player
    const nextPlayerIndex = (newGameState.currentPlayerIndex + newGameState.direction + newGameState.players.length) % newGameState.players.length;
    newGameState.currentPlayerIndex = nextPlayerIndex;
    
    const nextPlayer = newGameState.players[nextPlayerIndex];
    newGameState.gameStatus = nextPlayer.isBot ? t('uno.botTurn') : t('uno.yourTurn');
    
    setGameState(newGameState);
  }, [gameState]);

  const handleCardPress = useCallback((card: Card) => {
    if (!gameState || gameState.players[gameState.currentPlayerIndex].isBot) return;
    
    const currentColor = getCurrentColor(gameState.lastPlayedCard);
    
    if (canPlayCard(card, gameState.lastPlayedCard, currentColor)) {
      if (card.color === 'wild') {
        setSelectedCard(card);
        setShowColorPicker(true);
      } else {
        playCard(card);
      }
    }
  }, [gameState, playCard]);

  const handleColorSelect = useCallback((color: CardColor) => {
    if (selectedCard) {
      playCard(selectedCard, color);
      setShowColorPicker(false);
    }
  }, [selectedCard, playCard]);

  const resetGame = useCallback(async () => {
    setGameState(initializeGame());
    setSelectedCard(null);
    setShowColorPicker(false);
    setAnimatingCard(null);
    await clearGameState();
  }, [initializeGame]);

  const getCardStyle = useCallback((card: Card) => {
    const isPlayable = gameState && !gameState.players[gameState.currentPlayerIndex].isBot && 
      canPlayCard(card, gameState.lastPlayedCard, getCurrentColor(gameState.lastPlayedCard));
    
    return [
      styles.card,
      {
        backgroundColor: getCardColor(card),
        borderColor: isPlayable ? '#FFD700' : 'transparent',
        borderWidth: isPlayable ? 2 : 0,
        opacity: isPlayable ? 1 : 0.7,
      }
    ];
  }, [gameState]);

  // Don't render if not authenticated or profile not completed
  if (loading || profileLoading || !user || !isProfileComplete) {
    return null;
  }

  // Show loading while restoring game
  if (isLoading || !gameState) {
    return (
      <AppLayout>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <MaterialCommunityIcons name="chevron-left" size={24} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('games.uno')}</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t('uno.loading')}</Text>
          </View>
        </View>
      </AppLayout>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const playerHand = gameState.players[0].hand;
  const botHand = gameState.players[1].hand;
  const lastCard = gameState.discardPile[gameState.discardPile.length - 1];

  return (
    <AppLayout>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Uno</Text>
          <TouchableOpacity onPress={resetGame} style={styles.resetButton}>
            <MaterialCommunityIcons name="refresh" size={24} color="#000000" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.gameContainer}>
          {/* Game Status */}
          <View style={styles.gameInfo}>
            <Text style={styles.statusText}>{gameState.gameStatus}</Text>
            {gameState.drawCount > 0 && (
              <Text style={styles.drawCountText}>+{gameState.drawCount} cartes</Text>
            )}
            <View style={styles.gameStats}>
              <Text style={styles.statText}>Direction: {gameState.direction === 1 ? '→' : '←'}</Text>
              <Text style={styles.statText}>Tour: {gameState.currentPlayerIndex === 0 ? 'Vous' : 'Bot'}</Text>
            </View>
          </View>
          
          {/* Bot Hand */}
          <View style={styles.botHand}>
            <Text style={styles.playerName}>Bot ({botHand.length} cartes)</Text>
            <View style={styles.botCards}>
              {botHand.map((_, index) => (
                <View key={index} style={styles.hiddenCard} />
              ))}
            </View>
          </View>
          
          {/* Discard Pile */}
          <View style={styles.discardArea}>
            <Text style={styles.sectionTitle}>Carte jouée</Text>
            <View style={styles.discardPile}>
              {lastCard && (
                <View style={[styles.card, { backgroundColor: getCardColor(lastCard) }]}>
                  <View style={styles.cardContent}>
                    <View style={styles.cardTop}>
                      <Text style={[styles.cardText, styles.cardTextSmall]}>{getCardSymbol(lastCard)}</Text>
                    </View>
                    <View style={styles.cardCenter}>
                      <Text style={[styles.cardText, styles.cardTextLarge]}>{getCardSymbol(lastCard)}</Text>
                    </View>
                    <View style={styles.cardBottom}>
                      <Text style={[styles.cardText, styles.cardTextSmall]}>{getCardSymbol(lastCard)}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
            <View style={styles.gameInfoRow}>
              <Text style={styles.deckCount}>Deck: {gameState.deck.length}</Text>
              <Text style={styles.discardCount}>Défausse: {gameState.discardPile.length}</Text>
            </View>
            {lastCard && (
              <Text style={styles.cardInfo}>
                {lastCard.color === 'wild' ? 'Carte sauvage' : 
                 lastCard.value === 'skip' ? 'Tour sauté' :
                 lastCard.value === 'reverse' ? 'Sens inversé' :
                 lastCard.value === 'draw2' ? '+2 cartes' :
                 lastCard.value === 'wild4' ? '+4 cartes' :
                 `Carte ${lastCard.color} ${lastCard.value}`}
              </Text>
            )}
          </View>
          
          {/* Player Hand */}
          <View style={styles.playerHand}>
            <View style={styles.handHeader}>
              <Text style={styles.playerName}>{t('uno.yourCards')} ({playerHand.length})</Text>
              {!currentPlayer.isBot && (
                <Text style={styles.playableInfo}>
                  {getPlayableCards(playerHand, gameState.lastPlayedCard, getCurrentColor(gameState.lastPlayedCard)).length} {t('uno.playable')}
                </Text>
              )}
            </View>
            <SwipeableCardDisplay
              cards={playerHand}
              onCardPress={handleCardPress}
              getCardStyle={getCardStyle}
              getCardSymbol={getCardSymbol}
              currentPlayer={currentPlayer}
              lastPlayedCard={gameState.lastPlayedCard}
            />
          </View>
          
          {/* Draw Card Button */}
          {!currentPlayer.isBot && (
            <TouchableOpacity style={styles.drawButton} onPress={drawCard}>
              <MaterialCommunityIcons name="cards" size={20} color="#FFFFFF" />
              <Text style={styles.drawButtonText}>{t('uno.draw')}</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Color Picker Modal */}
        {showColorPicker && (
          <View style={styles.colorPickerOverlay}>
            <View style={styles.colorPicker}>
              <Text style={styles.colorPickerTitle}>Choisir une couleur</Text>
              <View style={styles.colorOptions}>
                {(['red', 'blue', 'green', 'yellow'] as CardColor[]).map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorOption, { backgroundColor: getCardColor({ color, value: '0', id: '', points: 0 } as Card) }]}
                    onPress={() => handleColorSelect(color)}
                  >
                    <Text style={styles.colorOptionText}>
                      {color === 'red' ? '🔴' : color === 'blue' ? '🔵' : color === 'green' ? '🟢' : '🟡'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
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
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  gameInfo: {
    alignItems: 'center',
    marginBottom: 15,
    minHeight: 80,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 5,
  },
  drawCountText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
    marginBottom: 8,
  },
  gameStats: {
    flexDirection: 'row',
    gap: 20,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  gameInfoRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 8,
  },
  deckCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  discardCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  cardInfo: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  botHand: {
    marginBottom: 15,
    alignItems: 'center',
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  botCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  hiddenCard: {
    width: 50,
    height: 75,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    margin: 3,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  discardArea: {
    alignItems: 'center',
    marginBottom: 15,
  },
  discardPile: {
    marginBottom: 8,
  },
  deckCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  playerHand: {
    flex: 1,
    marginBottom: 15,
  },
  handHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  playableInfo: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  handScroll: {
    maxHeight: 120,
  },
  handScrollContent: {
    paddingHorizontal: 5,
  },
  handContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  playableIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  swipeableContainer: {
    marginBottom: 10,
  },
  cardScrollView: {
    maxHeight: 120,
  },
  scrollContent: {
    paddingHorizontal: 15,
    alignItems: 'center',
    minWidth: '100%',
  },
  swipeableCard: {
    marginHorizontal: 2,
  },
  playerCard: {
    width: 85,
    height: 120,
    borderRadius: 14,
    marginHorizontal: 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  navigationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  activeDot: {
    backgroundColor: '#3B82F6',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  quickNav: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  navButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 32,
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#F9FAFB',
    borderColor: '#F3F4F6',
  },
  cardCounter: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  card: {
    width: 70,
    height: 105,
    borderRadius: 12,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 8,
  },
  cardTop: {
    alignItems: 'flex-start',
  },
  cardCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBottom: {
    alignItems: 'flex-end',
    transform: [{ rotate: '180deg' }],
  },
  cardText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  cardTextLarge: {
    fontSize: 24,
    fontWeight: '900',
  },
  cardTextSmall: {
    fontSize: 12,
    fontWeight: '700',
  },
  drawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F47CC6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  drawButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  colorPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPicker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  colorPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
  },
  colorOptions: {
    flexDirection: 'row',
    gap: 16,
  },
  colorOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  colorOptionText: {
    fontSize: 24,
  },
});
