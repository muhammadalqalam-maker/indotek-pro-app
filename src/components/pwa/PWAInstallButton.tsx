import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Download, Share2, PlusSquare, X, Smartphone } from 'lucide-react';

export const PWAInstallButton: React.FC<{ variant?: 'compact' | 'full' }> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      {isInstallable && (
        <button
          onClick={install}
          aria-label="Install Aplikasi Indotek Pro"
          className="flex items-center gap-1.5 rounded-lg bg-accent-500 hover:bg-accent-600 text-primary-900 font-semibold px-2.5 py-1.5 text-xs shadow-sm transition active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{variant === 'full' ? 'Install Aplikasi ke Home Screen' : 'Install App'}</span>
        </button>
      )}

      {isIOS && (
        <button
          onClick={() => setShowIOSGuide(true)}
          aria-label="Petunjuk Install di iPhone atau iPad"
          className="flex items-center gap-1.5 rounded-lg border border-border-strong dark:border-border bg-surface/5 hover:bg-surface/10 px-2.5 py-1.5 text-xs font-medium text-muted-foreground dark:text-muted-foreground transition"
        >
          <Smartphone className="w-3.5 h-3.5 text-accent-600" />
          <span>{variant === 'full' ? 'Install di iPhone / iPad' : 'PWA iOS'}</span>
        </button>
      )}

      {/* iOS Safari Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl dark:bg-surface border border-border dark:border-border">
            <div className="flex items-center justify-between pb-3 border-b border-border dark:border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent-500/10 text-accent-600 flex items-center justify-center font-bold">
                  IP
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text">Install di iPhone / iPad</h3>
                  <p className="text-xs text-muted-foreground">Jadikan aplikasi standalone</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-subtle hover:text-muted-foreground dark:hover:text-muted-foreground p-1"
                aria-label="Tutup petunjuk"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-muted-foreground dark:text-muted-foreground">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-bg dark:bg-surface-2/60">
                <div className="p-2 rounded-lg bg-info/10 text-info shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-text">Langkah 1</p>
                  <p className="text-muted-foreground">Tekan tombol <strong>Share</strong> (ikon kotak dengan panah atas) di menu Safari browser.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-bg dark:bg-surface-2/60">
                <div className="p-2 rounded-lg bg-accent-500/10 text-accent-600 shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-text">Langkah 2</p>
                  <p className="text-muted-foreground">Gulir ke bawah dan pilih opsi <strong>Add to Home Screen</strong> (Tambah ke Layar Utama).</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-bg dark:bg-surface-2/60">
                <div className="p-2 rounded-lg bg-success/10 text-success shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-text">Langkah 3</p>
                  <p className="text-muted-foreground">Tekan <strong>Tambah (Add)</strong> di pojok kanan atas. Indotek Pro siap dibuka seperti aplikasi native!</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-secondary py-2.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};
