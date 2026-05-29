import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import axios from 'axios';
import { userApi, presetApi, announcementApi, gameApi, giftApi, authApi } from '../services/api';
import { Loader2 } from 'lucide-react';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  BANNED = 'BANNED',
  SUSPENDED = 'SUSPENDED'
}

export enum RuleEvent {
  GIFT = 'GIFT',
  LIKE = 'LIKE',
  FOLLOW = 'FOLLOW',
  SHARE = 'SHARE',
  COMMENT = 'COMMENT'
}

export enum RuleAction {
  KEY_PRESS = 'KEY_PRESS',
  RCON_COMMAND = 'RCON_COMMAND',
  SOUND_PLAY = 'SOUND_PLAY',
  WIN_COUNTER = 'WIN_COUNTER',
  SPIN_WHEEL = 'SPIN_WHEEL'
}

export interface UserAccount {
  id: string;
  username: string | null;
  email: string;
  avatar: string | null;
  hwid: string | null;
  nativeStatus: string;
  role: string;
  nativeExpiry?: string;
  lastSeen?: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface PresetRule {
  id: string;
  presetId: string;
  event: RuleEvent;
  condition: any; // JSON
  action: RuleAction;
  key?: string;
  sound?: string;
  volume: number;
  duration?: string;
}

export interface Game {
  id: string;
  name: string;
  description?: string;
}

export interface CloudPreset {
  id: string;
  name: string;
  description: string;
  rules: PresetRule[];
  isDefault: boolean;
  gameId: string;
  createdAt: string;
}

export interface TikTokGift {
  id: number;
  name: string;
  image_url?: string;
  diamonds: number;
  trigger_type?: string;
}

export interface UserPreset {
  id: string;
  userId: string;
  presetId: string;
  isActive: boolean;
  sourcePresetId: string | null;
  createdAt: string;
  preset: CloudPreset;
}

interface AdminContextType {
  announcements: Announcement[];
  presets: CloudPreset[];
  myPresets: UserPreset[];
  games: Game[];
  gifts: TikTokGift[];
  loading: boolean;
  activePresetId: string | null;
  setActivePresetId: (id: string | null) => void;
  refreshData: () => Promise<void>;
  fetchMyPresets: () => Promise<void>;
  adoptPreset: (id: string) => Promise<void>;
  forkPreset: (id: string) => Promise<void>;
  activatePreset: (userPresetId: string) => Promise<void>;
  addPreset: (preset: any) => Promise<any>;
  updatePreset: (id: string, data: any) => Promise<void>;
  deletePreset: (id: string) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [presets, setPresets] = useState<CloudPreset[]>([]);
  const [myPresets, setMyPresets] = useState<UserPreset[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [gifts, setGifts] = useState<TikTokGift[]>([]);
  const [loading, setLoading] = useState(false);
  const [activePresetId, setActivePresetIdState] = useState<string | null>(() => localStorage.getItem('aclass_active_preset_id'));

  const setActivePresetId = (id: string | null) => {
    setActivePresetIdState(id);
    if (id) localStorage.setItem('aclass_active_preset_id', id);
    else localStorage.removeItem('aclass_active_preset_id');
  };

  const fetchMyPresets = useCallback(async () => {
    try {
      const res = await presetApi.getMyPresets();
      setMyPresets(res.data);
    } catch (e) {
      console.error('Failed to fetch my presets:', e);
    }
  }, []);

  const refreshData = useCallback(async () => {
    const currentUser = authApi.getCurrentUser();
    if (!currentUser) return;

    setLoading(true);
    try {
      const promises: Promise<any>[] = [
        presetApi.getPresets(),
        announcementApi.getAnnouncements(false), 
        gameApi.getGames(),
        giftApi.getGifts(),
        presetApi.getMyPresets()
      ];

      const results = await Promise.all(promises);
      
      setPresets(results[0].data);
      setAnnouncements(results[1].data);
      setGames(results[2].data);
      setGifts(results[3].data);
      setMyPresets(results[4].data);
    } catch (error) {
      console.error('Failed to fetch store data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('aclass_token');
    
    const triggerHeartbeat = async (status: 'online' | 'offline' = 'online') => {
      const token = localStorage.getItem('aclass_token');
      if (token) {
        try {
          if (status === 'offline') {
            // Use fetch with keepalive for more reliability during close
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            fetch(`${apiUrl}/auth/heartbeat`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ status: 'offline' }),
              keepalive: true
            }).catch(() => {});
          } else {
            // Send heartbeat to local API (3001) only
            const res = await authApi.heartbeat(status);
            
            if (res.data && res.data.action === 'forced_logout') {
              console.log('Forced logout triggered by admin');
              localStorage.removeItem('aclass_token');
              localStorage.removeItem('aclass_user');
              localStorage.removeItem('aclass_active_order_id');
              localStorage.removeItem('aclass_tiktok_session');
              window.location.href = '/login?error=' + encodeURIComponent(res.data.message || 'You have been kicked by administrator.');
            }
          }
        } catch (e) {
          console.error(`Heartbeat (${status}) failed`, e);
        }
      }
    };

    if (token) {
      refreshData();
      triggerHeartbeat('online'); // Trigger immediate heartbeat
    }
    
    // Heartbeat for online status (runs every 30 seconds to avoid server spam)
    const heartbeatInterval = setInterval(() => triggerHeartbeat('online'), 30000);

    const handleBeforeUnload = () => {
      // Try to send offline status before closing
      // Using navigator.sendBeacon would be better but our API is JSON-based
      // In Electron, this usually works for quick API calls
      triggerHeartbeat('offline');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'aclass_token' || e.key === 'aclass_user' || e.key === null) {
        if (localStorage.getItem('aclass_token')) {
          refreshData();
          triggerHeartbeat('online');
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(heartbeatInterval);
      triggerHeartbeat('offline');
    };
  }, [refreshData]);

  const adoptPreset = async (id: string) => { await presetApi.adoptPreset(id); await refreshData(); };
  const forkPreset = async (id: string) => { await presetApi.forkPreset(id); await refreshData(); };
  const activatePreset = async (userPresetId: string) => { await presetApi.activatePreset(userPresetId); await refreshData(); };

  const addPreset = async (data: any) => { 
    const res = await presetApi.createPreset(data); 
    await refreshData(); 
    return res.data; 
  };
  const updatePreset = async (id: string, data: any) => { 
    await presetApi.updatePreset(id, data); 
    // Usually we update local state or refresh
  };
  
  const deletePreset = async (id: string) => { await presetApi.deletePreset(id); await refreshData(); };

  const isLoginPage = window.location.pathname === '/login' || window.location.pathname === '/';

  return (
    <AdminContext.Provider value={{
      announcements, presets, myPresets, games, gifts, loading,
      activePresetId, setActivePresetId,
      refreshData, fetchMyPresets,
      adoptPreset, forkPreset, activatePreset,
      addPreset, updatePreset, deletePreset
    }}>
      {children}
      {loading && presets.length === 0 && !isLoginPage && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-300">
           <div className="bg-surface border border-border p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-brand" size={40} />
              <div className="flex flex-col items-center">
                <span className="text-white font-bold tracking-tight uppercase text-sm">Syncing Cloud Data</span>
                <span className="text-text3 text-[10px] font-bold uppercase tracking-widest">A Class Store Pro Infrastructure</span>
              </div>
           </div>
        </div>
      )}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within AdminProvider');
  return context;
};
