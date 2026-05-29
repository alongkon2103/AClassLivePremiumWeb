import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface HotkeyConfig { key: string; value?: number; }

export interface OverlaySettings {
  winEnabled: boolean;
  spinEnabled: boolean;
  winCount: number;
  maxWins: number;
  showMax: boolean;
  label: string;
  showLabel: boolean;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  colorWin: string;
  colorLose: string;
  colorLabel: string;
  colorNeg: string;
  allowNegative: boolean;
  spinChoices: string;
  spinSeq: number;
  spinResult: number;
  spinVolumeTick: number;
  spinVolumeWin: number;
  template: 'T1' | 'T2' | 'T3';
  hotkeys: {
    win: string;
    undo: string;
    reset: string;
    custom1: HotkeyConfig;
    custom2: HotkeyConfig;
    custom3: HotkeyConfig;
    spin: string;
  };
  outline: { enabled: boolean; color: string; size: number };
  layout: 'horizontal' | 'vertical';
  background: { opacity: number; color: string; gradient: boolean; color2: string };
}

export const DEFAULT_SETTINGS: OverlaySettings = {
  winEnabled: false,
  spinEnabled: false,
  winCount: 4,
  maxWins: 13,
  showMax: false,
  label: 'WIN',
  showLabel: true,
  fontFamily: 'Times New Roman',
  fontSize: 80,
  bold: true,
  colorWin: '#22c55e',
  colorLose: '#ef4444',
  colorLabel: '#ffffff',
  colorNeg: '#ef4444',
  allowNegative: false,
  spinChoices: '-7,-8,-7,+5',
  spinSeq: 0,
  spinResult: 0,
  spinVolumeTick: 0.2,
  spinVolumeWin: 0.5,
  template: 'T1',
  hotkeys: {
    win: 'F8',
    undo: 'F9',
    reset: 'F11',
    custom1: { key: '7', value: 5 },
    custom2: { key: '8', value: -5 },
    custom3: { key: '9', value: 10 },
    spin: 'F10'
  },
  outline: { enabled: false, color: '#000000', size: 8 },
  layout: 'horizontal',
  background: { opacity: 100, color: '#000000', gradient: false, color2: '#18181f' }
};

interface OverlayContextType {
  settings: OverlaySettings;
  updateSettings: (updates: Partial<OverlaySettings>) => void;
  resetSettings: () => void;
  triggerSpin: () => void;
  handleUndo: () => void;
  handleReset: () => void;
  handleQuickAdjust: (val: number) => void;
}

const OverlayContext = createContext<OverlayContextType | undefined>(undefined);

export const OverlayProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<OverlaySettings>(DEFAULT_SETTINGS);

  // Initial Load from Electron
  useEffect(() => {
    const loadInitialSettings = async () => {
      try {
        if (window.electron) {
          const loaded = await window.electron.invoke('settings:load');
          if (loaded && Object.keys(loaded).length > 0) {
            // Force enabled: false every time the app opens
            setSettings({ ...DEFAULT_SETTINGS, ...loaded, winEnabled: false, spinEnabled: false });
          }
        } else {
          const saved = localStorage.getItem('aclass_overlay_settings');
          if (saved) {
            const parsed = JSON.parse(saved);
            setSettings({ ...DEFAULT_SETTINGS, ...parsed, enabled: false });
          }
        }
      } catch (e) {
        console.error('Failed to initialize overlay settings', e);
      }
    };
    loadInitialSettings();
  }, []);

  // Listen for Real-time Updates from Electron
  useEffect(() => {
    if (!window.electron) return;

    const unbindUpdate = window.electron.on('settings:update', (newSettings: any) => {
      setSettings(prev => ({ ...prev, ...newSettings }));
    });

    const unbindHotkeySpin = window.electron.on('hotkey:spin-trigger', () => {
      // Need a way to trigger spin. We can dispatch a custom event or just update state directly.
      // Easiest is to dispatch the custom event since triggerSpin is wrapped in useCallback and depends on settings.
      window.dispatchEvent(new CustomEvent('trigger-spin'));
    });

    const unbindHotkey = window.electron.on('hotkey:win-adjust', (val: number | string | 'reset') => {
      setSettings(prev => {
        let newCount = prev.winCount;
        if (val === 'reset') {
          newCount = 0;
        } else {
          // Parse value as number (it might be a string from the UI)
          const numVal = typeof val === 'string' ? parseInt(val) : val;
          if (isNaN(numVal as number)) return prev;
          
          newCount = prev.allowNegative ? prev.winCount + (numVal as number) : Math.max(0, prev.winCount + (numVal as number));
        }
        
        const next = { ...prev, winCount: newCount };
        
        // Save back so other windows see the count change
        window.electron.send('settings:save', next);
        // Explicitly trigger storage event for local tabs
        localStorage.setItem('aclass_overlay_settings', JSON.stringify(next));
        window.dispatchEvent(new Event('storage'));
        
        return next;
      });
    });

    return () => {
      if (unbindUpdate) unbindUpdate();
      if (unbindHotkeySpin) unbindHotkeySpin();
      if (unbindHotkey) unbindHotkey();
    };
  }, []);

  const updateSettings = useCallback((updates: Partial<OverlaySettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      
      // Update local for instant feedback
      localStorage.setItem('aclass_overlay_settings', JSON.stringify(next));
      window.dispatchEvent(new Event('storage'));
      
      // Save to Electron (local JSON file)
      if (window.electron) {
        window.electron.send('settings:save', next);
      }
      
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    updateSettings(DEFAULT_SETTINGS);
  }, [updateSettings]);

  const triggerSpin = useCallback(() => {
    if (!settings.spinEnabled) return;

    const choices = settings.spinChoices.split(',').map(c => parseInt(c.trim())).filter(c => !isNaN(c));
    const result = choices.length > 0 ? choices[Math.floor(Math.random() * choices.length)] : 0;
    
    // 1. Trigger the spin animation
    updateSettings({
      spinSeq: (settings.spinSeq || 0) + 1,
      spinResult: result
    });

    // 2. Wait for animation to finish (approx 3s) then update the win counter
    setTimeout(() => {
      setSettings(prev => {
        const newCount = prev.allowNegative ? prev.winCount + result : Math.max(0, prev.winCount + result);
        const next = { ...prev, winCount: newCount };
        
        // Save and Broadcast
        window.electron?.send('settings:save', next);
        localStorage.setItem('aclass_overlay_settings', JSON.stringify(next));
        window.dispatchEvent(new Event('storage'));
        
        return next;
      });
    }, 3200); // 2.8s animation + buffer
  }, [settings.spinEnabled, settings.spinChoices, settings.spinSeq, updateSettings]);

  useEffect(() => {
    window.addEventListener('trigger-spin', triggerSpin as any);
    return () => {
      window.removeEventListener('trigger-spin', triggerSpin as any);
    };
  }, [triggerSpin]);

  const handleUndo = useCallback(() => {
    if (!settings.winEnabled) return;
    updateSettings({ 
      winCount: settings.allowNegative ? settings.winCount - 1 : Math.max(0, settings.winCount - 1) 
    });
  }, [settings.winEnabled, settings.allowNegative, settings.winCount, updateSettings]);

  const handleReset = useCallback(() => {
    if (!settings.winEnabled) return;
    updateSettings({ winCount: 0 });
  }, [settings.winEnabled, updateSettings]);

  const handleQuickAdjust = useCallback((val: number) => {
    if (!settings.winEnabled) return;
    updateSettings({ 
      winCount: settings.allowNegative ? settings.winCount + val : Math.max(0, settings.winCount + val) 
    });
  }, [settings.winEnabled, settings.allowNegative, settings.winCount, updateSettings]);

  return (
    <OverlayContext.Provider value={{
      settings,
      updateSettings,
      resetSettings,
      triggerSpin,
      handleUndo,
      handleReset,
      handleQuickAdjust
    }}>
      {children}
    </OverlayContext.Provider>
  );
};

export const useOverlay = () => {
  const context = useContext(OverlayContext);
  if (context === undefined) {
    throw new Error('useOverlay must be used within an OverlayProvider');
  }
  return context;
};



