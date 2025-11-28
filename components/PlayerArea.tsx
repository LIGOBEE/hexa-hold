import React from 'react';
import { Player, GamePhase, HandResult } from '../types';
import Die from './Die';

interface PlayerAreaProps {
  player: Player;
  isActive: boolean;
  gamePhase: GamePhase;
  realtimeRank?: HandResult; // Calculated in real-time for human
}

const PlayerArea: React.FC<PlayerAreaProps> = ({ player, isActive, gamePhase, realtimeRank }) => {
  const isShowdown = gamePhase === GamePhase.SHOWDOWN;
  // 简化逻辑：只要有骰子数据就显示，没有数据（被服务器隐藏）就显示背面
  const hasVisibleDice = player.holeDice && player.holeDice.length > 0;
  const isWinner = player.isWinner;

  // Determine what description to show: Showdown result OR Realtime estimation
  const displayRank = isShowdown ? player.handResult : realtimeRank;
  const shouldShowRank = (player.isHuman || isShowdown) && !player.hasFolded && displayRank;

  return (
    <div 
      className={`relative flex flex-col items-center p-4 rounded-xl transition-all duration-300 
      ${isActive ? 'bg-slate-700/60 ring-2 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.2)]' : 'bg-slate-800/40'}
      ${player.hasFolded ? 'opacity-50 grayscale' : 'opacity-100'}
      ${isWinner ? 'ring-4 ring-green-500 bg-green-900/40 shadow-[0_0_30px_rgba(34,197,94,0.4)] scale-105 z-10' : ''}
      `}
    >
      {/* Winner Badge */}
      {isWinner && (
        <div className="absolute -top-4 bg-green-500 text-green-950 font-bold px-3 py-1 rounded-full text-sm shadow-lg animate-bounce z-20">
          WINNER
        </div>
      )}

      {/* Avatar / Name Block */}
      <div className="flex flex-col items-center mb-2">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-1 border-2 
          ${player.isHuman ? 'bg-blue-600 border-blue-400 text-white' : 'bg-purple-600 border-purple-400 text-white'}`}>
          {player.name.charAt(0)}
        </div>
        <span className="text-sm font-semibold text-slate-200">{player.name}</span>
        <div className="flex items-center gap-1 text-amber-400 font-mono text-sm">
          <span>🪙</span>
          <span>{player.chips}</span>
        </div>
      </div>

      {/* Action / Status Badge */}
      <div className="h-6 mb-2">
        {player.hasFolded && <span className="text-xs bg-red-900 text-red-200 px-2 py-0.5 rounded font-bold">已弃牌</span>}
        {!player.hasFolded && player.bet > 0 && <span className="text-xs bg-slate-600 text-slate-200 px-2 py-0.5 rounded font-mono">下注: {player.bet}</span>}
        {!player.hasFolded && isActive && !isWinner && <span className="text-xs text-amber-300 animate-pulse font-bold">思考中...</span>}
      </div>

      {/* Dice Area */}
      <div className="flex gap-2 p-2 bg-slate-900/50 rounded-lg shadow-inner min-h-[80px]">
        {hasVisibleDice ? (
          player.holeDice.map((val, idx) => (
            <Die key={`hole-${player.id}-${idx}`} value={val} size="md" />
          ))
        ) : (
          <>
            <Die value={0} size="md" isPlaceholder />
            <Die value={0} size="md" isPlaceholder />
          </>
        )}
      </div>

      {/* Hand Result Badge (Prominent) */}
      {shouldShowRank && (
        <div className={`absolute -bottom-4 px-4 py-1.5 rounded-full shadow-xl border z-20 whitespace-nowrap flex items-center gap-1
          ${isWinner ? 'bg-green-500 border-green-300 text-white font-bold text-sm' : 
            player.isHuman ? 'bg-amber-600 border-amber-400 text-white font-bold text-xs' :
            'bg-slate-900 border-slate-600 text-blue-300 text-xs font-bold'
          }`}>
          {player.isHuman && !isShowdown && !isWinner && <span className="animate-pulse">✨</span>}
          <span>{displayRank.description}</span>
        </div>
      )}
    </div>
  );
};

export default PlayerArea;