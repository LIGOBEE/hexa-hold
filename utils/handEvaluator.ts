
import { HandRank, HandResult } from '../types';

/**
 * Returns the rank name as a string (Chinese)
 */
export const getRankName = (rank: HandRank): string => {
  switch (rank) {
    case HandRank.FIVE_OF_A_KIND: return "五条 (Five of a Kind)";
    case HandRank.FOUR_OF_A_KIND: return "四条 (Four of a Kind)";
    case HandRank.FULL_HOUSE: return "葫芦 (Full House)";
    case HandRank.SIX_STRAIGHT: return "六顺-天顺 (Six Straight)";
    case HandRank.FIVE_STRAIGHT: return "五顺-顺子 (Straight)";
    case HandRank.THREE_OF_A_KIND: return "三条 (Three of a Kind)";
    case HandRank.TWO_PAIR: return "两对 (Two Pair)";
    case HandRank.ONE_PAIR: return "一对 (One Pair)";
    default: return "高牌 (High Die)";
  }
};

/**
 * Main evaluation function.
 * Takes 7 integers (or fewer, though logic assumes 5+ for final hands).
 * Returns the best possible hand rank and tie-breaker values.
 */
export const evaluateHand = (dice: number[]): HandResult => {
  // 1. Frequency Map
  const counts = new Map<number, number>();
  for (const die of dice) {
    counts.set(die, (counts.get(die) || 0) + 1);
  }

  const uniqueValues = Array.from(counts.keys()).sort((a, b) => b - a); // Descending

  // --- Check 8: Five of a Kind ---
  for (const val of uniqueValues) {
    if ((counts.get(val) || 0) >= 5) {
      return {
        rank: HandRank.FIVE_OF_A_KIND,
        rankName: "五条",
        tieBreakers: [val],
        description: `五条 ${val}`,
      };
    }
  }

  // --- Check 7: Four of a Kind ---
  for (const val of uniqueValues) {
    if ((counts.get(val) || 0) === 4) {
      // Find kicker (highest remaining)
      const kickers = uniqueValues.filter(v => v !== val);
      return {
        rank: HandRank.FOUR_OF_A_KIND,
        rankName: "四条",
        tieBreakers: [val, kickers[0] || 0],
        description: `四条 ${val}`,
      };
    }
  }

  // --- Check 6: Full House (3 + 2) ---
  let tripVal = -1;
  let pairVal = -1;

  // Find highest trip
  for (const val of uniqueValues) {
    if ((counts.get(val) || 0) >= 3) {
      tripVal = val;
      break;
    }
  }

  if (tripVal !== -1) {
    // Find highest pair (can be another trip treated as pair)
    for (const val of uniqueValues) {
      if (val !== tripVal && (counts.get(val) || 0) >= 2) {
        pairVal = val;
        break;
      }
    }
  }

  if (tripVal !== -1 && pairVal !== -1) {
    return {
      rank: HandRank.FULL_HOUSE,
      rankName: "葫芦",
      tieBreakers: [tripVal, pairVal],
      description: `葫芦 (${tripVal}带${pairVal})`,
    };
  }

  // --- Check 5: Six Straight (1,2,3,4,5,6) ---
  // Must have at least one of every number 1-6
  const allPresent = [1, 2, 3, 4, 5, 6].every(n => counts.has(n));
  if (allPresent) {
    return {
      rank: HandRank.SIX_STRAIGHT,
      rankName: "六连顺",
      tieBreakers: [6], // Max value is always 6
      description: "传说中的六连顺!",
    };
  }

  // --- Check 4: Five Straight ---
  // Possible straights: 2-3-4-5-6 or 1-2-3-4-5
  const hasLowStraight = [1, 2, 3, 4, 5].every(n => counts.has(n));
  const hasHighStraight = [2, 3, 4, 5, 6].every(n => counts.has(n));

  if (hasHighStraight) {
    return {
      rank: HandRank.FIVE_STRAIGHT,
      rankName: "顺子",
      tieBreakers: [6],
      description: "大顺子 (2-6)",
    };
  }
  if (hasLowStraight) {
    return {
      rank: HandRank.FIVE_STRAIGHT,
      rankName: "顺子",
      tieBreakers: [5],
      description: "小顺子 (1-5)",
    };
  }

  // --- Check 3: Three of a Kind ---
  if (tripVal !== -1) {
    // Get 2 kickers
    const kickers = dice
      .filter(d => d !== tripVal)
      .sort((a, b) => b - a)
      .slice(0, 2);
    
    return {
      rank: HandRank.THREE_OF_A_KIND,
      rankName: "三条",
      tieBreakers: [tripVal, ...kickers],
      description: `三条 ${tripVal}`,
    };
  }

  // --- Check 2: Two Pair ---
  const pairs = uniqueValues.filter(val => (counts.get(val) || 0) >= 2);
  if (pairs.length >= 2) {
    const highPair = pairs[0];
    const lowPair = pairs[1];
    // Kicker
    const kicker = dice
      .filter(d => d !== highPair && d !== lowPair)
      .sort((a, b) => b - a)[0];

    return {
      rank: HandRank.TWO_PAIR,
      rankName: "两对",
      tieBreakers: [highPair, lowPair, kicker || 0],
      description: `两对 (${highPair}和${lowPair})`,
    };
  }

  // --- Check 1: One Pair ---
  if (pairs.length === 1) {
    const pair = pairs[0];
    const kickers = dice
      .filter(d => d !== pair)
      .sort((a, b) => b - a)
      .slice(0, 3); // 3 kickers for 5-die hand

    return {
      rank: HandRank.ONE_PAIR,
      rankName: "一对",
      tieBreakers: [pair, ...kickers],
      description: `一对 ${pair}`,
    };
  }

  // --- Check 0: High Card ---
  const highCards = [...dice].sort((a, b) => b - a).slice(0, 5);
  return {
    rank: HandRank.HIGH_DIE,
    rankName: "高牌",
    tieBreakers: highCards,
    description: `高牌 ${highCards[0]}`,
  };
};

/**
 * Compare two hands to determine winner.
 * Returns > 0 if A wins, < 0 if B wins, 0 if tie.
 */
export const compareHands = (a: HandResult, b: HandResult): number => {
  if (a.rank !== b.rank) {
    return a.rank - b.rank;
  }
  // Ranks are equal, compare tie breakers sequentially
  for (let i = 0; i < Math.min(a.tieBreakers.length, b.tieBreakers.length); i++) {
    if (a.tieBreakers[i] !== b.tieBreakers[i]) {
      return a.tieBreakers[i] - b.tieBreakers[i];
    }
  }
  return 0;
};
