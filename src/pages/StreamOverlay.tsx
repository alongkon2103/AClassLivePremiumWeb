import React, { useState, useRef, useEffect } from 'react'; // เพิ่ม useEffect
import { useTranslation } from 'react-i18next';
import {
  Trophy, Save, Download, Upload, Check, Play, RefreshCw, Dices, Power
} from 'lucide-react';
import { OverlayProvider, useOverlay, DEFAULT_SETTINGS } from '../context/OverlayContext';
import WinCountControls from '../components/overlay/WinCountControls';
import SpinControls from '../components/overlay/SpinControls';
import LivePreview from '../components/overlay/LivePreview';

export const TEMPLATES = [
  { id: 'T1', name: 'Neon Cyber', preview: '/assets/T1.jpg' },
  { id: 'T2', name: 'Clean Modern', preview: '/assets/T2.jpg' },
  { id: 'T3', name: 'Minimalist', preview: '/assets/T3.jpg' },
];

const StreamOverlayContent: React.FC = () => {
  const { t } = useTranslation();
  const { settings, updateSettings, triggerSpin } = useOverlay();
  const [activeTab, setActiveTab] = useState<'wincount' | 'spin'>('wincount');
  const [showSaved, setShowSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // แก้ useEffect
  useEffect(() => {
    if (activeTab === 'spin') {
      const timer = setTimeout(() => {
        triggerSpin(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  const handleManualSave = () => {
    window.electron?.send('settings:save', settings);
    localStorage.setItem('aclass_overlay_settings', JSON.stringify(settings));
    window.dispatchEvent(new Event('storage'));
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `AClass_Overlay_Settings_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        updateSettings(imported);
        handleManualSave();
      } catch (error) {
        console.error('Failed to parse imported settings', error);
      }
    };
    reader.readAsText(file);
  };

  const selectedTemplate = TEMPLATES.find(t => t.id === settings.template) ?? TEMPLATES[0];
  const obsOverlayUrl = `http://localhost:5555/overlays/overlay.html`;
  const obsSpinUrl = `http://localhost:5555/overlays/${selectedTemplate.id === 'T1' ? 'spin_1' : selectedTemplate.id === 'T2' ? 'spin_2' : 'spin_3'}.html`;
  return (
    <div className="h-screen flex flex-col bg-bg text-text overflow-hidden font-sans">
      {/* ── Header ── */}
      <div className="h-16 bg-surface border-b border-border px-8 flex items-center justify-between shrink-0 z-10 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-brand/10 text-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand/5">
            <Trophy size={22} />
          </div>
          <div className="flex flex-col">
            <h1 className="font-bold text-sm uppercase tracking-[0.2em] leading-tight">{t('stream_overlay.title')}</h1>
            <span className="text-[9px] text-text3 font-bold tracking-widest uppercase opacity-70">A Class Store Pro v1.2.0</span>
          </div>
        </div>

        <div className="bg-bg/80 backdrop-blur-md px-6 py-2  flex items-center gap-4 shadow-inner">
          <span className="text-[10px] font-bold text-text3 uppercase">{t('stream_overlay.live_status')}</span>
          <div className="flex items-center gap-3 bg-surface2/50 px-4 py-1 rounded-xl border border-border">
            <span className="text-xs font-bold text-text2 uppercase mr-1">WIN +1</span>
            <span className="text-xl font-mono font-bold text-brand">[ {settings.winCount ?? 0} ]</span>
          </div>
        </div>

        <div className="flex bg-bg p-1 rounded-xl border border-border shadow-inner">
          <button
            onClick={() => setActiveTab('wincount')}
            className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${activeTab === 'wincount' ? 'bg-brand text-white shadow-lg' : 'text-text3 hover:text-text2'}`}
          >
            {t('stream_overlay.win_count')}
          </button>
          <button
            onClick={() => setActiveTab('spin')}
            className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${activeTab === 'spin' ? 'bg-brand text-white shadow-lg' : 'text-text3 hover:text-text2'}`}
          >
            {t('stream_overlay.spin_wheel')}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-[420px] border-r border-border flex flex-col bg-surface/20 shrink-0">

          {/* Master Switch Panel */}
          <div className="p-5 border-b border-border bg-surface2/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${(activeTab === 'wincount' ? settings.winEnabled : settings.spinEnabled) ? 'bg-green/10 text-green border border-green/20' : 'bg-surface border border-border text-text3'
                }`}>
                <Power size={20} className={(activeTab === 'wincount' ? settings.winEnabled : settings.spinEnabled) ? "animate-pulse" : ""} />
              </div>
              <div>
                <div className="text-sm font-black uppercase tracking-widest text-text">{t('stream_overlay.master_switch')}</div>
                <div className="text-[10px] text-text3 font-medium uppercase tracking-widest mt-0.5">
                  {(activeTab === 'wincount' ? settings.winEnabled : settings.spinEnabled) ? t('stream_overlay.active') : t('stream_overlay.off')}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                if (activeTab === 'wincount') {
                  const updated = { ...settings, winEnabled: !settings.winEnabled };
                  updateSettings({ winEnabled: !settings.winEnabled });
                  window.electron?.send('settings:save', updated);
                } else {
                  const updated = { ...settings, spinEnabled: !settings.spinEnabled };
                  updateSettings({ spinEnabled: !settings.spinEnabled });
                  window.electron?.send('settings:save', updated);
                }
              }}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none shadow-inner ${(activeTab === 'wincount' ? settings.winEnabled : settings.spinEnabled) ? 'bg-brand' : 'bg-surface border border-border'
                }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${(activeTab === 'wincount' ? settings.winEnabled : settings.spinEnabled) ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            {activeTab === 'wincount' ? <WinCountControls /> : <SpinControls />}
          </div>

          {/* Sticky Bottom: Save / Import / Export */}
          <div className="p-5 border-t border-border bg-surface2/30 space-y-4">
            <div className="flex gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="flex-1 h-10 bg-surface border border-border rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-2 hover:bg-border transition-all">
                <Upload size={14} /> {t('stream_overlay.import')}
              </button>
              <button onClick={handleExport} className="flex-1 h-10 bg-surface border border-border rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-2 hover:bg-border transition-all">
                <Download size={14} /> {t('stream_overlay.export')}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-2 text-green font-bold text-xs transition-opacity ${showSaved ? 'opacity-100' : 'opacity-0'}`}>
                <Check size={16} /> {t('stream_overlay.saved')}
              </div>
              <button onClick={handleManualSave} className="h-11 px-8 bg-brand text-white rounded-xl font-bold text-sm shadow-xl shadow-brand/30 hover:bg-brand-hover transition-all flex items-center gap-2">
                <Save size={18} /> {t('stream_overlay.save_settings')}
              </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".json" />
          </div>
        </div>

        {/* RIGHT PANEL - Preview */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#08080c]">

          <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">

              {/* {activeTab === 'spin' && (
                <div className="bg-surface/90 backdrop-blur border border-border p-6 rounded-3xl shadow-xl flex flex-col">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text3 mb-4 flex items-center gap-2">
                    <Palette size={14} className="text-brand" /> Select Theme
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {TEMPLATES.map((tpl) => (
                      <div 
                        key={tpl.id}
                        onClick={() => updateSettings({ template: tpl.id as any })}
                        className={`cursor-pointer rounded-2xl border-2 transition-all overflow-hidden group ${
                          settings.template === tpl.id 
                            ? 'border-brand shadow-lg shadow-brand/20' 
                            : 'border-transparent hover:border-border bg-surface2'
                        }`}
                      >
                        <div className="h-24 bg-bg relative overflow-hidden flex items-center justify-center">
                          <span className="font-black text-2xl opacity-20 absolute">{tpl.id}</span>
                          {tpl.id === 'T1' && <div className="text-brand font-black italic transform -skew-x-12 tracking-tighter">WIN 99</div>}
                          {tpl.id === 'T2' && <div className="text-white font-medium tracking-widest border-b-2 border-brand pb-1">WIN: 99</div>}
                          {tpl.id === 'T3' && <div className="bg-white text-black px-3 py-1 rounded-full font-bold">W 99</div>}
                        </div>
                        <div className="p-3 text-center bg-surface border-t border-border">
                          <span className="text-[10px] font-black uppercase tracking-widest">{tpl.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )} */}

              {/* Live Preview Embed */}
              <div className="bg-surface/90 backdrop-blur border border-border rounded-3xl shadow-xl overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface2/30">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text3 flex items-center gap-2">
                    <Eye size={14} className="text-brand" /> Live Preview
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
                    <span className="text-[9px] font-bold text-green uppercase tracking-widest">Real-time</span>
                  </div>
                </div>
                <div className="p-8 flex items-center justify-center min-h-[300px] bg-bg">
                  <LivePreview
                    templateUrl={activeTab === 'wincount' ? obsOverlayUrl : obsSpinUrl}
                    title="Live Preview"
                    isEnabled={activeTab === 'wincount' ? settings.winEnabled : settings.spinEnabled}
                  />
                </div>
              </div>

              {/* Preview Cards */}
              <div className="grid grid-cols-1 gap-8">
                {activeTab === 'wincount' && (
                  <div className="bg-surface/90 backdrop-blur border border-border p-6 rounded-3xl shadow-xl flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text3 flex items-center gap-2">
                        <Layout size={14} className="text-brand" /> Win Counter URL
                      </h3>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={obsOverlayUrl}
                        className="flex-1 bg-bg border border-border rounded-xl px-4 text-xs font-mono text-text2 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(obsOverlayUrl);
                          toast.success("Win Counter URL copied to clipboard!");
                        }}
                        className="px-4 bg-brand/10 hover:bg-brand/20 text-brand rounded-xl font-bold text-xs transition-colors whitespace-nowrap"
                      >
                        {t('stream_overlay.copy_obs')}
                      </button>
                    </div>
                    <p className="text-[10px] text-text3 leading-relaxed border-l-2 border-brand/50 pl-3">
                      Add a "Browser" source in OBS.<br />Set Width: 800, Height: 200.<br />Check "Shutdown source when not visible"
                    </p>
                  </div>
                )}

                {activeTab === 'spin' && (
                  <div className="bg-surface/90 backdrop-blur border border-border p-6 rounded-3xl shadow-xl flex flex-col gap-4 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text3 flex items-center gap-2">
                        <Dices size={14} className="text-brand" /> Spin Wheel URL
                      </h3>
                      <button
                        onClick={() => triggerSpin()}  
                        disabled={!settings.spinEnabled}
                        className={`h-8 px-4 rounded-lg font-bold text-[10px] transition-all flex items-center gap-1.5 ${settings.spinEnabled
                            ? 'bg-brand/20 text-brand hover:bg-brand/30'
                            : 'bg-surface2 text-text3 cursor-not-allowed opacity-50'
                          }`}
                      >
                        <Play size={12} fill="currentColor" /> {t('stream_overlay.test_spin')}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={obsSpinUrl}
                        className="flex-1 bg-bg border border-border rounded-xl px-4 text-xs font-mono text-text2 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(obsSpinUrl);
                          toast.success("Spin Wheel URL copied to clipboard!");
                        }}
                        className="px-4 bg-brand/10 hover:bg-brand/20 text-brand rounded-xl font-bold text-xs transition-colors whitespace-nowrap"
                      >
                        {t('stream_overlay.copy_obs')}
                      </button>
                    </div>
                    <p className="text-[10px] text-text3 leading-relaxed border-l-2 border-brand/50 pl-3">
                      Add a "Browser" source in OBS.<br />Set Width: 800, Height: 800.<br />Check "Shutdown source when not visible"
                    </p>
                  </div>
                )}
              </div>



            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StreamOverlay: React.FC = () => {
  return <StreamOverlayContent />;
};

// Simple Mock icons for the layout section to prevent errors if not imported above
import { Palette, Layout, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default StreamOverlay;