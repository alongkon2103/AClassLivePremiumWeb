import React from 'react';

interface TitlebarProps {
  title?: string;
  showControls?: boolean;
}

const Titlebar: React.FC<TitlebarProps> = ({ title = "A Class Store Premium Live", showControls = true }) => {
  const handleMinimize = () => window.electron.send('window:minimize');
  const handleMaximize = () => window.electron.send('window:maximize');
  const handleClose = () => window.electron.send('window:close');

  return (
    <div className="h-10 bg-bg border-b border-[#1e1e28] flex items-center px-4 titlebar-drag select-none z-50">
      <div className="flex gap-2 no-drag">
        <div 
          onClick={handleClose}
          className="w-3.5 h-3.5 rounded-full bg-red cursor-pointer hover:opacity-80 transition-opacity" 
        />
        <div 
          onClick={handleMinimize}
          className="w-3.5 h-3.5 rounded-full bg-amber cursor-pointer hover:opacity-80 transition-opacity" 
        />
        <div 
          onClick={handleMaximize}
          className="w-3.5 h-3.5 rounded-full bg-green cursor-pointer hover:opacity-80 transition-opacity" 
        />
      </div>
      
      <div className="flex-1 flex justify-center items-center gap-2">
        <img src="/assets/AClassStoreLogo.png" alt="logo" className="w-4 h-4 object-contain" />
        <span className="text-xs font-semibold text-text2 uppercase tracking-widest">{title}</span>
      </div>
      
      {showControls && <div className="w-20" />}
    </div>
  );
};

export default Titlebar;
