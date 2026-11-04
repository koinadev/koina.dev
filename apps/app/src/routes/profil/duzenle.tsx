import { roles, updateProfile, type Member, type Role } from '@koina/shared/api';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { TextArea, TextInput } from '@/components/Field';
import { useOverlays } from '@/components/overlays';
import { PageHeader } from '@/components/PageHeader';
import { TagInput } from '@/components/TagInput';
import { Button, Chip } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { requireMe } from '@/lib/guards';
import { errorText, t } from '@/lib/i18n';
import { useDeleteAccount, useUpdateProfile } from '@/lib/queries';
import { seo } from '@/lib/seo';
import { useSignOut } from '@/lib/session';

export const Route = createFileRoute('/profil/duzenle')({
  beforeLoad: requireMe,
  head: ({ match }) => seo({ appUrl: match.context.config.appUrl, title: t.edit.title, description: t.edit.title, path: '/profil/duzenle', noindex: true }),
  component: EditProfile,
});

function Form({ user }: { user: Member }) {
  const navigate = useNavigate();
  const { toast, confirm } = useOverlays();
  const signOut = useSignOut();
  const qc = useQueryClient();
  const update = useUpdateProfile();
  const remove = useDeleteAccount();
  const [form, setForm] = useState({
    name: user.name,
    handle: user.handle,
    bio: user.bio,
    roles: user.roles,
    interests: user.interests,
    github: user.github ?? '',
    website: user.website ?? '',
    location: user.location ?? '',
  });
  const [issues, setIssues] = useState<Record<string, boolean>>({});
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    // Boş bırakılan isteğe bağlı alan "yok" demek: API'ye null gider, eski değer silinir.
    const parsed = updateProfile.safeParse({
      ...form,
      github: form.github.trim().replace(/^@/, '') || null,
      website: form.website.trim() || null,
      location: form.location.trim() || null,
    });
    if (!parsed.success) {
      setIssues(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), true])));
      return;
    }
    setIssues({});
    update.mutate(parsed.data, {
      onSuccess: () => {
        toast(t.edit.saved);
        navigate({ to: '/profil' });
      },
    });
  };

  const toggleRole = (r: Role) => set('roles', form.roles.includes(r) ? form.roles.filter((x) => x !== r) : [...form.roles, r]);

  const deleteAccount = async () => {
    if (!(await confirm(t.edit.deleteConfirm, { action: t.edit.delete, danger: true }))) return;
    remove.mutate(undefined, {
      onSuccess: async () => {
        await signOut();
        qc.clear();
        toast(t.edit.deleted);
        navigate({ to: '/home', replace: true });
      },
    });
  };

  return (
    <>
      <form onSubmit={submit} noValidate className="space-y-5 px-4 py-5">
        <TextInput label={t.edit.name} value={form.name} maxLength={80} onChange={(e) => set('name', e.target.value)} error={issues.name ? t.errors.INVALID_INPUT : undefined} />
        <TextInput
          label={t.edit.handle}
          value={form.handle}
          maxLength={30}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => set('handle', e.target.value.toLowerCase())}
          hint={t.edit.handleHint}
          error={issues.handle ? t.edit.handleHint : undefined}
        />
        <TextArea label={t.edit.bio} value={form.bio} maxLength={280} onChange={(e) => set('bio', e.target.value)} hint={`${form.bio.length}/280`} />
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{t.edit.roles}</legend>
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => (
              <Chip key={r} active={form.roles.includes(r)} onClick={() => toggleRole(r)}>
                {t.roles[r]}
              </Chip>
            ))}
          </div>
        </fieldset>
        <TagInput label={t.edit.interests} hint={t.edit.interestsHint} placeholder={t.edit.addInterest} max={10} value={form.interests} onChange={(v) => set('interests', v)} />
        <TextInput
          label={t.edit.github}
          value={form.github}
          maxLength={40}
          autoCapitalize="none"
          spellCheck={false}
          onChange={(e) => set('github', e.target.value)}
          error={issues.github ? t.errors.INVALID_INPUT : undefined}
        />
        <TextInput
          label={t.edit.website}
          type="url"
          inputMode="url"
          value={form.website}
          maxLength={200}
          placeholder="https://"
          onChange={(e) => set('website', e.target.value)}
          hint={t.edit.websiteHint}
          error={issues.website ? t.edit.websiteHint : undefined}
        />
        <TextInput label={t.edit.location} value={form.location} maxLength={60} onChange={(e) => set('location', e.target.value)} />
        {update.isError && (
          <p role="alert" className="rounded-2xl bg-danger-bg px-4 py-3 text-sm">
            {update.error instanceof ApiError && update.error.code === 'CONFLICT' ? t.edit.handleTaken : errorText(update.error)}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="outline" onClick={() => navigate({ to: '/profil' })}>
            {t.edit.cancel}
          </Button>
          <Button type="submit" disabled={update.isPending}>
            {t.edit.save}
          </Button>
        </div>
      </form>

      <section aria-labelledby="account-title" className="mx-4 mb-8 space-y-4">
        <h2 id="account-title" className="sr-only">
          {t.nav.account}
        </h2>
        <Button
          variant="outline"
          className="w-full"
          onClick={async () => {
            await signOut();
            navigate({ to: '/home' });
          }}>
          {t.nav.signOut}
        </Button>
        <div className="rounded-2xl border-[1.5px] border-live/40 p-4">
          <h3 className="font-bold text-live">{t.edit.danger}</h3>
          <p className="mt-1 text-sm text-muted">{t.edit.dangerText}</p>
          {remove.isError && (
            <p role="alert" className="mt-2 text-sm text-live">
              {errorText(remove.error)}
            </p>
          )}
          <Button variant="danger" size="sm" className="mt-3" onClick={deleteAccount} disabled={remove.isPending}>
            {t.edit.delete}
          </Button>
        </div>
      </section>
    </>
  );
}

function EditProfile() {
  const { me } = Route.useRouteContext();
  return (
    <>
      <PageHeader title={t.edit.title} back="/profil" />
      <Form user={me} />
    </>
  );
}
