import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOverlay, HotkeyConfig } from '../../context/OverlayContext';
import { 
  Zap, Settings, Palette, Sliders, Layout, Keyboard, 
  RotateCcw, ChevronDown, ChevronRight, Power 
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

const CustomSwitch = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
  <label className="flex items-center gap-3 cursor-pointer group">
    <div
      onClick={onChange}
      className={`w-10 h-5 rounded-full relative transition-all ${checked ? 'bg-brand shadow-[0_0_10px_rgba(124,92,252,0.3)]' : 'bg-bg border border-border'}`}
    >
      <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${checked ? 'left-6 bg-white' : 'left-1 bg-text3'}`} />
    </div>
    <span className="text-xs text-text2 font-bold group-hover:text-text transition-colors">{label}</span>
  </label>
);

const WinCountControls: React.FC = () => {
  const { t } = useTranslation();
  const { settings, updateSettings, handleUndo, handleReset, handleQuickAdjust } = useOverlay();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    controls: true,
    config: true,
    appearance: false,
    outline: false,
    layout: false,
    hotkeys_win: false,
  });
  const [customAdjust, setCustomAdjust] = useState('');
  const [rebinding, setRebinding] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleApplyCustom = () => {
    const val = parseInt(customAdjust);
    if (!isNaN(val)) {
      handleQuickAdjust(val);
      setCustomAdjust('');
    }
  };

  const startRebinding = (path: string) => {
    setRebinding(path);
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      
      // Use e.code for specific keys like Numpad or Arrow keys
      // Fallback to e.key for regular characters
      let key = e.key;
      if (e.code.startsWith('Numpad') || e.code.startsWith('Arrow')) {
        key = e.code;
      } else if (e.key === ' ') {
        key = 'Space';
      }

      if (path.startsWith('custom')) {
        const keyName = path as keyof typeof settings.hotkeys;
        const cur = settings.hotkeys[keyName] as HotkeyConfig;
        updateSettings({ hotkeys: { ...settings.hotkeys, [keyName]: { ...cur, key } } });
      } else {
        updateSettings({ hotkeys: { ...settings.hotkeys, [path]: key } });
      }
      setRebinding(null);
      window.removeEventListener('keydown', handler);
    };
    window.addEventListener('keydown', handler);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar relative">
      {!settings.winEnabled && (
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

      {/* Win Controls */}
      <AccordionSection
        id="controls" isExpanded={expandedSections.controls} onToggle={toggleSection}
        icon={<Zap size={18} />} label={t('overlay_controls.win_controls')} collapsible={false}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleUndo} className="h-12 bg-red/10 border border-border rounded-xl text-red font-bold text-sm hover:bg-red/20 transition-all">
              UNDO −1
            </button>
            <button onClick={handleReset} className="h-12 bg-amber/10 border border-border rounded-xl text-amber font-bold text-sm hover:bg-amber/20 transition-all flex items-center justify-center gap-2">
              <RotateCcw size={16} /> RESET
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => handleQuickAdjust(5)} className="h-11 bg-surface border border-border rounded-xl font-bold text-xs text-green hover:bg-green/10 transition-all">+5</button>
            <button onClick={() => handleQuickAdjust(-5)} className="h-11 bg-surface border border-border rounded-xl font-bold text-xs text-red hover:bg-red/10 transition-all">−5</button>
            <button onClick={() => handleQuickAdjust(10)} className="h-11 bg-surface border border-border rounded-xl font-bold text-xs text-green hover:bg-green/10 transition-all">+10</button>
          </div>
          <div className="flex gap-2">
            <input
              type="number" value={customAdjust} onChange={e => setCustomAdjust(e.target.value)}
              placeholder="Custom (e.g. +10)"
              className="flex-1 bg-bg border border-border rounded-xl h-11 px-4 text-xs"
            />
            <button onClick={handleApplyCustom} className="h-11 px-6 bg-brand text-white rounded-xl font-bold text-xs shadow-lg shadow-brand/20 active:scale-95 transition-all">
              APPLY
            </button>
          </div>
        </div>
      </AccordionSection>

      {/* Counter Config */}
      <AccordionSection
        id="config" isExpanded={expandedSections.config} onToggle={toggleSection}
        icon={<Settings size={18} />} label="Counter Config"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] text-text3 font-bold uppercase ml-1">Max Wins</label>
              <input type="number" value={settings.maxWins} onChange={e => updateSettings({ maxWins: parseInt(e.target.value) || 0 })} className="w-full h-10 bg-bg border border-border rounded-xl px-3 text-xs" />
            </div>
            <div className="flex items-end pb-2">
              <CustomSwitch checked={settings.showMax} onChange={() => updateSettings({ showMax: !settings.showMax })} label="Show Max" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] text-text3 font-bold uppercase ml-1">Label Text</label>
              <input type="text" value={settings.label} onChange={e => updateSettings({ label: e.target.value })} className="w-full h-10 bg-bg border border-border rounded-xl px-3 text-xs" />
            </div>
            <div className="flex items-end pb-2">
              <CustomSwitch checked={settings.showLabel} onChange={() => updateSettings({ showLabel: !settings.showLabel })} label="Show Label" />
            </div>
          </div>
          <CustomSwitch checked={settings.allowNegative} onChange={() => updateSettings({ allowNegative: !settings.allowNegative })} label="Allow negative wins" />
        </div>
      </AccordionSection>

      {/* Appearance */}
      <AccordionSection
        id="appearance" isExpanded={expandedSections.appearance} onToggle={toggleSection}
        icon={<Palette size={18} />} label="Appearance" iconColor="text-pink"
      >
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] text-text3 font-bold uppercase">Font Family</label>
              <select value={settings.fontFamily} onChange={e => updateSettings({ fontFamily: e.target.value })} className="w-full h-10 bg-bg border border-border rounded-xl px-3 text-xs">
                <option>Times New Roman</option><option>Arial</option><option>Impact</option>
                <option>Courier New</option><option>Georgia</option><option>Sora</option><option>IBM Plex Mono</option>
              </select>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-[10px] text-text3 font-bold uppercase">Size</label>
                <span className="text-[10px] font-mono text-brand">{settings.fontSize}px</span>
              </div>
              <input type="range" min="20" max="200" value={settings.fontSize} onChange={e => updateSettings({ fontSize: parseInt(e.target.value) })} className="w-full h-1.5 accent-brand" />
            </div>
            <CustomSwitch checked={settings.bold} onChange={() => updateSettings({ bold: !settings.bold })} label="Bold Text" />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-4">
            {[
              { label: 'Win', key: 'colorWin' }, { label: 'Lose', key: 'colorLose' },
              { label: 'Label', key: 'colorLabel' }, { label: 'Neg', key: 'colorNeg' },
            ].map(c => (
              <div key={c.key} className="flex flex-col items-center gap-1.5">
                <span className="text-[9px] text-text3 font-bold uppercase">{c.label}</span>
                <div className="w-12 h-12 rounded-xl border border-border p-1 bg-surface2 relative overflow-hidden shadow-inner cursor-pointer">
                  <div className="w-full h-full rounded-lg" style={{ backgroundColor: (settings as any)[c.key] }} />
                  <input type="color" value={(settings as any)[c.key]} onChange={e => updateSettings({ [c.key]: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </AccordionSection>

      {/* Text Outline */}
      <AccordionSection
        id="outline" isExpanded={expandedSections.outline} onToggle={toggleSection}
        icon={<Sliders size={18} />} label="Text Outline" iconColor="text-blue-400"
      >
        <div className="space-y-4">
          <CustomSwitch checked={settings.outline.enabled} onChange={() => updateSettings({ outline: { ...settings.outline, enabled: !settings.outline.enabled } })} label="Enable Outline" />
          {settings.outline.enabled && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-2">
                <label className="text-[10px] text-text3 font-bold uppercase">Color</label>
                <div className="h-10 rounded-xl border border-border overflow-hidden relative">
                  <div className="absolute inset-0" style={{ backgroundColor: settings.outline.color }} />
                  <input type="color" value={settings.outline.color} onChange={e => updateSettings({ outline: { ...settings.outline, color: e.target.value } })} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-[10px] text-text3 font-bold uppercase">Size</label>
                  <span className="text-[10px] font-mono text-brand">{settings.outline.size}px</span>
                </div>
                <input type="range" min="1" max="20" value={settings.outline.size} onChange={e => updateSettings({ outline: { ...settings.outline, size: parseInt(e.target.value) } })} className="w-full h-1.5 accent-brand" />
              </div>
            </div>
          )}
        </div>
      </AccordionSection>

      {/* Layout & Background */}
      <AccordionSection
        id="layout" isExpanded={expandedSections.layout} onToggle={toggleSection}
        icon={<Layout size={18} />} label="Layout & Background" iconColor="text-green"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {(['horizontal', 'vertical'] as const).map(l => (
              <button key={l} onClick={() => updateSettings({ layout: l })}
                className={`h-11 rounded-xl font-bold text-[10px] uppercase border transition-all ${settings.layout === l ? 'bg-brand border-border2 text-white shadow-lg' : 'bg-bg border-border text-text3'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-[10px] text-text3 font-bold uppercase">BG Opacity</label>
                <span className="text-[10px] font-mono text-brand">{settings.background.opacity}%</span>
              </div>
              <input type="range" min="0" max="100" value={settings.background.opacity} onChange={e => updateSettings({ background: { ...settings.background, opacity: parseInt(e.target.value) } })} className="w-full h-1.5 accent-brand" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] text-text3 font-bold uppercase">Color 1</label>
                <div className="h-10 rounded-xl border border-border overflow-hidden relative">
                  <div className="absolute inset-0" style={{ backgroundColor: settings.background.color }} />
                  <input type="color" value={settings.background.color} onChange={e => updateSettings({ background: { ...settings.background, color: e.target.value } })} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
                </div>
              </div>
              {settings.background.gradient && (
                <div className="space-y-2">
                  <label className="text-[10px] text-text3 font-bold uppercase">Color 2</label>
                  <div className="h-10 rounded-xl border border-border overflow-hidden relative">
                    <div className="absolute inset-0" style={{ backgroundColor: settings.background.color2 }} />
                    <input type="color" value={settings.background.color2} onChange={e => updateSettings({ background: { ...settings.background, color2: e.target.value } })} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
                  </div>
                </div>
              )}
            </div>
            <CustomSwitch checked={settings.background.gradient} onChange={() => updateSettings({ background: { ...settings.background, gradient: !settings.background.gradient } })} label="Enable Gradient" />
          </div>
        </div>
      </AccordionSection>

      {/* Win Count Hotkeys */}
      <AccordionSection
        id="hotkeys_win" isExpanded={expandedSections.hotkeys_win} onToggle={toggleSection}
        icon={<Keyboard size={18} />} label="Win Count Hotkeys" iconColor="text-amber"
      >
        <div className="overflow-hidden border border-border rounded-xl">
          <table className="w-full text-[10px] text-left border-collapse">
            <thead className="bg-bg text-text3 font-bold uppercase">
              <tr><th className="p-3">Action</th><th className="p-3">Key</th><th className="p-3">Val</th></tr>
            </thead>
            <tbody className="text-text2">
              {[
                { label: 'WIN (+1)', path: 'win' }, { label: 'UNDO (−1)', path: 'undo' }, { label: 'RESET', path: 'reset' },
                { label: 'Custom 1', path: 'custom1', hasValue: true }, { label: 'Custom 2', path: 'custom2', hasValue: true },
                { label: 'Custom 3', path: 'custom3', hasValue: true },
              ].map(row => (
                <tr key={row.path} className="border-t border-border/50">
                  <td className="p-3 font-bold">{row.label}</td>
                  <td className="p-3">
                    <button onClick={() => startRebinding(row.path)}
                      className={`px-2 py-1 rounded border text-[10px] font-mono min-w-[70px] ${rebinding === row.path ? 'bg-brand text-white border-border2 animate-pulse' : 'bg-surface2 border-border text-brand hover:bg-bg'}`}>
                      {rebinding === row.path ? '...' : (row.hasValue ? (settings.hotkeys[row.path as keyof typeof settings.hotkeys] as HotkeyConfig).key : settings.hotkeys[row.path as keyof typeof settings.hotkeys] as string)}
                    </button>
                  </td>
                  <td className="p-3">
                    {row.hasValue && (
                      <input type="text"
                        value={(settings.hotkeys[row.path as keyof typeof settings.hotkeys] as HotkeyConfig).value ?? ''}
                        onChange={e => {
                          const valStr = e.target.value;
                          const kn = row.path as keyof typeof settings.hotkeys;
                          const cur = settings.hotkeys[kn] as HotkeyConfig;
                          
                          // Allow typing '-' or empty string for better UX
                          if (valStr === '' || valStr === '-' || valStr === '+') {
                            updateSettings({ hotkeys: { ...settings.hotkeys, [kn]: { ...cur, value: valStr as any } } });
                            return;
                          }

                          const parsed = parseInt(valStr);
                          if (!isNaN(parsed)) {
                            updateSettings({ hotkeys: { ...settings.hotkeys, [kn]: { ...cur, value: parsed } } });
                          }
                        }}
                        className="w-10 h-7 bg-bg border border-border rounded text-center text-[10px] font-bold"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AccordionSection>
    </div>
  );
};

export default WinCountControls;
