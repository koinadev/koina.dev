import { ArrowLeft02Icon } from '@hugeicons/core-free-icons';
import { useCanGoBack, useRouter } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Mark } from './Brand';
import { t } from '@/lib/i18n';
import { IconButton } from './ui';

/**
 * Sayfanın yapışkan, yarı saydam başlığı. Sekme başlığı rotanın `head`'inden gelir (SSR'da da doğru olsun diye).
 * `back` verilirse geri düğmesi çıkar; geçmiş yoksa (doğrudan açılan bağlantı) `back` yoluna gider.
 */
export function PageHeader({ title, subtitle, back, right, children }: {
  title: string;
  subtitle?: string;
  back?: string;
  right?: ReactNode;
  /** Başlığın altındaki sekmeler ya da süzgeçler. */
  children?: ReactNode;
}) {
  const router = useRouter();
  const canGoBack = useCanGoBack();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur-md supports-[not(backdrop-filter:blur(1px))]:bg-surface">
      <div className="flex min-h-14 items-center gap-3 px-2 sm:px-4">
        {back ? (
          <IconButton
            icon={ArrowLeft02Icon}
            label={t.feed.back}
            onClick={() => (canGoBack ? router.history.back() : router.history.push(back))}
          />
        ) : (
          // Telefonda soldaki ray yok; logo başlığın başında durur.
          <span className="pl-2 sm:hidden">
            <Mark size={24} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl leading-tight font-bold tracking-[-0.02em]">{title}</h1>
          {subtitle && <p className="truncate text-[0.8125rem] text-muted">{subtitle}</p>}
        </div>
        {right && <div className="flex shrink-0 items-center gap-2 pr-2 sm:pr-0">{right}</div>}
      </div>
      {children}
    </header>
  );
}

/** Başlık altındaki sekmeler: X'teki gibi eşit genişlikte, seçili olanın altında kalın çizgi. */
export function Tabs<T extends string>({ value, options, onChange, label }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`relative flex h-12 flex-1 items-center justify-center text-[0.9375rem] transition-colors hover:bg-tint/60 ${
              active ? 'font-bold text-fg' : 'font-medium text-muted'
            }`}>
            {o.label}
            {active && <span className="absolute bottom-0 h-1 w-14 rounded-full bg-primary" />}
          </button>
        );
      })}
    </div>
  );
}
