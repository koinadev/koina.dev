import { Calendar03Icon, Folder01Icon, Github01Icon, Globe02Icon, Location01Icon } from '@hugeicons/core-free-icons';
import type { MemberProfile } from '@koina/shared/api';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { swatchFor } from '@/lib/format';
import { formatMonth, formatNumber, t } from '@/lib/i18n';
import { UGC_REL } from '@/lib/links';
import { projectsQuery } from '@/lib/queries';
import { Avatar } from './Avatar';
import { Icon, type IconSvgElement } from './Icon';
import { Tabs } from './PageHeader';
import { PostList } from './PostList';
import { ProjectItem } from './ProjectItem';
import { BlockSkeleton, ButtonLink, EmptyState, ErrorState, MoreButton, RoleBadge } from './ui';

function MetaItem({ icon, children }: { icon: IconSvgElement; children: ReactNode }) {
  return (
    <li className="flex min-w-0 items-center gap-1.5">
      <Icon icon={icon} size={17} className="shrink-0" />
      <span className="min-w-0 truncate">{children}</span>
    </li>
  );
}

function ProjectsTab({ handle, own }: { handle: string; own: boolean }) {
  const projects = useInfiniteQuery(projectsQuery({ member: handle }));
  if (projects.isPending) return <BlockSkeleton count={2} className="h-24" />;
  if (projects.isError) return <ErrorState error={projects.error} onRetry={() => projects.refetch()} />;
  const items = projects.data.pages.flatMap((p) => p.items);
  if (items.length === 0)
    return (
      <EmptyState
        icon={Folder01Icon}
        text={own ? t.profile.myNoProjects : t.profile.noProjects}
        action={
          own ? (
            <ButtonLink to="/kesfet" search={{}} size="sm">
              {t.nav.explore}
            </ButtonLink>
          ) : undefined
        }
      />
    );
  return (
    <div>
      {items.map((p) => (
        <ProjectItem key={p.id} project={p} />
      ))}
      <MoreButton query={projects} />
    </div>
  );
}

/** Profil: başkasının ve kendi profilin aynı görünüm; kendi profilinde düzenleme düğmesi çıkar. */
export function ProfileView({ profile, own, actions }: { profile: MemberProfile; own: boolean; actions?: ReactNode }) {
  const [tab, setTab] = useState<'posts' | 'projects'>('posts');
  const site = profile.website?.replace(/^https:\/\//, '').replace(/\/$/, '');
  const stats = [
    { n: profile.stats.posts, label: t.profile.stats.posts },
    { n: profile.stats.projects, label: t.profile.stats.projects },
    { n: profile.stats.claps, label: t.profile.stats.claps },
    { n: profile.stats.events, label: t.profile.stats.events },
    { n: profile.stats.followers, label: t.profile.stats.followers },
    { n: profile.stats.following, label: t.profile.stats.following },
  ];

  return (
    <>
      {/* Kapak şeridi: avatarla aynı rengin açık tonu (avatar üstünde seçilsin), üstünde markanın
          üç noktası soluk bir desen olarak. */}
      <div
        aria-hidden
        className="relative h-32 overflow-hidden sm:h-40"
        style={{ background: `color-mix(in oklab, ${swatchFor(profile.handle)} 60%, var(--k-surface))` }}>
        <svg className="absolute -right-6 -bottom-10 h-48 w-48 opacity-25" viewBox="0 0 96 96">
          <circle cx="55" cy="48" r="15" fill="var(--k-surface)" />
          <circle cx="81" cy="15" r="15" fill="var(--k-surface)" />
          <circle cx="81" cy="81" r="15" fill="var(--k-surface)" />
        </svg>
      </div>
      <section className="px-4 pb-4" aria-labelledby="profile-name">
        <div className="flex items-end justify-between gap-3">
          <Avatar name={profile.name} handle={profile.handle} size={112} className="relative -mt-14 ring-4 ring-surface sm:-mt-16" />
          <div className="flex flex-wrap justify-end gap-2 pt-3">{actions}</div>
        </div>
        <h2 id="profile-name" className="mt-3 text-2xl leading-tight font-bold tracking-[-0.02em] break-anywhere">
          {profile.name}
        </h2>
        <p className="text-[0.9375rem] text-muted break-anywhere">@{profile.handle}</p>
        {profile.roles.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t.edit.roles}>
            {profile.roles.map((r) => (
              <li key={r}>
                <RoleBadge role={r} className="h-6 px-2.5 text-[0.8125rem]" />
              </li>
            ))}
          </ul>
        )}
        <p className={`mt-3 text-[0.9375rem] leading-relaxed whitespace-pre-wrap break-anywhere ${profile.bio ? '' : 'text-muted'}`}>
          {profile.bio || (own ? t.profile.myBioEmpty : t.profile.bioEmpty)}
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[0.9375rem] text-muted">
          {profile.location && <MetaItem icon={Location01Icon}>{profile.location}</MetaItem>}
          {profile.website && site && (
            <MetaItem icon={Globe02Icon}>
              <a href={profile.website} target="_blank" rel={`${UGC_REL} me`} className="text-primary-text hover:underline">
                {site}
              </a>
            </MetaItem>
          )}
          {profile.github && (
            <MetaItem icon={Github01Icon}>
              <a
                href={`https://github.com/${profile.github}`}
                target="_blank"
                rel={`${UGC_REL} me`}
                className="text-primary-text hover:underline">
                {profile.github}
              </a>
            </MetaItem>
          )}
          <MetaItem icon={Calendar03Icon}>{t.profile.since(formatMonth(profile.createdAt))}</MetaItem>
        </ul>
        {profile.interests.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={t.profile.interests}>
            {profile.interests.map((i) => (
              <li key={i} className="rounded-full bg-tint px-2.5 py-0.5 text-[0.8125rem] font-medium text-on-tint">
                {i}
              </li>
            ))}
          </ul>
        )}
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[0.9375rem] text-muted">
          {stats.map((s) => (
            <li key={s.label}>
              <strong className="font-bold text-fg tabular-nums">{formatNumber(s.n)}</strong> {s.label}
            </li>
          ))}
        </ul>
      </section>
      <div className="border-b border-line">
        <Tabs
          label={t.profile.title}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'posts', label: t.profile.posts },
            { value: 'projects', label: t.profile.projects },
          ]}
        />
      </div>
      {tab === 'posts' ? (
        <PostList params={{ author: profile.handle }} empty={t.feed.emptyAuthor} />
      ) : (
        <ProjectsTab handle={profile.handle} own={own} />
      )}
    </>
  );
}
