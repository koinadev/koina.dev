import { Github01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { Avatar } from '@/components/Avatar';
import { Composer } from '@/components/Composer';
import { Icon } from '@/components/Icon';
import { useOverlays } from '@/components/overlays';
import { PageHeader } from '@/components/PageHeader';
import { PostList } from '@/components/PostList';
import { ProjectBadge } from '@/components/ProjectItem';
import { btn, Button, RoleBadge, SectionTitle, StatusBadge } from '@/components/ui';
import { excerpt } from '@/lib/format';
import { isMissing } from '@/lib/guards';
import { errorText, formatDay, t } from '@/lib/i18n';
import { UGC_REL } from '@/lib/links';
import { feedQuery, projectQuery, useJoinProject } from '@/lib/queries';
import { absolute, breadcrumbs, seo } from '@/lib/seo';
import { useMe, useRequireAuth } from '@/lib/session';

export const Route = createFileRoute('/proje/$slug')({
  loader: async ({ context, params }) => {
    try {
      const [project] = await Promise.all([
        context.queryClient.ensureQueryData(projectQuery(params.slug)),
        context.queryClient.ensureInfiniteQueryData(feedQuery({ project: params.slug })),
      ]);
      return project;
    } catch (err) {
      if (isMissing(err)) throw notFound({ data: { text: t.project.notFound } });
      throw err;
    }
  },
  head: ({ match, loaderData: p }) => {
    const appUrl = match.context.config.appUrl;
    const path = `/proje/${match.params.slug}`;
    if (!p) return seo({ appUrl, title: t.explore.title, description: t.project.notFound, path, noindex: true });
    return seo({
      appUrl,
      title: p.name,
      description: excerpt(p.summary),
      path,
      jsonLd: [
        {
          '@type': 'SoftwareSourceCode',
          name: p.name,
          description: p.summary,
          url: absolute(appUrl, path),
          ...(p.repoUrl ? { codeRepository: p.repoUrl } : {}),
          dateCreated: p.createdAt,
          creativeWorkStatus: t.status[p.status],
          author: { '@type': 'Person', name: p.owner.name },
          ...(p.team?.length ? { contributor: p.team.map((m) => ({ '@type': 'Person', name: m.name })) } : {}),
          inLanguage: 'tr',
        },
        breadcrumbs(appUrl, [
          { name: t.explore.title, path: '/kesfet' },
          { name: p.name, path },
        ]),
      ],
    });
  },
  component: ProjectDetail,
});

function ProjectDetail() {
  const { slug } = Route.useParams();
  const { data: p } = useSuspenseQuery(projectQuery(slug));
  const join = useJoinProject(slug);
  const me = useMe();
  const requireAuth = useRequireAuth();
  const { confirm } = useOverlays();

  const owner = me?.handle === p.owner.handle;
  const member = !!p.me;

  const toggle = () =>
    requireAuth(async () => {
      if (member && !(await confirm(t.project.leaveConfirm, { action: t.project.leave }))) return;
      join.mutate(!member);
    });

  return (
    <>
      <PageHeader title={p.name} subtitle={t.explore.members(p.members)} back="/kesfet" />
      <section className="border-b border-line px-4 py-5" aria-labelledby="project-name">
        <div className="flex items-start gap-4">
          <ProjectBadge project={p} size={64} />
          <div className="min-w-0 flex-1">
            <h2 id="project-name" className="text-2xl leading-tight font-bold tracking-[-0.02em] break-anywhere">
              {p.name}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
              <StatusBadge status={p.status} />
              <span>{t.project.since(formatDay(p.createdAt))}</span>
            </div>
          </div>
        </div>
        <p className="mt-4 text-[1.0625rem] leading-relaxed break-anywhere">{p.summary}</p>
        {p.lookingFor.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{t.project.lookingFor}</span>
            {p.lookingFor.map((r) => (
              <RoleBadge key={r} role={r} className="h-6 px-2.5 text-[0.8125rem]" />
            ))}
          </div>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {owner ? (
            <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-tint px-4 text-sm font-semibold text-on-tint">
              <Icon icon={Tick02Icon} size={16} />
              {t.project.ownerNote}
            </span>
          ) : (
            <Button variant={member ? 'outline' : 'primary'} onClick={toggle} disabled={join.isPending} aria-pressed={member}>
              {member && <Icon icon={Tick02Icon} size={16} />}
              {member ? t.project.joined : t.project.join}
            </Button>
          )}
          {p.repoUrl && (
            <a href={p.repoUrl} target="_blank" rel={UGC_REL} className={btn('outline')}>
              <Icon icon={Github01Icon} size={18} />
              {t.project.repo}
            </a>
          )}
        </div>
        {join.isError && (
          <p role="alert" className="mt-3 text-sm text-live">
            {errorText(join.error)}
          </p>
        )}
      </section>

      <section aria-labelledby="team-title" className="border-b border-line pb-2">
        <SectionTitle id="team-title">{t.project.team}</SectionTitle>
        <ul>
          {(p.team ?? []).map((m) => (
            <li key={m.handle}>
              <Link to="/u/$handle" params={{ handle: m.handle }} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-bg/70">
                <Avatar name={m.name} handle={m.handle} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate font-bold">{m.name}</span>
                    {m.handle === p.owner.handle && (
                      <span className="shrink-0 text-xs font-semibold text-primary-text">{t.project.owner}</span>
                    )}
                  </span>
                  <span className="block truncate text-sm text-muted">@{m.handle}</span>
                </span>
                <span className="hidden flex-wrap justify-end gap-1 min-[400px]:flex">
                  {m.roles.map((r) => (
                    <RoleBadge key={r} role={r} />
                  ))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="project-feed">
        <SectionTitle id="project-feed">{t.project.feed}</SectionTitle>
        {member && (
          <div className="border-y border-line">
            <Composer key={p.slug} project={p.slug} />
          </div>
        )}
        <div className={member ? '' : 'border-t border-line'}>
          <PostList params={{ project: p.slug }} empty={t.feed.emptyProject} />
        </div>
      </section>
    </>
  );
}
