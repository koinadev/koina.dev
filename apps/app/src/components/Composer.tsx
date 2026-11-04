import { Cancel01Icon, ImageAdd02Icon } from '@hugeicons/core-free-icons';
import { ALT_MAX, MEDIA_BYTES, MEDIA_MAX, MEDIA_TYPES, POST_MAX, type Post } from '@koina/shared/api';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import { errorText, t } from '@/lib/i18n';
import { projectsQuery, uploadMedia, useCreatePost } from '@/lib/queries';
import { useMe } from '@/lib/session';
import { Avatar } from './Avatar';
import { QuoteEmbed } from './PostItem';
import { Button, IconButton } from './ui';

/** Kalan karakter halkası: son 20 karakterde sayı belirir, sınır aşılınca kırmızıya döner. */
function CounterRing({ length }: { length: number }) {
  const left = POST_MAX - length;
  const r = 9;
  const c = 2 * Math.PI * r;
  const ratio = Math.min(1, length / POST_MAX);
  const tone = left < 0 ? 'var(--k-live)' : left <= 20 ? '#e0a800' : 'var(--k-primary-text)';
  return (
    <span className="flex items-center gap-1.5" title={t.feed.left(left)}>
      {left <= 20 && <span className={`text-xs font-semibold tabular-nums ${left < 0 ? 'text-live' : 'text-muted'}`}>{left}</span>}
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden className="-rotate-90">
        <circle cx="12" cy="12" r={r} fill="none" stroke="var(--k-line)" strokeWidth="2.5" />
        <circle cx="12" cy="12" r={r} fill="none" stroke={tone} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - ratio)} />
      </svg>
      <span className="sr-only" aria-live="polite">
        {left <= 20 ? t.feed.left(left) : ''}
      </span>
    </span>
  );
}

interface Draft {
  key: string;
  file: File;
  preview: string;
  width: number;
  height: number;
  alt: string;
}

/** Görselin ölçüleri tarayıcıda okunur; API yalnız sınırları denetler. */
function readSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('MEDIA_INVALID'));
    img.src = url;
  });
}

function AltEditor({ draft, onSave, onClose }: { draft: Draft; onSave: (alt: string) => void; onClose: () => void }) {
  const id = useId();
  const [value, setValue] = useState(draft.alt);
  return (
    <div className="mt-3 rounded-2xl border-[1.5px] border-primary-text/40 bg-tint/40 p-3">
      <div className="flex gap-3">
        <img src={draft.preview} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="block text-sm font-semibold">
            {t.feed.altTitle}
          </label>
          <p className="text-[0.8125rem] text-muted">{t.feed.altHint}</p>
        </div>
      </div>
      <textarea
        id={id}
        value={value}
        maxLength={ALT_MAX}
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        className="mt-2 block min-h-16 w-full resize-y rounded-xl border-[1.5px] border-line bg-surface px-3 py-2 text-[0.9375rem] focus:border-primary-text focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        <span className="mr-auto text-xs text-muted tabular-nums">
          {value.length}/{ALT_MAX}
        </span>
        <Button variant="outline" size="sm" onClick={onClose}>
          {t.common.cancel}
        </Button>
        <Button variant="ink" size="sm" onClick={() => onSave(value.trim())}>
          {t.feed.altSave}
        </Button>
      </div>
    </div>
  );
}

/**
 * Gönderi, yanıt ve alıntı yazma alanı. Görseller gönderirken (alt metniyle birlikte) yüklenir: yüklemeden sonra açıklama
 * değiştirilemiyor, önce yüklemek düzeltmeyi kapatırdı. Yanıtta proje seçimi yok; yanıt ana gönderinin bağlamında kalır.
 * Ctrl/⌘+Enter gönderir.
 */
export function Composer({ parent, quote, project, placeholder, autoFocus, onDone, className = '' }: {
  parent?: Post;
  quote?: Post;
  /** Proje sayfasından yazılınca proje önceden seçili gelir. */
  project?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onDone?: (post: Post) => void;
  className?: string;
}) {
  const me = useMe();
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  // `<dialog>` açılınca odağı ilk düğmeye (Kapat) verir; yazma alanı odağı ondan sonra almalı.
  useEffect(() => {
    if (!autoFocus) return;
    const id = window.setTimeout(() => textRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [autoFocus]);
  const [body, setBody] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [projectSlug, setProjectSlug] = useState(project ?? '');
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const create = useCreatePost();
  // Yalnız üyenin içinde olduğu projeler: başkasının projesine gönderi bağlanmasın.
  const mine = useInfiniteQuery({ ...projectsQuery({ member: me?.handle ?? '' }), enabled: !!me && !parent });
  const myProjects = mine.data?.pages.flatMap((p) => p.items) ?? [];

  // Önizleme adresleri bellekte yer tutar; bileşen kapanınca bırakılır.
  const previews = useRef(new Set<string>());
  useEffect(() => () => previews.current.forEach((u) => URL.revokeObjectURL(u)), []);

  if (!me) return null;
  const trimmed = body.trim();
  const tooLong = body.length > POST_MAX;
  const busy = uploading || create.isPending;
  const canSend = (trimmed.length > 0 || (drafts.length > 0 && !quote)) && !tooLong && !busy;

  const addFiles = async (files: FileList | null) => {
    setLocalError(null);
    if (!files) return;
    const room = MEDIA_MAX - drafts.length;
    const picked = [...files];
    if (picked.length > room) setLocalError(t.feed.imageLimit);
    const next: Draft[] = [];
    for (const file of picked.slice(0, room)) {
      if (!(MEDIA_TYPES as readonly string[]).includes(file.type) || file.size > MEDIA_BYTES) {
        setLocalError(t.feed.imageType);
        continue;
      }
      const preview = URL.createObjectURL(file);
      previews.current.add(preview);
      try {
        const size = await readSize(preview);
        next.push({ key: `${file.name}-${file.size}-${Math.random()}`, file, preview, ...size, alt: '' });
      } catch {
        setLocalError(t.feed.imageType);
      }
    }
    setDrafts((cur) => [...cur, ...next].slice(0, MEDIA_MAX));
    if (fileRef.current) fileRef.current.value = '';
  };

  const submit = async () => {
    if (!canSend) return;
    setLocalError(null);
    let media: string[] = [];
    if (drafts.length) {
      setUploading(true);
      try {
        for (const d of drafts) media.push((await uploadMedia(d.file, d, d.alt)).id);
      } catch (err) {
        setUploading(false);
        setLocalError(errorText(err));
        return;
      }
      setUploading(false);
    }
    create.mutate(
      {
        body: trimmed,
        media,
        ...(parent ? { parentId: parent.id } : {}),
        ...(quote ? { quoteId: quote.id } : {}),
        ...(!parent && projectSlug ? { projectSlug } : {}),
      },
      {
        onSuccess: (post) => {
          setBody('');
          setDrafts([]);
          media = [];
          onDone?.(post);
        },
      },
    );
  };

  const editingDraft = drafts.find((d) => d.key === editing);
  const label = placeholder ?? (parent ? t.feed.replyPlaceholder : quote ? t.feed.quotePlaceholder : t.feed.placeholder);

  return (
    <form
      className={`flex gap-3 px-4 py-3 ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}>
      <Avatar name={me.name} handle={me.handle} size={40} className="mt-1" />
      <div className="min-w-0 flex-1">
        {parent && <p className="text-sm text-muted">{t.feed.replyingTo(parent.author.handle)}</p>}
        <label htmlFor={`${id}-body`} className="sr-only">
          {label}
        </label>
        <textarea
          ref={textRef}
          id={`${id}-body`}
          value={body}
          rows={parent ? 2 : 3}
          placeholder={label}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          onPaste={(e) => {
            if (e.clipboardData.files.length) {
              e.preventDefault();
              addFiles(e.clipboardData.files);
            }
          }}
          aria-invalid={tooLong}
          className="field-sizing-content block min-h-16 w-full resize-none bg-transparent py-2 text-[1.0625rem] leading-relaxed placeholder:text-muted/80 focus:outline-none"
        />
        {drafts.length > 0 && (
          <ul className={`mt-2 grid gap-2 ${drafts.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {drafts.map((d) => (
              <li key={d.key} className="relative overflow-hidden rounded-2xl border border-line">
                <img src={d.preview} alt={d.alt} className={`w-full object-cover ${drafts.length === 1 ? 'max-h-80' : 'aspect-square'}`} />
                <IconButton
                  icon={Cancel01Icon}
                  size={16}
                  label={t.feed.removeImage}
                  onClick={() => setDrafts((cur) => cur.filter((x) => x.key !== d.key))}
                  className="absolute top-1.5 right-1.5 size-8 bg-ink/70 text-bg hover:bg-ink"
                />
                <button
                  type="button"
                  onClick={() => setEditing(d.key)}
                  className="absolute bottom-1.5 left-1.5 rounded-full bg-ink/75 px-2.5 py-1 text-xs font-bold text-bg hover:bg-ink">
                  {d.alt ? `✓ ${t.feed.altEdit}` : `+ ${t.feed.altEdit}`}
                </button>
              </li>
            ))}
          </ul>
        )}
        {editingDraft && (
          <AltEditor
            key={editingDraft.key}
            draft={editingDraft}
            onClose={() => setEditing(null)}
            onSave={(alt) => {
              setDrafts((cur) => cur.map((x) => (x.key === editingDraft.key ? { ...x, alt } : x)));
              setEditing(null);
            }}
          />
        )}
        {quote && (
          <QuoteEmbed
            interactive={false}
            quote={{ id: quote.id, body: quote.body, author: quote.author, createdAt: quote.createdAt, media: quote.media }}
          />
        )}
        {(localError || create.isError) && (
          <p role="alert" className="mt-2 text-sm text-live">
            {localError ?? errorText(create.error)}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <input
            ref={fileRef}
            id={`${id}-file`}
            type="file"
            accept={MEDIA_TYPES.join(',')}
            multiple
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => addFiles(e.target.files)}
          />
          <IconButton
            icon={ImageAdd02Icon}
            label={t.feed.addImage}
            disabled={drafts.length >= MEDIA_MAX || busy}
            onClick={() => fileRef.current?.click()}
            className="-ml-2 text-primary-text disabled:opacity-40"
          />
          {!parent && myProjects.length > 0 && (
            <>
              <label htmlFor={`${id}-project`} className="sr-only">
                {t.feed.project}
              </label>
              <select
                id={`${id}-project`}
                value={projectSlug}
                onChange={(e) => setProjectSlug(e.target.value)}
                className="h-8 max-w-[11rem] min-w-0 truncate rounded-full border-[1.5px] border-line bg-surface pr-7 pl-3 text-sm font-medium text-primary-text">
                <option value="">{t.feed.noProject}</option>
                {myProjects.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    ◆ {p.name}
                  </option>
                ))}
              </select>
            </>
          )}
          <span className="ml-auto flex items-center gap-3">
            {body.length > 0 && <CounterRing length={body.length} />}
            <Button type="submit" size="sm" disabled={!canSend}>
              {uploading ? t.feed.uploading : parent ? t.feed.reply : t.feed.send}
            </Button>
          </span>
        </div>
      </div>
    </form>
  );
}
