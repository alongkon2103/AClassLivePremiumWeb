import { useEffect, useState } from 'react';

type UpdateState = 'idle' | 'available' | 'downloading' | 'downloaded' | 'error';

interface UpdateInfo {
  version?: string;
  releaseNotes?: string;
}

interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

export default function UpdateNotification() {
  const [state, setState] = useState<UpdateState>('idle');
  const [info, setInfo] = useState<UpdateInfo>({});
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!window.electron) return;

    const unsubAvailable = window.electron.on('update:available', (data: UpdateInfo) => {
      setInfo(data);
      setState('available');
      setVisible(true);
    });

    const unsubProgress = window.electron.on('update:progress', (data: DownloadProgress) => {
      setState('downloading');
      setProgress(data);
      setVisible(true);
    });

    const unsubDownloaded = window.electron.on('update:downloaded', () => {
      setState('downloaded');
      setVisible(true);
    });

    const unsubError = window.electron.on('update:error', () => {
      setState('error');
      setVisible(true);
    });

    return () => {
      unsubAvailable?.();
      unsubProgress?.();
      unsubDownloaded?.();
      unsubError?.();
    };
  }, []);

  const handleInstall = () => {
    window.electron?.invoke('update:install');
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-80 overflow-hidden rounded-2xl shadow-2xl"
      style={{ background: 'var(--surface)', border: '0.5px solid var(--border)' }}
    >
      {/* header bar */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '0.5px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: 'var(--text3)' }}
          >
            App Update
          </span>
          {state === 'available' && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-mono"
              style={{ background: 'color-mix(in srgb, var(--brand) 15%, transparent)', color: 'var(--brand-hover)' }}
            >
              v{info.version}
            </span>
          )}
        </div>
        {(state === 'available' || state === 'error') && (
          <button
            onClick={handleDismiss}
            className="text-lg leading-none transition-colors"
            style={{ color: 'var(--text3)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text2)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
          >
            ×
          </button>
        )}
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* available */}
        {state === 'available' && (
          <>
            <p className="text-sm" style={{ color: 'var(--text2)' }}>
              A new version is ready to download.
            </p>
            <p className="text-xs" style={{ color: 'var(--text3)' }}>
              It will download automatically in the background.
            </p>
          </>
        )}

        {/* downloading */}
        {state === 'downloading' && progress && (
          <>
            <p className="text-sm" style={{ color: 'var(--text2)' }}>
              Downloading update...
            </p>
            <div className="space-y-1.5">
              <div
                className="h-1.5 w-full rounded-full overflow-hidden"
                style={{ background: 'var(--border2)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress.percent}%`, background: 'var(--brand)' }}
                />
              </div>
              <div
                className="flex justify-between text-[11px] font-mono"
                style={{ color: 'var(--text3)' }}
              >
                <span>{Math.round(progress.percent)}%</span>
                <span>{(progress.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s</span>
              </div>
            </div>
          </>
        )}

        {/* downloaded — ready to install */}
        {state === 'downloaded' && (
          <>
            <p className="text-sm" style={{ color: 'var(--text2)' }}>
              Download complete. Ready to install.
            </p>
            <p className="text-xs" style={{ color: 'var(--text3)' }}>
              The app will restart automatically after installing.
            </p>
            <button
              onClick={handleInstall}
              className="w-full py-2 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: 'var(--brand)', color: 'var(--text)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--brand)')}
            >
              Install & Restart
            </button>
          </>
        )}

        {/* error */}
        {state === 'error' && (
          <p className="text-sm" style={{ color: 'var(--red)' }}>
            Something went wrong during the update. Please try again.
          </p>
        )}
      </div>
    </div>
  );
}