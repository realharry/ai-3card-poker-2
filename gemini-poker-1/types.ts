export enum Suit {
  Clubs = 'C',
  Diamonds = 'D',
  Hearts = 'H',
  Spades = 'S'
}

export enum Rank {
  _2 = '2',
  _3 = '3',
  _4 = '4',
  _5 = '5',
  _6 = '6',
  _7 = '7',
  _8 = '8',
  _9 = '9',
  _T = 'T',
  _J = 'J',
  _Q = 'Q',
  _K = 'K',
  _A = 'A'
}

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type Hand = [Card, Card, Card];

export enum HandRank {
  HIGH_CARD,
  PAIR,
  FLUSH,
  STRAIGHT,
  THREE_OF_A_KIND,
  STRAIGHT_FLUSH,
}

export interface HandEvaluation {
  rank: HandRank;
  name: string;
  values: number[];
}

export enum GameState {
  LOADING,
  NAMING,
  BETTING,
  DEALING,
  PLAYER_TURN,
  REVEAL,
  PAYOUT,
}

export type AIHint = {
    recommendation: 'Strong Play' | 'Marginal Play' | 'Fold';
    reason: string;
}

export type SoundKey = 'deal' | 'flip' | 'win' | 'lose' | 'click' | 'chip';

declare global {
  interface Window {
    PIXI: any;
  }
}