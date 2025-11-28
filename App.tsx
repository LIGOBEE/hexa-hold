
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GamePhase, Player, GameState } from './types';
import { BLIND_BET } from './constants';
import Die from './components/Die';
import PlayerArea from './components/PlayerArea';
import HandGuide from './components/HandGuide';
import { evaluateHand } from './utils/handEvaluator';
import Lobby from './components/Lobby';
import { Socket } from 'socket.io-client';

function App() {
  // --- Network State ---
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);

  // --- Game State ---
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    phase: GamePhase.IDLE,
    communityDice: [],
    pot: 0,
    currentBet: 0,
    deckSeed: Date.now(),
    log: []
  });
  
  const [activePlayerIdx, setActivePlayerIdx] = useState<number>(-1);
  const [showRankGuideModal, setShowRankGuideModal] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [gameState.log]);

  // --- Socket Handlers ---
  useEffect(() => {
    if (!socket) return;

    socket.on('updateGameState', (serverRoom: any) => {
        // Sync full state from server
        // Need to map server fields to client fields if they differ, 
        // but we kept them mostly consistent.
        setPlayers(serverRoom.players);
        setGameState(serverRoom.gameState);
        setActivePlayerIdx(serverRoom.activePlayerIdx);
    });

    return () => {
        socket.off('updateGameState');
    };
  }, [socket]);

  // --- Actions (Send to Server) ---

  const handleJoinGame = (sock: Socket, rId: string, host: boolean) => {
    setSocket(sock);
    setRoomId(rId);
    setIsHost(host);
  };

  const handleLeaveGame = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setRoomId('');
      setIsHost(false);
      setPlayers([]);
      setGameState({
        phase: GamePhase.IDLE,
        communityDice: [],
        pot: 0,
        currentBet: 0,
        deckSeed: Date.now(),
        log: []
      });
    }
  };

  const startGame = () => {
    if (socket && isHost) {
        socket.emit('startGame', roomId);
    }
  };

  const addBot = () => {
    if (socket && isHost) {
        socket.emit('addBot', roomId);
    }
  };

  const handleAction = (action: 'check' | 'call' | 'fold') => {
    if (socket) {
        socket.emit('playerAction', { roomId, action });
    }
  };

  // --- Helpers ---

  // Identify current user
  const myPlayer = players.find(p => p.id === socket?.id);
  const isMyTurn = activePlayerIdx !== -1 && players[activePlayerIdx]?.id === socket?.id;

  // Calculate local hand rank for display
  const humanRealtimeHand = useMemo(() => {
    if (!myPlayer || myPlayer.holeDice.length === 0 || myPlayer.hasFolded) return undefined;
    const cards = [...myPlayer.holeDice, ...gameState.communityDice];
    if (cards.length === 0) return undefined;
    return evaluateHand(cards);
  }, [myPlayer, gameState.communityDice]);

  // --- Rendering ---

  const renderCommunityDice = () => {
    const slots = [0, 1, 2, 3, 4];
    return (
      <div className="flex justify-center gap-3 my-4">
        {slots.map((i) => (
          <div key={i} className="relative">
            {gameState.communityDice[i] ? (
              <Die value={gameState.communityDice[i]} size="lg" className="animate-fade-in-up" />
            ) : (
              <Die value={0} size="lg" isPlaceholder />
            )}
            <div className="absolute -bottom-6 w-full text-center text-xs text-slate-500 font-mono uppercase tracking-wider">
              {i < 3 ? '翻牌' : i === 3 ? '转牌' : '河牌'}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const getPhaseName = (p: GamePhase) => {
    switch(p) {
        case GamePhase.IDLE: return "等待开始";
        case GamePhase.PRE_FLOP: return "翻牌前";
        case GamePhase.FLOP: return "翻牌圈";
        case GamePhase.TURN: return "转牌圈";
        case GamePhase.RIVER: return "河牌圈";
        case GamePhase.SHOWDOWN: return "摊牌";
        default: return p;
    }
  }

  const gameRunning = gameState.phase !== GamePhase.IDLE && gameState.phase !== GamePhase.SHOWDOWN;
  const canDeal = isHost && (gameState.phase === GamePhase.IDLE || gameState.phase === GamePhase.SHOWDOWN);

  if (!socket) {
      return <Lobby onJoin={handleJoinGame} />;
  }

  return (
    <div className="h-screen bg-slate-900 text-slate-200 flex flex-col overflow-hidden">
      
      {/* Mobile Modal for Hand Guide */}
      {showRankGuideModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowRankGuideModal(false)}>
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm h-[80vh] overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowRankGuideModal(false)} className="absolute top-2 right-2 text-slate-400 hover:text-white z-20 bg-slate-800 rounded-full p-1 w-8 h-8">✕</button>
                <HandGuide />
            </div>
        </div>
      )}

      {/* --- Top Bar --- */}
      <header className="h-14 shrink-0 bg-slate-950 flex items-center justify-between px-6 shadow-lg border-b border-slate-800 z-20">
        <div className="flex items-center gap-2">
            <button 
                onClick={handleLeaveGame}
                className="mr-2 p-2 rounded-full bg-slate-800 hover:bg-red-900 text-slate-400 hover:text-red-200 transition-colors"
                title="退出房间"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
            </button>
          <span className="text-2xl">🎲</span>
          <h1 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-red-500 bg-clip-text text-transparent hidden sm:block">
            Hexa-Hold'em 联机版
          </h1>
          <div className="ml-4 px-3 py-1 bg-slate-800 rounded text-xs font-mono text-slate-400">
              房间: <span className="text-white font-bold">{roomId}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm font-mono text-slate-400">
          <button 
            onClick={() => setShowRankGuideModal(true)}
            className="flex lg:hidden items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-full text-xs transition-colors border border-slate-700"
          >
            <span>ℹ️</span> <span>牌型</span>
          </button>
          <div>底池: <span className="text-amber-400 font-bold text-lg">${gameState.pot}</span></div>
          <div className="w-px h-4 bg-slate-700"></div>
          <div><span className="text-blue-400 font-bold">{getPhaseName(gameState.phase)}</span></div>
        </div>
      </header>

      {/* --- Main Content Area (Flex) --- */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Game Table (Grow) */}
        <main className="flex-1 relative flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden">
          
          {/* Felt Texture Background */}
          <div className="absolute inset-0 bg-[#0f172a] radial-gradient opacity-100 pointer-events-none">
            <div className="absolute inset-4 rounded-[60px] sm:rounded-[100px] border-[12px] sm:border-[16px] border-slate-800 bg-[#1e293b] shadow-2xl flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/felt.png')]"></div>
              <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="text-slate-700 text-4xl sm:text-6xl font-black opacity-20 select-none tracking-tighter">HEXA</div>
              </div>
            </div>
          </div>

          {/* Other Players (Top) */}
          <div className="relative z-10 flex flex-wrap justify-center gap-4 sm:gap-8 mb-4 sm:mb-8 scale-90 sm:scale-100 transition-transform">
            {players.filter(p => p.id !== myPlayer?.id).map(p => (
              <PlayerArea 
                key={p.id} 
                player={p} 
                isActive={activePlayerIdx !== -1 && players[activePlayerIdx].id === p.id} 
                gamePhase={gameState.phase}
              />
            ))}
            {/* Host: Add Bot Button */}
            {isHost && gameState.phase === GamePhase.IDLE && (
                <div className="flex items-center justify-center">
                    <button onClick={addBot} className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-600 text-slate-400 hover:text-white hover:border-white hover:bg-slate-700 transition-all flex flex-col items-center justify-center gap-1 shadow-lg">
                        <span className="text-2xl">+</span>
                        <span className="text-[10px]">机器人</span>
                    </button>
                </div>
            )}
          </div>

          {/* Community Cards Area */}
          <div className="relative z-10 bg-slate-800/80 backdrop-blur-sm px-6 py-4 sm:px-10 sm:py-6 rounded-3xl shadow-2xl border border-slate-700/50 mb-8 sm:mb-12 scale-90 sm:scale-100">
            <div className="text-center text-amber-500/80 text-xs font-bold tracking-[0.3em] uppercase mb-2">公共骰子区域</div>
            {renderCommunityDice()}
          </div>

          {/* My Player (Bottom) */}
          <div className="relative z-10 scale-90 sm:scale-100">
            {myPlayer && (
              <PlayerArea 
                player={myPlayer} 
                isActive={isMyTurn}
                gamePhase={gameState.phase}
                realtimeRank={humanRealtimeHand}
              />
            )}
          </div>

        </main>

        {/* --- Right Sidebar (Hand Guide - Desktop Only) --- */}
        <aside className="hidden lg:block w-72 bg-slate-950 border-l border-slate-800 shrink-0 shadow-xl z-20 relative">
           <HandGuide />
        </aside>

      </div>

      {/* --- Controls & Log --- */}
      <footer className="h-auto min-h-[160px] sm:h-48 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row z-30 shrink-0">
        
        {/* Controls Section */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4 border-b sm:border-b-0 sm:border-r border-slate-800">
           {canDeal ? (
              <button 
                onClick={startGame}
                className="bg-green-600 hover:bg-green-500 text-white text-lg font-bold py-3 px-12 rounded-lg shadow-[0_0_15px_rgba(22,163,74,0.5)] transition-all transform hover:scale-105 active:scale-95"
              >
                {gameState.phase === GamePhase.IDLE ? "开始游戏" : "下一局"}
              </button>
           ) : (
             <div className="flex gap-2 sm:gap-4 w-full justify-center">
                <button 
                  disabled={!isMyTurn}
                  onClick={() => handleAction('fold')}
                  className="flex-1 max-w-[120px] bg-red-900/80 hover:bg-red-700 text-red-200 py-3 rounded-lg font-bold border border-red-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                >
                  弃牌
                </button>
                <button 
                  disabled={!isMyTurn}
                  onClick={() => handleAction('check')}
                  className="flex-1 max-w-[120px] bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 rounded-lg font-bold border border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                >
                  过牌
                </button>
                <button 
                  disabled={!isMyTurn}
                  onClick={() => handleAction('call')}
                  className="flex-1 max-w-[140px] bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-lg font-bold shadow-[0_0_15px_rgba(217,119,6,0.4)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                >
                  下注 {BLIND_BET}
                </button>
             </div>
           )}
           <div className="text-xs text-slate-500 mt-2">
             {isMyTurn ? "👉 轮到你了！" : activePlayerIdx !== -1 ? `等待 ${players[activePlayerIdx]?.name} 行动...` : "等待游戏开始..."}
           </div>
        </div>

        {/* Game Log Section */}
        <div className="h-32 sm:h-auto sm:w-1/3 max-w-md bg-black/20 p-4 font-mono text-xs text-slate-400 overflow-y-auto scrollbar-hide flex flex-col gap-1" ref={scrollRef}>
          {gameState.log.map((entry, i) => (
             <div key={i} className="border-l-2 border-slate-700 pl-2">
               <span className="opacity-50 mr-2">[{i}]</span> {entry}
             </div>
          ))}
        </div>
      </footer>

      {/* Global Styles for Animations */}
      <style>{`
        .radial-gradient {
          background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(10px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default App;
