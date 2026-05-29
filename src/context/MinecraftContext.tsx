import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';

interface MinecraftConfig {
  host: string;
  port: string;
  password: string;
  enabled: boolean;
}

interface MinecraftContextType {
  config: MinecraftConfig;
  updateConfig: (updates: Partial<MinecraftConfig>) => void;
  logs: any[];
  addLog: (log: any) => void;
  status: 'connected' | 'disconnected' | 'connecting';
  setStatus: (status: 'connected' | 'disconnected' | 'connecting') => void;
  sendCommand: (command: string) => Promise<string>;
}

const DEFAULT_CONFIG: MinecraftConfig = { host: '127.0.0.1', port: '25575', password: '', enabled: false };

const MinecraftContext = createContext<MinecraftContextType | undefined>(undefined);

export const MinecraftProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<MinecraftConfig>(DEFAULT_CONFIG);
  const [logs, setLogs] = useState<any[]>([]);
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  // Load from Electron on mount
  useEffect(() => {
    const loadInitialConfig = async () => {
      if (window.electron) {
        const settings = await window.electron.invoke('settings:load');
        if (settings && settings.minecraft) {
          setConfig({ ...DEFAULT_CONFIG, ...settings.minecraft });
        }
      } else {
        const saved = localStorage.getItem('aclass_minecraft_config');
        if (saved) setConfig(JSON.parse(saved));
      }
    };
    loadInitialConfig();
  }, []);

  // Listen for Real-time Updates from Electron
  useEffect(() => {
    if (!window.electron) return;

    const unbindUpdate = window.electron.on('settings:update', (newSettings: any) => {
      if (newSettings.minecraft) {
        setConfig(prev => ({ ...prev, ...newSettings.minecraft }));
      }
    });

    return () => {
      // Unbind if we had an unbind function
    };
  }, []);

  const updateConfig = useCallback((updates: Partial<MinecraftConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...updates };
      
      // Update local cache
      localStorage.setItem('aclass_minecraft_config', JSON.stringify(next));
      
      // Save to Electron
      if (window.electron) {
        window.electron.invoke('settings:load').then(currentSettings => {
          const updatedSettings = { ...currentSettings, minecraft: next };
          window.electron.send('settings:save', updatedSettings);
        });
      }

      return next;
    });
  }, []);

  const addLog = (log: any) => {
    setLogs(prev => [...prev.slice(-100), { ...log, time: new Date().toLocaleTimeString() }]);
  };

  const sendCommand = async (command: string) => {
    if (!config.enabled) return 'RCON is disabled';
    
    addLog({ type: 'sent', text: command });
    try {
      if (!window.electron) {
        throw new Error('Not running in Electron environment');
      }
      const response = await window.electron.invoke('rcon:send', {
        host: config.host,
        port: config.port,
        password: config.password,
        command
      });
      addLog({ type: 'received', text: response });
      return response;
    } catch (error: any) {
      addLog({ type: 'error', text: error.message || 'Failed to send RCON command' });
      throw error;
    }
  };

  return (
    <MinecraftContext.Provider value={{ config, updateConfig, logs, addLog, status, setStatus, sendCommand }}>
      {children}
    </MinecraftContext.Provider>
  );
};

export const useMinecraft = () => {
  const context = useContext(MinecraftContext);
  if (!context) throw new Error('useMinecraft must be used within MinecraftProvider');
  return context;
};
