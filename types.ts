export enum GamePhase {
  IDLE = 'IDLE',
  PRE_FLOP = 'PRE_FLOP',
  FLOP = 'FLOP',
  TURN = 'TURN',
  RIVER = 'RIVER',
  SHOWDOWN = 'SHOWDOWN',
}

export enum HandRank {
  HIGH_DIE = 0,
  ONE_PAIR = 1,
  TWO_PAIR = 2,
  THREE_OF_A_KIND = 3,
  FIVE_STRAIGHT = 4,
  SIX_STRAIGHT = 5, // Special rule: 1-2-3-4-5-6 available
  FULL_HOUSE = 6,
  FOUR_OF_A_KIND = 7,
  FIVE_OF_A_KIND = 8,
}

export interface HandResult {
  rank: HandRank;
  rankName: string;
  tieBreakers: number[]; // Array of values used to break ties
  description: string;
}

export interface Player {
  id: number;
  name: string;
  isHuman: boolean;
  chips: number;
  bet: number;
  holeDice: number[]; // Usually 2 dice
  hasFolded: boolean;
  handResult?: HandResult;
  isWinner?: boolean;
}

export interface GameState {
  phase: GamePhase;
  communityDice: number[];
  pot: number;
  currentBet: number;
  deckSeed: number; // Just for RNG simulation context
  log: string[];
}