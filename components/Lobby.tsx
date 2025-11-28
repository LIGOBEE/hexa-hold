
import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface RoomSummary {
    id: string;
    hostName: string;
    playerCount: number;
    status: string;
}

interface LobbyProps {
  onJoin: (socket: Socket, roomId: string, isHost: boolean) => void;
}

export default function Lobby({ onJoin }: LobbyProps) {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [roomList, setRoomList] = useState<RoomSummary[]>([]);
  const socketRef = useRef<Socket | null>(null);

  // 判断是否为线上生产环境 (非 localhost 且非 IP 地址)
  const isProduction = window.location.hostname !== 'localhost' && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(window.location.hostname);
  
  // 仅在非生产环境（本地开发/局域网联机）显示 IP 输入框
  const [serverIp, setServerIp] = useState(window.location.hostname);

  const getSocketUrl = () => {
    if (isProduction) return undefined; // 让 socket.io 自动推导
    const targetIp = serverIp || 'localhost';
    return `http://${targetIp}:3001`;
  };

  // 初始化大厅 Socket 连接以获取房间列表
  useEffect(() => {
    const url = getSocketUrl();
    const newSocket = url ? io(url) : io();
    socketRef.current = newSocket;

    newSocket.on('roomListUpdate', (list: RoomSummary[]) => {
        setRoomList(list);
    });

    return () => {
        newSocket.disconnect();
    };
  }, [serverIp]); // IP 变更时重连

  const createRoom = () => {
    if (!name) return alert('请输入昵称');
    const socket = socketRef.current;
    if (!socket) return;

    // 复用当前连接或确保连接
    if (!socket.connected) socket.connect();

    socket.emit('createRoom', name);
    socket.once('roomCreated', ({ roomId, player }) => {
      console.log('Room Created:', roomId);
      onJoin(socket, roomId, true);
      // 这里不需要手动 disconnect，因为 App.tsx 会接管这个 socket 对象
      // 但为了避免 Lobby 卸载时触发 cleanup 断开连接，我们需要一种机制
      // 实际上 React 卸载 cleanup 会运行。
      // 更好的做法：将 socket 提升到 App.tsx 管理，或者在这里移除 cleanup (不完美)。
      // 简单 hack: 将 socketRef.current 置空防止 cleanup 断开
      socketRef.current = null; 
    });
  };

  const joinSpecificRoom = (rId: string) => {
      if (!name) return alert('请输入昵称');
      const socket = socketRef.current;
      if (!socket) return;

      if (!socket.connected) socket.connect();
      
      socket.emit('joinRoom', { roomId: rId, playerName: name });
      
      socket.once('updateGameState', () => {
          onJoin(socket, rId, false);
          socketRef.current = null; // 防止 cleanup 断开
      });
      socket.once('error', (msg) => alert(msg));
  }

  const joinRoom = () => {
    if (!name || !roomId) return alert('请输入昵称和房间号');
    joinSpecificRoom(roomId);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 gap-8">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700 shrink-0">
        <h1 className="text-3xl font-bold text-amber-500 mb-8 text-center">Hexa-Hold'em 联机大厅</h1>
        
        <div className="space-y-6">
            <div>
                <label className="block text-slate-400 text-sm mb-2">你的昵称</label>
                <input 
                    className="w-full bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white focus:border-amber-500 outline-none"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="赌神高进"
                />
            </div>

            {!isProduction && (
            <div>
                <label className="block text-slate-400 text-sm mb-2">服务器 IP (默认本机)</label>
                <input 
                    className="w-full bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white focus:border-amber-500 outline-none"
                    value={serverIp}
                    onChange={e => setServerIp(e.target.value)}
                    placeholder="192.168.x.x"
                />
                 <p className="text-xs text-slate-500 mt-1">如果是主机请填 localhost，如果是访客请填主机的局域网 IP</p>
            </div>
            )}

            <div className="pt-4 border-t border-slate-700">
                <button 
                    onClick={createRoom}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg mb-4 transition-colors"
                >
                    创建新房间
                </button>

                <div className="flex gap-2">
                    <input 
                        className="flex-1 bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white focus:border-amber-500 outline-none"
                        value={roomId}
                        onChange={e => setRoomId(e.target.value.toUpperCase())}
                        placeholder="输入房间号"
                    />
                    <button 
                        onClick={joinRoom}
                        className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-6 rounded-lg transition-colors"
                    >
                        加入
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Room List Section */}
      <div className="w-full max-w-4xl bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 backdrop-blur-sm overflow-hidden flex flex-col max-h-[400px]">
          <h2 className="text-xl font-bold text-slate-300 mb-4 flex items-center gap-2">
              <span>🏠</span> 正在进行的房间 ({roomList.length})
          </h2>
          
          <div className="overflow-y-auto pr-2 space-y-2 flex-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
              {roomList.length === 0 ? (
                  <div className="text-center text-slate-500 py-8 italic">
                      暂无房间，快创建一个吧！
                  </div>
              ) : (
                  roomList.map(room => (
                      <div key={room.id} className="bg-slate-900/80 p-4 rounded-lg border border-slate-700 flex items-center justify-between hover:border-amber-500/50 transition-colors group">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                              <div className="bg-slate-800 px-2 py-1 rounded text-sm font-mono text-amber-400 font-bold">
                                  {room.id}
                              </div>
                              <div className="text-slate-300 text-sm">
                                  <span className="text-slate-500 mr-1">房主:</span>
                                  {room.hostName}
                              </div>
                              <div className="text-slate-400 text-xs sm:text-sm flex items-center gap-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] border ${room.status === '等待中' ? 'border-green-500/30 text-green-400 bg-green-500/10' : 'border-red-500/30 text-red-400 bg-red-500/10'}`}>
                                      {room.status}
                                  </span>
                                  <span>👤 {room.playerCount}人</span>
                              </div>
                          </div>
                          
                          <button 
                              onClick={() => joinSpecificRoom(room.id)}
                              className="bg-slate-700 hover:bg-green-600 text-slate-200 hover:text-white text-sm px-4 py-2 rounded transition-all opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0"
                          >
                              加入
                          </button>
                      </div>
                  ))
              )}
          </div>
      </div>
    </div>
  );
}

