// import React, { useEffect, useRef, useState } from 'react';
// import { useOverlay } from '../../context/OverlayContext';
// import { Eye, Settings, PowerOff, Loader2 } from 'lucide-react';

// interface LivePreviewProps {
//   templateUrl: string;
//   title: string;
//   height?: string;
//   aspectRatio?: string;
//   isEnabled?: boolean;
// }

// const LivePreview: React.FC<LivePreviewProps> = ({ 
//   templateUrl, 
//   title, 
//   height = "260px",
//   aspectRatio = "16/9",
//   isEnabled = true
// }) => {
//   const { settings } = useOverlay();
//   const iframeRef = useRef<HTMLIFrameElement>(null);
//   const [isReady, setIsReady] = useState(false);

//   // Force iframe reload when URL or enabled state changes
//   useEffect(() => {
//     setIsReady(false);
//     if (isEnabled) {
//       // Give server a 800ms head start
//       const timer = setTimeout(() => setIsReady(true), 800);
//       return () => clearTimeout(timer);
//     }
//   }, [templateUrl, isEnabled]);

//   // Sync settings to iframe via postMessage whenever they change
//   useEffect(() => {
//     if (isEnabled && isReady && iframeRef.current && iframeRef.current.contentWindow) {
//       iframeRef.current.contentWindow.postMessage({
//         type: 'UPDATE_SETTINGS',
//         settings
//       }, '*');
//     }
//   }, [settings, isEnabled, isReady]);

//   return (
//     <div className="space-y-4 w-full h-full flex flex-col">
//       {/* <div className="flex items-center gap-2 text-text2">
//         <Eye size={18} className="text-brand" />
//         <h3 className="text-[11px] font-bold uppercase tracking-[0.2em]">{title}</h3>
//       </div> */}

//       <div 
//         className="w-full flex-1 rounded-[2.5rem] border border-border overflow-hidden shadow-2xl bg-[#050505] relative group"
//         style={{ height: height, aspectRatio }}
//       >
//         {!isEnabled ? (
//           <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#050505]">
//             <div className="w-16 h-16 rounded-3xl bg-red/5 border border-red/10 flex items-center justify-center text-red/20">
//               <PowerOff size={32} />
//             </div>
//             <div className="text-center">
//               <p className="text-xs font-black text-white/40 uppercase tracking-widest">System Offline</p>
//               <p className="text-[10px] text-white/20 mt-1 uppercase tracking-tighter italic">Turn on Master Switch to enable server</p>
//             </div>
//           </div>
//         ) : !isReady ? (
//           <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#050505]">
//             <Loader2 size={24} className="text-brand animate-spin" />
//             <p className="text-[10px] font-black text-brand uppercase tracking-widest animate-pulse">Starting Server...</p>
//           </div>
//         ) : (
//           <iframe
//             ref={iframeRef}
//             src={`${templateUrl}?t=${Date.now()}`}
//             title={title}
//             className="w-full h-full"
//             style={{ border: 'none', background: 'transparent' }}
//             sandbox="allow-scripts allow-same-origin"
//             onLoad={() => {
//               if (iframeRef.current?.contentWindow) {
//                 iframeRef.current.contentWindow.postMessage({
//                   type: 'UPDATE_SETTINGS',
//                   settings
//                 }, '*');
//               }
//             }}
//           />
//         )}

//         {isEnabled && isReady && (
//           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
//             <div className="bg-surface/90 backdrop-blur-md px-4 py-2 rounded-full border border-border flex items-center gap-2">
//               <Settings size={14} className="text-brand animate-spin-slow" />
//               <span className="text-[10px] font-bold text-text2 uppercase tracking-widest">Live Preview Mode</span>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default LivePreview;
import React, { useEffect, useRef, useState } from 'react';
import { useOverlay } from '../../context/OverlayContext';
import { Settings, PowerOff, Loader2 } from 'lucide-react';

interface LivePreviewProps {
  templateUrl: string;
  title: string;
  height?: string;
  aspectRatio?: string;
  isEnabled?: boolean;
  isSpin?: boolean;
}

const LivePreview: React.FC<LivePreviewProps> = ({
  templateUrl,
  title,
  height = "260px",
  aspectRatio = "16/9",
  isEnabled = true,
  isSpin = false,
}) => {
  const { settings } = useOverlay();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);

  const srcRef = useRef(`${templateUrl}?t=${Date.now()}`);

  useEffect(() => {
    srcRef.current = `${templateUrl}?t=${Date.now()}`;
    setIsReady(false);
    if (isEnabled) {
      const timer = setTimeout(() => setIsReady(true), 800);
      return () => clearTimeout(timer);
    }
  }, [templateUrl, isEnabled]);

  // ✅ Sync settings — win overlay เท่านั้น, spin รับผ่าน SSE โดยตรง
  useEffect(() => {
    if (!isEnabled || !isReady || isSpin) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: 'UPDATE_SETTINGS', settings }, '*');
  }, [settings, isEnabled, isReady, isSpin]);

  // ✅ onLoad — win overlay เท่านั้น, spin ไม่ต้องทำอะไร
  const handleLoad = () => {
    if (isSpin) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: 'UPDATE_SETTINGS', settings }, '*');
  };

  return (
    <div className="space-y-4 w-full h-full flex flex-col">
      <div
        className="w-full flex-1 rounded-[2.5rem] border border-border overflow-hidden shadow-2xl bg-[#050505] relative group"
        style={{ height, aspectRatio }}
      >
        {!isEnabled ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#050505]">
            <div className="w-16 h-16 rounded-3xl bg-red/5 border border-red/10 flex items-center justify-center text-red/20">
              <PowerOff size={32} />
            </div>
            <div className="text-center">
              <p className="text-xs font-black text-white/40 uppercase tracking-widest">System Offline</p>
              <p className="text-[10px] text-white/20 mt-1 uppercase tracking-tighter italic">
                Turn on Master Switch to enable server
              </p>
            </div>
          </div>
        ) : !isReady ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#050505]">
            <Loader2 size={24} className="text-brand animate-spin" />
            <p className="text-[10px] font-black text-brand uppercase tracking-widest animate-pulse">
              Starting Server...
            </p>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={srcRef.current}
            title={title}
            className="w-full h-full"
            style={{ border: 'none', background: 'transparent' }}
            onLoad={handleLoad}
          />
        )}

        {isEnabled && isReady && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <div className="bg-surface/90 backdrop-blur-md px-4 py-2 rounded-full border border-border flex items-center gap-2">
              <Settings size={14} className="text-brand animate-spin-slow" />
              <span className="text-[10px] font-bold text-text2 uppercase tracking-widest">
                Live Preview Mode
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LivePreview;