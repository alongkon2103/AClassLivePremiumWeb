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
import { useTikTok } from '../context/TikTokContext';

// ใน component เพิ่ม
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
  created_at: string;
  expires_at: string | null;
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
  const { roomUser } = useTikTok();

  const [myOrders, setMyOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [savedOrderId, setSavedOrderId] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(() => {
    const stored = localStorage.getItem('aclass_active_order_id');
    return (stored && stored !== 'undefined' && stored !== 'null') ? stored : null;
  });
  // ...
  const [isActivating, setIsActivating] = useState<string | null>(null);
  const [isInteractiveEnabled, setIsInteractiveEnabled] = useState(
    () => localStorage.getItem('aclass_interactive_enabled') !== 'false'
  );

  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [activeMapping, setActiveMapping] = useState<{ orderId: string; functionId: string } | null>(null);
  const [giftSearch, setGiftSearch] = useState('');

  useEffect(() => {
    fetchMyProducts();
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


  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(
      i18n.language.startsWith('th') ? 'th-TH' : 'en-GB',
      { day: '2-digit', month: 'short', year: 'numeric' }
    );
  };
  const handleToggleGameActivation = async (orderId: string) => {
    if (activeOrderId === orderId) {
      setActiveOrderId(null);
      localStorage.removeItem('aclass_active_order_id');
      toast.info('Game session deactivated');
      return;
    }
    setIsActivating(orderId);
    try {
      const username = roomUser || localStorage.getItem('aclass_last_tiktok_user') || 'streamer';
      console.log('🔥 registerSession called:', { orderId, username, roomUser }); // ← เพิ่มตรงนี้
      await interactiveApi.registerSession(orderId, username);
      console.log('✅ registerSession success'); // ← และตรงนี้
      setActiveOrderId(orderId);
      localStorage.setItem('aclass_active_order_id', orderId);
      toast.success('Game session activated successfully');
    } catch (err) {
      console.error('❌ registerSession error:', err); // ← และตรงนี้
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
          let updatedUfgs = [...order.user_function_gifts];

          // ถ้า gift ที่เลือกเป็น 'like' → reset function อื่นที่ใช้ like อยู่ให้เป็น NONE_GIFT
          if (gift.trigger_type === 'like') {
            updatedUfgs = updatedUfgs.map(ufg => {
              if (ufg.function_id !== functionId && ufg.gifts?.trigger_type === 'like') {
                // หาชื่อ function ที่ถูก reset เพื่อแจ้ง user
                toast.info(`"${ufg.gifts.name}" unassigned from previous function`);
                return { ...ufg, gift_id: NONE_GIFT.id, gifts: NONE_GIFT };
              }
              return ufg;
            });
          }

          const existingIdx = updatedUfgs.findIndex(ufg => ufg.function_id === functionId);
          const newUfg: UserFunctionGift = {
            id: updatedUfgs[existingIdx]?.id || 'new',
            function_id: functionId,
            gift_id: gift.id,
            is_enabled: true,
            trigger_threshold: updatedUfgs[existingIdx]?.trigger_threshold || 1,
            gifts: gift,
          };

          if (existingIdx >= 0) updatedUfgs[existingIdx] = newUfg;
          else updatedUfgs.push(newUfg);

          return { ...order, user_function_gifts: updatedUfgs };
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
        .im-root * { font-family: 'DM Sans', sans-serif; }
        .im-mono { font-family: 'DM Mono', monospace !important; }

        .im-card {
          background: rgba(66, 122, 181, 0.04);
          border: 1px solid rgba(66, 122, 181, 0.15);
        }

        .im-fn-row {
          background: rgba(66, 122, 181, 0.03);
          border: 1px solid rgba(66, 122, 181, 0.12);
          transition: background 0.15s;
        }
        .im-fn-row:hover { background: rgba(66, 122, 181, 0.06); }
        .im-fn-row.disabled { opacity: 0.38; filter: saturate(0.3); }

        .im-gift-btn {
          background: rgba(66, 122, 181, 0.04);
          border: 1px solid rgba(66, 122, 181, 0.15);
          transition: background 0.15s;
        }
        .im-gift-btn:hover { background: rgba(66, 122, 181, 0.1); }

        .im-save-btn {
          background: #427AB5;
          border: 1px solid rgba(66, 122, 181, 0.3);
          transition: background 0.15s;
        }
        .im-save-btn:hover:not(:disabled) { background: #4a88c9; }
        .im-save-btn.saved { background: #10b981; }

        .im-badge {
          background: rgba(66, 122, 181, 0.1);
          border: 1px solid rgba(66, 122, 181, 0.25);
          color: #427AB5;
        }

        .im-power-btn { transition: background 0.15s; }
        .im-power-btn.on {
          background: rgba(66, 122, 181, 0.12);
          color: #427AB5;
          border: 1px solid rgba(66, 122, 181, 0.25);
        }
        .im-power-btn.off {
          background: rgba(255,255,255,0.03);
          color: rgba(255,255,255,0.25);
          border: 1px solid rgba(255,255,255,0.06);
        }

        .im-gift-item { transition: background 0.1s; }
        .im-gift-item:hover { background: rgba(66, 122, 181, 0.08); }

        .im-scrollbar::-webkit-scrollbar { width: 4px; }
        .im-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .im-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(66, 122, 181, 0.25);
          border-radius: 99px;
        }
      `}</style>

      <div className="im-root flex-1 flex flex-col bg-[#07070b] overflow-y-auto im-scrollbar">

        {/* Header */}
        <div className="sticky top-0 z-20 bg-[#07070b] border-b border-white/[0.06] px-4 sm:px-8 py-4">
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl im-badge flex items-center justify-center">
              <Zap size={22} strokeWidth={2.5} />
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
        </div>

        {/* Body */}
        <div className="flex-1 px-4 sm:px-8 py-8 max-w-7xl mx-auto w-full">
          {myOrders.length === 0 ? (
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
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {myOrders.map(order => {
                const isSaved = savedOrderId === order.id;
                const isSavingThis = isSaving === order.id;
                const isActive = activeOrderId === order.id;

                return (
                  <div
                    key={order.id}
                    className={`im-card rounded-3xl overflow-hidden flex flex-col ${isActive ? 'ring-2 ring-brand' : 'opacity-60 grayscale-[0.5]'}`}
                  >
                    {/* Card Header */}
                    <div className="px-6 pt-6 pb-5 border-b border-white/[0.06]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <button
                            onClick={() => handleToggleGameActivation(order.id)}
                            disabled={isActivating === order.id}
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${isActive ? 'bg-brand text-white' : 'bg-white/[0.03] border border-white/[0.06] text-white/20 hover:text-white/40'}`}
                          >
                            {isActivating === order.id
                              ? <Loader2 size={20} className="animate-spin" />
                              : <Power size={20} strokeWidth={2.5} />
                            }
                          </button>
                          <div className="min-w-0">
                            <h2 className="text-base font-black text-white truncate leading-tight">
                              {getLocalized(order.products, 'name')}
                            </h2>

                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className={`im-mono text-[8px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-lg border ${isActive ? 'bg-brand border-brand text-white' : 'bg-white/5 border-white/10 text-white/30'}`}>
                                {isActive ? 'CONNECTED' : 'DISCONNECTED'}
                              </span>
                              <span className="im-mono text-[8px] text-white/25 uppercase tracking-[0.15em]">
                                {t('interactive_mapping.built_in_functions', { count: order.products.product_functions.length })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="im-mono text-[8px] text-white/20 tracking-[0.1em]">
                                SINCE {formatDate(order.created_at)}
                              </span>
                              {order.expires_at && (
                                <span className={`im-mono text-[8px] px-2 py-0.5 rounded-lg border ${new Date(order.expires_at) < new Date()
                                  ? 'text-red-400 border-red-500/20 bg-red-500/10'
                                  : 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10'
                                  }`}>
                                  {new Date(order.expires_at) < new Date() ? 'EXPIRED' : 'EXP'} {formatDate(order.expires_at)}
                                </span>
                              )}
                            </div>


                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleDeleteProduct(order.id)}
                            className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/25 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => saveMappings(order.id)}
                            disabled={isSavingThis || isSaved || !isActive}
                            className={`im-save-btn flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold disabled:opacity-30 ${isSaved ? 'saved' : ''}`}
                          >
                            {isSavingThis ? <Loader2 size={13} className="animate-spin" />
                              : isSaved ? <Check size={13} />
                                : <Save size={13} />}
                            <span className="hidden sm:inline">
                              {isSaved ? t('interactive_mapping.save_success') : t('interactive_mapping.save_to_cloud')}
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
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {fn.image_url && (
                                <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] overflow-hidden shrink-0">
                                  <img src={getFullImageUrl(fn.image_url)} className="w-full h-full object-cover" alt={fn.name} />
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

                            <div className="flex items-center gap-2 shrink-0">
                              {actualGift?.trigger_type === 'like' && isEnabled && (
                                <div className="flex items-center gap-2 mr-1 px-2 py-1 bg-white/[0.03] border border-white/[0.08] rounded-xl">
                                  <Heart size={12} className="text-pink-400" fill="currentColor" />
                                  <input
                                    type="number"
                                    min="1"
                                    value={mapping?.trigger_threshold || 1}
                                    onClick={e => e.stopPropagation()}
                                    onMouseDown={e => e.stopPropagation()}
                                    onChange={e => handleUpdateThreshold(order.id, fn.id, parseInt(e.target.value) || 1)}
                                    className="w-16 bg-transparent outline-none im-mono text-xs font-bold text-white text-center"
                                  />
                                </div>
                              )}

                              <button
                                onClick={() => {
                                  if (!isEnabled || !isActive) return;
                                  setActiveMapping({ orderId: order.id, functionId: fn.id });
                                  setGiftSearch('');
                                  setIsGiftModalOpen(true);
                                }}
                                disabled={!isEnabled || !isActive}
                                className={`im-gift-btn flex items-center gap-2.5 px-3 py-2 rounded-xl ${!isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center overflow-hidden shrink-0">
                                  {actualGift?.image_url
                                    ? <img src={getFullImageUrl(actualGift.image_url)} className="w-full h-full object-contain p-0.5" alt="gift" />
                                    : <Gift size={13} className="text-white/30" />
                                  }
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

                              <button
                                onClick={() => { if (isActive) handleToggleFunction(order.id, fn.id); }}
                                disabled={!isActive}
                                className={`im-power-btn w-9 h-9 rounded-xl flex items-center justify-center ${isEnabled ? 'on' : 'off'} ${!isActive ? 'opacity-30 cursor-not-allowed' : ''}`}
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

      {/* Gift Selection Modal — simplified, no blur/animation */}
      {isGiftModalOpen && activeMapping && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={e => { if (e.target === e.currentTarget) setIsGiftModalOpen(false); }}
        >
          <div className="bg-[#111116] border border-white/[0.1] w-full sm:w-[440px] rounded-2xl overflow-hidden flex flex-col max-h-[80vh]">

            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gift size={18} className="text-[#427AB5]" />
                <h3 className="text-sm font-bold text-white">{t('interactive_mapping.select_gift')}</h3>
              </div>
              <button
                onClick={() => setIsGiftModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center text-white/40 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  placeholder={t('interactive_mapping.search_gifts')}
                  value={giftSearch}
                  onChange={e => setGiftSearch(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.08] h-9 rounded-lg pl-8 pr-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#427AB5]"
                  autoFocus
                />
              </div>
            </div>

            {/* Gift List */}
            <div className="overflow-y-auto im-scrollbar p-2 flex flex-col gap-0.5">
              {/* None option */}
              <button
                onClick={() => handleUpdateGift(activeMapping.orderId, activeMapping.functionId, NONE_GIFT)}
                className="im-gift-item flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left border border-dashed border-white/[0.07]"
              >
                <div className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/30 shrink-0">
                  <Sparkles size={15} />
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
                  className="im-gift-item flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                    {gift.image_url
                      ? <img src={getFullImageUrl(gift.image_url)} alt={gift.name} className="w-full h-full object-contain" />
                      : <Gift size={15} className="text-white/25" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{gift.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Gem size={9} className="text-amber-400" fill="currentColor" />
                      <span className="im-mono text-[9px] text-amber-400">{gift.diamonds}</span>
                    </div>
                  </div>
                </button>
              ))}

              {filteredGifts.length === 0 && (
                <div className="py-12 flex flex-col items-center gap-3 text-white/20">
                  <Gift size={26} />
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