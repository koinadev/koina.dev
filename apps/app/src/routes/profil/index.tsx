import { Logout01Icon } from '@hugeicons/core-free-icons';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { ProfileView } from '@/components/ProfileView';
import { Button, ButtonLink } from '@/components/ui';
import { requireMe } from '@/lib/guards';
import { formatNumber, t } from '@/lib/i18n';
import { memberQuery } from '@/lib/queries';
import { seo } from '@/lib/seo';
import { useSignOut } from '@/lib/session';

export const Route = createFileRoute('/profil/')({
  beforeLoad: requireMe,
  loader: ({ context }) => context.queryClient.ensureQueryData(memberQuery(context.me.handle)),
  head: ({ match }) => seo({ appUrl: match.context.config.appUrl, title: t.profile.title, description: t.profile.title, path: '/profil', noindex: true }),
  component: MyProfile,
});

/** Kendi profilin: başkalarının gördüğü görünüm + düzenle ve çıkış. */
function MyProfile() {
  const { me } = Route.useRouteContext();
  const { data: profile } = useSuspenseQuery(memberQuery(me.handle));
  const signOut = useSignOut();
  const navigate = useNavigate();
  return (
    <>
      <PageHeader title={profile.name} subtitle={`${formatNumber(profile.stats.posts)} ${t.profile.stats.posts}`} />
      <ProfileView
        profile={profile}
        own
        actions={
          <>
            <ButtonLink to="/profil/duzenle" variant="outline" size="sm">
              {t.profile.edit}
            </ButtonLink>
            <Button
              variant="ghost"
              size="sm"
              className="xl:hidden"
              onClick={async () => {
                await signOut();
                navigate({ to: '/home' });
              }}>
              <Icon icon={Logout01Icon} size={18} />
              <span className="max-sm:sr-only">{t.nav.signOut}</span>
            </Button>
          </>
        }
      />
    </>
  );
}
