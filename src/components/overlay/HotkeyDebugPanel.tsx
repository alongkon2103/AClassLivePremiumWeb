import React, { useEffect, useRef, useState } from 'react';
import { Bug, Trash2, Pause, Play, Download, AlertTriangle, Radio } from 'lucide-react';
import { useOverlay } from '../../context/OverlayContext';

type LogKind = 'RAW' | 'WIN' | 'SPIN' | 'REG';

interface LogEntry {
  id: number;
  ts: number;
  kind: LogKind;
  label: string;
  keycode?: number;
  modifiers?: string;
  value?: number | string;
  matched?: boolean;
  suspectRepeat?: boolean;
}

interface BindingSummary {
  label: string;
  key: string | null;
  action: string;
  val?: number | string | boolean;
  status: 'active' | 'unresolved' | 'empty';
  keycode?: number;
}

interface RegisteredPayload {
  count: number;
  bindings: BindingSummary[];
  reason?: string;
}

const MAX_LOGS = 60;

const formatTime = (ts: number) => {
  const d = new Date(ts);
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
};

const kindStyle: Record<LogKind, { bg: string; text: string }> = {
  RAW: { bg: 'bg-surface2', text: 'text-text3' },
  WIN: { bg: 'bg-brand/15', text: 'text-brand' },
  SPIN: { bg: 'bg-amber/15', text: 'text-amber' },
  REG: { bg: 'bg-green/15', text: 'text-green' },
};

const HotkeyDebugPanel: React.FC = () => {
  const { settings } = useOverlay();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const [showRaw, setShowRaw] = useState(true);
  const [stats, setStats] = useState({ raw: 0, matched: 0, repeats: 0 });
  const [registered, setRegistered] = useState<RegisteredPayload | null>(null);
  const [regSeq, setRegSeq] = useState(0);

  const idRef = useRef(0);
  const lastByKeyRef = useRef<Map<string, number>>(new Map());
  const lastRegSigRef = useRef<string>('');
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    if (!window.electron) return;

    const push = (entry: Omit<LogEntry, 'id' | 'ts'>) => {
      if (pausedRef.current) return;
      const ts = Date.now();
      const id = ++idRef.current;
      setLogs(prev => {
        const next = [{ ...entry, id, ts } as LogEntry, ...prev];
        if (next.length > MAX_LOGS) next.length = MAX_LOGS;
        return next;
      });
    };

    const offRaw = window.electron.on('hotkey:rawkey', (payload: any) => {
      const { keycode, ctrlKey, altKey, shiftKey, metaKey, label } = payload || {};
      const mods: string[] = [];
      if (ctrlKey) mods.push('Ctrl');
      if (altKey) mods.push('Alt');
      if (shiftKey) mods.push('Shift');
      if (metaKey) mods.push('Meta');

      const fp = `${keycode}:${ctrlKey ? 1 : 0}:${altKey ? 1 : 0}:${shiftKey ? 1 : 0}:${metaKey ? 1 : 0}`;
      const prev = lastByKeyRef.current.get(fp) ?? 0;
      const now = Date.now();
      const delta = now - prev;
      lastByKeyRef.current.set(fp, now);
      const suspectRepeat = prev > 0 && delta < 90;

      setStats(s => ({
        ...s,
        raw: s.raw + 1,
        repeats: s.repeats + (suspectRepeat ? 1 : 0),
      }));

      push({
        kind: 'RAW',
        label: label ?? `key_${keycode}`,
        keycode,
        modifiers: mods.join('+') || '—',
        suspectRepeat,
      });
    });

    const offWin = window.electron.on('hotkey:win-adjust', (val: any) => {
      setStats(s => ({ ...s, matched: s.matched + 1 }));
      push({
        kind: 'WIN',
        label: val === 'reset' ? 'RESET' : (Number(val) >= 0 ? `+${val}` : String(val)),
        value: val,
        matched: true,
      });
    });

    const offSpin = window.electron.on('hotkey:spin-trigger', () => {
      setStats(s => ({ ...s, matched: s.matched + 1 }));
      push({
        kind: 'SPIN',
        label: 'SPIN',
        matched: true,
      });
    });

    const offReg = window.electron.on('hotkey:registered', (payload: RegisteredPayload) => {
      setRegistered(payload);
      setRegSeq(n => n + 1);

      // De-duplicate noise: only log REG when the set of bindings actually changed.
      const sig = `${payload.count}|${(payload.bindings || [])
        .map(b => `${b.label}:${b.key ?? ''}:${b.status}:${b.val ?? ''}`)
        .join(',')}`;
      if (sig !== lastRegSigRef.current) {
        lastRegSigRef.current = sig;
        const activeKeys = (payload.bindings || [])
          .filter(b => b.status === 'active')
          .map(b => b.key)
          .join(', ');
        push({
          kind: 'REG',
          label: payload.reason === 'master_switch_off'
            ? 'Disabled (Master Switch OFF)'
            : `Listening: ${activeKeys || '(none)'}`,
          value: `${payload.count} keys`,
        });
      }
    });

    return () => {
      offRaw && offRaw();
      offWin && offWin();
      offSpin && offSpin();
      offReg && offReg();
    };
  }, []);

  const clear = () => {
    setLogs([]);
    setStats({ raw: 0, matched: 0, repeats: 0 });
    lastByKeyRef.current.clear();
  };

  const exportLogs = () => {
    const lines = logs
      .slice()
      .reverse()
      .map(l => {
        const t = formatTime(l.ts);
        const mods = l.modifiers && l.modifiers !== '—' ? `[${l.modifiers}]` : '';
        const kc = l.keycode != null ? ` code=${l.keycode}` : '';
        const v = l.value != null ? ` val=${l.value}` : '';
        const rep = l.suspectRepeat ? ' AUTO-REPEAT?' : '';
        return `${t}  ${l.kind.padEnd(4)} ${l.label}${kc} ${mods}${v}${rep}`;
      })
      .join('\n');
    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hotkey-debug-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const visibleLogs = showRaw ? logs : logs.filter(l => l.kind !== 'RAW');

  return (
    <div className="bg-surface/90 backdrop-blur border border-border rounded-3xl shadow-xl overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface2/30 gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Bug size={14} className="text-amber shrink-0" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text3 whitespace-nowrap">
            Hotkey Debug
          </h3>
          <span className="text-[9px] text-text3 font-bold uppercase tracking-widest opacity-70 truncate">
            · raw {stats.raw} · matched {stats.matched}
            {stats.repeats > 0 && <span className="text-amber"> · repeats {stats.repeats}</span>}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label className="flex items-center gap-1.5 cursor-pointer text-[9px] font-bold uppercase tracking-widest text-text3 hover:text-text2">
            <input
              type="checkbox"
              checked={showRaw}
              onChange={e => setShowRaw(e.target.checked)}
              className="accent-brand"
            />
            Raw
          </label>
          <button
            onClick={() => setPaused(p => !p)}
            className={`h-7 px-2 rounded-lg border border-border text-[9px] font-bold uppercase flex items-center gap-1 transition-all ${
              paused ? 'bg-amber/10 text-amber' : 'bg-surface text-text2 hover:bg-bg'
            }`}
            title={paused ? 'Resume capture' : 'Pause capture'}
          >
            {paused ? <Play size={11} /> : <Pause size={11} />}
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={exportLogs}
            disabled={logs.length === 0}
            className="h-7 px-2 rounded-lg border border-border bg-surface text-text2 hover:bg-bg text-[9px] font-bold uppercase flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Download log as .txt"
          >
            <Download size={11} /> Save
          </button>
          <button
            onClick={clear}
            className="h-7 px-2 rounded-lg border border-border bg-surface text-red hover:bg-red/10 text-[9px] font-bold uppercase flex items-center gap-1 transition-all"
            title="Clear log"
          >
            <Trash2 size={11} /> Clear
          </button>
        </div>
      </div>

      <div className="px-6 py-3 border-b border-border bg-bg/40 text-[10px] text-text3 leading-relaxed">
        <p>
          Live capture from the global hotkey listener. Master Switch is{' '}
          <span className={settings.winEnabled ? 'text-green font-bold' : 'text-red font-bold'}>
            {settings.winEnabled ? 'ON' : 'OFF'}
          </span>
          . While OFF, RAW events still appear but WIN/SPIN should not fire.
          If the counter changes unexpectedly, watch for{' '}
          <span className="text-brand font-bold">WIN</span> rows — the row above it shows what key triggered it.
          {' '}<span className="text-amber font-bold">AUTO-REPEAT?</span> marks the same key fired within 90 ms.
        </p>
      </div>

      <div className="px-6 py-3 border-b border-border bg-bg/30">
        <div className="flex items-center gap-2 mb-2">
          <Radio size={11} className={registered && registered.count > 0 ? 'text-green' : 'text-text3'} />
          <span className="text-[9px] font-bold uppercase tracking-widest text-text3">
            Currently Listening
          </span>
          {registered && (
            <span className="text-[9px] text-text3 font-mono">
              · {registered.count} active · refreshed {regSeq}×
            </span>
          )}
        </div>
        {!registered ? (
          <span className="text-[10px] text-text3 italic">
            Waiting for first register event… try toggling Master Switch.
          </span>
        ) : registered.reason === 'master_switch_off' ? (
          <span className="text-[10px] text-text3 italic">
            Master Switch is OFF — no hotkeys are bound right now.
          </span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {registered.bindings.map((b, i) => {
              const cls =
                b.status === 'active'
                  ? 'border-green/40 bg-green/10 text-text2'
                  : b.status === 'unresolved'
                  ? 'border-red/40 bg-red/10 text-red'
                  : 'border-border bg-surface text-text3 opacity-50';
              return (
                <div key={i} className={`px-2 py-1 rounded border text-[10px] font-mono ${cls}`}>
                  <span className="font-bold">{b.label}</span>
                  <span className="mx-1 text-text3">→</span>
                  <span>{b.key ?? '(unset)'}</span>
                  {b.val != null && b.val !== true && (
                    <span className="ml-1 text-text3">({String(b.val)})</span>
                  )}
                  {b.status === 'unresolved' && (
                    <AlertTriangle size={10} className="inline ml-1 -mt-0.5" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="max-h-[320px] overflow-y-auto custom-scrollbar font-mono text-[10px]">
        {visibleLogs.length === 0 ? (
          <div className="p-8 text-center text-text3">
            Waiting for keyboard events… press any key to see if uiohook captures it.
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-bg/95 backdrop-blur text-text3 uppercase text-[9px] tracking-widest">
              <tr>
                <th className="text-left p-2 w-[120px]">Time</th>
                <th className="text-left p-2 w-[60px]">Type</th>
                <th className="text-left p-2">Key</th>
                <th className="text-left p-2 w-[80px]">Code</th>
                <th className="text-left p-2 w-[100px]">Modifiers</th>
                <th className="text-left p-2 w-[70px]">Value</th>
              </tr>
            </thead>
            <tbody>
              {visibleLogs.map(l => {
                const st = kindStyle[l.kind];
                return (
                  <tr
                    key={l.id}
                    className={`border-t border-border/40 ${
                      l.suspectRepeat ? 'bg-amber/5' : ''
                    } ${l.matched ? 'bg-brand/5' : ''}`}
                  >
                    <td className="p-2 text-text3 whitespace-nowrap">{formatTime(l.ts)}</td>
                    <td className="p-2">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded ${st.bg} ${st.text} font-bold uppercase text-[9px] tracking-wider`}
                      >
                        {l.kind}
                      </span>
                    </td>
                    <td className="p-2 text-text font-bold">
                      <span className="flex items-center gap-1.5">
                        {l.label}
                        {l.suspectRepeat && (
                          <span className="text-amber flex items-center gap-0.5">
                            <AlertTriangle size={10} />
                            repeat
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="p-2 text-text3">{l.keycode ?? '—'}</td>
                    <td className="p-2 text-text2">{l.modifiers ?? '—'}</td>
                    <td className="p-2 text-text2">{l.value ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default HotkeyDebugPanel;
