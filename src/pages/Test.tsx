import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, 
  Shield, 
  Keyboard, 
  Terminal, 
  Volume2, 
  Radio, 
  Heart, 
  UserPlus, 
  Share2, 
  MessageSquare, 
  Gift, 
  Play, 
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  Dices
} from 'lucide-react';
import { useEventEngine } from '../context/EventEngineContext';
import { useAdmin, RuleEvent, RuleAction } from '../context/AdminContext';
import { useOverlay } from '../context/OverlayContext';
import { useTikTok } from '../context/TikTokContext';
import { useMinecraft } from '../context/MinecraftContext';
import { toast } from 'sonner';

const TestCard = ({ title, icon: Icon, children, color = "text-brand" }: any) => (
  <div className="bg-surface border border-border rounded-[2rem] p-6 shadow-xl hover:shadow-brand/5 transition-all group overflow-hidden relative">
    <div className="flex items-center gap-3 mb-6 relative z-10">
      <div className={`w-10 h-10 rounded-xl bg-bg border border-border flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
        <Icon size={20} />
      </div>
      <h2 className="font-bold text-sm uppercase tracking-widest">{title}</h2>
    </div>
    <div className="relative z-10">{children}</div>
    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
      <Icon size={80} />
    </div>
  </div>
);

const Test: React.FC = () => {
  const { triggerTest, testCountdown } = useEventEngine();
  const { gifts } = useAdmin();
  const { settings, triggerSpin, handleQuickAdjust } = useOverlay();
  const { connected: tiktokConnected, roomUser } = useTikTok();
  const { status: mcStatus, config: mcConfig } = useMinecraft();
  const mcConnected = mcStatus === 'connected';

  const [hwid, setHwid] = useState<string>('Loading...');
  const [selectedGiftId, setSelectedGiftId] = useState<number | null>(null);

  useEffect(() => {
    if (window.electron) {
      window.electron.invoke('get-hwid').then(setHwid);
    }
  }, []);

  const simulateEvent = (type: RuleEvent, data: any = {}) => {
    if (!window.electron) {
      toast.error('Electron environment not detected');
      return;
    }
    
    // In a real scenario, this would go through the tiktok-live-connector
    // Here we simulate the IPC message that EventEngineContext is listening for
    const simulatedMessage = { type: type.toLowerCase(), data };
    
    // We dispatch a custom event to our own window so EventEngineContext can catch it if we add a listener,
    // but the EventEngineContext is listening to window.electron.on('tiktok:event')...
    // So we'll use a direct execute-like approach or just toast for now since we can't easily emit IPC from renderer to itself.
    // UPDATE: We can call triggerTest with a temporary rule!
    
    const tempRule: any = {
      id: 'test-rule',
      event: type,
      action: RuleAction.SOUND_PLAY, // default test action
      condition: data,
      volume: 1.0,
      key: 'Space'
    };

    toast.info(`Simulating ${type} event...`);
    triggerTest(tempRule);
  };

  const handleNativeKeyTest = () => {
    if (window.electron) {
      window.electron.send('keyboard:press', 'Control + Shift + T');
      toast.success('Sent "Ctrl+Shift+T" to system');
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8 gap-8 overflow-y-auto custom-scrollbar bg-[#08080c]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-brand/10 text-brand rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-brand/10 ring-1 ring-brand/20">
            <FlaskConical size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Lab</h1>
            <p className="text-text3 font-medium uppercase tracking-widest text-[10px] mt-1 opacity-70">Pre-stream diagnostic & simulation center</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 text-[10px] font-bold uppercase transition-all ${tiktokConnected ? 'bg-green/10 border-green/20 text-green' : 'bg-red/10 border-red/20 text-red'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${tiktokConnected ? 'bg-green animate-pulse' : 'bg-red'}`} />
              TikTok: {tiktokConnected ? `@${roomUser}` : 'Offline'}
            </div>
            <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 text-[10px] font-bold uppercase transition-all ${mcConnected ? 'bg-green/10 border-green/20 text-green' : 'bg-red/10 border-red/20 text-red'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${mcConnected ? 'bg-green animate-pulse' : 'bg-red'}`} />
              Minecraft: {mcConnected ? 'Ready' : 'Not Linked'}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* TikTok Event Simulator */}
        <TestCard title="TikTok Simulator" icon={Radio} color="text-pink">
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => simulateEvent(RuleEvent.LIKE, { likeCount: 100 })}
              className="flex flex-col items-center gap-2 p-4 bg-bg border border-border rounded-2xl hover:border-pink/40 hover:bg-pink/5 transition-all active:scale-95"
            >
              <Heart className="text-pink" size={20} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Fake Like</span>
            </button>
            <button 
              onClick={() => simulateEvent(RuleEvent.FOLLOW)}
              className="flex flex-col items-center gap-2 p-4 bg-bg border border-border rounded-2xl hover:border-brand/40 hover:bg-brand/5 transition-all active:scale-95"
            >
              <UserPlus className="text-brand" size={20} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Fake Follow</span>
            </button>
            <button 
              onClick={() => simulateEvent(RuleEvent.SHARE)}
              className="flex flex-col items-center gap-2 p-4 bg-bg border border-border rounded-2xl hover:border-emerald-400/40 hover:bg-emerald-400/5 transition-all active:scale-95"
            >
              <Share2 className="text-emerald-400" size={20} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Fake Share</span>
            </button>
            <button 
              onClick={() => simulateEvent(RuleEvent.COMMENT, { comment: 'Hello world' })}
              className="flex flex-col items-center gap-2 p-4 bg-bg border border-border rounded-2xl hover:border-blue-400/40 hover:bg-blue-400/5 transition-all active:scale-95"
            >
              <MessageSquare className="text-blue-400" size={20} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Fake Chat</span>
            </button>
          </div>
          
          <div className="mt-4 space-y-2">
             <label className="text-[9px] font-bold uppercase text-text3 ml-1">Test specific gift</label>
             <div className="flex gap-2">
                <select 
                  className="flex-1 bg-bg border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-violet-500/50"
                  onChange={(e) => setSelectedGiftId(Number(e.target.value))}
                >
                  <option value="">Select Gift...</option>
                  {gifts.slice(0, 20).map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.diamonds} coins)</option>
                  ))}
                </select>
                <button 
                  disabled={!selectedGiftId}
                  onClick={() => simulateEvent(RuleEvent.GIFT, { giftId: selectedGiftId })}
                  className="w-10 h-10 rounded-xl bg-violet-500 text-white flex items-center justify-center hover:bg-violet-600 disabled:opacity-30 transition-all active:scale-95"
                >
                  <Play size={16} fill="currentColor" />
                </button>
             </div>
          </div>
        </TestCard>

        {/* Native & Hardware */}
        <TestCard title="Hardware Lab" icon={Keyboard} color="text-amber">
          <div className="space-y-4">
             <div className="p-4 bg-bg rounded-2xl border border-border space-y-3">
                <div className="flex justify-between items-center">
                   <span className="text-[10px] font-bold text-text3 uppercase">Hardware ID</span>
                   <span className="text-[10px] font-mono text-amber-400 font-bold">{hwid}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                   <span className="text-[10px] font-bold text-text3 uppercase">Key Press</span>
                   <button 
                    onClick={handleNativeKeyTest}
                    className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg text-[9px] font-black uppercase hover:bg-amber-500/20 transition-all"
                   >
                     Trigger "T"
                   </button>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                   <span className="text-[10px] font-bold text-text3 uppercase">RCON Link</span>
                   {mcConnected ? (
                     <CheckCircle2 size={14} className="text-green" />
                   ) : (
                     <AlertTriangle size={14} className="text-red" />
                   )}
                </div>
             </div>

             <button 
               className="w-full h-12 rounded-2xl bg-surface2 border border-border flex items-center justify-center gap-2 text-xs font-bold hover:bg-white/5 transition-all active:scale-[0.98]"
               onClick={() => {
                 const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
                 audio.play();
                 toast.info('Playing test audio...');
               }}
             >
               <Volume2 size={16} className="text-violet-400" />
               Test Audio Output
             </button>
          </div>
        </TestCard>

        {/* Overlay Preview */}
        <TestCard title="Overlay Debug" icon={Monitor} color="text-emerald-400">
           <div className="space-y-4">
              <div className="aspect-video bg-bg rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 p-4 text-center">
                 <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center">
                       <span className="text-[8px] font-black text-text3 uppercase mb-1">Win Count</span>
                       <div className="text-2xl font-black text-green">{settings.winCount}</div>
                    </div>
                    <div className="w-[1px] h-8 bg-white/10" />
                    <div className="flex flex-col items-center">
                       <span className="text-[8px] font-black text-text3 uppercase mb-1">Spin Seq</span>
                       <div className="text-2xl font-black text-brand">{settings.spinSeq}</div>
                    </div>
                 </div>
                 <p className="text-[9px] text-text3 leading-relaxed mt-2 italic">Live data synced from Local Server<br/>Port: 5555</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <button 
                   onClick={() => handleQuickAdjust(1)}
                   className="h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase hover:bg-emerald-500/20 transition-all"
                 >
                   Win +1
                 </button>
                 <button 
                   onClick={triggerSpin}
                   className="h-10 rounded-xl bg-brand/10 border border-brand/20 text-brand text-[10px] font-bold uppercase hover:bg-brand/20 transition-all flex items-center justify-center gap-2"
                 >
                   <Dices size={14} /> Spin!
                 </button>
              </div>
           </div>
        </TestCard>

      </div>

      {/* Lab Safety Footer */}
      <div className="mt-auto bg-amber-500/5 border border-amber-500/10 rounded-3xl p-6 flex items-start gap-4">
         <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Shield size={24} />
         </div>
         <div>
            <h3 className="text-amber-200 font-bold text-sm">Lab Safety Protocol</h3>
            <p className="text-amber-200/60 text-xs mt-1 leading-relaxed max-w-2xl">
              ใช้หน้านี้เพื่อตรวจสอบการตั้งค่าก่อนเริ่มไลฟ์สดทุกครั้ง ระบบจำลองเหตุการณ์ TikTok จะทำงานเหมือนมีการส่งข้อมูลจริงเข้ามา 
              ช่วยให้คุณมั่นใจได้ว่า Overlay ใน OBS และการเชื่อมต่อ RCON จะทำงานได้อย่างถูกต้อง 100% ระหว่างสตรีม
            </p>
         </div>
      </div>

    </div>
  );
};

export default Test;
