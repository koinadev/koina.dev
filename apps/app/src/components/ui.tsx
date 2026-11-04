import { Alert02Icon, RefreshIcon } from '@hugeicons/core-free-icons';
import type { ProjectStatus, Role } from '@koina/shared/api';
import { createLink } from '@tanstack/react-router';
import { forwardRef, useEffect, useRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { errorText, t } from '@/lib/i18n';
import { Icon, type IconSvgElement } from './Icon';

type Variant = 'primary' | 'outline' | 'ghost' | 'ink' | 'danger' | 'onInk';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-[background-color,color,filter] disabled:cursor-not-allowed disabled:opacity-50';
const variants: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:brightness-[1.04] active:brightness-95',
  outline: 'border-[1.5px] border-line bg-surface text-fg hover:border-fg',
  ghost: 'text-fg hover:bg-tint',
  ink: 'bg-fg text-bg hover:bg-ink',
  danger: 'bg-live text-white hover:brightness-95',
  // Lacivert zemin üstündeki ikincil düğme (canlı yayın kutusu).
  onInk: 'border-[1.5px] border-bg/30 text-bg hover:border-bg',
};
const sizes: Record<Size, string> = { sm: 'h-9 px-4 text-sm', md: 'h-10 px-5 text-[0.9375rem]', lg: 'h-12 px-6 text-base' };

/** Butonun sınıfları; aynı görünüm `<button>`, `<Link>` ve dış `<a>` için. */
export const btn = (variant: Variant = 'primary', size: Size = 'md', extra = '') =>
  `${base} ${variants[variant]} ${sizes[size]} ${extra}`;

export function Button({ variant, size, className = '', type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return <button type={type} className={btn(variant, size, className)} {...rest} />;
}

const ButtonAnchor = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; size?: Size }>(
  ({ variant, size, className = '', ...rest }, ref) => <a ref={ref} className={btn(variant, size, className)} {...rest} />,
);

/** Buton görünümlü yönlendirici bağlantısı; `to`, `params`, `search` tipleri rotalardan gelir. */
export const ButtonLink = createLink(ButtonAnchor);

/** İkon düğmesi: görünür metni yok, etiketi zorunlu. */
export function IconButton({ icon, label, size = 20, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconSvgElement;
  label: string;
  size?: number;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full text-fg transition-colors hover:bg-tint ${className}`}
      {...rest}>
      <Icon icon={icon} size={size} />
    </button>
  );
}

/** Seçilebilir hap: süzgeçler ve rol seçimi. */
export function Chip({ active, children, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border-[1.5px] px-3.5 text-sm font-medium transition-colors ${
        active ? 'border-primary bg-primary text-on-primary' : 'border-line bg-surface text-fg hover:border-fg/40'
      } ${className}`}
      {...rest}>
      {children}
    </button>
  );
}

// Rol rozetleri: usta pembe, fikir sahibi sarı, yeni başlayan nane; hepsi açık tonda, metin lacivert.
const roleTone: Record<Role, string> = {
  mentor: 'bg-accent/20',
  founder: 'bg-primary/35',
  learner: 'bg-squiggle/40',
};
export function RoleBadge({ role, className = '' }: { role: Role; className?: string }) {
  return (
    <span className={`inline-flex h-5 items-center rounded-full px-2 text-xs font-semibold text-fg ${roleTone[role]} ${className}`}>
      {t.roles[role]}
    </span>
  );
}

const statusTone: Record<ProjectStatus, string> = {
  idea: 'bg-tint text-on-tint',
  building: 'bg-primary/35 text-fg',
  shipped: 'bg-squiggle/45 text-fg',
};
export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ${statusTone[status]}`}>
      <span className={`size-1.5 rounded-full ${status === 'shipped' ? 'bg-fg' : status === 'building' ? 'bg-fg/70' : 'bg-primary-text'}`} />
      {t.status[status]}
    </span>
  );
}

// ─── Durumlar ───────────────────────────────────────────────────────────────

export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden className={`skeleton block rounded-full ${className}`} />;
}

/** Akış satırının iskeleti: gerçek satırla aynı ölçüler, yüklenince sayfa zıplamasın. */
export function PostSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-label={t.common.loading}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex gap-3 border-b border-line px-4 py-4">
          <Skeleton className="size-10 shrink-0" />
          <div className="flex-1 space-y-2.5 pt-1">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-full rounded-md" />
            <Skeleton className="h-3 w-4/5 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BlockSkeleton({ count = 3, className = 'h-28' }: { count?: number; className?: string }) {
  return (
    <div role="status" aria-label={t.common.loading} className="space-y-3 p-4">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={`w-full rounded-2xl ${className}`} />
      ))}
    </div>
  );
}

export function EmptyState({ icon, text, action, className = '' }: {
  icon: IconSvgElement;
  text: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-3 px-6 py-14 text-center ${className}`}>
      <span className="flex size-14 items-center justify-center rounded-full bg-tint text-primary-text">
        <Icon icon={icon} size={28} />
      </span>
      <p className="max-w-xs text-[0.9375rem] text-muted">{text}</p>
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, className = '' }: { error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={`m-4 flex items-center gap-3 rounded-2xl bg-danger-bg px-4 py-3 ${className}`}>
      <Icon icon={Alert02Icon} size={20} className="shrink-0 text-live" />
      <p className="flex-1 text-sm">{errorText(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <Icon icon={RefreshIcon} size={16} />
          {t.common.retry}
        </Button>
      )}
    </div>
  );
}

/**
 * İmleçli sayfalama: liste sonuna gelince sonraki sayfa kendiliğinden yüklenir; düğme klavye ve gözlemcisiz tarayıcı için
 * yerinde kalır. Son sayfada kaybolur.
 */
export function MoreButton({ query }: {
  query: { hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => unknown };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const el = ref.current;
    if (!el || !hasNextPage || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
    }, { rootMargin: '600px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  if (!hasNextPage) return null;
  return (
    <div ref={ref} className="flex justify-center py-5">
      <Button variant="outline" size="sm" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
        {query.isFetchingNextPage ? t.common.loading : t.common.more}
      </Button>
    </div>
  );
}

/** Bölüm başlığı: sayfa içi küçük başlık ve sağda isteğe bağlı bağlantı. */
export function SectionTitle({ children, right, id }: { children: ReactNode; right?: ReactNode; id?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 pt-5 pb-2">
      <h2 id={id} className="text-lg font-bold tracking-[-0.02em]">
        {children}
      </h2>
      {right}
    </div>
  );
}
