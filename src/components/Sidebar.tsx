import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Layers,
  LayoutGrid,
  Gamepad2,
  Monitor,
  LogOut,
  User as UserIcon,
  Radio,
  WifiOff,
  Loader2,
  Gift,
  Heart,
  ShoppingBag,
  Zap,
  Megaphone,
  Languages,
} from 'lucide-react';
import { useTikTok } from '../context/TikTokContext';

const TikTokIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
  </svg>
);

const Sidebar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { connected, isConnecting, hasFirstEvent, roomUser, giftLogs, likeLogs, disconnect } = useTikTok();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  let user = null;
  try {
    const userJson = localStorage.getItem('aclass_user');
    user = userJson ? JSON.parse(userJson) : null;
  } catch (e) {
    console.error('Failed to parse user from localStorage', e);
  }

  const navItems = [
    { name: t('sidebar.announcements'), path: '/announcements', icon: <Megaphone size={18} /> },
    { name: t('sidebar.home'), path: '/dashboard', icon: <TikTokIcon size={18} /> },
    { name: t('sidebar.interactive'), path: '/interactive', icon: <ShoppingBag size={18} /> },
    { name: t('sidebar.interactive_map'), path: '/interactive-mapping', icon: <Zap size={18} /> },
    { name: t('sidebar.stream_overlay'), path: '/stream-overlay', icon: <Monitor size={18} /> },
  ];

  const handleLogout = () => {
    localStorage.removeItem('aclass_token');
    localStorage.removeItem('aclass_user');
    window.location.href = '/#/login';
  };

  const dotColor = connected && hasFirstEvent
    ? 'bg-green'
    : connected && !hasFirstEvent
      ? 'bg-amber'
      : isConnecting
        ? 'bg-amber'
        : null;

  const statusLabel = connected && hasFirstEvent
    ? t('sidebar.connected')
    : connected && !hasFirstEvent
      ? 'Wait…'
      : isConnecting
        ? t('sidebar.linking')
        : t('sidebar.offline');

  const statusIcon = connected && hasFirstEvent
    ? <Radio size={11} style={{ color: 'var(--brand)' }} className="animate-pulse" />
    : connected && !hasFirstEvent
      ? <Loader2 size={11} className="text-amber animate-spin" />
      : isConnecting
        ? <Loader2 size={11} className="text-text3 animate-spin" />
        : <WifiOff size={11} className="text-text3" />;

  const statusTextColor = connected && hasFirstEvent
    ? ''
    : connected && !hasFirstEvent
      ? 'text-amber'
      : isConnecting
        ? 'text-text3'
        : 'text-text3';

  const cardStyle = connected && hasFirstEvent ? {
    borderColor: 'color-mix(in srgb, var(--brand) 20%, transparent)',
    background: 'color-mix(in srgb, var(--brand) 5%, transparent)',
  } : connected && !hasFirstEvent ? {
    borderColor: 'color-mix(in srgb, var(--amber) 20%, transparent)',
    background: 'color-mix(in srgb, var(--amber) 5%, transparent)',
  } : isConnecting ? {
    borderColor: 'color-mix(in srgb, var(--brand) 15%, transparent)',
    background: 'color-mix(in srgb, var(--brand) 5%, transparent)',
  } : {};

  return (
    <div className="w-[200px] h-full bg-surface border-r border-border flex flex-col">
      <div className="p-6 flex flex-col items-center gap-4">
        <img
          src="/assets/AClassStoreLogo.png"
          alt="Logo"
          className="w-16 h-16 object-contain"
        />
        <div className="relative text-center py-1">
          <div className="absolute inset-0 bg-brand/10 blur-xl opacity-40" />
          <h6 className="relative text-[24px] leading-[0.95] font-black italic uppercase tracking-[0.14em]">
            <span className="bg-gradient-to-b from-white via-white to-brand bg-clip-text text-transparent">
              Premium
            </span>
            <br />
            <span className="bg-gradient-to-b from-brand to-white bg-clip-text text-transparent">
              Live
            </span>
          </h6>
          <p className="mt-2 text-[8px] uppercase tracking-[0.35em] text-white/30 font-medium">
            Exclusive Access
          </p>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
              ${isActive
                ? 'bg-brand/10 text-brand font-medium'
                : 'text-text2 hover:bg-surface2 hover:text-text'}
            `}
          >
            {item.icon}
            <span className="text-sm">{item.name}</span>
            {item.path === '/dashboard' && dotColor && (
              <span className={`ml-auto w-1.5 h-1.5 rounded-full animate-pulse ${dotColor}`} />
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── TikTok Status Card ─────────────────────────────── */}
      <div className="px-3 pb-3">
        <p className="text-[9px] font-bold uppercase tracking-widest text-text3 px-1 mb-2">
          {t('sidebar.tiktok_live')}
        </p>

        <div
          className="rounded-xl border overflow-hidden transition-all"
          style={cardStyle}
        >
          {/* Status header */}
          <div className="flex items-center gap-2 px-3 py-2 ">
            {statusIcon}
            <span
              className={`text-[9px] font-black uppercase tracking-widest ${statusTextColor}`}
              style={connected && hasFirstEvent ? { color: 'var(--brand)' } : {}}
            >
              {statusLabel}
            </span>
            {dotColor && (
              <span className={`ml-auto w-1.5 h-1.5 rounded-full animate-pulse ${dotColor}`} />
            )}
          </div>

          {/* Username */}
          <div className="px-3 py-2">
            <p
              className={`text-[11px] font-mono font-medium truncate ${connected || isConnecting ? '' : 'text-text3 italic'}`}
              style={connected || isConnecting ? { color: 'var(--brand)' } : {}}
            >
              {connected || isConnecting ? `@${roomUser}` : t('sidebar.not_connected')}
            </p>
          </div>

          {/* Disconnect button */}
          {connected && (
            <div className="px-2 pb-2 pt-0.5">
              <button
                onClick={disconnect}
                className="w-full py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95"
                style={{
                  color: 'var(--brand)',
                  background: 'color-mix(in srgb, var(--brand) 8%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--brand) 15%, transparent)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--brand) 15%, transparent)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--brand) 8%, transparent)')}
              >
                {t('sidebar.disconnect')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Language Switcher ─────────────────────────────── */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 p-1.5 bg-bg/50 border border-border rounded-xl">
          <div className="flex flex-1">
            <button
              onClick={() => changeLanguage('th')}
              className={`flex-1 text-[10px] font-black py-1 rounded-md transition-all ${i18n.language.startsWith('th') ? 'bg-brand text-white shadow-lg' : 'text-text3 hover:text-text2'}`}
            >
              TH
            </button>
            <button
              onClick={() => changeLanguage('en')}
              className={`flex-1 text-[10px] font-black py-1 rounded-md transition-all ${i18n.language.startsWith('en') ? 'bg-brand text-white shadow-lg' : 'text-text3 hover:text-text2'}`}
            >
              EN
            </button>
          </div>
        </div>
      </div>

      {/* ── User & Logout ──────────────────────────────────── */}
      <div className="p-4 border-t border-border space-y-4">
        <div className="flex items-center gap-3 p-2 bg-surface2 rounded-xl border border-border2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-pink flex items-center justify-center text-white overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={20} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate">{user?.username || 'Guest'}</div>
            <div className="text-[10px] text-text3 truncate uppercase">{user?.role || 'USER'}</div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 text-sm text-red hover:bg-red/10 rounded-lg transition-all w-full"
          >
            <LogOut size={18} />
            {t('sidebar.logout')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;