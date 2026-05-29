import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  LayoutGrid,
  CheckCircle2,
  Zap,
  Play,
  Music,
  Search,
  Check,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { useEventEngine } from '../context/EventEngineContext';

const Preset: React.FC = () => {
  const navigate = useNavigate();
  const { games, presets, myPresets, deletePreset, loading, activePresetId, setActivePresetId, adoptPreset, forkPreset, activatePreset } = useAdmin();
  const { triggerTest, testCountdown } = useEventEngine();

  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(activePresetId);
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-select game if preset is already active
  useEffect(() => {
    if (activePresetId) {
      // Find active preset in myPresets first, then fallback
      const activeMyPreset = myPresets.find(mp => mp.id === activePresetId || mp.preset.id === activePresetId);
      if (activeMyPreset && !selectedGameId) {
        setSelectedGameId(activeMyPreset.preset.gameId);
      } else {
        const preset = presets.find(p => p.id === activePresetId);
        if (preset && !selectedGameId) {
          setSelectedGameId(preset.gameId);
        }
      }
    }
  }, [activePresetId, presets, myPresets, selectedGameId]);

  // Filter presets by selected game
  const defaultTemplates = presets.filter(p => p.gameId === selectedGameId && p.isDefault);
  
  // Find current selected preset details for preview
  const currentPresetDetails = presets.find(p => p.id === selectedPresetId);

  const getBadgeForEvent = (event: string) => {
    if (event.startsWith('Gift')) return 'bg-purple';
    switch (event.toLowerCase()) {
      case 'gift': return 'bg-purple';
      case 'like': return 'bg-pink';
      case 'follow': return 'bg-amber';
      case 'share': return 'bg-green';
      case 'comment': return 'bg-blue-400';
      default: return 'bg-surface2';
    }
  };

  const handleAddToMyPresets = async (presetId: string) => {
    setSelectedPresetId(presetId);
    setIsProcessing(true);
    try {
      await forkPreset(presetId);
      // The new preset will be created and activated by the context
      navigate('/mapping');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTest = (rule: any) => {
    triggerTest(rule);
  };

  if (loading && games.length === 0) {
    return <div className="flex-1 flex items-center justify-center font-bold uppercase tracking-widest text-text3 animate-pulse">Loading Cloud Data...</div>;
  }

  const displayGames = games.filter(g => g.name !== 'General');

  return (
    <div className="flex-1 flex flex-col p-8 gap-8 overflow-y-auto custom-scrollbar bg-[#08080c]">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-brand/10 text-brand rounded-2xl flex items-center justify-center shadow-lg shadow-brand/5">
          <LayoutGrid size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Preset Configurations</h1>
          <p className="text-text3 text-sm font-medium">เลือกการตั้งค่าด่วนตามเกมที่เล่น</p>
        </div>
      </div>

      <div className="space-y-10">
        {/* Level 1: Game Selection */}
        <div className="space-y-4">
          <h3 className="text-[10px] text-text3 font-bold uppercase tracking-[0.2em] px-1">Level 1 — Select Game Category</h3>
          <div className="flex gap-4">
            {displayGames.map((game) => (
              <button
                key={game.id}
                onClick={() => { setSelectedGameId(game.id); setSelectedPresetId(null); }}
                className={`flex-1 flex items-center gap-4 p-5 rounded-2xl border transition-all ${selectedGameId === game.id
                  ? 'bg-brand/10 border-border2 shadow-xl shadow-brand/10 ring-1 ring-[#1e1e28]'
                  : 'bg-surface border-border hover:border-text3 opacity-60 hover:opacity-100'
                  }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedGameId === game.id ? 'bg-brand text-white shadow-lg' : 'bg-surface2 text-text3'}`}>
                  <Gamepad2 size={24} />
                </div>
                <div className="text-left">
                  <div className={`font-bold ${selectedGameId === game.id ? 'text-white' : 'text-text2'}`}>{game.name}</div>
                  <div className="text-[10px] text-text3 font-bold uppercase tracking-tighter line-clamp-1">{game.description || 'Game Category'}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Level 2: Default Templates Section */}
        {selectedGameId && (
          <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="space-y-4">
              <h3 className="text-[10px] text-text3 font-bold uppercase tracking-[0.2em] px-1">Level 2 — Official Templates</h3>
              <div className="bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] text-text3 uppercase border-b border-[#1e1e28] bg-surface2/30">
                      <th className="px-6 py-5 font-bold">Template Name</th>
                      <th className="px-6 py-5 font-bold">Description</th>
                      <th className="px-6 py-5 font-bold">Rules</th>
                      <th className="px-6 py-5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px]">
                    {defaultTemplates.map((preset) => {
                      const isSelected = selectedPresetId === preset.id;

                      return (
                        <tr
                          key={preset.id}
                          className={`border-b border-[#1e1e28]/50 hover:bg-surface2/10 transition-colors cursor-pointer group ${isSelected ? 'bg-brand/5 border-l-4 border-l-brand' : 'border-l-4 border-l-transparent'}`}
                          onClick={() => setSelectedPresetId(preset.id)}
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isSelected ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'bg-surface2 text-text3'}`}>
                                <LayoutGrid size={16} />
                              </div>
                              <span className={`font-bold tracking-tight ${isSelected ? 'text-brand' : 'text-text'}`}>
                                {preset.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-text2 font-medium italic opacity-80">{preset.description || '—'}</td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand/40" />
                              <span className="font-mono text-text3 uppercase font-bold tracking-tighter">{preset.rules.length} Rules</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleAddToMyPresets(preset.id); }}
                                disabled={isProcessing}
                                className="h-9 px-6 bg-brand text-white hover:bg-brand-hover rounded-xl text-[10px] font-bold uppercase transition-all shadow-lg shadow-brand/20 disabled:opacity-50 flex items-center gap-2"
                              >
                                {isProcessing && isSelected ? <Loader2 size={12} className="animate-spin" /> : null}
                                Add to My Presets
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {defaultTemplates.length === 0 && (
                  <div className="py-16 text-center space-y-3">
                    <Search size={32} className="mx-auto text-text3 opacity-20" />
                    <p className="text-text3 text-[10px] font-bold uppercase tracking-widest">No Default Templates available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Preset Preview Table */}
        {selectedPresetId && currentPresetDetails && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-8 duration-500 pt-6">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-text2">
                <CheckCircle2 size={18} className="text-green" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Rules Preview: {currentPresetDetails.name}</h3>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] text-text3 uppercase border-b border-[#1e1e28] bg-surface2/30">
                    <th className="px-6 py-5 font-bold">Event</th>
                    <th className="px-6 py-5 font-bold">Condition</th>
                    <th className="px-6 py-5 font-bold">Action</th>
                    <th className="px-6 py-4 font-bold">Sound / Vol</th>
                    <th className="px-6 py-4 font-bold">Key / Dur</th>
                    <th className="px-6 py-4 font-bold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-[11px]">
                  {currentPresetDetails.rules.map((rule) => (
                    <tr key={rule.id} className="border-b border-[#1e1e28]/50 hover:bg-surface2/10 transition-colors group">
                      <td className="px-6 py-5">
                        <span className={`px-2.5 py-1 rounded text-[9px] font-bold text-white uppercase ${getBadgeForEvent(rule.event)}`}>
                          {rule.event}
                        </span>
                      </td>
                      <td className="px-6 py-5 font-medium text-text">
                        {rule.event === 'GIFT' && rule.condition?.giftName && <span>🎁 {rule.condition.giftName}</span>}
                        {rule.event === 'COMMENT' && rule.condition?.keyword && <span className="italic text-sky-400">"{rule.condition.keyword}"</span>}
                        {rule.condition?.count && <span className="ml-2 text-text3 font-mono font-bold">×{rule.condition.count}</span>}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1.5 text-text2 font-bold uppercase tracking-tighter">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                          {rule.action}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {rule.sound && rule.sound !== '—' ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-text3"><Music size={12} /> {rule.sound}</div>
                            <div className="text-[9px] text-brand/70 font-bold">VOL: {rule.volume}%</div>
                          </div>
                        ) : <span className="text-text3 opacity-30">—</span>}
                      </td>
                      <td className="px-6 py-5">
                        {rule.key && rule.key !== '—' ? (
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-surface2 border border-border rounded font-mono font-bold text-brand">{rule.key}</span>
                            {rule.duration && <span className="text-text3 text-[9px]">({rule.duration})</span>}
                          </div>
                        ) : <span className="text-text3 opacity-30">—</span>}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <button 
                          onClick={() => handleTest(rule)}
                          disabled={testCountdown !== null}
                          className={`p-2 rounded-lg transition-all ${testCountdown !== null ? 'opacity-50' : 'hover:bg-brand/10 text-text3 hover:text-brand'}`}
                        >
                          <Play size={16} fill="currentColor" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Preset;
