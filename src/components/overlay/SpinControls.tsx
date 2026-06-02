import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOverlay } from '../../context/OverlayContext';
import {
  Dices, Eye, Keyboard, ChevronDown, ChevronRight, Power
} from 'lucide-react';

const AccordionSection = ({
  isExpanded, onToggle, id, icon, label, children, collapsible = true, iconColor = 'text-brand'
}: {
  isExpanded: boolean;
  onToggle: (id: string) => void;
  id: string;
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  collapsible?: boolean;
  iconColor?: string;
}) => (
  <div className={`border-b border-[#1e1e28] transition-all ${isExpanded ? 'bg-surface/10' : 'bg-surface/30'}`}>
    <div
      onClick={() => collapsible && onToggle(id)}
      className={`h-12 px-5 flex items-center justify-between transition-colors hover:bg-surface2/50 ${collapsible ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-center gap-3">
        <span className={iconColor}>{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-text2">{label}</span>
      </div>
      {collapsible && (
        <div className="text-text3">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      )}
    </div>
    {isExpanded && (
      <div className="p-5 space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
        {children}
      </div>
    )}
  </div>
);

const TEMPLATES = [
  { id: 'T1', label: 'T1 — Neon Purple', url: '/overlays/spin_1.html', desc: 'Dark space + brand glow cards' },
  { id: 'T2', label: 'T2 — Minimal Dark', url: '/overlays/spin_2.html', desc: 'Clean monochrome minimal' },
  { id: 'T3', label: 'T3 — Cyberpunk', url: '/overlays/spin_3.html', desc: 'Orbitron font + cyan/magenta neon' },
] as const;

const SpinControls: React.FC = () => {
  const { t } = useTranslation();
  const { settings, updateSettings } = useOverlay();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    spin_choices: true,
    spin_template: true,
    hotkeys_spin: false,
  });
  const [rebinding, setRebinding] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const startRebinding = (path: string) => {
    setRebinding(path);
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      updateSettings({ hotkeys: { ...settings.hotkeys, spin: e.key } });
      setRebinding(null);
      window.removeEventListener('keydown', handler);
    };
    window.addEventListener('keydown', handler);
  };

  const getSpinChips = () =>
    (settings.spinChoices ?? '').split(',').map((choice, i) => {
      const val = parseInt(choice.trim());
      if (isNaN(val)) return null;
      const isNeg = val < 0;
      const isZero = val === 0;
      return (
        <span
          key={i}
          className={`
          inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black tracking-wide
          border transition-all
          ${isZero
              ? 'bg-surface2 text-text3 border-border'
              : isNeg
                ? 'bg-red/10 text-red border-red/20 shadow-sm shadow-red/10'
                : 'bg-green/10 text-green border-green/20 shadow-sm shadow-green/10'
            }
        `}
        >
          <span className="text-[9px]">{isZero ? '◆' : isNeg ? '▼' : '▲'}</span>
          {val > 0 ? `+${val}` : val}
        </span>
      );
    });

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar relative">
      {!settings.spinEnabled && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-8 text-center bg-bg/40 backdrop-blur-[2px]">
          <div className="bg-surface/90 p-8 rounded-[2rem] border border-border shadow-2xl flex flex-col items-center gap-4 max-w-[280px]">
            <div className="w-16 h-16 bg-red/10 text-red rounded-full flex items-center justify-center shadow-lg shadow-red/10 border border-red/20">
              <Power size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-sm uppercase tracking-widest text-text">{t('stream_overlay.controls_locked')}</h3>
              <p className="text-[10px] text-text3 font-bold leading-relaxed uppercase tracking-tighter">{t('stream_overlay.unlock_desc')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Spin Choices */}
      <AccordionSection
        id="spin_choices" isExpanded={expandedSections.spin_choices} onToggle={toggleSection}
        icon={<Dices size={18} />} label={t('overlay_controls.spin_pool')} collapsible={false} iconColor="text-brand"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] text-text3 font-bold uppercase">Choices (comma separated)</label>
            <input
              type="text"
              value={settings.spinChoices}
              onChange={e => updateSettings({ spinChoices: e.target.value })}
              className="w-full h-10 bg-bg border border-border rounded-xl px-3 font-mono text-xs"
              placeholder="-7,-8,-7,+5"
            />
          </div>
          <div className="flex flex-wrap gap-2 min-h-[28px] items-center">
            {getSpinChips()}
          </div>

          {/* Volume Controls */}
          {/* <div className="space-y-3 pt-4 border-t border-white/5">
            <label className="text-[10px] text-text3 font-bold uppercase">Sound Effects Volume</label>
            
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-text2 w-16">Tick Sound</span>
              <input 
                type="range" min="0" max="1" step="0.05"
                value={settings.spinVolumeTick ?? 0.2}
                onChange={e => updateSettings({ spinVolumeTick: parseFloat(e.target.value) })}
                className="flex-1 h-1 accent-brand"
              />
              <span className="text-[10px] text-brand font-mono w-8">{Math.round((settings.spinVolumeTick ?? 0.2) * 100)}%</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-text2 w-16">Win Sound</span>
              <input 
                type="range" min="0" max="1" step="0.05"
                value={settings.spinVolumeWin ?? 0.5}
                onChange={e => updateSettings({ spinVolumeWin: parseFloat(e.target.value) })}
                className="flex-1 h-1 accent-brand"
              />
              <span className="text-[10px] text-brand font-mono w-8">{Math.round((settings.spinVolumeWin ?? 0.5) * 100)}%</span>
            </div>
          </div> */}
        </div>
      </AccordionSection>

      {/* Template Selector */}
      <AccordionSection
        id="spin_template" isExpanded={expandedSections.spin_template} onToggle={toggleSection}
        icon={<Eye size={18} />} label="Template" collapsible={false} iconColor="text-pink"
      >
        <div className="space-y-3">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => updateSettings({ template: t.id as any })}
              className={`w-full h-14 rounded-xl border text-left px-4 flex items-center gap-4 transition-all ${settings.template === t.id ? 'bg-brand/10 border-brand/40 text-white shadow-lg shadow-brand/10' : 'bg-bg border-border text-text3 hover:border-border2'}`}
            >
              <div className={`w-2 h-2 rounded-full transition-all ${settings.template === t.id ? 'bg-brand shadow-[0_0_8px_rgba(124,92,252,0.8)]' : 'bg-text3'}`} />
              <div>
                <div className="text-xs font-bold">{t.label}</div>
                <div className="text-[10px] text-text3">{t.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </AccordionSection>

      {/* Spin Hotkey */}
      <AccordionSection
        id="hotkeys_spin" isExpanded={expandedSections.hotkeys_spin} onToggle={toggleSection}
        icon={<Keyboard size={18} />} label="Spin Hotkey" iconColor="text-amber"
      >
        <div className="flex items-center gap-4 py-1">
          <span className="text-xs font-bold text-text2 flex-1">Trigger Spin</span>
          <button
            onClick={() => startRebinding('spin')}
            className={`px-4 py-2 rounded-lg border text-[11px] font-mono min-w-[90px] text-center ${rebinding === 'spin' ? 'bg-brand text-white border-border2 animate-pulse' : 'bg-surface2 border-border text-brand hover:bg-bg'}`}
          >
            {rebinding === 'spin' ? 'Press key...' : settings.hotkeys.spin}
          </button>
        </div>
        <p className="text-[10px] text-text3 mt-2">กด hotkey นี้เพื่อ trigger spin animation บน overlay</p>
      </AccordionSection>
    </div>
  );
};

export default SpinControls;
