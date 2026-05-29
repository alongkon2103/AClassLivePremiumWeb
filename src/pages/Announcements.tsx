import React, { useState, useEffect } from 'react';
import { Megaphone, Calendar, ChevronRight, Info, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { announcementApi } from '../services/api';
import { Announcement } from '../context/AdminContext';

const Announcements: React.FC = () => {
  const { t } = useTranslation();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await announcementApi.getAnnouncements();
        setAnnouncements(res.data);
      } catch (err) {
        console.error('Failed to fetch announcements', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, []);


  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl  flex items-center justify-center">
            <Megaphone size={28} className="text-brand animate-pulse" />
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
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-brand/10 text-brand rounded-2xl md:rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-brand/10 ring-1 ring-brand/20">
            <Megaphone size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('announcements.title')}</h1>
            <p className="text-text3 font-medium uppercase tracking-widest text-[9px] md:text-[10px] mt-1 opacity-70">{t('announcements.subtitle')}</p>
          </div>
        </div>

        {announcements.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-30">
            <Megaphone size={64} className="mb-4" />
            <h2 className="text-xl font-bold uppercase tracking-widest">{t('announcements.no_announcements')}</h2>
            <p className="text-sm">Stay tuned for future updates!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className={`group bg-surface border border-border rounded-3xl overflow-hidden transition-all hover:border-brand/30 shadow-xl ${!ann.isActive ? 'opacity-50 grayscale' : ''}`}
              >
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6">
                  {/* Date Side */}
                  <div className="flex md:flex-col items-center justify-center md:justify-start gap-2 md:w-24 shrink-0 border-b md:border-b-0 md:border-r border-white/5 pb-4 md:pb-0 md:pr-6">
                    <div className="p-2 bg-brand/10 text-brand rounded-xl">
                      <Calendar size={20} />
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-black text-brand uppercase">{new Date(ann.createdAt).toLocaleDateString('en-US', { month: 'short' })}</div>
                      <div className="text-2xl font-black text-white">{new Date(ann.createdAt).getDate()}</div>
                      <div className="text-[10px] font-bold text-text3 opacity-50 uppercase tracking-widest">{new Date(ann.createdAt).getFullYear()}</div>
                    </div>
                  </div>

                  {/* Content Side */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="text-xl font-black text-white group-hover:text-brand transition-colors">
                        {ann.title}
                      </h2>
                      {!ann.isActive && (
                        <span className="px-2 py-0.5 bg-surface2 text-text3 text-[9px] font-black rounded uppercase">{t('announcements.archived')}</span>
                      )}
                    </div>
                    
                    {ann.imageUrl && (
                      <div className="w-full h-48 md:h-64 rounded-2xl overflow-hidden border border-white/5 bg-bg/50 relative">
                        <img 
                          src={`${ann.imageUrl}`} 
                          alt={ann.title} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                             (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    <div className="bg-bg/50 rounded-2xl p-5 border border-white/5 overflow-hidden">
                      <div 
                        className="text-text2 text-sm leading-relaxed prose prose-invert prose-sm max-w-none 
                          prose-headings:text-white prose-a:text-brand prose-strong:text-white prose-img:rounded-xl
                          prose-table:border prose-table:border-white/10 prose-th:bg-white/5 prose-td:border-white/5"
                        dangerouslySetInnerHTML={{ __html: ann.content }}
                      />
                    </div>

                    <div className="flex items-center gap-6 pt-2">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-text3 uppercase tracking-widest">
                        <Info size={14} className="text-brand" />
                        {t('announcements.official_release')}
                      </div>
                      {ann.isActive && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                          <Sparkles size={14} />
                          {t('announcements.active_update')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-center md:pl-4">
                    <ChevronRight size={24} className="text-text3 group-hover:text-brand group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Announcements;
