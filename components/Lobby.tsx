
import React, { useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface LobbyProps {
  onJoin: (socket: Socket, roomId: string, isHost: boolean) => void;
}

export default function Lobby({ onJoin }: LobbyProps) {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [serverIp, setServerIp] = useState(window.location.hostname);

  const connect = () => {
    // 自动检测环境
    // 1. 如果用户手动输入了IP，使用用户输入的
    // 2. 如果是开发环境，默认连接 localhost:3001
    // 3. 生产环境（部署后），连接当前域名（空字符串或 undefined 让 socket.io 自动处理）
    if (serverIp && serverIp !== window.location.hostname) {
         return io(`http://${serverIp}:3001`);
    }
    
    if (import.meta.env.DEV) {
        return io('http://localhost:3001');
    }
    
    // 生产环境，自动连接当前服务器
    return io();
  };

  const createRoom = () => {
    if (!name) return alert('请输入昵称');
    const socket = connect();
    socket.emit('createRoom', name);
    socket.on('roomCreated', ({ roomId, player }) => {
      console.log('Room Created:', roomId);
      onJoin(socket, roomId, true);
    });
  };

  const joinRoom = () => {
    if (!name || !roomId) return alert('请输入昵称和房间号');
    const socket = connect();
    socket.emit('joinRoom', { roomId, playerName: name });
    
    // 等待服务器响应状态更新，作为加入成功的标志
    socket.once('updateGameState', () => {
        onJoin(socket, roomId, false);
    });
    socket.on('error', (msg) => alert(msg));
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700">
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
    </div>
  );
}

