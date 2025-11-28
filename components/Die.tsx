import React from 'react';

interface DieProps {
  value: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  isPlaceholder?: boolean;
}

const Die: React.FC<DieProps> = ({ value, size = 'md', className = '', isPlaceholder = false }) => {
  if (isPlaceholder) {
    return (
      <div 
        className={`bg-slate-800 border-2 border-slate-600 rounded-xl flex items-center justify-center shadow-inner
        ${size === 'xs' ? 'w-6 h-6 rounded' : size === 'sm' ? 'w-10 h-10' : size === 'md' ? 'w-16 h-16' : 'w-24 h-24'} ${className}`}
      >
        <span className="text-slate-500 text-2xl font-bold opacity-50">?</span>
      </div>
    );
  }

  // Size classes
  const sizeClasses = {
    xs: 'w-6 h-6 p-0.5 gap-0.5 rounded border',
    sm: 'w-10 h-10 p-1 gap-0.5 rounded-md border',
    md: 'w-16 h-16 p-2 gap-1 rounded-xl border-2 shadow-lg',
    lg: 'w-24 h-24 p-3 gap-2 rounded-2xl border-4 shadow-xl',
  };

  // Dot size
  const dotSize = size === 'xs' ? 'w-1 h-1' : size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4';

  // Face Color Logic
  // 1 is Red, 6 is Gold, others are standard White/Black
  const getFaceStyle = (val: number) => {
    switch (val) {
      case 1: return 'bg-red-50 border-red-200 text-red-600 shadow-red-900/20';
      case 6: return 'bg-amber-100 border-amber-300 text-amber-600 shadow-amber-900/20';
      default: return 'bg-white border-slate-300 text-slate-800 shadow-slate-900/20';
    }
  };

  const getDotColor = (val: number) => {
      switch(val) {
          case 1: return 'bg-red-500';
          case 6: return 'bg-amber-500';
          default: return 'bg-slate-800';
      }
  }

  // Grid positioning for dots (1-9 grid)
  const renderDots = (val: number) => {
    const dotClass = `${dotSize} rounded-full ${getDotColor(val)}`;
    
    // We can just create 9 cells and fill them invisibly or visibly
    const cells = [0,0,0, 0,0,0, 0,0,0]; // 0=empty, 1=dot
    
    if (val === 1) { cells[4] = 1; }
    if (val === 2) { cells[2] = 1; cells[6] = 1; }
    if (val === 3) { cells[2] = 1; cells[4] = 1; cells[6] = 1; }
    if (val === 4) { cells[0] = 1; cells[2] = 1; cells[6] = 1; cells[8] = 1; }
    if (val === 5) { cells[0] = 1; cells[2] = 1; cells[4] = 1; cells[6] = 1; cells[8] = 1; }
    if (val === 6) { cells[0] = 1; cells[2] = 1; cells[3] = 1; cells[5] = 1; cells[6] = 1; cells[8] = 1; }

    return (
      <div className="grid grid-cols-3 grid-rows-3 w-full h-full justify-items-center items-center">
        {cells.map((active, i) => (
          <div key={i} className={active ? dotClass : 'w-0 h-0'} />
        ))}
      </div>
    );
  };

  return (
    <div className={`flex items-center justify-center transition-all duration-300 ${sizeClasses[size]} ${getFaceStyle(value)} ${className}`}>
      {renderDots(value)}
    </div>
  );
};

export default Die;