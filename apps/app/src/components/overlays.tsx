import { ArrowLeft01Icon, ArrowRight01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { reportReasons, type Post, type PostMedia, type ReportReason } from '@koina/shared/api';
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { errorText, t } from '@/lib/i18n';
import { useReport } from '@/lib/queries';
import { Composer } from './Composer';
import { Button, IconButton } from './ui';

// Bildirim, onay, gönderi yazma, şikâyet ve görsel pencereleri: uygulamanın her yerinden açılıyor, tek yerde çiziliyor.

export interface ComposeOptions {
  replyTo?: Post;
  quote?: Post;
}

export interface ReportTarget {
  target: 'post' | 'link' | 'user';
  /** Gönderi ve bağlantıda kimlik, üyede kullanıcı adı. */
  id: string;
}

interface Overlays {
  toast: (text: string) => void;
  confirm: (text: string, options?: { action?: string; danger?: boolean }) => Promise<boolean>;
  compose: (options?: ComposeOptions) => void;
  report: (target: ReportTarget) => void;
  lightbox: (media: PostMedia[], index: number) => void;
}

const OverlayContext = createContext<Overlays | null>(null);

export function useOverlays(): Overlays {
  const value = useContext(OverlayContext);
  if (!value) throw new Error('useOverlays: OverlayProvider dışında');
  return value;
}

interface ConfirmState {
  text: string;
  action: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
}

/** `<dialog>` açık durumunu React durumuna bağlar; odak tuzağı ve Esc tarayıcıdan gelir. */
function useModal(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return ref;
}

const panel = 'rounded-3xl border border-line bg-surface text-fg';

function ReportForm({ target, onDone }: { target: ReportTarget; onDone: (sent: boolean) => void }) {
  const id = useId();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const report = useReport();
  return (
    <form
      className="p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!reason) return;
        report.mutate({ ...target, reason, note: note.trim() }, { onSuccess: () => onDone(true) });
      }}>
      <h2 id="report-title" className="text-lg font-bold">
        {target.target === 'user' ? t.report.member : t.report.title}
      </h2>
      <p className="mt-1 text-sm text-muted">{t.report.lead}</p>
      <fieldset className="mt-4 space-y-1.5">
        <legend className="sr-only">{t.report.title}</legend>
        {reportReasons.map((r) => (
          <label
            key={r}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] px-4 py-2.5 text-[0.9375rem] ${reason === r ? 'border-primary-text bg-tint/50' : 'border-line'}`}>
            <input type="radio" name={`${id}-reason`} value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-[var(--k-primary-text)]" />
            {t.report.reasons[r]}
          </label>
        ))}
      </fieldset>
      <label htmlFor={`${id}-note`} className="mt-4 mb-1.5 block text-sm font-semibold">
        {t.report.note}
      </label>
      <textarea
        id={`${id}-note`}
        value={note}
        maxLength={500}
        onChange={(e) => setNote(e.target.value)}
        className="block min-h-20 w-full resize-y rounded-2xl border-[1.5px] border-line bg-surface px-4 py-3 text-[0.9375rem] focus:border-primary-text focus:outline-none"
      />
      {report.isError && (
        <p role="alert" className="mt-2 text-sm text-live">
          {errorText(report.error)}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={() => onDone(false)}>
          {t.common.cancel}
        </Button>
        <Button type="submit" variant="ink" disabled={!reason || report.isPending}>
          {t.report.send}
        </Button>
      </div>
    </form>
  );
}

function Lightbox({ media, index, onIndex, onClose }: { media: PostMedia[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const item = media[index];
  if (!item) return null;
  const many = media.length > 1;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-2">
        <span className="px-3 text-sm text-bg/80">{many ? t.feed.image(index + 1, media.length) : ''}</span>
        <IconButton icon={Cancel01Icon} label={t.common.close} onClick={onClose} className="text-bg hover:bg-bg/15" />
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
        {many && (
          <IconButton
            icon={ArrowLeft01Icon}
            label={t.feed.back}
            disabled={index === 0}
            onClick={() => onIndex(index - 1)}
            className="absolute left-2 bg-ink/60 text-bg hover:bg-ink disabled:opacity-30"
          />
        )}
        <img src={item.url} alt={item.alt} width={item.width} height={item.height} className="max-h-full max-w-full object-contain" />
        {many && (
          <IconButton
            icon={ArrowRight01Icon}
            label={t.feed.more}
            disabled={index === media.length - 1}
            onClick={() => onIndex(index + 1)}
            className="absolute right-2 bg-ink/60 text-bg hover:bg-ink disabled:opacity-30"
          />
        )}
      </div>
      {item.alt && <p className="mx-auto max-w-2xl px-4 py-3 text-center text-sm text-bg/85">{item.alt}</p>}
    </div>
  );
}

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [toastText, setToastText] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [composing, setComposing] = useState<ComposeOptions | null>(null);
  const [reporting, setReporting] = useState<ReportTarget | null>(null);
  const [viewing, setViewing] = useState<{ media: PostMedia[]; index: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const toast = useCallback((text: string) => {
    setToastText(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToastText(null), 3200);
  }, []);

  const confirm = useCallback<Overlays['confirm']>(
    (text, options = {}) =>
      new Promise((resolve) => setConfirmState({ text, action: options.action ?? t.common.confirm, danger: !!options.danger, resolve })),
    [],
  );
  const compose = useCallback((options: ComposeOptions = {}) => setComposing(options), []);
  const report = useCallback((target: ReportTarget) => setReporting(target), []);
  const lightbox = useCallback((media: PostMedia[], index: number) => setViewing({ media, index }), []);

  const confirmRef = useModal(!!confirmState);
  const composeRef = useModal(!!composing);
  const reportRef = useModal(!!reporting);
  const viewRef = useModal(!!viewing);

  const settle = (ok: boolean) => {
    confirmState?.resolve(ok);
    setConfirmState(null);
  };

  useEffect(() => {
    if (!viewing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setViewing((v) => v && { ...v, index: Math.max(0, v.index - 1) });
      if (e.key === 'ArrowRight') setViewing((v) => v && { ...v, index: Math.min(v.media.length - 1, v.index + 1) });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewing]);

  const composeTitle = composing?.quote ? t.feed.quoteTitle : composing?.replyTo ? t.feed.reply : t.feed.composeTitle;

  return (
    <OverlayContext.Provider value={{ toast, confirm, compose, report, lightbox }}>
      {children}

      <dialog ref={confirmRef} aria-labelledby="confirm-text" onClose={() => confirmState && settle(false)} className={`m-auto w-[min(92vw,400px)] p-6 ${panel}`}>
        <p id="confirm-text" className="text-[1.0625rem] leading-relaxed font-medium">
          {confirmState?.text}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => settle(false)}>
            {t.common.cancel}
          </Button>
          <Button variant={confirmState?.danger ? 'danger' : 'ink'} onClick={() => settle(true)}>
            {confirmState?.action}
          </Button>
        </div>
      </dialog>

      <dialog
        ref={composeRef}
        aria-labelledby="compose-title"
        onClose={() => setComposing(null)}
        className={`mx-auto mt-[6vh] w-[min(94vw,600px)] p-0 ${panel}`}>
        <div className="flex items-center gap-2 px-2 pt-2">
          <IconButton icon={Cancel01Icon} label={t.feed.close} onClick={() => setComposing(null)} />
          <h2 id="compose-title" className="text-base font-bold">
            {composeTitle}
          </h2>
        </div>
        {composing && (
          <Composer
            autoFocus
            parent={composing.replyTo}
            quote={composing.quote}
            onDone={() => {
              const reply = !!composing.replyTo;
              setComposing(null);
              toast(reply ? t.feed.replied : t.feed.posted);
            }}
          />
        )}
      </dialog>

      <dialog ref={reportRef} aria-labelledby="report-title" onClose={() => setReporting(null)} className={`m-auto w-[min(94vw,460px)] p-0 ${panel}`}>
        {reporting && (
          <ReportForm
            target={reporting}
            onDone={(sent) => {
              setReporting(null);
              if (sent) toast(t.report.sent);
            }}
          />
        )}
      </dialog>

      <dialog
        ref={viewRef}
        aria-label={t.feed.openImage}
        onClose={() => setViewing(null)}
        onClick={(e) => e.target === e.currentTarget && setViewing(null)}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-ink/92 p-0 text-bg">
        {viewing && <Lightbox media={viewing.media} index={viewing.index} onIndex={(index) => setViewing({ ...viewing, index })} onClose={() => setViewing(null)} />}
      </dialog>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 sm:bottom-8">
        {toastText && (
          <p className="rounded-full bg-fg px-5 py-2.5 text-sm font-medium text-bg shadow-[0_10px_30px_-12px_rgb(17_20_42/0.6)]">{toastText}</p>
        )}
      </div>
    </OverlayContext.Provider>
  );
}

