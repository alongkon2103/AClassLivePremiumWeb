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
  ChevronDown,
  Check,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { useTikTok } from '../context/TikTokContext';
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_META,
  normalizeLocale,
  type SupportedLanguage,
} from '../i18n';

const TikTokIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
  </svg>
);

const Sidebar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { connected, isConnecting, hasFirstEvent, roomUser, giftLogs, likeLogs, disconnect } = useTikTok();

  const changeLanguage = (lng: SupportedLanguage) => {
    i18n.changeLanguage(lng);
  };

  const [langOpen, setLangOpen] = React.useState(false);
  const langRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!langOpen) return;
    const onClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [langOpen]);

  const currentLang: SupportedLanguage =
    normalizeLocale(i18n.language) ?? 'en';
  const currentMeta = LANGUAGE_META[currentLang];

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

  const [restartOpen, setRestartOpen] = React.useState(false);
  const [restarting, setRestarting] = React.useState(false);
  const [logoutOpen, setLogoutOpen] = React.useState(false);

  const handleRestart = async () => {
    if (restarting) return;
    setRestarting(true);
    try {
      const electron = (window as any)?.electron;
      if (electron?.invoke) {
        await electron.invoke('app:restart');
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error('[Restart] Failed:', err);
      setRestarting(false);
    }
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
          className="rounded-xl border border-border overflow-hidden transition-all"
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
        <p className="text-[9px] font-bold uppercase tracking-widest text-text3 px-1 mb-2 flex items-center gap-1.5">
          <Languages size={11} />
          {t('sidebar.language')}
        </p>
        <div className="relative" ref={langRef}>
          <button
            type="button"
            onClick={() => setLangOpen(o => !o)}
            className="w-full flex items-center gap-2 px-3 py-2 bg-bg/50 border border-border rounded-xl text-left text-xs font-bold hover:border-brand/40 transition-all"
            aria-haspopup="listbox"
            aria-expanded={langOpen}
          >
            <span className="text-base leading-none">{currentMeta.flag}</span>
            <span className="flex-1 truncate">{currentMeta.label}</span>
            <ChevronDown
              size={14}
              className={`text-text3 transition-transform ${langOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {langOpen && (
            <div
              role="listbox"
              className="absolute bottom-full left-0 right-0 mb-1 bg-surface2 border border-border rounded-xl shadow-2xl overflow-hidden z-50"
            >
              {SUPPORTED_LANGUAGES.map(code => {
                const meta = LANGUAGE_META[code];
                const active = code === currentLang;
                return (
                  <button
                    key={code}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      changeLanguage(code);
                      setLangOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-left transition-all ${
                      active
                        ? 'bg-brand/10 text-brand'
                        : 'text-text2 hover:bg-surface hover:text-text'
                    }`}
                  >
                    <span className="text-base leading-none">{meta.flag}</span>
                    <span className="flex-1 truncate">{meta.label}</span>
                    {active && <Check size={12} />}
                  </button>
                );
              })}
            </div>
          )}
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
            onClick={() => setRestartOpen(true)}
            className="flex items-center gap-3 px-3 py-2 text-sm text-text2 hover:bg-surface2 hover:text-text rounded-lg transition-all w-full"
          >
            <RotateCcw size={18} />
            {t('sidebar.restart')}
          </button>
          <button
            onClick={() => setLogoutOpen(true)}
            className="flex items-center gap-3 px-3 py-2 text-sm text-red hover:bg-red/10 rounded-lg transition-all w-full"
          >
            <LogOut size={18} />
            {t('sidebar.logout')}
          </button>
        </div>
      </div>

      {/* ── Logout Confirmation Modal ─────────────────────── */}
      {logoutOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in"
          onClick={() => setLogoutOpen(false)}
        >
          <div
            className="w-[90%] max-w-sm bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red/10 flex items-center justify-center">
                  <LogOut size={20} className="text-red" />
                </div>
                <h3 className="text-base font-bold text-text">
                  {t('sidebar.logout_title')}
                </h3>
              </div>
              <p className="text-sm text-text2 leading-relaxed">
                {t('sidebar.logout_message')}
              </p>
            </div>
            <div className="flex gap-2 p-4 border-t border-border bg-bg/30">
              <button
                onClick={() => setLogoutOpen(false)}
                className="flex-1 py-2 px-3 rounded-lg text-sm font-semibold text-text2 hover:bg-surface2 transition-all"
              >
                {t('sidebar.logout_cancel')}
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2 px-3 rounded-lg text-sm font-bold bg-red text-white hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={14} />
                {t('sidebar.logout_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Restart Confirmation Modal ────────────────────── */}
      {restartOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in"
          onClick={() => !restarting && setRestartOpen(false)}
        >
          <div
            className="w-[90%] max-w-sm bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber/10 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-amber" />
                </div>
                <h3 className="text-base font-bold text-text">
                  {t('sidebar.restart_title')}
                </h3>
              </div>
              <p className="text-sm text-text2 leading-relaxed">
                {t('sidebar.restart_message')}
              </p>
            </div>
            <div className="flex gap-2 p-4 border-t border-border bg-bg/30">
              <button
                onClick={() => setRestartOpen(false)}
                disabled={restarting}
                className="flex-1 py-2 px-3 rounded-lg text-sm font-semibold text-text2 hover:bg-surface2 transition-all disabled:opacity-50"
              >
                {t('sidebar.restart_cancel')}
              </button>
              <button
                onClick={handleRestart}
                disabled={restarting}
                className="flex-1 py-2 px-3 rounded-lg text-sm font-bold bg-brand text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {restarting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {t('sidebar.linking')}
                  </>
                ) : (
                  <>
                    <RotateCcw size={14} />
                    {t('sidebar.restart_confirm')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;