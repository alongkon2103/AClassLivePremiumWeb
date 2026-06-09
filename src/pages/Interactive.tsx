import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  ExternalLink,
  Play,
  Info,
  Youtube,
  Download,
  Sparkles,
  Search,
  Loader2,
  Gamepad2,
  Gift,
  ArrowRight,
  Gem,
} from 'lucide-react';
import { interactiveApi } from '../services/api';
import { toast } from 'sonner';

const Interactive: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);


  // Helper to get localized field
  const getLocalized = (obj: any, field: string) => {
    const isEn = i18n.language.startsWith('en');
    if (isEn && obj[`${field}_en`]) return obj[`${field}_en`];
    if (!isEn && obj[`${field}_th`]) return obj[`${field}_th`];
    // Fallbacks
    return obj[`${field}_th`] || obj[`${field}_en`] || obj[field];
  };

  // Tiptap stores description as HTML — strip tags for preview/line-clamp.
  const stripHtml = (html: string) =>
    (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // The API already filters this to products the user has a paid,
        // non-expired order for.
        const res = await interactiveApi.getStoreProducts();
        setProducts(res.data?.data || []);
      } catch (err) {
        console.error('Failed to fetch store products', err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const handleDeploy = async (product: any) => {
    setIsDeploying(true);
    try {
      await interactiveApi.deployProduct({ productId: product.id });
      toast.success(`${getLocalized(product, 'name')} deployed successfully!`);
      setSelectedProduct(null);
      navigate('/interactive-mapping');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to deploy product');
    } finally {
      setIsDeploying(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name_en.toLowerCase().includes(search.toLowerCase()) ||
    (p.name_th && p.name_th.toLowerCase().includes(search.toLowerCase()))
  );


  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 ">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center">
            <ShoppingBag size={28} className="text-brand animate-pulse" />

          </div>
          <div className="absolute inset-0 rounded-2xl border border-brand/30 animate-ping opacity-30" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
          {t('common.loading')}
        </p>
      </div>
    );
  }

  return (
    <>
    <style>{
      `.im-stagger > * {
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
}`
}</style>
    <div className="flex-1 flex flex-col p-4 md:p-8 gap-6 md:gap-8 overflow-y-auto custom-scrollbar bg-[#08080c] im-stagger">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-brand/10 text-brand rounded-2xl md:rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-brand/10 ring-1 ring-brand/20">
            <ShoppingBag size={24} className="md:hidden" />
            <ShoppingBag size={32} className="hidden md:block" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('interactive.title')}</h1>
            <p className="text-text3 font-medium uppercase tracking-widest text-[9px] md:text-[10px] mt-1 opacity-70">{t('interactive.subtitle')}</p>
          </div>
        </div>

        <div className="relative w-full lg:w-80">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text3" />
          <input
            type="text"
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 md:h-12 bg-surface border border-border rounded-2xl pl-12 pr-4 text-sm focus:outline-none focus:border-brand/50 transition-all shadow-xl"
          />
        </div>
      </div>

      {selectedProduct ? (
        <div className="animate-in fade-in slide-in-from-left-4 duration-500">
          <button
            onClick={() => setSelectedProduct(null)}
            className="flex items-center gap-2 text-text3 hover:text-white mb-6 transition-colors text-[10px] md:text-xs font-bold uppercase tracking-widest"
          >
            <ArrowRight size={14} className="rotate-180" /> {t('common.back')}
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            {/* Product Info */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-6 md:space-y-8">
              <div className="bg-surface border border-border rounded-3xl md:rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="h-64 md:h-[420px] relative group overflow-hidden">
                  <img
                    src={`https://aclassstore.com${selectedProduct.product_images[0]?.url}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    alt={getLocalized(selectedProduct, 'name')}
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex items-end p-6 md:p-10">
                    <div>
                      <h2 className="text-3xl md:text-5xl font-black text-white mb-3">
                        {getLocalized(selectedProduct, 'name')}
                      </h2>

                      <div className="flex flex-wrap items-center gap-3 md:gap-4">
                        <span className="px-3 py-1 md:px-4 md:py-1.5 bg-brand/20 text-brand border border-brand/30 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest">
                          {t('interactive.interactive_ready')}
                        </span>

                        <span className="text-white/60 text-xs md:text-sm font-medium">
                          {t('interactive.built_in_functions', { count: selectedProduct.product_functions.length })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-10 space-y-6 md:space-y-8">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text3 mb-4 flex items-center gap-2">
                      <Info size={16} className="text-brand" /> {t('interactive.description')}
                    </h3>
                    {getLocalized(selectedProduct, 'description') ? (
                      <div
                        className="text-text2 text-sm md:text-base leading-relaxed prose prose-invert prose-sm max-w-none
                          prose-headings:text-white prose-a:text-brand prose-strong:text-white prose-img:rounded-xl
                          prose-table:border prose-table:border-white/10 prose-th:bg-white/5 prose-td:border-white/5"
                        dangerouslySetInnerHTML={{ __html: getLocalized(selectedProduct, 'description') }}
                      />
                    ) : (
                      <p className="text-text2 text-sm md:text-base leading-relaxed">{t('interactive.description')}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 pt-4">
                    <a href={selectedProduct.info_page_url} target="_blank" className="flex items-center justify-center gap-3 p-3 md:p-4 bg-bg border border-border rounded-2xl hover:border-brand/40 transition-all font-bold text-[10px] md:text-xs uppercase tracking-widest text-center">
                      <Gamepad2 size={16} className="text-brand shrink-0" /> {t('interactive.roblox_page')}
                    </a>
                    <a href={selectedProduct.youtube_url} target="_blank" className="flex items-center justify-center gap-3 p-3 md:p-4 bg-bg border border-border rounded-2xl hover:border-red/40 transition-all font-bold text-[10px] md:text-xs uppercase tracking-widest text-center">
                      <Youtube size={16} className="text-red shrink-0" /> {t('interactive.trailer')}
                    </a>
                    <a href={selectedProduct.tutorial_video_url} target="_blank" className="flex items-center justify-center gap-3 p-3 md:p-4 bg-bg border border-border rounded-2xl hover:border-blue-400/40 transition-all font-bold text-[10px] md:text-xs uppercase tracking-widest text-center">
                      <Play size={16} className="text-blue-400 shrink-0" /> {t('interactive.tutorial')}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Function List */}
            <div className="lg:col-span-4 xl:col-span-3 space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text3 px-2 flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" /> {t('interactive.interaction_settings')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 max-h-none lg:max-h-[70vh] overflow-y-auto pr-0 lg:pr-2 custom-scrollbar">
                {selectedProduct.product_functions.map((fn: any) => (
                  <div key={fn.id} className="bg-surface border border-border p-4 md:p-5 rounded-3xl hover:border-brand/30 transition-all shadow-lg group">
                    <div className="flex items-center justify-between mb-3">
                      <div className="px-2 py-0.5 md:px-3 md:py-1 bg-brand/10 text-brand text-[9px] md:text-[10px] font-black rounded-full uppercase">{fn.name}</div>
                      <div className="text-[9px] md:text-[10px] text-text3 font-bold uppercase tracking-tighter italic">{getLocalized(fn, 'label')}</div>
                    </div>
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="flex flex-col items-center gap-2">
                        {fn.image_url && (
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-bg border border-border flex items-center justify-center overflow-hidden mb-1">
                            <img src={`https://aclassstore.com${fn.image_url}`} className="w-full h-full object-cover" alt="fn" />
                          </div>
                        )}
                      </div>
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-bg border border-border flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-110 transition-transform">
                        {fn.default_gift?.image_url ? (
                          <img src={`https://aclassstore.com${fn.default_gift.image_url}`} className="w-full h-full object-contain p-2" alt="gift" />
                        ) : <Gift size={18} className="text-text3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] md:text-xs font-black truncate">
                          {fn.default_gift?.name || t('interactive.any_action')}
                        </div>

                        <div className="mt-1 flex flex-col">
                          <span className="text-[8px] md:text-[9px] font-black text-amber-400 uppercase tracking-widest">
                            {t('interactive.default_gift')}
                          </span>

                          <span className="text-[9px] md:text-[10px] font-mono font-bold text-text3">
                            {fn.default_gift?.diamonds
                              ? `${fn.default_gift.diamonds} coins`
                              : t('interactive.any_amount')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleDeploy(selectedProduct)}
                disabled={isDeploying}
                className="w-full h-11 md:h-13 bg-brand hover:bg-brand-hover text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] shadow-xl shadow-brand/20 active:scale-95 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeploying ? (
                  <>
                    <Loader2 size={16} className="animate-spin shrink-0" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} className="shrink-0" />
                    <span>Apply Preset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 animate-in fade-in zoom-in-95 duration-500">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              className="bg-surface border border-border rounded-3xl md:rounded-[2.5rem] overflow-hidden group cursor-pointer hover:border-brand/40 transition-all shadow-xl hover:shadow-brand/5 relative flex flex-col"
            >
              <div className="h-40 md:h-52 overflow-hidden relative">
                <img
                  src={`https://aclassstore.com${product.product_images[0]?.url}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  alt={getLocalized(product, 'name')}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
              </div>
              <div className="p-4 md:p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-black text-base md:text-lg group-hover:text-brand transition-colors truncate pr-4">{getLocalized(product, 'name')}</h3>
                </div>
                <p className="text-text3 text-[10px] md:text-xs line-clamp-2 min-h-[30px] md:min-h-[32px] leading-relaxed mb-4 flex-1">{stripHtml(getLocalized(product, 'description')) || t('interactive.description')}</p>

                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-brand animate-pulse" />
                    <span className="text-[9px] md:text-[10px] font-black uppercase text-text3 tracking-widest">{t('interactive.interactive_ready')}</span>
                  </div>
                  <ExternalLink size={14} className="text-text3 group-hover:text-brand transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </div>
              {product.is_featured && (
                <div className="absolute top-3 left-3 md:top-4 md:left-4 px-2 py-0.5 md:px-3 md:py-1 bg-brand text-white text-[8px] md:text-[9px] font-black uppercase rounded-full shadow-lg shadow-brand/20 z-10">
                  Featured
                </div>
              )}
            </div>
          ))}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-text3 bg-surface border border-border rounded-3xl border-dashed">
              <Search size={48} className="mb-4 opacity-50" />
              <div className="text-center">
                <p className="font-bold text-lg text-white mb-1">{t('interactive.no_products')}</p>
                <p className="text-sm">{t('interactive.try_different_keyword')}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
};

export default Interactive;
