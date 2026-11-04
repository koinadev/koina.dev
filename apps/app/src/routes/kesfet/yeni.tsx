import { createProject, roles, type Role } from '@koina/shared/api';
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { TextArea, TextInput } from '@/components/Field';
import { useOverlays } from '@/components/overlays';
import { PageHeader } from '@/components/PageHeader';
import { Button, Chip } from '@/components/ui';
import { errorText, t } from '@/lib/i18n';
import { useCreateProject } from '@/lib/queries';
import { requireMe } from '@/lib/guards';
import { seo } from '@/lib/seo';

export const Route = createFileRoute('/kesfet/yeni')({
  beforeLoad: requireMe,
  head: ({ match }) => seo({ appUrl: match.context.config.appUrl, title: t.newProject.title, description: t.newProject.lead, path: '/kesfet/yeni', noindex: true }),
  component: NewProject,
});

function NewProject() {
  const navigate = useNavigate();
  const router = useRouter();
  const { toast } = useOverlays();
  const create = useCreateProject();
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [repo, setRepo] = useState('');
  const [lookingFor, setLookingFor] = useState<Role[]>([]);
  const [issues, setIssues] = useState<Record<string, boolean>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    // Sunucuyla aynı şema: istemcide geçen her gövde API'de de geçer.
    const parsed = createProject.safeParse({ name, summary, repoUrl: repo.trim() || null, lookingFor });
    if (!parsed.success) {
      setIssues(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), true])));
      return;
    }
    setIssues({});
    create.mutate(parsed.data, {
      onSuccess: (project) => {
        toast(t.newProject.created);
        navigate({ to: '/proje/$slug', params: { slug: project.slug }, replace: true });
      },
    });
  };

  const toggle = (r: Role) => setLookingFor((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

  return (
    <>
      <PageHeader title={t.newProject.title} back="/kesfet" />
      <form onSubmit={submit} className="space-y-5 px-4 py-5" noValidate>
        <p className="text-[0.9375rem] text-muted">{t.newProject.lead}</p>
        <TextInput
          label={t.newProject.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          required
          error={issues.name ? t.newProject.nameError : undefined}
        />
        <TextArea
          label={t.newProject.summary}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          maxLength={280}
          required
          hint={`${summary.trim().length}/280`}
          error={issues.summary ? t.newProject.summaryError : undefined}
        />
        <TextInput
          label={t.newProject.repo}
          type="url"
          inputMode="url"
          placeholder="https://github.com/…"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          hint={t.newProject.repoHint}
          error={issues.repoUrl ? t.newProject.repoHint : undefined}
        />
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{t.newProject.lookingFor}</legend>
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => (
              <Chip key={r} active={lookingFor.includes(r)} onClick={() => toggle(r)}>
                {t.rolesPlural[r]}
              </Chip>
            ))}
          </div>
        </fieldset>
        {create.isError && (
          <p role="alert" className="rounded-2xl bg-danger-bg px-4 py-3 text-sm">
            {errorText(create.error)}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="outline" onClick={() => router.history.back()}>
            {t.common.cancel}
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {t.newProject.create}
          </Button>
        </div>
      </form>
    </>
  );
}
