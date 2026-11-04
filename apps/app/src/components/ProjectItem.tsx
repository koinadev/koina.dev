import { UserGroupIcon } from '@hugeicons/core-free-icons';
import type { Project } from '@koina/shared/api';
import { Link } from '@tanstack/react-router';
import { initials, swatchFor } from '@/lib/format';
import { t } from '@/lib/i18n';
import { Icon } from './Icon';
import { StatusBadge } from './ui';

/** Projenin rozeti: adın baş harfleri, slug'ın özetinden seçilen renkte yuvarlatılmış kare. */
export function ProjectBadge({ project, size = 44 }: { project: Pick<Project, 'slug' | 'name'>; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-[30%] font-bold text-fg"
      style={{ width: size, height: size, background: swatchFor(project.slug), fontSize: Math.round(size * 0.36) }}>
      {initials(project.name)}
    </span>
  );
}

/** Keşfet listesindeki proje satırı: kart değil, akıştaki gibi çizgiyle ayrılmış satır. */
export function ProjectItem({ project }: { project: Project }) {
  return (
    <article className="relative flex gap-3 border-b border-line px-4 py-4 transition-colors hover:bg-bg/70">
      <ProjectBadge project={project} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-base font-bold">
            {/* Satırın tamamı tıklanır; bağlantı tek, ekran okuyucu tek hedef duyar. */}
            <Link to="/proje/$slug" params={{ slug: project.slug }} className="after:absolute after:inset-0 hover:underline">
              {project.name}
            </Link>
          </h3>
          <StatusBadge status={project.status} />
          {project.me && <span className="text-xs font-semibold text-primary-text">{t.project.joined}</span>}
        </div>
        <p className="mt-1 text-[0.9375rem] leading-normal text-fg/90">{project.summary}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <Icon icon={UserGroupIcon} size={16} />
            {t.explore.members(project.members)}
          </span>
          <span className="truncate">{project.owner.name}</span>
          {project.lookingFor.length > 0 && (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <span>{t.explore.wants}:</span>
              {project.lookingFor.map((r) => (
                <span key={r} className="rounded-full border border-line bg-surface px-2 py-px text-xs font-medium text-fg">
                  {t.roles[r]}
                </span>
              ))}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/** Yan sütun ve ana sayfa için kısa satır. */
export function ProjectMini({ project }: { project: Project }) {
  return (
    <Link to="/proje/$slug" params={{ slug: project.slug }} className="flex items-center gap-3 rounded-xl px-4 py-2.5 transition-colors hover:bg-tint/60">
      <ProjectBadge project={project} size={36} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-semibold">{project.name}</span>
        <span className="block truncate text-[0.8125rem] text-muted">
          {t.status[project.status]} · {t.explore.members(project.members)}
        </span>
      </span>
    </Link>
  );
}
