import { Rank, HandRank, Suit, SoundKey } from './types';

export const RANK_ORDER: Rank[] = [
  Rank._2, Rank._3, Rank._4, Rank._5, Rank._6, Rank._7, Rank._8,
  Rank._9, Rank._T, Rank._J, Rank._Q, Rank._K, Rank._A
];

export const SUITS: Suit[] = [Suit.Clubs, Suit.Diamonds, Suit.Hearts, Suit.Spades];

export const HAND_NAMES: { [key in HandRank]: string } = {
  [HandRank.HIGH_CARD]: 'High Card',
  [HandRank.PAIR]: 'Pair',
  [HandRank.FLUSH]: 'Flush',
  [HandRank.STRAIGHT]: 'Straight',
  [HandRank.THREE_OF_A_KIND]: 'Three of a Kind',
  [HandRank.STRAIGHT_FLUSH]: 'Straight Flush',
};

export const ANTE_BONUS_PAYOUT: { [key in HandRank]?: number } = {
    [HandRank.STRAIGHT_FLUSH]: 5,
    [HandRank.THREE_OF_A_KIND]: 4,
    [HandRank.STRAIGHT]: 1,
};

// Pixi.js Assets - Using a stable asset from the official PixiJS examples repo via jsDelivr CDN
export const CARD_SPRITESHEET_URL = 'https://cdn.jsdelivr.net/gh/pixijs/examples@main/public/assets/cards/cards.json';
export const CARD_BACK_ASSET = 'card_back.png';

// Sound Assets - Using a new set of stable, high-quality sounds from a version-pinned GitHub repo via jsDelivr CDN
export const SOUND_ASSETS: Record<SoundKey, string> = {
    deal: 'https://cdn.jsdelivr.net/gh/TakashiW/three-card-poker-ai@0a4b0d1f7a08d28102a45025731473f27572765d/public/sounds/deal.wav',
    flip: 'https://cdn.jsdelivr.net/gh/TakashiW/three-card-poker-ai@0a4b0d1f7a08d28102a45025731473f27572765d/public/sounds/flip.wav',
    chip: 'https://cdn.jsdelivr.net/gh/TakashiW/three-card-poker-ai@0a4b0d1f7a08d28102a45025731473f27572765d/public/sounds/chip.wav',
    win: 'https://cdn.jsdelivr.net/gh/TakashiW/three-card-poker-ai@0a4b0d1f7a08d28102a45025731473f27572765d/public/sounds/win.wav',
    lose: 'https://cdn.jsdelivr.net/gh/TakashiW/three-card-poker-ai@0a4b0d1f7a08d28102a45025731473f27572765d/public/sounds/lose.wav',
    click: 'https://cdn.jsdelivr.net/gh/TakashiW/three-card-poker-ai@0a4b0d1f7a08d28102a45025731473f27572765d/public/sounds/click.wav',
}

// Game constants
export const STARTING_BALANCE = 1000;
export const MIN_BET = 10;
export const MAX_BET = 100;