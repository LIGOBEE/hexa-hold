import React from 'react';
import Die from './Die';

const HandGuide: React.FC = () => {
  const ranks = [
    { name: "五条 (Five of a Kind)", dice: [6,6,6,6,6], score: "100" },
    { name: "四条 (Four of a Kind)", dice: [5,5,5,5], score: "90" },
    { name: "葫芦 (Full House)", dice: [4,4,4,2,2], score: "80" },
    { name: "六连顺 (Six Straight)", dice: [1,2,3,4,5,6], score: "75" },
    { name: "五顺 (Straight)", dice: [2,3,4,5,6], score: "70" },
    { name: "三条 (Three of a Kind)", dice: [3,3,3], score: "60" },
    { name: "两对 (Two Pair)", dice: [4,4,2,2], score: "50" },
    { name: "一对 (One Pair)", dice: [1,1], score: "40" },
    { name: "高牌 (High Die)", dice: [6], score: "10" },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900/90 overflow-y-auto">
      <div className="p-4 border-b border-slate-700 bg-slate-900 sticky top-0 z-10">
        <h3 className="text-amber-400 font-bold flex items-center gap-2">
          <span>📜</span> 牌型说明书
        </h3>
        <p className="text-xs text-slate-500 mt-1">从大到小排列</p>
      </div>
      <div className="p-2 space-y-1">
        {ranks.map((r, idx) => (
          <div key={idx} className="p-2 rounded hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700 group">
            <div className="flex justify-between items-center mb-1">
              <span className={`text-xs font-bold ${idx < 3 ? 'text-amber-200' : 'text-slate-300'}`}>
                {r.name}
              </span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {r.dice.map((d, i) => (
                <Die key={i} value={d} size="xs" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 mt-auto text-[10px] text-slate-600 border-t border-slate-800">
        * 示例仅供参考，实际比较还需看点数大小
      </div>
    </div>
  );
};

export default HandGuide;