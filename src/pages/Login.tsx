import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Titlebar from '../components/Titlebar';
import { AlertCircle, Loader2, Globe, Shield, Wrench } from 'lucide-react';
import { authApi } from '../services/api';

// ⚠️ Flip to false to re-open the app. When true: blocks both existing-token
// auto-login and the OAuth buttons, and shows a full-screen popup.
const MAINTENANCE_MODE = true;

const Login: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Initial Check: Auto-login if token exists
  useEffect(() => {
    const checkExistingSession = async () => {
      const token = localStorage.getItem('aclass_token');
      if (token) {
        console.log('Existing token found, verifying...');
        try {
          // Verify profile and HWID
          const profileRes = await authApi.getProfile();
          const hwid = window.electron
            ? await window.electron.invoke('get-hwid')
            : 'web-no-hwid';
          await authApi.verifyHwid(hwid);

          localStorage.setItem('aclass_user', JSON.stringify(profileRes.data));
          navigate('/announcements');
        } catch (e: any) {
          console.error('Session verification failed:', e);
          localStorage.removeItem('aclass_token');
          localStorage.removeItem('aclass_user');
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    if (MAINTENANCE_MODE) {
      setLoading(false);
      return;
    }
    // If we're NOT in a callback, check existing session
    if (!searchParams.get('token')) {
      checkExistingSession();
    }
  }, [navigate, searchParams]);

  // 2. Handle OAuth Callback
  useEffect(() => {
    // If there is an error in URL, clear existing session
    const errorParam = searchParams.get('error');
    if (errorParam) {
      localStorage.removeItem('aclass_token');
      localStorage.removeItem('aclass_user');
      localStorage.removeItem('aclass_active_order_id');
      localStorage.removeItem('aclass_tiktok_session');
      setError(errorParam);
    }

    const token = searchParams.get('token');
    const userData = searchParams.get('user');
    const urlError = searchParams.get('error');

    if (urlError) {
      setError(decodeURIComponent(urlError));
      setLoading(false);
      return;
    }

    if (token && userData) {
      console.log('OAuth Callback Detected, processing user data...');
      const processCallback = async () => {
        setLoading(true);
        try {
          const decodedUser = decodeURIComponent(userData);
          localStorage.setItem('aclass_token', token);

          // CRITICAL: Verify HWID before proceeding
          const hwid = window.electron
            ? await window.electron.invoke('get-hwid')
            : 'web-no-hwid';
          await authApi.verifyHwid(hwid);

          localStorage.setItem('aclass_user', decodedUser);
          console.log('Login successful and HWID verified');

          window.dispatchEvent(new Event('storage'));
          navigate('/announcements');
        } catch (e: any) {
          console.error('Failed to verify HWID or parse user data', e);
          const errorMsg = e.response?.data?.message || 'การตรวจสอบสิทธิ์ล้มเหลว (HWID mismatch)';
          setError(errorMsg);
          localStorage.removeItem('aclass_token');
          localStorage.removeItem('aclass_user');
          setLoading(false);
        }
      };

      processCallback();
    }
  }, [searchParams, navigate]);

  const handleOAuthLogin = (provider: 'google' | 'discord') => {
    console.log(`Starting ${provider} login flow...`);
    setLoading(true);
    setError(null);

    // Redirect the current window to the API auth endpoint
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    window.location.href = `${apiUrl}/auth/${provider}`;
  };

  return (
    <div className="h-screen flex flex-col bg-bg">
      <Titlebar title="A Class Store Pro - Authentication" showControls={true} />

      {MAINTENANCE_MODE && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-surface border border-yellow-500/40 rounded-2xl p-8 md:p-10 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl" />

            <div className="relative">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                <Wrench size={44} className="text-yellow-400 animate-pulse" />
              </div>

              <div className="inline-block px-3 py-1 mb-4 rounded-full bg-yellow-500/15 border border-yellow-500/30">
                <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">
                  Maintenance · ปิดปรับปรุง
                </span>
              </div>

              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
                ปิดปรับปรุงระบบ
              </h2>
              <p className="text-yellow-400 font-semibold text-sm mb-6">
                System Under Maintenance
              </p>

              <div className="space-y-3 mb-6">
                <p className="text-text2 text-sm md:text-base leading-relaxed">
                  ขณะนี้ระบบกำลังอยู่ระหว่างการปรับปรุงครั้งใหญ่<br />
                  ขออภัยในความไม่สะดวก กรุณากลับมาใหม่อีกครั้งในภายหลัง
                </p>
                <div className="h-px w-16 bg-yellow-500/30 mx-auto" />
                <p className="text-text3 text-xs md:text-sm leading-relaxed">
                  We're performing scheduled maintenance to improve your experience.<br />
                  Please check back later. Thank you for your patience.
                </p>
              </div>

              <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] text-text3/60 font-mono uppercase tracking-widest">
                  Login temporarily disabled
                </p>
              </div>
            </div>
          </div>
        </div>
      )}


      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-[400px] bg-surface border border-border rounded-2xl p-10 shadow-2xl relative overflow-hidden text-center">
          {/* Decorative background element */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand/10 rounded-full blur-3xl opacity-50" />

          <div className="flex flex-col items-center mb-10 relative">
            <div className="w-24 h-24 mb-4 relative">
              <img
                src="/assets/AClassStoreLogo.png"
                alt="A Class Store Pro Logo"
                className="w-full h-full object-contain drop-shadow-2xl"
              />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">{t('login.title')}</h1>
            <p className="text-text2 text-sm mt-2">{t('login.subtitle')}</p>
          </div>

          <div className="space-y-4 relative">
            {error && (
              <div className="bg-red/10 border border-red/20 text-red text-xs p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1 mb-6 text-left">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error.includes('Access denied') || error.includes('เข้าถึงถูกปฏิเสธ') ? t('login.error_purchase') : error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => handleOAuthLogin('google')}
                disabled={loading || MAINTENANCE_MODE}
                className="flex items-center justify-center gap-3 h-14 bg-white hover:bg-gray-100 text-black rounded-xl transition-all active:scale-[0.95] shadow-lg disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="font-bold">{t('login.google')}</span>
              </button>

              <button
                onClick={() => handleOAuthLogin('discord')}
                disabled={loading || MAINTENANCE_MODE}
                className="flex items-center justify-center gap-3 h-14 bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-xl transition-all active:scale-[0.95] shadow-lg disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 127.14 96.36">
                  <path fill="currentColor" d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.71,32.65-1.82,56.6.48,80.21a105.73,105.73,0,0,0,32.22,16.15,77.7,77.7,0,0,0,7.34-11.86,68.11,68.11,0,0,1-11.85-5.65c.3-.22.58-.45.88-.67a82.11,82.11,0,0,0,61,0c.3.22.58.45.88.67a68.21,68.11,0,0,1-11.85,5.65,77.06,77.7,0,0,0,7.34,11.86,105.27,105.27,0,0,0,32.27-16.14C129.58,52.84,125.13,29.15,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
                </svg>
                <span className="font-bold">{t('login.discord')}</span>
              </button>
            </div>

            {loading && (
              <div className="pt-6 flex flex-col items-center gap-3 animate-in fade-in">
                <Loader2 className="animate-spin text-brand" size={24} />
                <span className="text-[10px] text-text3 font-bold uppercase tracking-widest">{t('common.loading')}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 text-center space-y-4">
          <div className="flex items-center justify-center gap-6">
            <div className="flex items-center gap-2 text-[10px] text-text3 font-bold uppercase tracking-widest">
              <Globe size={12} />
              {t('login.auth_cloud')}
            </div>
            <div className="w-1 h-1 bg-text3/30 rounded-full" />
            <div className="flex items-center gap-2 text-[10px] text-text3 font-bold uppercase tracking-widest">
              <Shield size={12} />
              {t('login.hwid_bound')}
            </div>
          </div>
          <div className="text-[10px] text-text3/50 font-mono">
            V1.2.0 · SESSION SECURED · {navigator.platform}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
