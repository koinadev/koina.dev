import { markSvg } from '@koina/shared/brand';

// İşaret sabit ve bizim; innerHTML güvenli. Geometri sitedeki ve mobildeki ile aynı kaynaktan.
const MARK = markSvg();

export function Mark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 [&>svg]:size-full ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: MARK }}
    />
  );
}

/** Logotip: işaret + `koina.dev`. `.dev` adın parçası, bir tık açık renkte (sitedeki Wordmark). */
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark size={compact ? 30 : 28} />
      {!compact && (
        <span className="text-[1.375rem] leading-none font-bold tracking-[-0.03em] whitespace-nowrap">
          koina<span className="text-primary-text">.dev</span>
        </span>
      )}
      {compact && <span className="sr-only">koina.dev</span>}
    </span>
  );
}
