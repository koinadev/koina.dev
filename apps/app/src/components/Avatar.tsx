import { initials, swatchFor } from '@/lib/format';

/** Fotoğraf yok: adın baş harfleri, kullanıcı adının özetinden seçilen marka renginde. */
export function Avatar({ name, handle, size = 40, className = '' }: {
  name: string;
  handle: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-fg select-none ${className}`}
      style={{ width: size, height: size, background: swatchFor(handle), fontSize: Math.round(size * 0.38) }}>
      {initials(name)}
    </span>
  );
}
