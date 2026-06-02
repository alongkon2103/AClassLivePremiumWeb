import React, { useState, useEffect, useRef } from 'react';
import {
  WifiOff, Gift, MessageSquare, Heart,
  UserPlus, Loader2, Terminal, Users, Radio,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { announcementApi, authApi } from '../services/api';
import { useTikTok, LogEntry } from '../context/TikTokContext';
import { interactiveApi } from '../services/api';

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  label: string; value: number | string;
  icon: React.ReactNode; accent: string;
}> = ({ label, value, icon, accent }) => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border"
    style={{ background: `${accent}0d`, borderColor: `${accent}22` }}>
    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
      style={{ background: `${accent}18`, color: accent }}>
      {icon}
    </div>
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: `${accent}99` }}>
        {label}
      </div>
      <div className="text-lg font-black font-mono leading-none" style={{ color: accent }}>
        {value}
      </div>
    </div>
  </div>
);

// ─── Log Panel ────────────────────────────────────────────────────────────────
const LOG_COLORS: Record<string, { accent: string; dimAccent: string }> = {
  gift:    { accent: '#a78bfa', dimAccent: '#a78bfa66' },
  comment: { accent: '#60a5fa', dimAccent: '#60a5fa66' },
  like:    { accent: '#f472b6', dimAccent: '#f472b666' },
  follow:  { accent: '#fbbf24', dimAccent: '#fbbf2466' },
  system:  { accent: '#6b7280', dimAccent: '#6b728066' },
};

const LogPanel: React.FC<{
  type: 'gift' | 'comment' | 'like' | 'follow' | 'system';
  title: string; icon: React.ReactNode;
  logs: LogEntry[]; scrollRef: React.RefObject<HTMLDivElement>;
  renderLine: (log: LogEntry) => React.ReactNode;
}> = ({ type, title, icon, logs, scrollRef, renderLine }) => {
  const { accent, dimAccent } = LOG_COLORS[type];
  return (
    <div className="flex flex-col rounded-2xl overflow-hidden h-full"
      style={{ background: '#0d0d14', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2" style={{ color: accent }}>
          {icon}
          <span className="text-[10px] font-black uppercase tracking-widest">{title}</span>
        </div>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${accent}18`, color: accent }}>
          {logs.length}
        </span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: dimAccent }}>Waiting…</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id}
              className="flex gap-2 px-2 py-1 rounded-lg font-mono text-[10px] transition-colors"
              onMouseEnter={e => (e.currentTarget.style.background = `${accent}0a`)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <span className="shrink-0 opacity-30" style={{ color: accent }}>[{log.time}]</span>
              {renderLine(log)}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    connected, isConnecting, appStatus,
    roomUser, setRoomUser,
    giftLogs, commentLogs, likeLogs, followLogs, systemLogs,
    stats,
    connect, disconnect,
  } = useTikTok();

  useEffect(() => {
    const userStr = localStorage.getItem('aclass_user');
    if (!userStr || userStr === 'undefined' || userStr === 'null') {
      navigate('/login');
    }
  }, [navigate]);

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const currentUser = authApi.getCurrentUser();
  const giftRef    = useRef<HTMLDivElement>(null);
  const commentRef = useRef<HTMLDivElement>(null);
  const likeRef    = useRef<HTMLDivElement>(null);
  const followRef  = useRef<HTMLDivElement>(null);
  const systemRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomUser && currentUser?.tiktok_username) {
      setRoomUser(currentUser.tiktok_username);
    }
  }, [currentUser, roomUser, setRoomUser]);

  const scrollToBottom = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  };

  useEffect(() => { announcementApi.getAnnouncements().then(res => setAnnouncements(res.data)).catch(() => {}); }, []);
  useEffect(() => scrollToBottom(giftRef),    [giftLogs]);
  useEffect(() => scrollToBottom(commentRef), [commentLogs]);
  useEffect(() => scrollToBottom(likeRef),    [likeLogs]);
  useEffect(() => scrollToBottom(followRef),  [followLogs]);
  useEffect(() => scrollToBottom(systemRef),  [systemLogs]);

  const handleConnectToggle = async () => {
    if (isConnecting) return;
    if (connected) { disconnect(); return; }
    if (!roomUser) return;

    localStorage.setItem('aclass_last_tiktok_user', roomUser);

    const activeOrderId = localStorage.getItem('aclass_active_order_id');
    if (activeOrderId) {
      try {
        await interactiveApi.registerSession(activeOrderId, roomUser);
      } catch (err) {
        console.warn('registerSession failed:', err);
      }
    }

    connect(roomUser);
  };

  // ─── Status pill style & label ────────────────────────────────────────────
  const statusStyle =
    appStatus === 'LIVE'
      ? { background: 'rgba(52,211,153,0.1)',  color: '#34d399', border: '1px solid rgba(52,211,153,0.2)'  }
      : appStatus === 'WAIT'
        ? { background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }
        : { background: 'rgba(255,255,255,0.04)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.08)' };

  const statusLabel =
    appStatus === 'LIVE' ? <><Radio size={11} className="animate-pulse" /> Live</> :
    appStatus === 'WAIT' ? <><Loader2 size={11} className="animate-spin" /> Wait…</> :
    isConnecting         ? <><Loader2 size={11} className="animate-spin" /> Linking…</> :
                           <><WifiOff size={11} /> Offline</>;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#08080c]">

      {/* ── Top Bar ── */}
      <div className="shrink-0 px-6 py-3 flex items-center gap-4 justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Connect input */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl"
            style={{ background: '#0d0d14', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-[11px] font-bold text-text3 pl-1">@</span>
            <input
              type="text"
              placeholder="tiktok_username"
              value={roomUser}
              onChange={e => setRoomUser(e.target.value)}
              disabled={isConnecting || connected}
              onKeyDown={e => e.key === 'Enter' && handleConnectToggle()}
              className="bg-transparent outline-none text-sm font-bold w-44 placeholder:text-text3/40 disabled:opacity-50"
            />
            <button
              onClick={handleConnectToggle}
              disabled={isConnecting || (!connected && !roomUser)}
              className="h-7 px-4 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40"
              style={connected
                ? { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }
                : { background: 'var(--color-brand)', color: '#fff' }
              }
            >
              {isConnecting
                ? <Loader2 size={12} className="animate-spin" />
                : connected ? 'OFF' : 'ON'
              }
            </button>
          </div>

          {/* ✅ Status pill — ใช้ appStatus โดยตรง */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            style={statusStyle}>
            {statusLabel}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3">
          <StatCard label="Gifts"   value={giftLogs.length}   icon={<Gift  size={14} />} accent="#a78bfa" />
          <StatCard label="Likes"   value={stats.likeCount}   icon={<Heart size={14} />} accent="#f472b6" />
          <StatCard label="Viewers" value={stats.viewerCount} icon={<Users size={14} />} accent="#34d399" />
        </div>

        {/* User */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl"
          style={{ background: '#0d0d14', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-7 h-7 rounded-lg bg-brand/20 flex items-center justify-center text-brand font-black text-xs">
            {(currentUser?.username || 'G')[0].toUpperCase()}
          </div>
          <div>
            <div className="text-[10px] text-text3 font-bold uppercase tracking-widest leading-none">Account</div>
            <div className="text-xs font-bold leading-tight">{currentUser?.username || 'Guest'}</div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">

        {/* Left sidebar — Console */}
        <div className="w-56 flex flex-col gap-3 shrink-0">
          <div className="flex flex-col rounded-2xl overflow-hidden flex-1"
            style={{ background: '#0d0d14', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 px-3 py-2.5 shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <Terminal size={12} className="text-text3" />
              <span className="text-[10px] font-black uppercase tracking-widest text-text3">Console</span>
            </div>
            <div ref={systemRef} className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
              {systemLogs.length === 0
                ? <p className="text-[9px] text-text3/30 font-mono p-1">No output</p>
                : systemLogs.map(log => (
                  <div key={log.id} className="font-mono text-[9px] text-text3/60 leading-tight px-1 py-0.5">
                    <span className="opacity-40">[{log.time}]</span> {log.message}
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {/* 2×2 Log Grid */}
        <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3 overflow-hidden">
          <LogPanel
            type="gift" title="Gifts" icon={<Gift size={12} />}
            logs={giftLogs} scrollRef={giftRef}
            renderLine={log => (
              <>
                <span className="font-bold shrink-0" style={{ color: '#a78bfa' }}>{log.user}</span>
                <span className="text-white/40 mx-1">→</span>
                <span className="text-white/70">{log.giftName}</span>
                <span className="ml-auto font-bold shrink-0" style={{ color: '#a78bfa' }}>×{log.count}</span>
              </>
            )}
          />
          <LogPanel
            type="comment" title="Comments" icon={<MessageSquare size={12} />}
            logs={commentLogs} scrollRef={commentRef}
            renderLine={log => (
              <>
                <span className="font-bold shrink-0" style={{ color: '#60a5fa' }}>{log.user}</span>
                <span className="text-white/40 mx-1">:</span>
                <span className="text-white/80 whitespace-pre-wrap">{log.message}</span>
              </>
            )}
          />
          <LogPanel
            type="like" title="Likes" icon={<Heart size={12} />}
            logs={likeLogs} scrollRef={likeRef}
            renderLine={log => (
              <>
                <span className="font-bold shrink-0" style={{ color: '#f472b6' }}>{log.user}</span>
                <span className="text-white/40 mx-1">×</span>
                <span className="font-bold" style={{ color: '#f472b6' }}>{log.count}</span>
              </>
            )}
          />
          <LogPanel
            type="follow" title="Follows" icon={<UserPlus size={12} />}
            logs={followLogs} scrollRef={followRef}
            renderLine={log => (
              <>
                <span className="font-bold shrink-0" style={{ color: '#fbbf24' }}>{log.user}</span>
                <span className="text-white/30 mx-1">followed</span>
              </>
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;