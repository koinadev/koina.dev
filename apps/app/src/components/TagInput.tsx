import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { useState, type KeyboardEvent } from 'react';
import { parseTags } from '@/lib/format';
import { t } from '@/lib/i18n';
import { Field } from './Field';
import { Icon } from './Icon';

/** Etiket alanı: yazıp Enter (ya da virgül); yapıştırılan virgüllü liste de bölünür. */
export function TagInput({ label, hint, value, onChange, max, placeholder }: {
  label: string;
  hint?: string;
  value: string[];
  onChange: (v: string[]) => void;
  max: number;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');
  const commit = () => {
    if (!draft.trim()) return;
    onChange(parseTags([...value, draft].join(','), max));
    setDraft('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <Field label={label} hint={hint}>
      {(p) => (
        <div className={`${p.className} flex min-h-12 flex-wrap items-center gap-1.5 py-2 focus-within:border-primary-text`}>
          {value.map((tag) => (
            <span key={tag} className="inline-flex h-7 items-center gap-1 rounded-full bg-tint pr-1 pl-3 text-sm font-medium text-on-tint">
              {tag}
              <button
                type="button"
                aria-label={t.edit.removeTag(tag)}
                onClick={() => onChange(value.filter((x) => x !== tag))}
                className="flex size-5 items-center justify-center rounded-full hover:bg-surface">
                <Icon icon={Cancel01Icon} size={13} />
              </button>
            </span>
          ))}
          {value.length < max && (
            <input
              id={p.id}
              aria-describedby={p['aria-describedby']}
              value={draft}
              maxLength={30}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKey}
              onBlur={commit}
              placeholder={value.length ? '' : placeholder}
              className="h-7 min-w-24 flex-1 bg-transparent focus:outline-none"
            />
          )}
        </div>
      )}
    </Field>
  );
}
