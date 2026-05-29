import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export interface LogEntry {
  id: number;
  time: string;
  user: string;
  message: string;
  type: 'gift' | 'comment' | 'like' | 'follow' | 'system';
  count?: number;
  giftName?: string;
}

interface RoomStats {
  viewerCount: number;
  likeCount: number;
}

interface TikTokContextType {
  connected: boolean;
  isConnecting: boolean;
  hasFirstEvent: boolean;
  roomUser: string;
  setRoomUser: (user: string) => void;
  giftLogs: LogEntry[];
  commentLogs: LogEntry[];
  likeLogs: LogEntry[];
  followLogs: LogEntry[];
  systemLogs: LogEntry[];
  stats: RoomStats;
  connect: (username: string) => Promise<void>;
  disconnect: () => void;
}

const TikTokContext = createContext<TikTokContextType | undefined>(undefined);

export const TikTokProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasFirstEvent, setHasFirstEvent] = useState(false);
  const [roomUser, setRoomUser] = useState(() => {
    const saved = localStorage.getItem('aclass_last_tiktok_user');
    if (saved) return saved;
    try {
      const userStr = localStorage.getItem('aclass_user');
      const user = userStr ? JSON.parse(userStr) : null;
      return user?.tiktok_username || '';
    } catch (e) {
      return '';
    }
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [giftLogs, setGiftLogs] = useState<LogEntry[]>([]);
  const [commentLogs, setCommentLogs] = useState<LogEntry[]>([]);
  const [likeLogs, setLikeLogs] = useState<LogEntry[]>([]);
  const [followLogs, setFollowLogs] = useState<LogEntry[]>([]);
  const [systemLogs, setSystemLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<RoomStats>({ viewerCount: 0, likeCount: 0 });

  const connectedRef = useRef(connected);
  useEffect(() => { connectedRef.current = connected; }, [connected]);

  const clearLogs = useCallback(() => {
    setGiftLogs([]);
    setCommentLogs([]);
    setLikeLogs([]);
    setFollowLogs([]);
    setSystemLogs([]);
    setStats({ viewerCount: 0, likeCount: 0 });
  }, []);

  const addSystemLog = useCallback((message: string) => {
    const newEntry: LogEntry = {
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      user: 'SYSTEM',
      message,
      type: 'system'
    };
    setSystemLogs(prev => [...prev.slice(-50), newEntry]);
  }, []);

  const connect = async (username: string) => {
    if (!window.electron) return;

    setIsConnecting(true);
    setConnected(false);
    setHasFirstEvent(false);
    const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
    setRoomUser(cleanUsername);
    localStorage.setItem('aclass_last_tiktok_user', cleanUsername);

    clearLogs();
    addSystemLog(`Checking login status for: ${cleanUsername}...`);

    try {
      const storedActiveId = localStorage.getItem('aclass_active_order_id');
      const activeOrderId = (storedActiveId && storedActiveId !== 'undefined' && storedActiveId !== 'null') ? storedActiveId : null;

      if (!activeOrderId) {
        addSystemLog('❌ Please activate a game (Power ON) in Interactive Mapping before connecting to TikTok.');
        toast.error('Please activate a game before connecting.');
        setIsConnecting(false);
        return;
      }

      let session = null;
      const savedSession = localStorage.getItem('aclass_tiktok_session');
      if (savedSession) {
        try { session = JSON.parse(savedSession); } catch (e) { }
      }

      if (!session || !session.sessionid || !session.idc) {
        addSystemLog('No login session found. Opening TikTok login window...');
        session = await window.electron.invoke('tiktok:login');

        if (session && session.sessionid) {
          addSystemLog('TikTok login successful ✅');
          localStorage.setItem('aclass_tiktok_session', JSON.stringify(session));
        } else {
          addSystemLog('Login cancelled ❌');
          setIsConnecting(false);
          return;
        }
      }

      addSystemLog(`Connecting to Live @${cleanUsername}...`);
      const token = localStorage.getItem('aclass_token');
      window.electron.send('tiktok:connect', {
        username: cleanUsername,
        sessionId: session.sessionid,
        idc: session.idc,
        token: token,
        orderId: activeOrderId,
      });

      const timeout = setTimeout(() => {
        if (!connectedRef.current) {
          setIsConnecting(false);
          addSystemLog('Connection timed out ❌');
        }
      }, 30000);

      timeoutRef.current = timeout;

    } catch (err: any) {
      addSystemLog(`Error: ${err.message}`);
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (!window.electron) return;
    setHasFirstEvent(false);
    addSystemLog('Disconnecting...');
    window.electron.send('tiktok:disconnect');
  };

  // ─── FIX: Register listeners only once on mount, using stable refs ───────────
  // addSystemLog and clearLogs are useCallback with [] so they are stable,
  // but we still use refs to be safe and avoid any potential re-registration.
  const addSystemLogRef = useRef(addSystemLog);
  const clearLogsRef = useRef(clearLogs);
  useEffect(() => { addSystemLogRef.current = addSystemLog; }, [addSystemLog]);
  useEffect(() => { clearLogsRef.current = clearLogs; }, [clearLogs]);

  useEffect(() => {
    if (!window.electron) return;

    const removeStatusListener = window.electron.on('tiktok:status', (status: any) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      const wasConnected = connectedRef.current;
      setConnected(status.connected);
      setIsConnecting(false);

      if (status.connected) {
        addSystemLogRef.current(`Connected! (Room ID: ${status.roomId})`);
      } else {
        if (wasConnected) {
          clearLogsRef.current();
          setHasFirstEvent(false);
        }

        if (status.error) {
          addSystemLogRef.current(`Connection failed: ${status.error}`);
          if (
            status.error.includes('expired') ||
            status.error.includes('cookie') ||
            status.error.includes('sid')
          ) {
            localStorage.removeItem('aclass_tiktok_session');
            addSystemLogRef.current('TikTok session may have expired. Please reconnect.');
          }
        } else if (status.info) {
          addSystemLogRef.current(status.info);
        } else {
          addSystemLogRef.current('Disconnected.');
        }
      }
    });

    const removeStatsListener = window.electron.on('tiktok:stats', (newStats: any) => {
      setStats(prev => ({
        viewerCount: newStats.viewerCount ?? prev.viewerCount,
        likeCount: Math.max(prev.likeCount, newStats.likeCount ?? 0),
      }));
    });

    const removeEventListener = window.electron.on('tiktok:event', (event: any) => {
      const now = Date.now();
      const newEntry: LogEntry = {
        id: now,
        time: new Date().toLocaleTimeString(),
        user: event.data.uniqueId,
        // Normalise type: treat 'chat' as 'comment' for log consistency
        type: (event.type === 'chat' ? 'comment' : event.type) as LogEntry['type'],
        message: event.data.comment || '',
        giftName: event.data.giftName,
        count: event.data.repeatCount || event.data.likeCount || 1,
      };

      setHasFirstEvent(true);

      if (event.type === 'comment' || event.type === 'chat') {
        setCommentLogs(prev => [...prev.slice(-100), newEntry]);
      } else if (event.type === 'gift') {
        setGiftLogs(prev => {
          // ─── DEDUPLICATION LOGIC ───
          // Check if we have a very recent entry for the same user and gift
          const lastIdx = prev.findLastIndex(l => 
            l.user === event.data.uniqueId && 
            l.giftName === event.data.giftName
          );
          
          if (lastIdx >= 0) {
            const lastLog = prev[lastIdx];
            // If it's within 3 seconds, update the existing entry
            if (now - lastLog.id < 3000) {
              const updated = [...prev];
              updated[lastIdx] = {
                ...lastLog,
                count: Math.max(lastLog.count || 1, event.data.repeatCount || 1)
              };
              return updated;
            }
          }
          return [...prev.slice(-100), newEntry];
        });
      } else if (event.type === 'like') {
        setLikeLogs(prev => [...prev.slice(-100), newEntry]);
      } else if (
        event.type === 'follow' ||
        (event.type === 'social' && event.data.displayType?.includes('follow'))
      ) {
        setFollowLogs(prev => [...prev.slice(-100), newEntry]);
      }
    });

    // Cleanup: remove all listeners when this effect tears down (component unmount only,
    // since the dep array is empty — no accidental re-registration mid-session)
    return () => {
      if (removeStatusListener) removeStatusListener();
      if (removeStatsListener) removeStatsListener();
      if (removeEventListener) removeEventListener();
    };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← empty array: register once, clean up on unmount only

  return (
    <TikTokContext.Provider value={{
      connected, isConnecting, hasFirstEvent,
      roomUser, setRoomUser,
      giftLogs, commentLogs, likeLogs, followLogs, systemLogs,
      stats,
      connect, disconnect
    }}>
      {children}
    </TikTokContext.Provider>
  );
};

export const useTikTok = () => {
  const context = useContext(TikTokContext);
  if (!context) throw new Error('useTikTok must be used within TikTokProvider');
  return context;
};