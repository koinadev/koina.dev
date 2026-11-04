import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconSvgElement } from './Icon';

export interface MenuItem {
  label: string;
  icon: IconSvgElement;
  onSelect: () => void;
  danger?: boolean;
}

/**
 * Küçük açılır menü: tetikleyici düğme + seçenek listesi. Dışarı tıklama ve Esc kapatır; ok tuşlarıyla gezilir.
 * Kart tıklamasına (gönderiyi açma) karışmasın diye olaylar yukarı taşınmaz.
 */
export function Menu({ trigger, items, align = 'right' }: {
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu'; 'aria-controls': string }) => ReactNode;
  items: MenuItem[];
  align?: 'left' | 'right';
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const buttons = [...(list.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
        const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
        buttons[(i + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative" onClick={(e) => e.stopPropagation()}>
      {trigger({ onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-haspopup': 'menu', 'aria-controls': id })}
      {open && (
        <ul
          ref={list}
          id={id}
          role="menu"
          className={`absolute top-full z-40 mt-1 min-w-52 overflow-hidden rounded-2xl border border-line bg-surface py-1.5 shadow-[0_16px_40px_-16px_rgb(17_20_42/0.45)] ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}>
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[0.9375rem] font-medium hover:bg-tint/60 focus:bg-tint/60 focus:outline-none ${
                  item.danger ? 'text-live' : 'text-fg'
                }`}>
                <Icon icon={item.icon} size={18} />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
