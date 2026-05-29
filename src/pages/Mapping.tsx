import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Save,
  Play,
  Trash2,
  Music,
  Keyboard as KeyboardIcon,
  X,
  Check,
  Edit2,
  Layers,
  Search,
  Gift as GiftIcon,
  Loader2,
  ChevronDown,
  Volume2,
  Upload,
  Command,
  Zap,
  AlertCircle,
  ShieldCheck,
  Gem,
  } from 'lucide-react';
import { toast } from 'sonner';
import { useAdmin, RuleEvent, RuleAction, PresetRule } from '../context/AdminContext';
import { useEventEngine } from '../context/EventEngineContext';
import { uploadApi } from '../services/api';

// ─── Event / Action meta ────────────────────────────────────────────────────

const EVENT_META: Record<RuleEvent, { label: string; bg: string; text: string; border: string; dot: string }> = {
  [RuleEvent.GIFT]: { label: 'Gift', bg: 'rgba(139,92,246,0.15)', text: '#c4b5fd', border: 'rgba(139,92,246,0.3)', dot: '#a78bfa' },
  [RuleEvent.LIKE]: { label: 'Like', bg: 'rgba(236,72,153,0.15)', text: '#f9a8d4', border: 'rgba(236,72,153,0.3)', dot: '#f472b6' },
  [RuleEvent.FOLLOW]: { label: 'Follow', bg: 'rgba(245,158,11,0.15)', text: '#fcd34d', border: 'rgba(245,158,11,0.3)', dot: '#fbbf24' },
  [RuleEvent.SHARE]: { label: 'Share', bg: 'rgba(16,185,129,0.15)', text: '#6ee7b7', border: 'rgba(16,185,129,0.3)', dot: '#34d399' },
  [RuleEvent.COMMENT]: { label: 'Comment', bg: 'rgba(14,165,233,0.15)', text: '#7dd3fc', border: 'rgba(14,165,233,0.3)', dot: '#38bdf8' },
};

const ACTION_META: Record<RuleAction, { label: string; icon: React.ReactNode; color: string }> = {
  [RuleAction.KEY_PRESS]: { label: 'Key Press', icon: <KeyboardIcon size={12} />, color: 'text-brand' },
  [RuleAction.RCON_COMMAND]: { label: 'RCON Command', icon: <Command size={12} />, color: 'text-emerald-400' },
  [RuleAction.SOUND_PLAY]: { label: 'Sound Play', icon: <Music size={12} />, color: 'text-violet-400' },
  [RuleAction.WIN_COUNTER]: { label: 'Win Counter', icon: <Zap size={12} />, color: 'text-amber-400' },
  [RuleAction.SPIN_WHEEL]: { label: 'Spin Wheel', icon: <Zap size={12} />, color: 'text-pink-400' },
};

// ── Action options สำหรับ dropdown (ไม่รวม WIN_COUNTER) ──
const SELECTABLE_ACTIONS = [
  RuleAction.KEY_PRESS,
  RuleAction.RCON_COMMAND,
  RuleAction.SOUND_PLAY,
  RuleAction.SPIN_WHEEL,
] as const;

// ─── Reusable small components ───────────────────────────────────────────────

const Badge: React.FC<{ event: RuleEvent }> = ({ event }) => {
  const m = EVENT_META[event];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
      style={{ background: m.bg, color: m.text, borderColor: m.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
};

const SelectField: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}> = ({ value, onChange, options, className = '' }) => (
  <div className={`relative ${className}`}>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-9 bg-[#0d0d14] border border-white/8 rounded-lg text-[11px] font-bold uppercase tracking-wider text-text pl-3 pr-8 appearance-none cursor-pointer focus:outline-none focus:border-brand/50 transition-colors"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text3 pointer-events-none" />
  </div>
);

// ─── Keyboard Capture Modal ───────────────────────────────────────────────────

interface KeyboardModalProps {
  open: boolean;
  initial: string;
  onConfirm: (key: string) => void;
  onCancel: () => void;
}

const MODIFIER_KEYS = ['Control', 'Shift', 'Alt', 'Meta'];
const MODIFIER_LABELS: Record<string, string> = {
  Control: 'Ctrl', Shift: 'Shift', Alt: 'Alt', Meta: '⌘ Meta',
};

const KeyboardModal: React.FC<KeyboardModalProps> = ({ open, initial, onConfirm, onCancel }) => {
  const [captured, setCaptured] = useState(initial);
  const [isListening, setIsListening] = useState(false);
  const [modifiers, setModifiers] = useState<string[]>([]);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setCaptured(initial);
      setModifiers([]);
      setIsListening(false);
    }
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      setIsListening(true);

      const mods: string[] = [];
      if (e.ctrlKey) mods.push('Ctrl');
      if (e.shiftKey) mods.push('Shift');
      if (e.altKey) mods.push('Alt');
      if (e.metaKey) mods.push('Meta');
      setModifiers(mods);

      if (!MODIFIER_KEYS.includes(e.key)) {
        const mainKey = e.code === 'Space' ? 'Space'
          : e.key.length === 1 ? e.key.toUpperCase()
            : e.key;
        const full = [...mods, mainKey].join(' + ');
        setCaptured(full);
        setIsListening(false);
        setModifiers([]);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      // If only modifier keys were held and all released
      if (MODIFIER_KEYS.includes(e.key)) {
        const stillHeld = modifiers.filter(m => {
          if (m === 'Ctrl' && e.key === 'Control') return false;
          if (m === 'Shift' && e.key === 'Shift') return false;
          if (m === 'Alt' && e.key === 'Alt') return false;
          if (m === 'Meta' && e.key === 'Meta') return false;
          return true;
        });
        setModifiers(stillHeld);
        if (stillHeld.length === 0) setIsListening(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [open, modifiers]);

  if (!open) return null;

  const displayParts = captured ? captured.split(' + ') : [];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-[420px] bg-[#0d0d14] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/60 space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
            <KeyboardIcon size={26} />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Capture Shortcut</h2>
            <p className="text-text3 text-xs mt-0.5">Press any key combination</p>
          </div>
        </div>

        {/* Key display area */}
        <div
          className={`h-28 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 transition-all duration-200 cursor-text
            ${isListening
              ? 'border-brand/60 bg-brand/5 shadow-[0_0_24px_-4px] shadow-brand/30'
              : 'border-white/8 bg-[#08080c] hover:border-white/15'
            }`}
        >
          {isListening && modifiers.length > 0 && modifiers.map(m => (
            <KeyChip key={m} label={m} dim />
          ))}
          {isListening && modifiers.length > 0 && (
            <span className="text-text3 text-xs">+</span>
          )}
          {isListening && modifiers.length === 0 && (
            <span className="text-text3 text-xs font-mono animate-pulse">press a key…</span>
          )}
          {!isListening && displayParts.length > 0 && displayParts.map((part, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-text3 text-xs font-bold">+</span>}
              <KeyChip label={part} />
            </React.Fragment>
          ))}
          {!isListening && displayParts.length === 0 && (
            <span className="text-text3 text-xs font-mono opacity-40">— none —</span>
          )}
        </div>

        {/* Hint */}
        {captured && (
          <div className="flex items-center gap-2 text-[10px] text-text3 bg-white/3 rounded-lg px-3 py-2">
            <Check size={10} className="text-emerald-400 shrink-0" />
            <span>Captured: <span className="text-text font-mono font-bold">{captured}</span></span>
            <button
              onClick={() => { setCaptured(''); setIsListening(false); }}
              className="ml-auto text-text3 hover:text-red transition-colors"
            >
              <X size={10} />
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="h-11 rounded-xl bg-white/5 hover:bg-white/8 font-bold text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(captured || 'Space')}
            disabled={!captured}
            className="h-11 rounded-xl bg-brand hover:bg-brand/90 text-white font-bold text-sm shadow-lg shadow-brand/25 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

const KeyChip: React.FC<{ label: string; dim?: boolean }> = ({ label, dim }) => (
  <span className={`px-3 py-1.5 rounded-lg border font-mono font-bold text-sm tracking-tight transition-all
    ${dim
      ? 'bg-brand/10 border-brand/20 text-brand/60'
      : 'bg-[#1a1a28] border-white/15 text-text shadow-sm'
    }`}>
    {label}
  </span>
);

// ─── Gift Picker Modal ────────────────────────────────────────────────────────

interface GiftModalProps {
  open: boolean;
  gifts: any[];
  selectedId: number | null;
  search: string;
  onSearch: (v: string) => void;
  onSelect: (id: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const GiftModal: React.FC<GiftModalProps> = ({
  open, gifts, selectedId, search, onSearch, onSelect, onConfirm, onCancel,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-150 p-4">
      <div className="w-full max-w-[600px] bg-[#0d0d14] border border-white/10 rounded-[2rem] flex flex-col shadow-2xl shadow-black/60 max-h-[82vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/6 shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <GiftIcon size={18} />
              </div>
              <div>
                <h2 className="font-bold text-base">Select Gift</h2>
                <p className="text-text3 text-[10px] uppercase tracking-widest font-bold">TikTok gift trigger</p>
              </div>
            </div>
            <button onClick={onCancel} className="w-8 h-8 rounded-lg hover:bg-white/8 flex items-center justify-center text-text3 transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search gifts…"
              className="w-full h-10 bg-[#08080c] border border-white/8 rounded-xl pl-9 pr-4 text-sm focus:outline-none focus:border-brand/40 transition-colors"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {gifts.length === 0 ? (
            <div className="py-16 text-center text-text3 text-sm">No gifts found</div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {gifts.map((gift) => (
                <button
                  key={gift.id}
                  onClick={() => onSelect(gift.id)}
                  className={`p-3 rounded-2xl flex flex-col items-center gap-2 transition-all text-left
                    ${selectedId === gift.id
                      ? 'bg-brand/10 border-brand/50 ring-1 ring-brand/30 shadow-lg shadow-brand/10'
                      : 'bg-white/3 border-white/6 hover:border-white/15 hover:bg-white/5'
                    }`}
                >
                  <div className="w-14 h-14 flex items-center justify-center">
                    {gift.imageUrl
                      ? <img src={gift.imageUrl} alt={gift.name} className="w-full h-full object-contain" />
                      : <div className="text-3xl">🎁</div>
                    }
                  </div>
                  <div className="w-full text-center">
                    <div className="text-[11px] font-bold truncate">{gift.name}</div>
                    <div className="text-[10px] text-amber-400 font-bold flex items-center justify-center gap-0.5 mt-0.5">
                      🪙 {gift.diamonds}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/6 bg-white/2 shrink-0 grid grid-cols-2 gap-3">
          <button onClick={onCancel} className="h-12 rounded-xl bg-white/5 hover:bg-white/8 font-bold text-sm transition-colors">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={!selectedId}
            className="h-12 rounded-xl bg-brand hover:bg-brand/90 text-white font-bold text-sm shadow-lg shadow-brand/25 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const Mapping: React.FC = () => {
  const { gifts, presets, myPresets, activePresetId, updatePreset, forkPreset, refreshData, setActivePresetId, addPreset, games, activatePreset, deletePreset } = useAdmin();
  const { triggerTest, testCountdown } = useEventEngine();

  const currentUser = JSON.parse(localStorage.getItem('aclass_user') || '{}');
  const isAdmin = currentUser.role === 'ADMIN';

  // Find a preset to work with: 
  // 1. the one that matches activePresetId
  // 2. fallback to the first active in myPresets
  // 3. fallback to the first preset in myPresets
  const activeMyPreset = myPresets.find(mp => mp.presetId === activePresetId || mp.isActive) || myPresets[0];
  const activePreset = activeMyPreset ? activeMyPreset.preset : null;
  
  const isReadOnly = activePreset?.isDefault && !isAdmin;

  const [localRules, setLocalRules] = useState<PresetRule[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMappingEnabled, setIsMappingEnabled] = useState(() => localStorage.getItem('aclass_mapping_enabled') !== 'false');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('aclass_mapping_enabled', isMappingEnabled.toString());
    // Dispatch event so EventEngine can react if needed (though it reads from localStorage or we can pass via context)
    window.dispatchEvent(new CustomEvent('mapping-toggle', { detail: isMappingEnabled }));
  }, [isMappingEnabled]);

  // Keyboard modal
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [previousAction, setPreviousAction] = useState<RuleAction>(RuleAction.KEY_PRESS);

  // Gift modal
  const [isGiftOpen, setIsGiftOpen] = useState(false);
  const [giftSearch, setGiftSearch] = useState('');
  const [selectedGiftId, setSelectedGiftId] = useState<number | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setLocalRules(activePreset?.rules ?? []);
    setNewName(activePreset?.name || '');
  }, [activePreset]);

  const handleCreatePreset = async () => {
    // Put purely custom presets in the 'General' game category
    const generalGame = games.find(g => g.name === 'General');
    const gameId = generalGame ? generalGame.id : games[0]?.id;

    if (!gameId) {
      toast.error('No games available to attach the preset to.');
      return;
    }
    
    const name = `Custom Preset ${myPresets.length + 1}`;
    
    setIsSaving(true);
    try {
      const newPreset = await addPreset({ name, gameId, description: 'My custom mapping preset' });
      setActivePresetId(newPreset.id);
      toast.success('Preset created and activated.');
    } catch (e: any) {
      toast.error('Failed to create preset');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveName = async () => {
    if (!activePreset || !newName.trim()) {
      setIsRenaming(false);
      return;
    }
    
    if (newName === activePreset.name) {
      setIsRenaming(false);
      return;
    }
    
    setIsSaving(true);
    try {
      await updatePreset(activePreset.id, { name: newName });
      await refreshData();
      setIsRenaming(false);
      toast.success('Preset renamed');
    } catch (e) {
      toast.error('Failed to rename preset');
      setNewName(activePreset.name);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSwitchPreset = async (userPresetId: string, presetId: string) => {
    setIsDropdownOpen(false);
    if (activePreset?.id === presetId) return;
    
    setIsSaving(true);
    try {
      await activatePreset(userPresetId);
      setActivePresetId(presetId);
      toast.success('Preset switched successfully');
    } catch (e) {
      toast.error('Failed to switch preset');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePreset = async (presetId: string) => {
    if (window.confirm("Are you sure you want to delete this preset?")) {
      setIsDropdownOpen(false);
      setIsSaving(true);
      try {
        await deletePreset(presetId);
        toast.success('Preset deleted');
        if (activePresetId === presetId) {
           setActivePresetId(null);
        }
      } catch (e) {
        toast.error('Failed to delete preset');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const filteredGifts = useMemo(() => {
    let result = gifts.filter(g => g.name.toLowerCase().includes(giftSearch.toLowerCase()));
    // Sort by diamonds ascending
    result.sort((a, b) => (a.diamonds || 0) - (b.diamonds || 0));
    return result;
  }, [giftSearch, gifts]);

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const startAdd = () => {
    setEditingId('new');
    setEditForm({
      id: 'new',
      event: RuleEvent.LIKE,
      condition: { count: 1 },
      action: RuleAction.KEY_PRESS,
      sound: '',
      volume: 1.0,
      key: 'Space',
      duration: '0.1s',
    });
    setIsAdding(true);
  };

  const startEdit = (rule: PresetRule) => {
    setEditingId(rule.id);
    setEditForm({
      ...rule,
      condition: rule.condition || { count: 1 },
      duration: '0.1s',
    });
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setIsAdding(false);
  };

  const saveEdit = () => {
    if (!editForm) return;
    if (isAdding) {
      setLocalRules(prev => [...prev, { ...editForm, id: `temp-${Date.now()}` }]);
    } else {
      setLocalRules(prev => prev.map(r => r.id === editingId ? editForm : r));
    }
    cancelEdit();
  };

  const deleteRule = (id: string) => {
    if (window.confirm('Delete this rule?')) {
      setLocalRules(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleSaveToCloud = async () => {
    if (!activePreset) {
      toast.error('No active preset found.');
      return;
    }
    setIsSaving(true);
    try {
      const sanitized = localRules.map(({ id, presetId, ...rest }) => ({
        ...rest,
        volume: rest.volume || 1.0,
        condition: rest.condition || {},
      }));
      await updatePreset(activePreset.id, { rules: sanitized });
      await refreshData();
      toast.success('Rules saved to cloud!');
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Event / Action handlers ───────────────────────────────────────────────

  const handleEventChange = (event: string) => {
    if (!editForm) return;
    if (event === RuleEvent.GIFT) setIsGiftOpen(true);
    setEditForm({ ...editForm, event });
  };

  const handleActionChange = (action: string) => {
    if (!editForm) return;
    if (action === RuleAction.KEY_PRESS) {
      setPreviousAction(editForm.action);
      setIsKeyboardOpen(true);
    }
    setEditForm({ ...editForm, action });
  };

  const handleKeyConfirm = (key: string) => {
    setEditForm((f: any) => ({ ...f, key }));
    setIsKeyboardOpen(false);
  };

  const handleKeyCancel = () => {
    setEditForm((f: any) => ({ ...f, action: previousAction }));
    setIsKeyboardOpen(false);
  };

  const handleGiftConfirm = () => {
    if (!editForm || !selectedGiftId) return;
    const gift = gifts.find(g => g.id === selectedGiftId);
    if (gift) {
      setEditForm((f: any) => ({
        ...f,
        event: RuleEvent.GIFT,
        condition: { ...f.condition, giftId: gift.id, giftName: gift.name },
      }));
    }
    setIsGiftOpen(false);
    setSelectedGiftId(null);
    setGiftSearch('');
  };

  const handleGiftCancel = () => {
    setIsGiftOpen(false);
    setSelectedGiftId(null);
    setGiftSearch('');
  };

  // ── Sound upload ──────────────────────────────────────────────────────────

  const handleSoundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editForm) return;

    if (file.type !== 'audio/mpeg' || !file.name.toLowerCase().endsWith('.mp3')) {
      toast.error('รองรับเฉพาะไฟล์ .mp3 เท่านั้น');
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('ไฟล์ต้องมีขนาดไม่เกิน 10MB');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const res = await uploadApi.uploadSound(file);
      setEditForm((f: any) => ({ ...f, sound: res.data.url }));
      toast.success('อัปโหลดสำเร็จ');
    } catch (err) {
      toast.error('อัปโหลดไฟล์เสียงไม่สำเร็จ');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // ── Edit row renderer ─────────────────────────────────────────────────────

  const renderEditRow = (rowKey?: string) => {
    if (!editForm) return null;
    const am = ACTION_META[editForm.action as RuleAction];

    return (
      <tr key={rowKey || 'new-row'} className="border-b border-white/5 bg-brand/3">
        {/* Event */}
        <td className="px-5 py-4">
          <SelectField
            value={editForm.event}
            onChange={handleEventChange}
            options={Object.values(RuleEvent).map(ev => ({ value: ev, label: ev }))}
          />
          {editForm.event === RuleEvent.GIFT && editForm.condition?.giftName && (
            <button
              onClick={() => setIsGiftOpen(true)}
              className="mt-1.5 text-[10px] text-brand font-bold hover:underline block"
            >
              🎁 {editForm.condition.giftName}
            </button>
          )}
          {editForm.event === RuleEvent.COMMENT && (
            <input
              type="text"
              placeholder="Keyword…"
              value={editForm.condition?.keyword || ''}
              onChange={(e) => setEditForm((f: any) => ({ ...f, condition: { ...f.condition, keyword: e.target.value } }))}
              className="w-full h-8 mt-1.5 bg-[#0d0d14] border border-white/8 rounded-lg text-[11px] px-2.5 focus:outline-none focus:border-brand/40"
            />
          )}
        </td>

        {/* Count */}
        <td className="px-5 py-4">
          <input
            type="number"
            min={1}
            value={editForm.condition?.count || ''}
            onChange={(e) => setEditForm((f: any) => ({ ...f, condition: { ...f.condition, count: parseInt(e.target.value) || 1 } }))}
            placeholder="Count"
            className="w-full h-9 bg-[#0d0d14] border border-white/8 rounded-lg text-xs px-3 focus:outline-none focus:border-brand/40 transition-colors"
          />
        </td>

        {/* Action */}
        <td className="px-5 py-4">
          <SelectField
            value={editForm.action}
            onChange={handleActionChange}
            options={SELECTABLE_ACTIONS.map(act => ({ value: act, label: ACTION_META[act].label }))}
          />
        </td>

        {/* Sound */}
        <td className="px-5 py-4">
          {editForm.action === RuleAction.SOUND_PLAY ? (
            <div className="space-y-2">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={editForm.sound || ''}
                  onChange={(e) => setEditForm((f: any) => ({ ...f, sound: e.target.value }))}
                  placeholder="URL or path…"
                  className="flex-1 h-8 bg-[#0d0d14] border border-white/8 rounded-lg text-[11px] px-2.5 focus:outline-none focus:border-brand/40 transition-colors min-w-0"
                />
                <input type="file" ref={fileInputRef} onChange={handleSoundUpload} accept=".mp3,audio/mpeg" className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-8 h-8 shrink-0 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/20 transition-colors disabled:opacity-40 flex items-center justify-center"
                >
                  {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Volume2 size={11} className="text-text3 shrink-0" />
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={editForm.volume}
                  onChange={(e) => setEditForm((f: any) => ({ ...f, volume: parseFloat(e.target.value) }))}
                  className="flex-1 h-1 accent-brand"
                />
                <span className="text-[10px] text-text3 font-mono w-8 text-right">{Math.round((editForm.volume || 1) * 100)}%</span>
              </div>
            </div>
          ) : (
            <span className="text-text3/30 text-lg">—</span>
          )}
        </td>

        {/* Key / Command */}
        <td className="px-5 py-4">
          {editForm.action === RuleAction.KEY_PRESS && (
            <button
              onClick={() => setIsKeyboardOpen(true)}
              className="w-full h-8 bg-[#0d0d14] border border-white/8 rounded-lg font-mono text-[11px] font-bold text-brand hover:border-brand/40 transition-colors truncate px-2"
            >
              {editForm.key || '— click to set —'}
            </button>
          )}
          {editForm.action === RuleAction.RCON_COMMAND && (
            <input
              type="text"
              placeholder="Command…"
              value={editForm.key || ''}
              onChange={(e) => setEditForm((f: any) => ({ ...f, key: e.target.value }))}
              className="w-full h-8 bg-[#0d0d14] border border-white/8 rounded-lg text-[11px] px-2.5 font-mono text-emerald-400 focus:outline-none focus:border-emerald-500/30 transition-colors"
            />
          )}
          {editForm.action !== RuleAction.KEY_PRESS && editForm.action !== RuleAction.RCON_COMMAND && (
            <span className="text-text3/30 text-lg">—</span>
          )}
        </td>

        {/* Save / Cancel */}
        <td className="px-5 py-4">
          <div className="flex items-center gap-1.5">
            <button
              onClick={saveEdit}
              className="h-8 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors"
            >
              <Check size={13} /> Save
            </button>
            <button
              onClick={cancelEdit}
              className="h-8 w-8 bg-white/5 hover:bg-red/10 text-text3 hover:text-red border border-white/8 rounded-lg flex items-center justify-center transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const handleCustomize = async () => {
    if (!activePreset) return;
    setIsSaving(true);
    try {
      await forkPreset(activePreset.id);
      toast.success('Default preset duplicated! You can now customize it.');
    } catch (err: any) {
      toast.error('Failed to duplicate preset');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col p-8 gap-6 overflow-y-auto custom-scrollbar bg-[#08080c]">

      {/* Read-only Alert */}
      {isReadOnly && (

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-200">Default Preset (Read-Only)</h3>
              <p className="text-[11px] text-amber-200/60 font-medium">This is a system template. Click "Customize" to create your own editable copy.</p>
            </div>
          </div>
          <button
            onClick={handleCustomize}
            disabled={isSaving}
            className="h-9 px-4 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 text-white"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Layers size={14} />}
            Customize Preset
          </button>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-brand/10  flex items-center justify-center text-brand">
            <Layers size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Mapping Rules</h1>
            
            <div className="flex items-center gap-2 mt-0.5">
              {activePreset ? (
                <>
                  <span className="opacity-50 uppercase tracking-widest text-[9px] font-black text-brand">ACTIVE:</span>
                  
                  {isRenaming && !isReadOnly ? (
                    <div className="flex items-center gap-1">
                      <input 
                        type="text"
                        autoFocus
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onBlur={handleSaveName}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                        className="bg-[#0d0d14] border border-brand/50 rounded text-xs px-2 py-0.5 text-brand focus:outline-none w-48"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 group relative" ref={dropdownRef}>
                      <button 
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="text-text3 text-xs font-medium text-brand hover:underline flex items-center gap-1"
                      >
                        {activePreset.name}
                        <ChevronDown size={12} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {!isReadOnly && (
                        <button 
                          onClick={() => setIsRenaming(true)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-text3 hover:text-brand ml-1"
                          title="Rename preset"
                        >
                          <Edit2 size={12} />
                        </button>
                      )}

                      {/* Dropdown Menu */}
                      {isDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 w-64 bg-[#1a1a28] border border-white/10 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-text3 border-b border-white/5 mb-1">
                            Switch Preset
                          </div>
                          <div className="max-h-64 overflow-y-auto custom-scrollbar">
                            {myPresets.length > 0 ? (
                              myPresets.map((mp) => (
                                <div key={mp.id} className={`w-full flex items-center justify-between hover:bg-white/5 transition-colors ${mp.presetId === activePreset.id ? 'text-brand font-bold bg-brand/5' : 'text-text2'}`}>
                                  <button
                                    onClick={() => handleSwitchPreset(mp.id, mp.presetId)}
                                    className="flex-1 text-left px-3 py-2 text-xs flex items-center justify-between"
                                  >
                                    <span className="truncate pr-2">{mp.preset.name}</span>
                                    {mp.presetId === activePreset.id && <Check size={12} className="shrink-0" />}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeletePreset(mp.preset.id); }}
                                    className="p-2 text-text3 hover:text-red hover:bg-red/10 transition-colors rounded-r-md"
                                    title="Delete Preset"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div className="px-3 py-4 text-xs text-text3 text-center italic">
                                No personal presets found
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activePreset.isDefault && <span className="px-1.5 py-0.5 bg-brand/20 text-[9px] rounded uppercase text-brand">Template</span>}
                </>
              ) : (
                <span className="text-text3 text-xs font-medium text-brand">No preset selected</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Mapping Toggle */}
          <div className="flex items-center gap-3 px-4 py-2 bg-surface border border-border rounded-xl mr-2">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isMappingEnabled ? 'text-green' : 'text-text3'}`}>
              {isMappingEnabled ? 'Mapping Active' : 'Mapping Paused'}
            </span>
            <button
              onClick={() => setIsMappingEnabled(!isMappingEnabled)}
              className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none ${isMappingEnabled ? 'bg-green' : 'bg-white/10'}`}
            >
              <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${isMappingEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {!isAdding && !editingId && (
            <button
              onClick={handleCreatePreset}
              disabled={isSaving}
              className="h-10 px-4 bg-surface2 hover:bg-white/10 text-text text-sm font-bold rounded-xl flex items-center gap-2 transition-all active:scale-95 border border-border"
            >
              <Plus size={16} /> New Preset
            </button>
          )}

          {!isAdding && !editingId && !isReadOnly && (
            <button
              onClick={startAdd}
              className="h-10 px-5 bg-brand hover:bg-brand/90 text-white text-sm font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-brand/25 transition-all active:scale-95"
            >
              <Plus size={16} /> Add Rule
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0d0d14]  rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="">
              {['Event', 'Count', 'Action', 'Sound / Vol', 'Key / Command', 'Controls'].map(h => (
                <th key={h} className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-text3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {localRules.map((rule) => {
              if (editingId === rule.id && !isAdding) return renderEditRow(rule.id);
              const am = ACTION_META[rule.action];
              return (
                <tr key={rule.id} className="hover:bg-white/2 transition-colors group">
                  {/* Event */}
                  <td className="px-5 py-4">
                    <Badge event={rule.event} />
                    {rule.event === RuleEvent.GIFT && rule.condition?.giftName && (
                      <div className="text-[10px] text-text3 mt-1 font-bold">🎁 {rule.condition.giftName}</div>
                    )}
                    {rule.event === RuleEvent.COMMENT && rule.condition?.keyword && (
                      <div className="text-[10px] text-sky-400/70 mt-1 font-bold italic">"{rule.condition.keyword}"</div>
                    )}
                  </td>

                  {/* Count */}
                  <td className="px-5 py-4 text-sm font-mono font-bold text-text2">
                    {rule.condition?.count ? `×${rule.condition.count}` : '—'}
                  </td>

                  {/* Action */}
                  <td className="px-5 py-4">
                    <span className={`flex items-center gap-1.5 text-[11px] font-bold ${am?.color || 'text-text3'}`}>
                      {am?.icon}
                      {am?.label || rule.action}
                    </span>
                  </td>

                  {/* Sound */}
                  <td className="px-5 py-4">
                    {rule.action === RuleAction.SOUND_PLAY && rule.sound ? (
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] text-text3 max-w-[120px]">
                          <Music size={11} className="text-violet-400 shrink-0" />
                          <span className="truncate">{rule.sound.split('/').pop()}</span>
                        </div>
                        <div className="text-[10px] text-violet-400/60 font-bold mt-0.5">
                          {Math.round((rule.volume || 1) * 100)}%
                        </div>
                      </div>
                    ) : <span className="text-text3/25 text-base">—</span>}
                  </td>

                  {/* Key */}
                  <td className="px-5 py-4">
                    {rule.action === RuleAction.KEY_PRESS && rule.key ? (
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-1 bg-[#1a1a28] border border-white/10 rounded-lg font-mono font-bold text-[11px] text-brand">
                          {rule.key}
                        </span>
                      </div>
                    ) : rule.action === RuleAction.RCON_COMMAND && rule.key ? (
                      <span className="px-2 py-1 bg-emerald-500/8 border border-emerald-500/15 rounded-lg font-mono font-bold text-[11px] text-emerald-400">
                        {rule.key}
                      </span>
                    ) : <span className="text-text3/25 text-base">—</span>}
                  </td>

                  {/* Controls */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => triggerTest(rule)}
                        disabled={testCountdown !== null}
                        title="Test"
                        className="w-8 h-8 rounded-lg hover:bg-brand/10 text-text3 hover:text-brand flex items-center justify-center transition-colors disabled:opacity-40"
                      >
                        <Play size={14} fill="currentColor" />
                      </button>
                      
                      {!isReadOnly && (
                        <>
                          <button
                            onClick={() => startEdit(rule)}
                            title="Edit"
                            className="w-8 h-8 rounded-lg hover:bg-white/8 text-text3 hover:text-text flex items-center justify-center transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => deleteRule(rule.id)}
                            title="Delete"
                            className="w-8 h-8 rounded-lg hover:bg-red/10 text-text3 hover:text-red flex items-center justify-center transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Add row */}
            {isAdding && renderEditRow('new')}
          </tbody>
        </table>

        {/* Empty state */}
        {localRules.length === 0 && !isAdding && (
          <div className="py-24 flex flex-col items-center gap-4 text-center">
            <Layers size={40} className="text-text3/20" />
            <div>
              <p className="text-text3 text-sm font-bold">No rules yet</p>
              <p className="text-text3/50 text-xs mt-1">
                {isReadOnly ? 'This template is empty' : 'Click "Add Rule" to get started'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-text3 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {localRules.length} {localRules.length === 1 ? 'rule' : 'rules'} defined
          {editingId && <span className="text-amber-400 flex items-center gap-1"><AlertCircle size={11} /> unsaved changes</span>}
          {isReadOnly && <span className="text-amber-400/60 ml-2 italic tracking-wide">(READ-ONLY TEMPLATE)</span>}
        </div>
        {!isReadOnly && (
          <button
            onClick={handleSaveToCloud}
            disabled={isSaving || !!editingId}
            className="h-11 px-8 bg-brand hover:bg-brand/90 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-brand/25 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            title={editingId ? 'Finish editing before saving' : ''}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Saving…' : 'Save to Cloud'}
          </button>
        )}
      </div>

      {/* Modals */}
      <KeyboardModal
        open={isKeyboardOpen}
        initial={editForm?.key || ''}
        onConfirm={handleKeyConfirm}
        onCancel={handleKeyCancel}
      />

      <GiftModal
        open={isGiftOpen}
        gifts={filteredGifts}
        selectedId={selectedGiftId}
        search={giftSearch}
        onSearch={setGiftSearch}
        onSelect={setSelectedGiftId}
        onConfirm={handleGiftConfirm}
        onCancel={handleGiftCancel}
      />
    </div>
  );
};

export default Mapping;