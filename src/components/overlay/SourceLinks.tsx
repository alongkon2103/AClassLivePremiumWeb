import React from 'react';
import { ExternalLink, Settings, Copy, Check } from 'lucide-react';

interface SourceLinksProps {
  title: string;
  url: string;
  instructions?: string;
}

const SourceLinks: React.FC<SourceLinksProps> = ({ title, url, instructions }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 max-w-[760px]">
      <div className="flex items-center gap-2 text-text2">
        <ExternalLink size={18} className="text-brand" />
        <h3 className="text-[11px] font-bold uppercase tracking-[0.2em]">{title}</h3>
      </div>
      
      <div className="bg-surface border border-border rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex gap-3">
          <div className="flex-1 h-11 bg-bg border border-border rounded-xl flex items-center px-4 text-xs font-mono text-brand overflow-hidden whitespace-nowrap overflow-ellipsis">
            {url}
          </div>
          <button 
            onClick={handleCopy} 
            className={`h-11 px-5 rounded-xl transition-all flex items-center gap-2 font-bold text-xs uppercase border ${
              copied ? 'bg-green/10 border-green text-green' : 'bg-surface2 border-border text-text2 hover:text-brand hover:border-brand/50'
            }`}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        
        {instructions && (
          <p className="text-[10px] text-text3 leading-relaxed bg-bg/50 p-3 rounded-xl border border-border italic">
            <Settings size={12} className="inline mr-1" />
            {instructions}
          </p>
        )}
      </div>
    </div>
  );
};

export default SourceLinks;
