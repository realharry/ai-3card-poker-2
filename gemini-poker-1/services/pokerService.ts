
import { Card, Suit, Rank, Hand, HandRank, HandEvaluation } from '../types';
import { SUITS, RANK_ORDER, HAND_NAMES, ANTE_BONUS_PAYOUT } from '../constants';

let deck: Card[] = [];

const createDeck = (): Card[] => {
  const newDeck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANK_ORDER) {
      newDeck.push({ suit, rank });
    }
  }
  return newDeck;
};

const shuffleDeck = (deckToShuffle: Card[]): void => {
  for (let i = deckToShuffle.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deckToShuffle[i], deckToShuffle[j]] = [deckToShuffle[j], deckToShuffle[i]];
  }
};

const getShuffledDeck = (): Card[] => {
    const newDeck = createDeck();
    shuffleDeck(newDeck);
    return newDeck;
};

export const dealHands = (): { playerHand: Hand, dealerHand: Hand } => {
    deck = getShuffledDeck();
    const playerHand = [deck.pop()!, deck.pop()!, deck.pop()!] as Hand;
    const dealerHand = [deck.pop()!, deck.pop()!, deck.pop()!] as Hand;
    return { playerHand, dealerHand };
};

const getCardValues = (hand: Hand): number[] => {
  return hand.map(card => RANK_ORDER.indexOf(card.rank)).sort((a, b) => b - a);
};

export const evaluateHand = (hand: Hand): HandEvaluation => {
  const values = getCardValues(hand);
  const isFlush = hand.every(card => card.suit === hand[0].suit);
  
  const isStraight = (v: number[]): boolean => {
    // Ace-low straight (A, 2, 3 -> values 12, 1, 0)
    if (v[0] === 12 && v[1] === 1 && v[2] === 0) return true;
    return v[0] - v[1] === 1 && v[1] - v[2] === 1;
  };

  const isStr = isStraight(values);

  if (isStraight(values) && isFlush) {
    return { rank: HandRank.STRAIGHT_FLUSH, name: HAND_NAMES[HandRank.STRAIGHT_FLUSH], values };
  }
  
  const isThreeOfAKind = values[0] === values[1] && values[1] === values[2];
  if (isThreeOfAKind) {
    return { rank: HandRank.THREE_OF_A_KIND, name: HAND_NAMES[HandRank.THREE_OF_A_KIND], values };
  }
  
  if (isStr) {
    return { rank: HandRank.STRAIGHT, name: HAND_NAMES[HandRank.STRAIGHT], values };
  }

  if (isFlush) {
    return { rank: HandRank.FLUSH, name: HAND_NAMES[HandRank.FLUSH], values };
  }
  
  const isPair = values[0] === values[1] || values[1] === values[2];
  if (isPair) {
    // Reorder values to put pair first for comparison
    const pairedValue = values[0] === values[1] ? values[0] : values[2];
    const kicker = values.find(v => v !== pairedValue)!;
    return { rank: HandRank.PAIR, name: HAND_NAMES[HandRank.PAIR], values: [pairedValue, kicker] };
  }

  return { rank: HandRank.HIGH_CARD, name: HAND_NAMES[HandRank.HIGH_CARD], values };
};

export const compareHands = (playerEval: HandEvaluation, dealerEval: HandEvaluation): number => {
    if (playerEval.rank > dealerEval.rank) return 1;
    if (playerEval.rank < dealerEval.rank) return -1;
    
    // Hands have the same rank, compare card values
    for (let i = 0; i < playerEval.values.length; i++) {
        if (playerEval.values[i] > dealerEval.values[i]) return 1;
        if (playerEval.values[i] < dealerEval.values[i]) return -1;
    }
    
    return 0; // Tie
};

export const determineWinner = (playerHand: Hand, dealerHand: Hand): { result: 'player' | 'dealer' | 'push', message: string, dealerQualified: boolean } => {
    const playerEval = evaluateHand(playerHand);
    const dealerEval = evaluateHand(dealerHand);

    const dealerQualifies = dealerEval.rank > HandRank.HIGH_CARD || (dealerEval.rank === HandRank.HIGH_CARD && dealerEval.values[0] >= RANK_ORDER.indexOf(Rank._Q));
    
    if (!dealerQualifies) {
        return { result: 'player', message: `Dealer doesn't qualify. You win!`, dealerQualified: false };
    }
    
    const comparison = compareHands(playerEval, dealerEval);
    
    if (comparison > 0) {
        return { result: 'player', message: `You win with ${playerEval.name}!`, dealerQualified: true };
    } else if (comparison < 0) {
        return { result: 'dealer', message: `Dealer wins with ${dealerEval.name}.`, dealerQualified: true };
    } else {
        return { result: 'push', message: `It's a push! Both have ${playerEval.name}.`, dealerQualified: true };
    }
};

export const calculateAnteBonus = (playerHand: Hand, anteBet: number): number => {
    const playerEval = evaluateHand(playerHand);
    return (ANTE_BONUS_PAYOUT[playerEval.rank] || 0) * anteBet;
};


export const calculatePayout = (anteBet: number, playerHand: Hand, result: { result: 'player' | 'dealer' | 'push', dealerQualified: boolean }): number => {
    const bonus = calculateAnteBonus(playerHand, anteBet);

    if (result.result === 'dealer') {
        return bonus; // Player loses Ante and Play bets, but still gets Ante Bonus
    }
    
    if (result.result === 'push') {
        return anteBet * 2 + bonus; // Return Ante and Play bets (already deducted from balance)
    }
    
    // Player wins
    if (!result.dealerQualified) {
        // Ante pays 1:1, Play pushes. Returns original ante + ante win + original play bet.
        return (anteBet * 3) + bonus; 
    } else {
        // Ante pays 1:1, Play pays 1:1. Returns original ante + ante win + original play + play win.
        return (anteBet * 4) + bonus; 
    }
};