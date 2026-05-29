import React, { useState, useEffect } from 'react';
import { 
  Gamepad2, 
  Terminal, 
  Send, 
  Wifi, 
  WifiOff, 
  Lock, 
  Eye, 
  EyeOff, 
  Info,
  Play,
  Skull,
  Clock,
  Box
} from 'lucide-react';
import { useMinecraft } from '../context/MinecraftContext';

const Minecraft: React.FC = () => {
  const { config, updateConfig, logs, sendCommand, status, setStatus } = useMinecraft();
  const [showPassword, setShowPassword] = useState(false);
  const [command, setCommand] = useState('');

  const handleConnect = async () => {
    setStatus('connecting');
    try {
      // Test connection with a dummy command
      await sendCommand('/seed');
      setStatus('connected');
    } catch (err) {
      setStatus('disconnected');
      alert('Failed to connect to Minecraft RCON');
    }
  };

  const handleSendCommand = async (cmd?: string) => {
    const finalCmd = cmd || command;
    if (!finalCmd) return;
    
    setCommand('');
    await sendCommand(finalCmd);
  };

  const QuickButton = ({ cmd, label, icon }: { cmd: string, label: string, icon: React.ReactNode }) => (
    <button 
      onClick={() => handleSendCommand(cmd)}
      className="flex items-center gap-2 px-3 py-2 bg-surface2 border border-border rounded-lg text-xs font-bold text-text2 hover:text-brand hover:border-border2 transition-all active:scale-95"
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="flex-1 flex flex-col p-8 gap-8 overflow-y-auto custom-scrollbar bg-[#08080c]">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 bg-green/10 text-green rounded-2xl flex items-center justify-center shadow-lg shadow-green/5">
          <Gamepad2 size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Minecraft Integration</h1>
          <p className="text-text3 text-sm font-medium">จัดการการเชื่อมต่อ RCON และคำสั่งในเกม</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column: Connection */}
        <div className="col-span-5 space-y-6">
          <div className="bg-surface border border-border rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2 text-text2">
                <Wifi size={20} className={config.enabled ? 'text-green' : 'text-text3'} />
                <h2 className="text-sm font-bold uppercase tracking-widest">RCON Connection</h2>
              </div>
              <button 
                onClick={() => updateConfig({ enabled: !config.enabled })}
                className={`w-12 h-6 rounded-full relative transition-colors ${config.enabled ? 'bg-green' : 'bg-surface2 border border-border'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${config.enabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            {config.enabled && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-text3 font-bold uppercase px-1">IP Address</label>
                  <input 
                    type="text" 
                    value={config.host} 
                    onChange={(e) => updateConfig({ host: e.target.value })}
                    className="w-full h-11 bg-surface2" 
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1 space-y-1.5">
                    <label className="text-[10px] text-text3 font-bold uppercase px-1">Port</label>
                    <input 
                      type="text" 
                      value={config.port} 
                      onChange={(e) => updateConfig({ port: e.target.value })}
                      className="w-full h-11 bg-surface2" 
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[10px] text-text3 font-bold uppercase px-1">Password</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        value={config.password} 
                        onChange={(e) => updateConfig({ password: e.target.value })}
                        className="w-full h-11 bg-surface2 pr-10" 
                      />
                      <button 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 hover:text-text transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={handleConnect}
                  className="w-full h-11 bg-green text-bg font-bold rounded-xl mt-4 shadow-lg shadow-green/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Connect to Server
                </button>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <div className={`w-2 h-2 rounded-full ${
                    status === 'connected' ? 'bg-green animate-pulse' : 
                    status === 'connecting' ? 'bg-amber animate-pulse' : 'bg-red'
                  }`} />
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${
                    status === 'connected' ? 'text-green' : 
                    status === 'connecting' ? 'text-amber' : 'text-red'
                  }`}>
                    {status}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-surface2/30 border border-border/50 rounded-2xl p-4 flex items-start gap-3">
            <Info size={18} className="text-text3 shrink-0 mt-0.5" />
            <p className="text-[11px] text-text3 leading-relaxed font-medium">
              RCON ทำงานเฉพาะเมื่อเปิด F-104 เท่านั้น และต้องตรวจสอบว่าไฟล์ <code className="text-green/80">server.properties</code> ได้เปิดใช้งาน <code className="text-green/80">enable-rcon=true</code> เรียบร้อยแล้ว
            </p>
          </div>
        </div>

        {/* Right Column: Console */}
        <div className="col-span-7 space-y-4 h-[560px] flex flex-col">
          <div className="bg-surface border border-border rounded-3xl flex-1 flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface2/30">
              <div className="flex items-center gap-2 text-text2">
                <Terminal size={18} />
                <h2 className="text-sm font-bold uppercase tracking-widest">Command Console</h2>
              </div>
              <div className="text-[10px] font-mono text-text3">SESSION_ID: 0x4F92</div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#050508] font-mono text-[11px] custom-scrollbar">
              {logs.map((log, i) => (
                <div key={i} className={`flex gap-3 ${log.type === 'sent' ? 'text-text2' : log.type === 'error' ? 'text-red' : 'text-green/80'}`}>
                  <span className="opacity-30 shrink-0">[{log.time}]</span>
                  <span className="shrink-0">{log.type === 'sent' ? '>' : '<'}</span>
                  <span className="break-all">{log.text}</span>
                </div>
              ))}
            </div>

            <div className="p-4 bg-surface border-t border-border">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Type a command (e.g. /say Hello)..." 
                  className="w-full h-11 bg-surface2 pl-4 pr-12 font-mono text-xs"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCommand()}
                />
                <button 
                  onClick={() => handleSendCommand()}
                  className="absolute right-1 top-1 w-9 h-9 bg-brand text-white rounded-lg flex items-center justify-center hover:bg-brand-hover transition-colors active:scale-95 shadow-lg shadow-brand/20"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-[10px] text-text3 font-bold uppercase tracking-widest px-1">Quick Actions</span>
            <div className="flex flex-wrap gap-2">
              <QuickButton cmd="/give @a diamond 1" label="/give Diamond" icon={<Box size={14} />} />
              <QuickButton cmd="/kill @e[type=zombie]" label="/kill Zombie" icon={<Skull size={14} />} />
              <QuickButton cmd="/time set day" label="/time Day" icon={<Clock size={14} />} />
              <QuickButton cmd="/summon lightning_bolt" label="Summon Bolt" icon={<Play size={14} />} />
              <button className="px-3 py-2 bg-brand/10 border border-border2 rounded-lg text-xs font-bold text-brand hover:bg-brand/20 transition-all">
                Custom...
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Minecraft;
