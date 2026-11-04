import { createLink, linkCategories, type LinkCategory, type LinkDraft } from '@koina/shared/api';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { TextArea, TextInput } from '@/components/Field';
import { useOverlays } from '@/components/overlays';
import { PageHeader } from '@/components/PageHeader';
import { TagInput } from '@/components/TagInput';
import { Button, Chip } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { requireMe } from '@/lib/guards';
import { errorText, t } from '@/lib/i18n';
import { useCreateLink, usePreviewLink } from '@/lib/queries';
import { seo } from '@/lib/seo';

export const Route = createFileRoute('/baglantilar/yeni')({
  beforeLoad: requireMe,
  head: ({ match }) => seo({ appUrl: match.context.config.appUrl, title: t.links.newTitle, description: t.links.lead, path: '/baglantilar/yeni', noindex: true }),
  component: NewLink,
});

/** Aynı adres zaten eklenmişse var olanın sayfasına bağlantı. */
function Existing({ id }: { id: string }) {
  return (
    <p role="alert" className="rounded-2xl bg-tint px-4 py-3 text-sm">
      {t.links.exists}{' '}
      <Link to="/baglantilar/$id" params={{ id }} className="font-semibold text-primary-text underline">
        {t.links.viewExisting}
      </Link>
    </p>
  );
}

function NewLink() {
  const navigate = useNavigate();
  const { toast } = useOverlays();
  const preview = usePreviewLink();
  const create = useCreateLink();
  const [url, setUrl] = useState('');
  const [draft, setDraft] = useState<LinkDraft | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<LinkCategory | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [issues, setIssues] = useState<Record<string, boolean>>({});

  const fetchPreview = (e: FormEvent) => {
    e.preventDefault();
    const value = url.trim();
    if (!value) return;
    const full = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    setUrl(full);
    preview.mutate(full, {
      onSuccess: (d) => {
        setDraft(d);
        setTitle(d.title.slice(0, 120));
        setDescription(d.description.slice(0, 400));
      },
    });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const parsed = createLink.safeParse({ url: draft.url, title, description, category, tags });
    if (!parsed.success) {
      setIssues(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), true])));
      return;
    }
    setIssues({});
    create.mutate(parsed.data, {
      onSuccess: (link) => {
        toast(t.links.created);
        navigate({ to: '/baglantilar/$id', params: { id: link.id }, replace: true });
      },
    });
  };

  const conflictId = create.error instanceof ApiError && create.error.code === 'CONFLICT' ? String(create.error.body.id ?? '') : '';

  return (
    <>
      <PageHeader title={t.links.newTitle} back="/baglantilar" />
      <div className="space-y-5 px-4 py-5">
        <p className="text-[0.9375rem] text-muted">{t.links.lead}</p>
        <form onSubmit={fetchPreview} className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <TextInput
              label={t.links.urlLabel}
              type="url"
              inputMode="url"
              placeholder="https://"
              value={url}
              maxLength={2000}
              onChange={(e) => {
                setUrl(e.target.value);
                setDraft(null);
              }}
              hint={t.links.urlHint}
            />
          </div>
          <Button type="submit" variant="ink" className="mb-7 h-12" disabled={preview.isPending || !url.trim()}>
            {preview.isPending ? t.common.loading : t.links.fetch}
          </Button>
        </form>
        {preview.isError && (
          <p role="alert" className="rounded-2xl bg-danger-bg px-4 py-3 text-sm">
            {errorText(preview.error)}
          </p>
        )}
        {draft?.existing && <Existing id={draft.existing} />}

        {draft && !draft.existing && (
          <form onSubmit={submit} noValidate className="space-y-5">
            <div className="flex gap-3 rounded-2xl border border-line p-3">
              {draft.image && <img src={draft.image} alt="" className="size-16 shrink-0 rounded-xl object-cover" />}
              <p className="min-w-0 self-center text-sm">
                <span className="block truncate font-semibold">{draft.siteName || new URL(draft.url).hostname}</span>
                <span className="block truncate text-muted">{draft.url}</span>
              </p>
            </div>
            <TextInput
              label={t.links.titleLabel}
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              error={issues.title ? t.errors.INVALID_INPUT : undefined}
            />
            <TextArea
              label={t.links.descriptionLabel}
              value={description}
              maxLength={400}
              onChange={(e) => setDescription(e.target.value)}
              hint={`${description.length}/400`}
            />
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">{t.links.categoryLabel}</legend>
              <div className="flex flex-wrap gap-2">
                {linkCategories.map((c) => (
                  <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                    {t.links.categories[c]}
                  </Chip>
                ))}
              </div>
              {issues.category && <p className="mt-1.5 text-[0.8125rem] font-medium text-live">{t.errors.INVALID_INPUT}</p>}
            </fieldset>
            <TagInput label={t.links.tagsLabel} hint={t.links.tagsHint} value={tags} onChange={setTags} max={3} />
            {conflictId ? (
              <Existing id={conflictId} />
            ) : (
              create.isError && (
                <p role="alert" className="rounded-2xl bg-danger-bg px-4 py-3 text-sm">
                  {errorText(create.error)}
                </p>
              )
            )}
            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="outline" onClick={() => navigate({ to: '/baglantilar' })}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {t.links.create}
              </Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
