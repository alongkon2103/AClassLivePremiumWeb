import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  Loader2,
  Gift,
  Plus,
  Monitor,
  Zap,
  Trash2,
  Save,
  Check,
  Sparkles,
  ArrowRight,
  X,
  ChevronDown,
  Gem,
  Power,
  Gamepad2,
  Heart
} from 'lucide-react';
import { interactiveApi } from '../services/api';
import { useAdmin } from '../context/AdminContext';
import { toast } from 'sonner';

interface TikTokGiftInfo {
  id: number;
  name: string;
  image_url?: string | null;
  diamonds: number;
  trigger_type?: string;
}

interface UserFunctionGift {
  id: string;
  function_id: string;
  gift_id: number;
  is_enabled: boolean;
  trigger_threshold?: number | null;
  gifts: TikTokGiftInfo;
}

interface ProductFunction {
  id: string;
  name: string;
  label_en: string;
  label_th?: string;
  image_url: string | null;
  sort_order: number;
  default_gift: TikTokGiftInfo | null;
}

interface ProductImage {
  id: string;
  url: string;
}

interface UserOrder {
  id: string;
  products: {
    id: string;
    name_en: string;
    name_th?: string;
    product_images?: ProductImage[];
    product_functions: ProductFunction[];
  };
  user_function_gifts: UserFunctionGift[];
}

const NONE_GIFT: TikTokGiftInfo = {
  id: 10001,
  name: 'None',
  image_url: null,
  diamonds: 0,
  trigger_type: 'GIFT'
};

const InteractiveMapping: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { gifts } = useAdmin();
  const [myOrders, setMyOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [savedOrderId, setSavedOrderId] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(() => {
    const stored = localStorage.getItem('aclass_active_order_id');
    return (stored && stored !== 'undefined' && stored !== 'null') ? stored : null;
  });
  const [isActivating, setIsActivating] = useState<string | null>(null);
  const [isInteractiveEnabled, setIsInteractiveEnabled] = useState(
    () => localStorage.getItem('aclass_interactive_enabled') !== 'false'
  );

  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [activeMapping, setActiveMapping] = useState<{ orderId: string; functionId: string } | null>(null);
  const [giftSearch, setGiftSearch] = useState('');

  useEffect(() => {
    fetchMyProducts();
    // Auto-register session if activeOrderId exists
    const stored = localStorage.getItem('aclass_active_order_id');
    const storedActiveId = (stored && stored !== 'undefined' && stored !== 'null') ? stored : null;
    
    if (storedActiveId) {
      const username = localStorage.getItem('aclass_last_tiktok_user') || 'streamer';
      interactiveApi.registerSession(storedActiveId, username).catch(err => {
        console.warn('Auto-registration failed:', err);
      });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('aclass_interactive_enabled', isInteractiveEnabled.toString());
    window.dispatchEvent(new CustomEvent('interactive-toggle', { detail: isInteractiveEnabled }));
  }, [isInteractiveEnabled]);

  const handleToggleGameActivation = async (orderId: string, tiktokUsername?: string) => {
    if (activeOrderId === orderId) {
      // Deactivate
      setActiveOrderId(null);
      localStorage.removeItem('aclass_active_order_id');
      toast.info('Game session deactivated');
      return;
    }

    // Activate
    setIsActivating(orderId);
    try {
      const username = tiktokUsername || localStorage.getItem('aclass_last_tiktok_user') || 'streamer';
      await interactiveApi.registerSession(orderId, username);
      
      setActiveOrderId(orderId);
      localStorage.setItem('aclass_active_order_id', orderId);
      toast.success('Game session activated successfully');
    } catch (err) {
      toast.error('Failed to activate game session');
    } finally {
      setIsActivating(null);
    }
  };

  const fetchMyProducts = async () => {
    try {
      const res = await interactiveApi.getMyProducts();
      setMyOrders(res.data);
    } catch (err) {
      toast.error('Failed to load your products');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGift = (orderId: string, functionId: string, gift: TikTokGiftInfo) => {
    setMyOrders(prev =>
      prev.map(order => {
        if (order.id === orderId) {
          const existingIdx = order.user_function_gifts.findIndex(ufg => ufg.function_id === functionId);
          const newUfg: UserFunctionGift = {
            id: order.user_function_gifts[existingIdx]?.id || 'new',
            function_id: functionId,
            gift_id: gift.id,
            is_enabled: true,
            trigger_threshold: order.user_function_gifts[existingIdx]?.trigger_threshold || 1,
            gifts: gift,
          };
          const newUserFunctionGifts = [...order.user_function_gifts];
          if (existingIdx >= 0) newUserFunctionGifts[existingIdx] = newUfg;
          else newUserFunctionGifts.push(newUfg);
          return { ...order, user_function_gifts: newUserFunctionGifts };
        }
        return order;
      })
    );
    setIsGiftModalOpen(false);
    setActiveMapping(null);
  };

  const handleUpdateThreshold = (orderId: string, functionId: string, threshold: number) => {
    setMyOrders(prev =>
      prev.map(order => {
        if (order.id === orderId) {
          return {
            ...order,
            user_function_gifts: order.user_function_gifts.map(ufg =>
              ufg.function_id === functionId ? { ...ufg, trigger_threshold: threshold } : ufg
            ),
          };
        }
        return order;
      })
    );
  };

  const handleToggleFunction = (orderId: string, functionId: string) => {
    setMyOrders(prev =>
      prev.map(order => {
        if (order.id === orderId) {
          return {
            ...order,
            user_function_gifts: order.user_function_gifts.map(ufg =>
              ufg.function_id === functionId ? { ...ufg, is_enabled: !ufg.is_enabled } : ufg
            ),
          };
        }
        return order;
      })
    );
  };

  const saveMappings = async (orderId: string) => {
    const order = myOrders.find(o => o.id === orderId);
    if (!order) return;
    setIsSaving(orderId);
    try {
      const mappings = order.user_function_gifts.map((ufg: any) => ({
        functionId: ufg.function_id,
        giftId: ufg.gift_id,
        isEnabled: ufg.is_enabled,
        triggerThreshold: ufg.trigger_threshold
      }));
      await interactiveApi.updateMapping(orderId, mappings);
      setSavedOrderId(orderId);
      setTimeout(() => setSavedOrderId(null), 2000);
      toast.success(t('interactive_mapping.mappings_saved'));
    } catch (err) {
      toast.error(t('interactive_mapping.mappings_save_failed'));
    } finally {
      setIsSaving(null);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm(t('interactive_mapping.remove_product_confirm'))) return;
    try {
      await interactiveApi.deleteProduct(id);
      setMyOrders(prev => prev.filter(o => o.id !== id));
      toast.success(t('interactive_mapping.product_removed'));
    } catch (err) {
      toast.error(t('interactive_mapping.product_remove_failed'));
    }
  };

  const filteredGifts = React.useMemo(() => {
    let result = gifts.filter(g => g.name.toLowerCase().includes(giftSearch.toLowerCase()));
    result.sort((a, b) => (a.diamonds || 0) - (b.diamonds || 0));
    return result;
  }, [giftSearch, gifts]);

  const getFullImageUrl = (path: string | null | undefined): string | undefined => {
    if (!path) return undefined;
    if (path.startsWith('http')) return path;
    return `https://aclassstore.com${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const getLocalized = (obj: any, field: string) => {
    const isEn = i18n.language.startsWith('en');
    if (isEn && obj[`${field}_en`]) return obj[`${field}_en`];
    if (!isEn && obj[`${field}_th`]) return obj[`${field}_th`];
    return obj[`${field}_th`] || obj[`${field}_en`] || obj[field];
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center">
            <Zap size={28} className="text-brand animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-2xl border border-brand/30 animate-ping opacity-30" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
          {t('interactive_mapping.syncing_data')}
        </p>
      </div>
    );
  }

  return (
    <>
      <style>{`
       @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');

        .im-root * {
          font-family: 'DM Sans', sans-serif;
        }

        .im-mono {
          font-family: 'DM Mono', monospace !important;
        }

        .im-card {
          background: rgba(66, 122, 181, 0.04);
          border: 1px solid rgba(66, 122, 181, 0.15);
          backdrop-filter: blur(12px);
          transition: border-color 0.25s, background 0.25s;
        }



        .im-fn-row {
          background: rgba(66, 122, 181, 0.03);
          border: 1px solid rgba(66, 122, 181, 0.12);
          transition: all 0.2s;
        }

        .im-fn-row:hover {
          background: rgba(66, 122, 181, 0.06);
          border-color: rgba(66, 122, 181, 0.25);
        }

        .im-fn-row.disabled {
          opacity: 0.38;
          filter: saturate(0.3);
        }

        .im-gift-btn {
          background: rgba(66, 122, 181, 0.04);
          border: 1px solid rgba(66, 122, 181, 0.15);
          transition: all 0.2s;
        }

        .im-gift-btn:hover {
          background: rgba(66, 122, 181, 0.08);
          border-color: #427AB5;
        }

        .im-toggle-track {
          transition: background 0.3s;
        }

        .im-toggle-thumb {
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .im-save-btn {
          background: #427AB5;
          border: 1px solid rgba(66, 122, 181, 0.3);
          transition: all 0.2s;
        }

        .im-save-btn:hover:not(:disabled) {
          background: #4a88c9;
        }

        .im-save-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .im-save-btn.saved {
          background: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .im-modal-overlay {
          animation: fadeIn 0.15s ease;
        }

        .im-modal-panel {
          animation: slideUp 0.2s cubic-bezier(0.34, 1.4, 0.64, 1);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .im-gift-item {
          transition: background 0.15s;
        }

        .im-gift-item:hover {
          background: rgba(66, 122, 181, 0.08);
        }

        .im-scrollbar::-webkit-scrollbar {
          width: 4px;
        }

        .im-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .im-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(66, 122, 181, 0.25);
          border-radius: 99px;
        }

        .im-power-btn {
          transition: all 0.2s;
        }

        .im-power-btn.on {
          background: rgba(66, 122, 181, 0.12);
          color: #427AB5;
          border: 1px solid rgba(66, 122, 181, 0.25);
        }

        .im-power-btn.on:hover {
          background: rgba(66, 122, 181, 0.2);
        }

        .im-power-btn.off {
          background: rgba(255, 255, 255, 0.03);
          color: rgba(255, 255, 255, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .im-power-btn.off:hover {
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.5);
        }

        .im-badge {
          background: rgba(66, 122, 181, 0.1);
          border: 1px solid rgba(66, 122, 181, 0.25);
          color: #427AB5;
        }

        .im-dot-on {
          background: #427AB5;
          animation: pulse-dot 2s infinite;
        }

        .im-dot-off {
          background: rgba(255, 255, 255, 0.2);
        }

        @keyframes pulse-dot {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }

        .im-stagger > * {
          animation: staggerIn 0.4s ease both;
        }

        .im-stagger > *:nth-child(1) {
          animation-delay: 0ms;
        }

        .im-stagger > *:nth-child(2) {
          animation-delay: 60ms;
        }

        .im-stagger > *:nth-child(3) {
          animation-delay: 120ms;
        }

        .im-stagger > *:nth-child(4) {
          animation-delay: 180ms;
        }

        @keyframes staggerIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div className="im-root flex-1 flex flex-col bg-[#07070b] overflow-y-auto im-scrollbar">
        {/* ── Header ── */}
        <div className="sticky top-0 z-20 bg-[#07070b]/90 backdrop-blur-xl border-b border-white/[0.06] px-4 sm:px-8 py-4">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
            {/* Title */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl im-badge flex items-center justify-center text-violet-400">
                  <Zap size={22} strokeWidth={2.5} />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-black text-white tracking-tight leading-none">
                  {t('interactive_mapping.title')}
                </h1>
                <p className="im-mono text-[9px] text-white/30 tracking-[0.2em] uppercase mt-0.5">
                  {t('interactive_mapping.subtitle')}
                </p>
              </div>
            </div>

            {/* Global Toggle */}
            {/* <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${isInteractiveEnabled ? 'im-dot-on' : 'im-dot-off'}`} />
                <span
                  className={`im-mono text-[9px] font-bold uppercase tracking-[0.15em] ${isInteractiveEnabled
                    ? 'text-[var(--brand)]'
                    : 'text-white/30'
                    }`}
                >
                  {isInteractiveEnabled
                    ? t('interactive_mapping.store_link_active')
                    : t('interactive_mapping.store_link_paused')}
                </span>
              </div>
              <button
                onClick={() => setIsInteractiveEnabled(!isInteractiveEnabled)}
                className={`relative h-6 w-11 rounded-full transition-colors ${isInteractiveEnabled
                  ? 'bg-[var(--brand)]'
                  : 'bg-white/10'
                  }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all duration-300 ${isInteractiveEnabled
                    ? 'left-6'
                    : 'left-1'
                    }`}
                />
              </button>
            </div> */}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 px-4 sm:px-8 py-8 max-w-7xl mx-auto w-full">
          {myOrders.length === 0 ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-6 py-32 text-center">
              <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                <ShoppingBag size={32} className="text-white/20" />
              </div>
              <div>
                <p className="text-xl font-black text-white">{t('interactive_mapping.no_products')}</p>
                <p className="text-sm text-white/40 mt-2 max-w-xs mx-auto leading-relaxed">
                  {t('interactive_mapping.visit_store')}
                </p>
              </div>
              <button
                onClick={() => navigate('/interactive')}
                className="im-save-btn flex items-center gap-2 px-6 py-3 rounded-2xl text-white text-sm font-bold"
              >
                <ShoppingBag size={15} />
                {t('interactive_mapping.browse_store')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 im-stagger">
              {myOrders.map(order => {
                const isSaved = savedOrderId === order.id;
                const isSavingThis = isSaving === order.id;

                return (
                  <div key={order.id} className={`im-card rounded-3xl overflow-hidden flex flex-col transition-all duration-500 ${activeOrderId === order.id ? 'ring-2 ring-brand shadow-[0_0_30px_rgba(139,92,246,0.1)]' : 'opacity-60 grayscale-[0.5]'}`}>
                    {/* Card Header */}
                    <div className="px-6 pt-6 pb-5 border-b border-white/[0.06]">
                      <div className="flex items-start justify-between gap-4">
                        {/* Product Info */}
                        <div className="flex items-center gap-4 min-w-0">
                          <button 
                            onClick={() => handleToggleGameActivation(order.id)}
                            disabled={isActivating === order.id}
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all active:scale-90 ${activeOrderId === order.id ? 'bg-brand text-white ' : 'bg-white/[0.03] border border-white/[0.06] text-white/20 hover:text-white/40'}`}
                          >
                            {isActivating === order.id ? (
                               <Loader2 size={20} className="animate-spin" />
                            ) : (
                               <Power size={20} strokeWidth={2.5} />
                            )}
                          </button>
                          
                          <div className="min-w-0">
                            <h2 className="text-base font-black text-white truncate leading-tight">
                              {getLocalized(order.products, 'name')}
                            </h2>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className={`im-mono text-[8px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-lg border ${activeOrderId === order.id ? 'bg-brand border-brand text-band' : 'bg-white/5 border-white/10 text-white/30'}`}>
                                {activeOrderId === order.id ? 'CONNECTED' : 'DISCONNECTED'}
                              </span>
                              <span className="im-mono text-[8px] text-white/25 uppercase tracking-[0.15em]">
                                {t('interactive_mapping.built_in_functions', { count: order.products.product_functions.length })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleDeleteProduct(order.id)}
                            className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/25 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => saveMappings(order.id)}
                            disabled={isSavingThis || isSaved || activeOrderId !== order.id}
                            className={`im-save-btn flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold disabled:opacity-30 ${isSaved ? 'saved' : ''}`}
                          >
                            {isSavingThis ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : isSaved ? (
                              <Check size={13} />
                            ) : (
                              <Save size={13} />
                            )}
                            <span className="hidden sm:inline">
                              {isSaved
                                ? t('interactive_mapping.save_success')
                                : t('interactive_mapping.save_to_cloud')}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Function Rows */}
                    <div className="p-4 flex flex-col gap-2 flex-1">
                      {order.products.product_functions.map((fn: any) => {
                        const mapping = order.user_function_gifts.find(ufg => ufg.function_id === fn.id);
                        const isEnabled = mapping?.is_enabled ?? true;
                        const actualGift = mapping?.gifts || fn.default_gift;

                        return (
                          <div
                            key={fn.id}
                            className={`im-fn-row rounded-2xl p-3 flex items-center justify-between gap-3 ${!isEnabled ? 'disabled' : ''}`}
                          >
                            {/* Left: Function info */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {fn.image_url && (
                                <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] overflow-hidden shrink-0">
                                  <img
                                    src={getFullImageUrl(fn.image_url)}
                                    className="w-full h-full object-cover"
                                    alt={fn.name}
                                  />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-white truncate leading-tight">
                                  {getLocalized(fn, 'label')}
                                </p>
                                <p className="im-mono text-[9px] text-white/25 uppercase tracking-[0.1em] mt-0.5">
                                  {fn.name}
                                </p>
                              </div>
                            </div>

                            {/* Right: Gift selector + toggle */}
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Threshold Input for LIKE trigger */}
                              {actualGift?.trigger_type === 'like' && isEnabled && (
                                <div className="flex items-center gap-2 mr-1 px-2 py-1 bg-white/[0.03] border border-white/[0.08] rounded-xl group/like transition-all hover:border-pink/40">
                                  <Heart size={12} className="text-pink animate-pulse" fill="currentColor" />
                                  <input
                                    type="number"
                                    min="1"
                                    value={mapping?.trigger_threshold || 1}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onChange={(e) =>
                                      handleUpdateThreshold(
                                        order.id,
                                        fn.id,
                                        parseInt(e.target.value) || 1
                                      )
                                    }
                                    className="w-16 bg-transparent outline-none im-mono text-xs font-bold text-white text-center"
                                  />
                                </div>
                              )}

                              {/* Gift button */}
                              <button
                                onClick={() => {
                                  if (!isEnabled || activeOrderId !== order.id) return;
                                  setActiveMapping({ orderId: order.id, functionId: fn.id });
                                  setIsGiftModalOpen(true);
                                }}
                                disabled={!isEnabled || activeOrderId !== order.id}
                                className={`im-gift-btn flex items-center gap-2.5 px-3 py-2 rounded-xl ${activeOrderId !== order.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center overflow-hidden shrink-0">
                                  {actualGift?.image_url ? (
                                    <img
                                      src={getFullImageUrl(actualGift.image_url)}
                                      className="w-full h-full object-contain p-0.5"
                                      alt="gift"
                                    />
                                  ) : (
                                    <Gift size={13} className="text-white/30" />
                                  )}
                                </div>
                                <div className="hidden sm:block text-left">
                                  <p className="text-xs font-semibold text-white/80 truncate max-w-[90px]">
                                    {actualGift?.name || t('interactive_mapping.any_action')}
                                  </p>
                                  {actualGift && actualGift.id !== 10001 && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <Gem size={8} className="text-amber-400" fill="currentColor" />
                                      <span className="im-mono text-[9px] text-amber-400">{actualGift.diamonds}</span>
                                    </div>
                                  )}
                                </div>
                                <ChevronDown size={12} className="text-white/25 hidden sm:block" />
                              </button>

                              {/* Power toggle */}
                              <button
                                onClick={() => {
                                  if (activeOrderId !== order.id) return;
                                  handleToggleFunction(order.id, fn.id);
                                }}
                                disabled={activeOrderId !== order.id}
                                className={`im-power-btn w-9 h-9 rounded-xl flex items-center justify-center ${isEnabled ? 'on' : 'off'} ${activeOrderId !== order.id ? 'opacity-30 cursor-not-allowed' : ''}`}
                              >
                                <Power size={15} strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Gift Selection Modal ── */}
      {isGiftModalOpen && activeMapping && (
        <div
          className="im-modal-overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={e => { if (e.target === e.currentTarget) setIsGiftModalOpen(false); }}
        >

          <div className="im-modal-panel im-card w-full sm:w-[460px] rounded-3xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl im-badge flex items-center justify-center text-band">
                  <Gift size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{t('interactive_mapping.select_gift')}</h3>
                  <p className="im-mono text-[9px] text-white/25 uppercase tracking-[0.15em] mt-0.5">
                    {t('interactive_mapping.subtitle')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGiftModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-white transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type="text"
                  placeholder={t('interactive_mapping.search_gifts')}
                  value={giftSearch}
                  onChange={e => setGiftSearch(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.07] h-10 rounded-xl pl-9 pr-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-band transition-colors"
                  autoFocus
                />
              </div>
            </div>

            {/* Gift List */}
            <div className="overflow-y-auto im-scrollbar p-3 flex flex-col gap-1">
              {/* None option */}
              <button
                onClick={() => handleUpdateGift(activeMapping.orderId, activeMapping.functionId, NONE_GIFT)}
                className="im-gift-item flex items-center gap-3 p-2.5 rounded-xl w-full text-left border border-dashed border-white/[0.08]"
              >
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/30 shrink-0">
                  <Sparkles size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t('interactive_mapping.any_action')}</p>
                  <p className="im-mono text-[9px] text-white/25 uppercase tracking-[0.1em] mt-0.5">Triggers on any valid event</p>
                </div>
              </button>

              {filteredGifts.map(gift => (
                <button
                  key={gift.id}
                  onClick={() => handleUpdateGift(activeMapping.orderId, activeMapping.functionId, gift)}
                  className="im-gift-item flex items-center gap-3 p-2.5 rounded-xl w-full text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                    {gift.image_url ? (
                      <img src={getFullImageUrl(gift.image_url)} alt={gift.name} className="w-full h-full object-contain" />
                    ) : (
                      <Gift size={16} className="text-white/25" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{gift.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Gem size={9} className="text-amber-400" fill="currentColor" />
                      <span className="im-mono text-[10px] text-amber-400">{gift.diamonds}</span>
                    </div>
                  </div>
                </button>
              ))}

              {filteredGifts.length === 0 && (
                <div className="py-14 flex flex-col items-center gap-3 text-white/20">
                  <Gift size={28} />
                  <p className="text-sm font-bold">{t('interactive_mapping.no_gifts_found')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InteractiveMapping;