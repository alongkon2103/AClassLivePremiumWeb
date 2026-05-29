import React, { useState, useEffect } from 'react';

const OverlayView: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [animType, setAnimType] = useState<'none' | 'bounce' | 'flash' | 'pulse'>('none');
  const [lastCount, setLastCount] = useState<number | null>(null);

  useEffect(() => {
    const loadSettings = () => {
      const saved = localStorage.getItem('aclass_overlay_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
        
        // Trigger animation if count changed
        if (lastCount !== null && parsed.winCount !== lastCount) {
          const type = parsed.winCount > lastCount ? 'bounce' : 'flash';
          setAnimType(type);
          setTimeout(() => setAnimType('none'), 500);
        }
        setLastCount(parsed.winCount);
      }
    };

    loadSettings();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'aclass_overlay_settings') {
        loadSettings();
      }
    };

    window.addEventListener('storage', handleStorage);
    // Polling as fallback for same-window updates or quick changes
    const interval = setInterval(loadSettings, 500);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [lastCount]);

  if (!settings) return null;

  const getNumberColor = () => {
    if (settings.winCount < 0) return settings.colorNeg;
    return settings.colorWin;
  };

  const getContainerStyle = (): React.CSSProperties => {
    const { background } = settings;
    let bg = background.color;
    if (background.gradient) {
      bg = `linear-gradient(135deg, ${background.color}, ${background.color2})`;
    }

    return {
      background: bg,
      opacity: background.opacity / 100,
      display: 'flex',
      flexDirection: settings.layout === 'vertical' ? 'column' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
      padding: '20px 40px',
      borderRadius: '20px',
      transition: 'all 0.3s ease'
    };
  };

  const getNumberStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {
      fontFamily: settings.fontFamily,
      fontSize: `${settings.fontSize}px`,
      fontWeight: settings.bold ? 'bold' : 'normal',
      color: getNumberColor(),
      lineHeight: 1,
      transition: 'all 0.3s ease',
      transform: animType === 'bounce' ? 'scale(1.3)' : 'scale(1)',
      opacity: animType === 'flash' ? 0.3 : 1,
    };

    if (settings.outline.enabled) {
      const { color, size } = settings.outline;
      style.textShadow = `
        -${size}px -${size}px 0 ${color},  
         ${size}px -${size}px 0 ${color},
        -${size}px  ${size}px 0 ${color},
         ${size}px  ${size}px 0 ${color}
      `;
    }

    return style;
  };

  const getLabelStyle = (): React.CSSProperties => ({
    fontFamily: settings.fontFamily,
    fontSize: `${settings.fontSize * 0.4}px`,
    fontWeight: settings.bold ? 'bold' : 'normal',
    color: settings.colorLabel,
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    opacity: 0.8
  });

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-transparent overflow-hidden" style={{ background: 'transparent !important' }}>
      <div style={getContainerStyle()}>
        <div style={getNumberStyle()}>
          {settings.winCount}
          {settings.showMax && (
            <span style={{ fontSize: '0.5em', opacity: 0.5, marginLeft: '10px' }}>
              / {settings.maxWins}
            </span>
          )}
        </div>
        
        {settings.showLabel && (
          <div style={getLabelStyle()}>
            {settings.label}
          </div>
        )}
      </div>

      <style>
        {`
          body { background: transparent !important; margin: 0; padding: 0; overflow: hidden; }
        `}
      </style>
    </div>
  );
};

export default OverlayView;
