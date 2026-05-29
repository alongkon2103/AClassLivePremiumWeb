import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { useOverlay } from './OverlayContext';
import { useMinecraft } from './MinecraftContext';
import { useAdmin, RuleEvent, RuleAction, PresetRule } from './AdminContext';
import { interactiveApi } from '../services/api';

interface EventEngineContextType {
  rules: PresetRule[];
  refreshRules: () => void;
  triggerTest: (rule: PresetRule) => void;
  testCountdown: number | null;
}

const EventEngineContext = createContext<EventEngineContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_STORE_URL || 'http://localhost:3000';

export const EventEngineProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { presets, activePresetId } = useAdmin();
  const [testCountdown, setTestCountdown] = useState<number | null>(null);
  const { handleQuickAdjust, triggerSpin } = useOverlay();
  const { sendCommand } = useMinecraft();
  
  const [interactiveProducts, setInteractiveProducts] = useState<any[]>([]);

  // 1. Fetch Interactive Mappings for the engine
  const fetchInteractive = async () => {
    try {
      const res = await interactiveApi.getMyProducts();
      setInteractiveProducts(res.data);
    } catch (e) {
      console.error('Failed to fetch interactive products for engine');
    }
  };

  useEffect(() => {
    if (localStorage.getItem('aclass_token')) {
      fetchInteractive();
    }
  }, [activePresetId]);

  // Get rules from the active preset
  const rules = useMemo(() => {
    const activePreset = presets.find(p => p.id === activePresetId) || presets.find(p => !p.isDefault) || presets[0];
    return (activePreset?.rules || []) as PresetRule[];
  }, [presets, activePresetId]);

  const refreshRules = () => {
    fetchInteractive();
  };

  const executeAction = (rule: PresetRule) => {
    // Check if mapping is globally disabled
    if (localStorage.getItem('aclass_mapping_enabled') === 'false') {
      console.log('[EventEngine] Mapping is disabled, skipping action');
      return;
    }

    console.log(`Executing action: ${rule.action} for rule ${rule.id}`);

    switch (rule.action) {
      case RuleAction.KEY_PRESS:
        if (rule.key && rule.key !== '—') {
          if (window.electron) {
            window.electron.send('keyboard:press', rule.key);
          }
        }
        break;

      case RuleAction.WIN_COUNTER:
        handleQuickAdjust(1);
        break;


      case RuleAction.SOUND_PLAY:
        if (rule.sound && rule.sound !== '—' && rule.sound !== '') {
          const soundUrl = rule.sound.startsWith('http')
            ? rule.sound
            : `${API_BASE_URL}/${rule.sound.replace(/^\/+/, '')}`;

          console.log('[SOUND_PLAY] URL:', soundUrl, '| Volume:', rule.volume);
          const audio = new Audio(soundUrl);
          audio.volume = rule.volume ?? 1.0;
          audio.play().catch(err =>
            console.error('[SOUND_PLAY] Failed:', err.message, '| URL:', soundUrl)
          );
        }
        break;

      case RuleAction.RCON_COMMAND:
        const cmd = rule.key;
        if (cmd && cmd !== '—') {
          sendCommand(cmd);
        }
        break;

      case RuleAction.SPIN_WHEEL:
        console.log('[SPIN_WHEEL] Triggering spin from event engine');
        triggerSpin();
        break;
    }
  };

  useEffect(() => {
    if (!window.electron) return;

    const handleTikTokEvent = (event: any) => {
      // A. Handle Custom Presets (app_rules)
      rules.forEach(rule => {
        let match = false;
        const condition = rule.condition || {};

        if (event.type === 'gift' && rule.event === RuleEvent.GIFT) {
          if (event.data.giftId === condition.giftId) {
            match = true;
          }
        } else if (event.type === 'like' && rule.event === RuleEvent.LIKE) {
          const targetCount = condition.count || 1;
          if (event.data.likeCount % targetCount === 0) {
            match = true;
          }
        } else if (event.type === RuleEvent.FOLLOW.toLowerCase() && rule.event === RuleEvent.FOLLOW) {
          match = true;
        } else if (event.type === RuleEvent.SHARE.toLowerCase() && rule.event === RuleEvent.SHARE) {
          match = true;
        } else if (event.type === 'comment' && rule.event === RuleEvent.COMMENT) {
          if (condition.keyword) {
            if (event.data.comment.toLowerCase().includes(condition.keyword.toLowerCase())) {
              match = true;
            }
          } else {
            match = true;
          }
        }

        if (match) {
          executeAction(rule);
        }
      });

      // B. Handle Interactive Store Products
      if (localStorage.getItem('aclass_interactive_enabled') !== 'false') {
        interactiveProducts.forEach(product => {
          product.user_function_gifts.forEach((mapping: any) => {
            if (mapping.is_enabled === false) return;
            
            let match = false;
            // For now, interactive products mostly respond to gifts
            if (event.type === 'gift' && mapping.gift_id === event.data.giftId) {
               match = true;
            }

            if (match) {
               console.log(`[INTERACTIVE] Triggering function ${mapping.product_functions.name} for product ${product.products.slug}`);
               // Broadcast via local server for game (e.g. Roblox) to pick up
               window.electron.send('settings:save', {
                  type: 'INTERACTIVE_TRIGGER',
                  product: product.products.slug,
                  function: mapping.product_functions.name,
                  timestamp: Date.now()
               });
            }
          });
        });
      }
    };

    window.electron.on('tiktok:event', handleTikTokEvent);

    return () => {
      // IPC listeners in electron-context-bridge might need actual unbind if implemented
    };
  }, [rules, interactiveProducts]);

  const triggerTest = (rule: PresetRule) => {
    if (testCountdown !== null) return;

    // ✅ ถ้าเป็น SOUND_PLAY ให้ prepare audio ทันทีขณะที่ยังอยู่ใน click event
    let preparedAudio: HTMLAudioElement | null = null;
    if (rule.action === RuleAction.SOUND_PLAY && rule.sound) {
      const soundPath = rule.sound.startsWith('/') ? rule.sound : `/${rule.sound}`;
      const soundUrl = rule.sound.startsWith('http')
        ? rule.sound
        : `${API_BASE_URL}${soundPath}`;

      preparedAudio = new Audio(soundUrl);
      preparedAudio.volume = rule.volume ?? 1.0;
      preparedAudio.load();
    }

    let count = 5;
    setTestCountdown(count);

    const interval = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(interval);
        setTestCountdown(null);

        if (preparedAudio) {
          preparedAudio.play().catch(err =>
            console.error('Audio playback failed:', err.message)
          );
        } else {
          executeAction(rule);
        }
      } else {
        setTestCountdown(count);
      }
    }, 1000);
  };

  return (
    <EventEngineContext.Provider value={{ rules, refreshRules, triggerTest, testCountdown }}>
      {children}
      {testCountdown !== null && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-2 duration-300">
          <div className="bg-brand/90 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-4 ring-1 ring-black/5">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-2xl font-black text-white tabular-nums shadow-inner">
              {testCountdown}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/70 leading-none">Testing Action</span>
              <span className="text-[11px] font-bold text-white uppercase tracking-tighter">Get Ready!</span>
            </div>
          </div>
        </div>
      )}
    </EventEngineContext.Provider>
  );
};

export const useEventEngine = () => {
  const context = useContext(EventEngineContext);
  if (!context) throw new Error('useEventEngine must be used within EventEngineProvider');
  return context;
};
