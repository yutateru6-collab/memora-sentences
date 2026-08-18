import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import BaseUploadScreen from './UploadScreenBase';

type UploadScreenProps = React.ComponentProps<typeof BaseUploadScreen>;

type Bounds = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const UploadScreen: React.FC<UploadScreenProps> = (props) => {
  const isFirstRun = props.storedMaterials.length === 0 && props.storedFolders.length === 0;
  const shellRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);

  const syncBounds = useCallback(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const target = shell.querySelector<HTMLElement>('.rounded-3xl.border-dashed.py-24');
    if (!target) {
      setBounds(null);
      return;
    }

    const shellRect = shell.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    setBounds({
      top: targetRect.top - shellRect.top,
      left: targetRect.left - shellRect.left,
      width: targetRect.width,
      height: targetRect.height,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isFirstRun) return;

    const frame = window.requestAnimationFrame(syncBounds);
    const shell = shellRef.current;
    const target = shell?.querySelector<HTMLElement>('.rounded-3xl.border-dashed.py-24');
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncBounds) : null;

    if (shell && observer) observer.observe(shell);
    if (target && observer) observer.observe(target);
    window.addEventListener('resize', syncBounds);

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', syncBounds);
    };
  }, [isFirstRun, syncBounds]);

  if (!isFirstRun) {
    return <BaseUploadScreen {...props} />;
  }

  const openExistingAddModal = () => {
    const addButton = shellRef.current?.querySelector<HTMLButtonElement>('button[title="新規追加"]');
    addButton?.click();
  };

  return (
    <div ref={shellRef} className="memora-first-run relative flex-grow w-full min-h-screen">
      <style>{`
        .memora-first-run .rounded-3xl.border-dashed.py-24 {
          min-height: 540px;
          opacity: 0;
          pointer-events: none;
        }
        .memora-first-run button[title="新規追加"] {
          opacity: 0;
          pointer-events: none;
        }
        @media (min-width: 640px) {
          .memora-first-run .rounded-3xl.border-dashed.py-24 {
            min-height: 470px;
          }
        }
      `}</style>

      <BaseUploadScreen {...props} />

      {bounds && (
        <section
          aria-label="MEMORAをはじめる"
          className={`absolute z-20 overflow-hidden rounded-3xl border ${props.T.border} ${props.T.containerBg} shadow-2xl`}
          style={{
            top: bounds.top,
            left: bounds.left,
            width: bounds.width,
            minHeight: bounds.height,
          }}
        >
          <div className="pointer-events-none absolute -top-20 -left-16 w-56 h-56 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 w-64 h-64 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative z-10 mx-auto flex min-h-[540px] max-w-2xl flex-col items-center justify-center px-5 py-8 text-center sm:min-h-[470px] sm:px-10 sm:py-9">
            <div className={`relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border ${props.T.border} ${props.T.button} shadow-lg sm:h-20 sm:w-20 sm:rounded-3xl`}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8 text-sky-400 sm:w-10 sm:h-10" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="absolute -top-2 -right-2 text-lg sm:text-xl" aria-hidden="true">✨</span>
            </div>

            <p className="mb-2 text-[10px] sm:text-xs font-bold tracking-[0.22em] text-sky-400">WELCOME TO MEMORA</p>
            <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${props.T.textPrimary}`}>最初の教材をつくろう</h2>
            <p className={`mt-2 text-sm sm:text-base leading-6 sm:leading-7 ${props.T.textMuted}`}>
              好きなテーマの英語長文をつくって、<br className="hidden sm:block" />
              「読む・聴く・覚える」まで、ひとつに。
            </p>

            <div className="mt-5 flex w-full max-w-xl flex-col items-stretch justify-center gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={props.onGoToPromptLibrary}
                className={`min-h-12 flex-1 px-6 py-3 ${props.T.accentBg} hover:brightness-110 text-white rounded-xl font-bold shadow-lg transition-all hover:-translate-y-0.5 active:scale-[0.98]`}
              >
                <span className="mr-2" aria-hidden="true">✨</span>長文をつくる
              </button>
              <button
                type="button"
                onClick={openExistingAddModal}
                className={`min-h-12 flex-1 px-6 py-3 ${props.T.buttonStrong} rounded-xl font-bold shadow-sm transition-all hover:-translate-y-0.5 active:scale-[0.98]`}
              >
                <span className="mr-2" aria-hidden="true">＋</span>手持ちの教材を追加
              </button>
            </div>
            <p className={`mt-2.5 text-xs ${props.T.textMuted}`}>好きなテーマから、すぐ始められます。</p>

            <div className="mt-5 grid w-full max-w-md grid-cols-3 gap-2 sm:gap-3">
              {[
                ['📖', '読む'],
                ['🎧', '聴く'],
                ['🧠', '覚える'],
              ].map(([icon, label]) => (
                <div key={label} className={`rounded-2xl border ${props.T.border} ${props.T.button} px-2 py-2.5 sm:py-3`}>
                  <div className="mb-0.5 text-lg sm:text-xl" aria-hidden="true">{icon}</div>
                  <div className={`text-xs font-bold ${props.T.textSecondary}`}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default UploadScreen;
