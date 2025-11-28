
import { Server } from 'socket.io';
import express from 'express';
import http from 'http';
import { evaluateHand, compareHands, HandResult } from './handEvaluator';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3001;

// --- Types ---

interface Player {
    id: string;
    name: string;
    isHuman: boolean;
    chips: number;
    bet: number;
    holeDice: number[];
    hasFolded: boolean;
    isHost: boolean;
    roomId: string;
    handResult?: HandResult;
    isWinner?: boolean;
}

interface GameRoom {
    id: string;
    players: Player[];
    gameState: {
        phase: string; // 'IDLE' | 'PRE_FLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN'
        communityDice: number[];
        pot: number;
        currentBet: number;
        log: string[];
    };
    activePlayerIdx: number;
}

const rooms: Record<string, GameRoom> = {};

// --- Helpers ---
const generateRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();
const rollDie = () => Math.floor(Math.random() * 6) + 1;
const BLIND_BET = 10;

// --- Game Logic ---

const broadcastRoom = (room: GameRoom) => {
    // 获取房间内所有 socket 连接
    io.in(room.id).fetchSockets().then(sockets => {
        sockets.forEach(socket => {
            // 为每个玩家创建脱敏后的房间状态副本
            const safeRoom = {
                ...room,
                players: room.players.map(p => {
                    // 规则：
                    // 1. 如果是自己，看自己的牌
                    // 2. 如果是摊牌阶段 (SHOWDOWN)，看所有人的牌
                    // 3. 否则，隐藏别人的牌 (设为空数组)
                    if (p.id === socket.id || room.gameState.phase === 'SHOWDOWN') {
                        return p;
                    } else {
                        return {
                            ...p,
                            holeDice: [] // 隐藏手牌
                        };
                    }
                })
            };
            
            // 单独发送给该玩家
            socket.emit('updateGameState', safeRoom);
        });
    });
};

const nextPhase = (room: GameRoom) => {
    const { phase } = room.gameState;
    let nextP = phase;
    let msg = "";
    
    if (phase === 'PRE_FLOP') {
        nextP = 'FLOP';
        room.gameState.communityDice = [rollDie(), rollDie(), rollDie()];
        msg = "翻牌圈: 发出3颗公骰";
    } else if (phase === 'FLOP') {
        nextP = 'TURN';
        room.gameState.communityDice.push(rollDie());
        msg = "转牌圈: 发出1颗公骰";
    } else if (phase === 'TURN') {
        nextP = 'RIVER';
        room.gameState.communityDice.push(rollDie());
        msg = "河牌圈: 发出1颗公骰";
    } else if (phase === 'RIVER') {
        nextP = 'SHOWDOWN';
        msg = "摊牌时刻!";
    }

    room.gameState.phase = nextP;
    room.gameState.log.push(msg);
    
    // Reset bets for new round
    room.gameState.currentBet = 0;
    room.players.forEach(p => p.bet = 0);
    
    if (nextP === 'SHOWDOWN') {
        handleShowdown(room);
    } else {
        // Reset active player to first non-folded
        let startIdx = 0;
        while(startIdx < room.players.length && room.players[startIdx].hasFolded) {
            startIdx++;
        }
        room.activePlayerIdx = startIdx;
    }

    broadcastRoom(room);
};

const handleShowdown = (room: GameRoom) => {
    room.activePlayerIdx = -1;
    const activePlayers = room.players.filter(p => !p.hasFolded);

    if (activePlayers.length === 0) return; // Should not happen

    // Evaluate
    activePlayers.forEach(p => {
        const fullHand = [...p.holeDice, ...room.gameState.communityDice];
        p.handResult = evaluateHand(fullHand);
    });

    // Find Winner
    let winner = activePlayers[0];
    for (let i = 1; i < activePlayers.length; i++) {
        if (compareHands(activePlayers[i].handResult!, winner.handResult!) > 0) {
            winner = activePlayers[i];
        }
    }

    const winAmount = room.gameState.pot;
    room.gameState.log.push(`🏆 ${winner.name} 赢得了 ${winAmount} 筹码! 牌型: ${winner.handResult?.description}`);
    
    // Distribute Pot
    room.players.forEach(p => {
        if (p.id === winner.id) {
            p.chips += winAmount;
            p.isWinner = true;
        } else {
            p.isWinner = false;
        }
    });
    
    room.gameState.pot = 0;
    broadcastRoom(room);
};

const advanceTurn = (room: GameRoom) => {
    let nextIdx = room.activePlayerIdx + 1;
    
    // Check if we wrapped around
    if (nextIdx >= room.players.length) {
        // Round end?
        // Simplified: If everyone has acted (implied by index reaching end), go next phase
        // In real poker, we need to check if bets are equal. MVP: Fixed limit, everyone gets 1 chance per street.
        setTimeout(() => nextPhase(room), 1000);
        return;
    }

    // Skip folded players
    if (room.players[nextIdx].hasFolded) {
        room.activePlayerIdx = nextIdx;
        advanceTurn(room);
    } else {
        room.activePlayerIdx = nextIdx;
        broadcastRoom(room);
        
        // Trigger Bot if needed
        const currentPlayer = room.players[nextIdx];
        if (!currentPlayer.isHuman) {
             setTimeout(() => performBotAction(room, currentPlayer), 1500);
        }
    }
};

const performBotAction = (room: GameRoom, bot: Player) => {
    // Simple Bot Logic
    const roll = Math.random();
    if (roll < 0.1) handlePlayerAction(room, bot.id, 'fold');
    else if (roll < 0.6) handlePlayerAction(room, bot.id, 'check');
    else handlePlayerAction(room, bot.id, 'call');
};

const handlePlayerAction = (room: GameRoom, playerId: string, action: string) => {
    const pIdx = room.players.findIndex(p => p.id === playerId);
    if (pIdx === -1 || pIdx !== room.activePlayerIdx) return;

    const p = room.players[pIdx];

    if (action === 'fold') {
        p.hasFolded = true;
        room.gameState.log.push(`${p.name} 弃牌`);
        
        // Check if only one player left
        const activeCount = room.players.filter(pl => !pl.hasFolded).length;
        if (activeCount === 1) {
            // Win by default
            const winner = room.players.find(pl => !pl.hasFolded);
            if (winner) {
                room.gameState.log.push(`${winner.name} 获胜 (其他人全弃牌)`);
                winner.chips += room.gameState.pot;
                room.gameState.pot = 0;
                room.gameState.phase = 'SHOWDOWN'; // End state
                room.activePlayerIdx = -1;
                broadcastRoom(room);
                return;
            }
        }

    } else if (action === 'call') {
        // Fixed Limit: Bet = 10
        const betAmt = BLIND_BET;
        if (p.chips >= betAmt) {
            p.chips -= betAmt;
            p.bet += betAmt;
            room.gameState.pot += betAmt;
            room.gameState.log.push(`${p.name} 下注 ${betAmt}`);
        } else {
            // All in
            room.gameState.pot += p.chips;
            p.bet += p.chips;
            p.chips = 0;
            room.gameState.log.push(`${p.name} 全压!`);
        }
    } else {
        room.gameState.log.push(`${p.name} 过牌`);
    }

    advanceTurn(room);
};


io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    socket.on('createRoom', (playerName: string) => {
        const roomId = generateRoomId();
        const newPlayer: Player = {
            id: socket.id,
            name: playerName || `Player ${socket.id.substring(0,4)}`,
            isHuman: true,
            chips: 1000,
            bet: 0,
            holeDice: [],
            hasFolded: false,
            isHost: true,
            roomId: roomId
        };

        rooms[roomId] = {
            id: roomId,
            players: [newPlayer],
            gameState: {
                phase: 'IDLE',
                communityDice: [],
                pot: 0,
                currentBet: 0,
                log: [`房间 ${roomId} 创建成功`],
            },
            activePlayerIdx: -1
        };

        socket.join(roomId);
        socket.emit('roomCreated', { roomId, player: newPlayer });
        broadcastRoom(rooms[roomId]);
    });

    socket.on('joinRoom', ({ roomId, playerName }: { roomId: string, playerName: string }) => {
        const room = rooms[roomId];
        if (room) {
            // Check if already in (reconnect?) - simplified: always new
            const newPlayer: Player = {
                id: socket.id,
                name: playerName || `Player ${socket.id.substring(0,4)}`,
                isHuman: true,
                chips: 1000,
                bet: 0,
                holeDice: [],
                hasFolded: false,
                isHost: false,
                roomId: roomId
            };
            
            room.players.push(newPlayer);
            socket.join(roomId);
            room.gameState.log.push(`${newPlayer.name} 加入了房间`);
            broadcastRoom(room);
        } else {
            socket.emit('error', '房间不存在');
        }
    });

    socket.on('addBot', (roomId: string) => {
        const room = rooms[roomId];
        if (room) {
            const botId = `BOT-${Date.now()}-${Math.floor(Math.random()*100)}`;
            const botName = ["骰子王", "运财童子", "赌神阿发"][Math.floor(Math.random() * 3)] + `-${Math.floor(Math.random()*100)}`;
            
            const bot: Player = {
                id: botId,
                name: botName,
                isHuman: false,
                chips: 1000,
                bet: 0,
                holeDice: [],
                hasFolded: false,
                isHost: false,
                roomId: roomId
            };

            room.players.push(bot);
            room.gameState.log.push(`机器人 ${botName} 加入了战场`);
            broadcastRoom(room);
        }
    });

    socket.on('startGame', (roomId: string) => {
        const room = rooms[roomId];
        if (room) {
            room.gameState.phase = 'PRE_FLOP';
            room.gameState.communityDice = [];
            room.gameState.pot = 0;
            room.activePlayerIdx = 0;
            room.gameState.log = ["--- 新回合开始 ---"]; // Clear old logs or keep? Let's clear for fresh start feel
            
            room.players.forEach(p => {
                p.holeDice = [rollDie(), rollDie()];
                p.hasFolded = false;
                p.isWinner = false;
                p.handResult = undefined;
                p.bet = BLIND_BET;
                p.chips = Math.max(0, p.chips - BLIND_BET);
            });
            
            room.gameState.pot = room.players.length * BLIND_BET;
            room.gameState.currentBet = BLIND_BET;
            room.gameState.log.push(`收取盲注 ${BLIND_BET}`);
            
            broadcastRoom(room);
            
            // If first player is Bot, trigger it
            if (!room.players[0].isHuman) {
                setTimeout(() => performBotAction(room, room.players[0]), 1500);
            }
        }
    });

    socket.on('playerAction', ({ roomId, action }: { roomId: string, action: string }) => {
        const room = rooms[roomId];
        if (room) {
            handlePlayerAction(room, socket.id, action);
        }
    });

    socket.on('disconnect', () => {
        // Find room user was in
        // Ideally clean up player, but for MVP we leave 'ghost' players or handle nicely
        console.log('User disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

