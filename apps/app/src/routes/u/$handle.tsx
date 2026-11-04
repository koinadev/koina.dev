import { Flag02Icon, MoreHorizontalIcon, Tick02Icon, UserAdd01Icon } from '@hugeicons/core-free-icons';
import type { MemberProfile } from '@koina/shared/api';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { Menu } from '@/components/Menu';
import { useOverlays } from '@/components/overlays';
import { PageHeader } from '@/components/PageHeader';
import { ProfileView } from '@/components/ProfileView';
import { Button, IconButton } from '@/components/ui';
import { excerpt } from '@/lib/format';
import { isMissing } from '@/lib/guards';
import { errorText, formatNumber, t } from '@/lib/i18n';
import { useFeatures } from '@/lib/features';
import { memberQuery, useFollow } from '@/lib/queries';
import { seo } from '@/lib/seo';
import { useMe, useRequireAuth } from '@/lib/session';

export const Route = createFileRoute('/u/$handle')({
  beforeLoad: ({ context, params }) => {
    // Kendi profiline gelen, düzenleme düğmeli görünüme geçsin.
    if (context.me?.handle === params.handle) throw redirect({ to: '/profil' });
  },
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(memberQuery(params.handle));
    } catch (err) {
      if (isMissing(err)) throw notFound({ data: { text: t.profile.notFound } });
      throw err;
    }
  },
  // Profiller bilerek dizine girmez ve site haritasında yok: herkese açık bir üye listesi oluşmasın.
  head: ({ match, loaderData: m }) =>
    seo({
      appUrl: match.context.config.appUrl,
      title: m ? `${m.name} (@${m.handle})` : t.profile.title,
      description: m ? excerpt(m.bio || `${m.name}, Koina üyesi.`) : t.profile.notFound,
      path: `/u/${match.params.handle}`,
      type: 'profile',
      noindex: true,
    }),
  component: MemberPage,
});

function FollowButton({ profile }: { profile: MemberProfile }) {
  const follow = useFollow(profile.handle);
  const requireAuth = useRequireAuth();
  const { confirm, toast } = useOverlays();
  const [hover, setHover] = useState(false);
  const on = !!profile.followed;
  return (
    <Button
      size="sm"
      variant={on ? 'outline' : 'ink'}
      aria-pressed={on}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={follow.isPending}
      className={on && hover ? 'border-live! text-live' : ''}
      onClick={() =>
        requireAuth(async () => {
          if (on && !(await confirm(t.profile.unfollowConfirm(profile.handle), { action: t.profile.unfollow }))) return;
          follow.mutate(!on, { onError: (err) => toast(errorText(err)) });
        })
      }>
      <Icon icon={on ? Tick02Icon : UserAdd01Icon} size={16} />
      {on ? (hover ? t.profile.unfollow : t.profile.following) : t.profile.follow}
    </Button>
  );
}

function MemberPage() {
  const { handle } = Route.useParams();
  const { data: profile } = useSuspenseQuery(memberQuery(handle));
  const features = useFeatures();
  const me = useMe();
  const { report } = useOverlays();
  return (
    <>
      <PageHeader title={profile.name} subtitle={`${formatNumber(profile.stats.posts)} ${t.profile.stats.posts}`} back="/home" />
      <ProfileView
        profile={profile}
        own={false}
        actions={
          <>
            {me && (
              <Menu
                items={[{ label: t.report.member, icon: Flag02Icon, onSelect: () => report({ target: 'user', id: profile.handle }) }]}
                trigger={(p) => <IconButton {...p} icon={MoreHorizontalIcon} label={t.feed.more} className="border-[1.5px] border-line" />}
              />
            )}
            {features.follow && <FollowButton profile={profile} />}
          </>
        }
      />
    </>
  );
}
