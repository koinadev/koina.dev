import {
  BookOpen01Icon,
  Bookmark02Icon,
  Calendar03Icon,
  Compass01Icon,
  Home01Icon,
  Link04Icon,
  Logout01Icon,
  Notification03Icon,
  PencilEdit02Icon,
  Shield01Icon,
  UserCircleIcon,
} from '@hugeicons/core-free-icons';
import { Link, useLocation, useNavigate, type LinkComponentProps } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useFeatures } from '@/lib/features';
import { t } from '@/lib/i18n';
import { isModerator, useMe, useRequireAuth, useSignOut } from '@/lib/session';
import { Avatar } from './Avatar';
import { Wordmark } from './Brand';
import { Icon, type IconSvgElement } from './Icon';
import { useOverlays } from './overlays';
import { btn, IconButton } from './ui';
import { BlogWidget, FeaturedWidget, LiveWidget, SearchBox, SiteWidget, TrendingWidget } from './Widgets';

type To = LinkComponentProps['to'];

interface NavItem {
  to: To;
  label: string;
  icon: IconSvgElement;
  /** Telefonun alt çubuğunda da var mı (beş yer var). */
  tab?: boolean;
  /** Okunmamış sayısı rozeti. */
  badge?: number;
}

function useNav(): NavItem[] {
  const me = useMe();
  const features = useFeatures();
  return [
    { to: '/home', label: t.nav.home, icon: Home01Icon, tab: true },
    ...(features.projects ? [{ to: '/kesfet' as const, label: t.nav.explore, icon: Compass01Icon, tab: true }] : []),
    ...(features.links ? [{ to: '/baglantilar' as const, label: t.nav.links, icon: Link04Icon, tab: true }] : []),
    // Misafirde bildirim yok; alt çubuktaki yerini takvim alır.
    ...(me && features.feed ? [{ to: '/bildirimler' as const, label: t.nav.notifications, icon: Notification03Icon, tab: true, badge: me.unread }] : []),
    { to: '/takvim', label: t.nav.calendar, icon: Calendar03Icon, tab: !me || !features.feed },
    { to: '/yazilar', label: t.nav.blog, icon: BookOpen01Icon },
    ...(me && features.feed ? [{ to: '/kaydedilenler' as const, label: t.nav.bookmarks, icon: Bookmark02Icon }] : []),
    ...(isModerator(me) ? [{ to: '/moderasyon' as const, label: t.nav.moderation, icon: Shield01Icon }] : []),
    { to: '/profil', label: t.nav.profile, icon: UserCircleIcon, tab: true },
  ];
}

// Proje ve gönderi sayfaları kendi bölümünün altında sayılır; ray hangi bölümde olduğunu göstersin.
function isActive(to: string, path: string): boolean {
  if (to === '/home') return path === '/home' || path.startsWith('/akis') || path.startsWith('/etiket') || path.startsWith('/ara');
  if (to === '/kesfet') return path.startsWith('/kesfet') || path.startsWith('/proje/');
  return path === to || path.startsWith(`${to}/`);
}

function Badge({ n, className = '' }: { n?: number; className?: string }) {
  if (!n) return null;
  return (
    <span className={`absolute -top-1.5 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-live px-1 text-[0.6875rem] leading-none font-bold text-white ring-2 ring-bg ${className}`}>
      {n > 99 ? '99+' : n}
    </span>
  );
}

function useCompose() {
  const { compose } = useOverlays();
  const requireAuth = useRequireAuth();
  return () => requireAuth(() => compose());
}

function UserChip() {
  const me = useMe();
  const location = useLocation();
  const signOut = useSignOut();
  const navigate = useNavigate();
  if (!me) {
    return (
      <Link to="/giris" search={{ next: location.href }} className={btn('outline', 'md', 'w-full max-xl:size-12 max-xl:px-0')}>
        <Icon icon={UserCircleIcon} size={20} className="xl:hidden" />
        <span className="max-xl:sr-only">{t.nav.signIn}</span>
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-1 rounded-full p-1 xl:hover:bg-tint/60">
      <Link to="/profil" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full" aria-label={`${t.nav.account}: ${me.name}`}>
        <Avatar name={me.name} handle={me.handle} size={40} />
        <span className="min-w-0 max-xl:hidden">
          <span className="block truncate text-[0.9375rem] font-bold">{me.name}</span>
          <span className="block truncate text-sm text-muted">@{me.handle}</span>
        </span>
      </Link>
      <IconButton
        icon={Logout01Icon}
        label={t.nav.signOut}
        className="max-xl:hidden"
        onClick={async () => {
          await signOut();
          navigate({ to: '/home' });
        }}
      />
    </div>
  );
}

/** Sol ray: 640–1279 px'te yalnız ikon, geniş ekranda etiketli. Telefonda yok, yerine alt çubuk. */
function Rail() {
  const { pathname } = useLocation();
  const compose = useCompose();
  const nav = useNav();
  const { feed } = useFeatures();
  return (
    <header className="sticky top-0 hidden h-dvh w-[76px] shrink-0 flex-col items-center overflow-y-auto px-2 py-3 [scrollbar-width:none] sm:flex xl:w-[260px] xl:items-stretch xl:px-4">
      <Link to="/home" className="mb-3 flex h-12 shrink-0 items-center rounded-full px-3 xl:self-start" aria-label={`koina.dev, ${t.nav.home}`}>
        <span className="xl:hidden">
          <Wordmark compact />
        </span>
        <span className="hidden xl:inline">
          <Wordmark />
        </span>
      </Link>
      <nav aria-label={t.nav.main} className="flex flex-col gap-0.5 max-xl:items-center">
        {nav.map((item) => {
          const active = isActive(String(item.to), pathname);
          return (
            <Link
              key={String(item.to)}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              aria-label={item.badge ? `${item.label}, ${t.nav.unread(item.badge)}` : item.label}
              title={item.label}
              className={`flex h-12 items-center gap-4 rounded-full px-3 text-[1.1875rem] transition-colors hover:bg-tint xl:self-start xl:pr-6 ${active ? 'font-bold' : 'font-medium'}`}>
              <span className="relative">
                <Icon icon={item.icon} size={26} strokeWidth={active ? 2.2 : 1.7} />
                {active && !item.badge && <span className="absolute -right-1 -bottom-1 size-2 rounded-full bg-primary ring-2 ring-bg" />}
                <Badge n={item.badge} />
              </span>
              <span className="max-xl:hidden" aria-hidden>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
      {feed && (
        <button
          type="button"
          onClick={compose}
          className={btn('primary', 'lg', 'mt-4 w-full shrink-0 shadow-[0_8px_24px_-12px_var(--k-accent)] max-xl:size-13 max-xl:px-0')}
          aria-label={t.nav.compose}>
          <Icon icon={PencilEdit02Icon} size={22} className="xl:hidden" />
          <span className="max-xl:hidden">{t.nav.compose}</span>
        </button>
      )}
      <div className="mt-auto w-full pt-4 max-xl:flex max-xl:justify-center">
        <UserChip />
      </div>
    </header>
  );
}

/** Telefonun alt sekme çubuğu. */
function TabBar() {
  const { pathname } = useLocation();
  const nav = useNav().filter((n) => n.tab);
  return (
    <nav aria-label={t.nav.main} className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden">
      <ul className="flex">
        {nav.map((item) => {
          const active = isActive(String(item.to), pathname);
          return (
            <li key={String(item.to)} className="min-w-0 flex-1">
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`flex h-15 flex-col items-center justify-center gap-0.5 text-[0.6875rem] ${active ? 'font-bold text-fg' : 'font-medium text-muted'}`}>
                <span className={`relative flex h-7 w-12 items-center justify-center rounded-full ${active ? 'bg-primary' : ''}`}>
                  <Icon icon={item.icon} size={22} strokeWidth={active ? 2.1 : 1.7} />
                  <Badge n={item.badge} className="top-[-3px] right-1.5" />
                </span>
                <span className="max-w-full truncate px-0.5">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Telefondaki yüzen yazma düğmesi (akış sayfaları). */
export function ComposeFab() {
  const compose = useCompose();
  return (
    <button
      type="button"
      onClick={compose}
      aria-label={t.nav.compose}
      className="fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex size-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_10px_28px_-10px_rgb(17_20_42/0.55)] sm:hidden">
      <Icon icon={PencilEdit02Icon} size={24} />
    </button>
  );
}

/** Sağ sütun: arama, sıradaki yayın, gündem, projeler, yazılar. Topluluk sayıları bilerek yok. */
function Aside() {
  const { pathname } = useLocation();
  const features = useFeatures();
  return (
    <aside aria-label="Yan sütun" className="sticky top-0 hidden h-dvh w-[330px] shrink-0 overflow-y-auto pt-3 pl-6 [scrollbar-width:none] lg:block xl:w-[350px]">
      <div className="space-y-4">
        {features.feed && !pathname.startsWith('/ara') && <SearchBox />}
        {pathname !== '/takvim' && <LiveWidget />}
        {features.feed && <TrendingWidget />}
        {features.projects && !pathname.startsWith('/kesfet') && <FeaturedWidget />}
        {!pathname.startsWith('/yazilar') && <BlogWidget />}
        <SiteWidget />
      </div>
    </aside>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[1280px] justify-center">
      <a href="#main" className="sr-only z-50 rounded-full bg-primary px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        {t.nav.skip}
      </a>
      <Rail />
      <main id="main" className="min-h-dvh w-full max-w-[620px] min-w-0 border-line bg-surface pb-[calc(4rem+env(safe-area-inset-bottom))] sm:border-x sm:pb-0">
        {children}
      </main>
      <Aside />
      <TabBar />
    </div>
  );
}
