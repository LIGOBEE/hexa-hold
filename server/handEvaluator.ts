
export enum HandRank {
  HIGH_DIE = 0,
  ONE_PAIR = 1,
  TWO_PAIR = 2,
  THREE_OF_A_KIND = 3,
  FIVE_STRAIGHT = 4,
  SIX_STRAIGHT = 5,
  FULL_HOUSE = 6,
  FOUR_OF_A_KIND = 7,
  FIVE_OF_A_KIND = 8,
}

export interface HandResult {
  rank: HandRank;
  rankName: string;
  tieBreakers: number[];
  description: string;
}

export const evaluateHand = (dice: number[]): HandResult => {
  const counts = new Map<number, number>();
  for (const die of dice) {
    counts.set(die, (counts.get(die) || 0) + 1);
  }

  const uniqueValues = Array.from(counts.keys()).sort((a, b) => b - a);

  // Five of a Kind
  for (const val of uniqueValues) {
    if ((counts.get(val) || 0) >= 5) {
      return { rank: HandRank.FIVE_OF_A_KIND, rankName: "五条", tieBreakers: [val], description: `五条 ${val}` };
    }
  }

  // Four of a Kind
  for (const val of uniqueValues) {
    if ((counts.get(val) || 0) === 4) {
      const kickers = uniqueValues.filter(v => v !== val);
      return { rank: HandRank.FOUR_OF_A_KIND, rankName: "四条", tieBreakers: [val, kickers[0] || 0], description: `四条 ${val}` };
    }
  }

  // Full House
  let tripVal = -1;
  let pairVal = -1;
  for (const val of uniqueValues) {
    if ((counts.get(val) || 0) >= 3) {
      tripVal = val;
      break;
    }
  }
  if (tripVal !== -1) {
    for (const val of uniqueValues) {
      if (val !== tripVal && (counts.get(val) || 0) >= 2) {
        pairVal = val;
        break;
      }
    }
  }
  if (tripVal !== -1 && pairVal !== -1) {
    return { rank: HandRank.FULL_HOUSE, rankName: "葫芦", tieBreakers: [tripVal, pairVal], description: `葫芦 (${tripVal}带${pairVal})` };
  }

  // Six Straight
  const allPresent = [1, 2, 3, 4, 5, 6].every(n => counts.has(n));
  if (allPresent) {
    return { rank: HandRank.SIX_STRAIGHT, rankName: "六连顺", tieBreakers: [6], description: "六连顺" };
  }

  // Five Straight
  const hasLowStraight = [1, 2, 3, 4, 5].every(n => counts.has(n));
  const hasHighStraight = [2, 3, 4, 5, 6].every(n => counts.has(n));
  if (hasHighStraight) {
    return { rank: HandRank.FIVE_STRAIGHT, rankName: "顺子", tieBreakers: [6], description: "大顺子 (2-6)" };
  }
  if (hasLowStraight) {
    return { rank: HandRank.FIVE_STRAIGHT, rankName: "顺子", tieBreakers: [5], description: "小顺子 (1-5)" };
  }

  // Three of a Kind
  if (tripVal !== -1) {
    const kickers = dice.filter(d => d !== tripVal).sort((a, b) => b - a).slice(0, 2);
    return { rank: HandRank.THREE_OF_A_KIND, rankName: "三条", tieBreakers: [tripVal, ...kickers], description: `三条 ${tripVal}` };
  }

  // Two Pair
  const pairs = uniqueValues.filter(val => (counts.get(val) || 0) >= 2);
  if (pairs.length >= 2) {
    const highPair = pairs[0];
    const lowPair = pairs[1];
    const kicker = dice.filter(d => d !== highPair && d !== lowPair).sort((a, b) => b - a)[0];
    return { rank: HandRank.TWO_PAIR, rankName: "两对", tieBreakers: [highPair, lowPair, kicker || 0], description: `两对 (${highPair}和${lowPair})` };
  }

  // One Pair
  if (pairs.length === 1) {
    const pair = pairs[0];
    const kickers = dice.filter(d => d !== pair).sort((a, b) => b - a).slice(0, 3);
    return { rank: HandRank.ONE_PAIR, rankName: "一对", tieBreakers: [pair, ...kickers], description: `一对 ${pair}` };
  }

  // High Card
  const highCards = [...dice].sort((a, b) => b - a).slice(0, 5);
  return { rank: HandRank.HIGH_DIE, rankName: "高牌", tieBreakers: highCards, description: `高牌 ${highCards[0]}` };
};

export const compareHands = (a: HandResult, b: HandResult): number => {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.min(a.tieBreakers.length, b.tieBreakers.length); i++) {
    if (a.tieBreakers[i] !== b.tieBreakers[i]) return a.tieBreakers[i] - b.tieBreakers[i];
  }
  return 0;
};

