import { Search01Icon } from '@hugeicons/core-free-icons';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Composer } from '@/components/Composer';
import { FeatureLadder } from '@/components/FeatureLadder';
import { ComposeFab } from '@/components/Layout';
import { PageHeader, Tabs } from '@/components/PageHeader';
import { PostList } from '@/components/PostList';
import { btn, ButtonLink, EmptyState } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { resolveUrl } from '@/lib/format';
import { sitePaths, t } from '@/lib/i18n';
import { feedQuery, type FeedParams } from '@/lib/queries';
import { seo, webPage } from '@/lib/seo';
import { useFeatures } from '@/lib/features';
import { useMe } from '@/lib/session';
import { useConfig } from '@/lib/use-config';
import { LiveWidget } from '@/components/Widgets';
import { UserGroupIcon } from '@hugeicons/core-free-icons';

type Sekme = 'takip' | 'son';
const tabOf = (s?: Sekme): NonNullable<FeedParams['tab']> => (s === 'takip' ? 'following' : s === 'son' ? 'latest' : 'top');

export const Route = createFileRoute('/home')({
  validateSearch: (search: Record<string, unknown>): { sekme?: Sekme } =>
    search.sekme === 'takip' || search.sekme === 'son' ? { sekme: search.sekme } : {},
  loaderDeps: ({ search }) => ({ tab: tabOf(search.sekme) }),
  loader: async ({ context, deps }) => {
    // Takip sekmesi misafirde boş: istek atılmaz, giriş çağrısı gösterilir.
    if (!context.features.feed || (deps.tab === 'following' && !context.me)) return;
    await context.queryClient.ensureInfiniteQueryData(feedQuery({ tab: deps.tab }));
  },
  head: ({ match }) =>
    seo({
      appUrl: match.context.config.appUrl,
      title: t.home.welcome,
      description: t.home.description,
      path: '/home',
      jsonLd: [
        { '@type': 'WebSite', name: 'koina.dev', url: match.context.config.appUrl, inLanguage: 'tr' },
        webPage(match.context.config.appUrl, t.home.title, t.home.description, '/home'),
      ],
    }),
  component: Home,
});

function Welcome() {
  const { siteUrl } = useConfig();
  return (
    <section className="border-b border-line px-4 pt-6 pb-6" aria-labelledby="welcome-title">
      <p className="hand -rotate-2 text-[1.75rem] text-primary-text">{t.home.welcomeHand}</p>
      <h2 id="welcome-title" className="mt-1 max-w-md text-[1.75rem] leading-[1.15] font-bold tracking-[-0.03em] text-balance">
        {t.home.welcome}
      </h2>
      <p className="mt-3 max-w-lg text-[1.0625rem] leading-relaxed text-fg/85">{t.home.welcomeText}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <ButtonLink to="/giris" search={{ next: '/home' }} size="lg">
          {t.home.signIn}
        </ButtonLink>
        <a href={resolveUrl(sitePaths.home, siteUrl)} className={btn('outline', 'lg')}>
          {t.home.learnMore}
        </a>
      </div>
    </section>
  );
}

function Home() {
  const me = useMe();
  const { sekme } = Route.useSearch();
  const navigate = useNavigate({ from: '/home' });
  const tab = tabOf(sekme);
  const features = useFeatures();
  if (!features.feed) {
    return (
      <>
        <PageHeader title={t.home.title} />
        {!me && <Welcome />}
        <div className="space-y-4 p-4">
          <LiveWidget />
          <FeatureLadder />
        </div>
      </>
    );
  }
  return (
    <>
      <PageHeader
        title={t.home.title}
        right={
          <Link to="/ara" search={{}} className="flex size-10 items-center justify-center rounded-full hover:bg-tint lg:hidden" aria-label={t.nav.search}>
            <Icon icon={Search01Icon} size={21} />
          </Link>
        }>
        <Tabs
          label={t.feed.title}
          value={tab}
          onChange={(v) => navigate({ search: v === 'following' ? { sekme: 'takip' } : v === 'latest' ? { sekme: 'son' } : {}, replace: true })}
          options={[
            { value: 'top', label: t.home.tabs.top },
            ...(features.follow ? [{ value: 'following' as const, label: t.home.tabs.following }] : []),
            { value: 'latest', label: t.home.tabs.latest },
          ]}
        />
      </PageHeader>
      {me ? (
        // Telefonda yazma alanı yerine yüzen düğme var; ekranın üstü akışa kalsın.
        <div className="hidden border-b border-line sm:block">
          <Composer />
        </div>
      ) : (
        tab === 'top' && <Welcome />
      )}
      {tab === 'following' && !me ? (
        <EmptyState
          icon={UserGroupIcon}
          text={t.home.followingGuest}
          action={
            <ButtonLink to="/giris" search={{ next: '/home?sekme=takip' }} size="sm">
              {t.nav.signIn}
            </ButtonLink>
          }
        />
      ) : (
        <PostList key={tab} params={{ tab }} empty={tab === 'following' ? t.home.followingEmpty : t.feed.empty} />
      )}
      {me && <ComposeFab />}
    </>
  );
}
