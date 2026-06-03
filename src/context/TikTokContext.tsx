import React, {
  createContext, useContext, useState, useEffect,
  ReactNode, useCallback, useRef
} from 'react';
import { toast } from 'sonner';

export type AppStatus = 'OFFLINE' | 'WAIT' | 'LIVE';

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
  appStatus: AppStatus;
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
  const [appStatus, setAppStatus] = useState<AppStatus>('OFFLINE');
  const [roomUser, setRoomUser] = useState(() => {
    const saved = localStorage.getItem('aclass_last_tiktok_user');
    if (saved) return saved;
    try {
      const userStr = localStorage.getItem('aclass_user');
      const user = userStr ? JSON.parse(userStr) : null;
      return user?.tiktok_username || '';
    } catch { return ''; }
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectedRef = useRef(false);

  const [giftLogs, setGiftLogs] = useState<LogEntry[]>([]);
  const [commentLogs, setCommentLogs] = useState<LogEntry[]>([]);
  const [likeLogs, setLikeLogs] = useState<LogEntry[]>([]);
  const [followLogs, setFollowLogs] = useState<LogEntry[]>([]);
  const [systemLogs, setSystemLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<RoomStats>({ viewerCount: 0, likeCount: 0 });
  const isConnectingRef = useRef(false);
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
    setSystemLogs(prev => [...prev.slice(-50), {
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString(),
      user: 'SYSTEM',
      message,
      type: 'system' as const,
    }]);
  }, []);

  const addSystemLogRef = useRef(addSystemLog);
  const clearLogsRef = useRef(clearLogs);
  useEffect(() => { addSystemLogRef.current = addSystemLog; }, [addSystemLog]);
  useEffect(() => { clearLogsRef.current = clearLogs; }, [clearLogs]);

  const connect = async (username: string) => {
    if (!window.electron) return;
    if (isConnectingRef.current) return; // ✅ กัน double call
    isConnectingRef.current = true;

    setIsConnecting(true);
    setConnected(false);
    setHasFirstEvent(false);
    setAppStatus('WAIT');
    connectedRef.current = false;

    const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
    setRoomUser(cleanUsername);
    localStorage.setItem('aclass_last_tiktok_user', cleanUsername);

    clearLogs();
    addSystemLog(`Checking login status for: ${cleanUsername}...`);

    try {
      const storedActiveId = localStorage.getItem('aclass_active_order_id');
      const activeOrderId = (storedActiveId && storedActiveId !== 'undefined' && storedActiveId !== 'null')
        ? storedActiveId : null;

      if (!activeOrderId) {
        addSystemLog('❌ Please activate a game (Power ON) before connecting.');
        toast.error('Please activate a game before connecting.');
        setIsConnecting(false);
        setAppStatus('OFFLINE');
        return;
      }

      let session: any = null;
      const savedSession = localStorage.getItem('aclass_tiktok_session');
      if (savedSession) {
        try { session = JSON.parse(savedSession); } catch { }
      }

      if (!session?.sessionid || !session?.idc) {
        addSystemLog('No session found. Opening TikTok login window...');
        session = await window.electron.invoke('tiktok:login');
        if (session?.sessionid) {
          addSystemLog('TikTok login successful ✅');
          localStorage.setItem('aclass_tiktok_session', JSON.stringify(session));
        } else {
          addSystemLog('Login cancelled ❌');
          setIsConnecting(false);
          setAppStatus('OFFLINE');
          return;
        }
      }

      addSystemLog(`Connecting to Live @${cleanUsername}...`);
      const token = localStorage.getItem('aclass_token');
      window.electron.send('tiktok:connect', {
        username: cleanUsername,
        sessionId: session.sessionid,
        idc: session.idc,
        token,
        orderId: activeOrderId,
      });

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (!connectedRef.current) {
          isConnectingRef.current = false; // ✅
          setIsConnecting(false);
          setAppStatus('OFFLINE');
          addSystemLogRef.current('Connection timed out ❌');
        }
      }, 60000);
    } catch (err: any) {
      isConnectingRef.current = false; // ✅
      addSystemLog(`Error: ${err?.message || String(err)}`);
      setIsConnecting(false);
      setAppStatus('OFFLINE');
    }
  };

  const disconnect = () => {
    if (!window.electron) return;
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    connectedRef.current = false; // ← เพิ่ม
    setConnected(false);
    setHasFirstEvent(false);
    setAppStatus('OFFLINE');
    addSystemLog('Disconnecting...');
    window.electron.send('tiktok:disconnect');
  };

  // ─── Listeners — mount once ───────────────────────────────────────────────
  useEffect(() => {
    if (!window.electron) return;

    const removeStatus = window.electron.on('tiktok:status', (data: any) => {
      isConnectingRef.current = false;
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }

      const wasConnected = connectedRef.current;
      setConnected(data.connected);
      connectedRef.current = data.connected;
      setIsConnecting(false);
      setAppStatus(data.state ?? (data.connected ? 'LIVE' : 'OFFLINE'));

      addSystemLogRef.current(data.message || (data.connected ? 'Connected' : 'Disconnected'));

      if (data.connected) {
        const match = data.message?.match(/@([a-zA-Z0-9._-]+)/);
        if (match) setRoomUser(match[1]);
      } else {
        if (data.message?.includes('expired') || data.message?.includes('cookie') || data.message?.includes('sid')) {
          localStorage.removeItem('aclass_tiktok_session');
          addSystemLogRef.current('Session may have expired. Please reconnect.');
        }
      }
    });

    const removeStats = window.electron.on('tiktok:stats', (data: any) => {
      setStats(prev => ({
        viewerCount: data.viewerCount ?? prev.viewerCount,
        likeCount: data.likeCount !== undefined
          ? Math.max(prev.likeCount, data.likeCount) : prev.likeCount,
      }));
    });

    const removeGift = window.electron.on('tiktok:gift', (data: any) => {
      if (!connectedRef.current) return;
      addSystemLogRef.current(`🎁 Gift received: ${data.giftName}`);
      setHasFirstEvent(true);
      setAppStatus('LIVE');
      const now = Date.now();
      const user = data.nickname || data.username;
      const entry: LogEntry = {
        id: now + Math.random(),
        time: new Date().toLocaleTimeString(),
        user,
        type: 'gift',
        message: '',
        giftName: data.giftName,
        count: data.repeatCount || 1,
      };
      setGiftLogs(prev => {
        for (let i = prev.length - 1; i >= 0; i--) {
          const last = prev[i];
          if (last.user === user && last.giftName === data.giftName && now - last.id < 3000) {
            const updated = [...prev];
            updated[i] = { ...last, count: Math.max(last.count || 1, data.repeatCount || 1) };
            return updated;
          }
        }
        return [...prev.slice(-100), entry];
      });
    });

    const removeChat = window.electron.on('tiktok:chat', (data: any) => {
      if (!connectedRef.current) return;
      // addSystemLogRef.current(`💬 Chat received from @${data.nickname || data.username}`);
      setHasFirstEvent(true);
      setAppStatus('LIVE');
      setCommentLogs(prev => [...prev.slice(-100), {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString(),
        user: data.nickname || data.username,
        type: 'comment' as const,
        message: data.comment || '',
      }]);
    });

    const removeLike = window.electron.on('tiktok:like', (data: any) => {
      if (!connectedRef.current) return;
      setHasFirstEvent(true);
      setAppStatus('LIVE');
      setLikeLogs(prev => [...prev.slice(-100), {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString(),
        user: data.nickname || data.username,
        type: 'like' as const,
        message: '',
        count: data.likeCount || 1,
      }]);
      if (data.totalLikeCount !== undefined) {
        setStats(prev => ({ ...prev, likeCount: Math.max(prev.likeCount, data.totalLikeCount) }));
      }
    });

    const removeFollow = window.electron.on('tiktok:follow', (data: any) => {
      if (!connectedRef.current) return;
      setHasFirstEvent(true);
      setAppStatus('LIVE');
      setFollowLogs(prev => [...prev.slice(-100), {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString(),
        user: data.nickname || data.username,
        type: 'follow' as const,
        message: 'followed',
      }]);
    });

    return () => {
      removeStatus?.(); removeStats?.();
      removeGift?.(); removeChat?.();
      removeLike?.(); removeFollow?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TikTokContext.Provider value={{
      connected, isConnecting, hasFirstEvent, appStatus,
      roomUser, setRoomUser,
      giftLogs, commentLogs, likeLogs, followLogs, systemLogs,
      stats, connect, disconnect,
    }}>
      {children}
    </TikTokContext.Provider>
  );
};

export const useTikTok = () => {
  const ctx = useContext(TikTokContext);
  if (!ctx) throw new Error('useTikTok must be used within TikTokProvider');
  return ctx;
};