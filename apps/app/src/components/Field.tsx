import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';

const control =
  'block w-full rounded-2xl border-[1.5px] border-line bg-surface px-4 text-[0.9375rem] text-fg placeholder:text-muted/80 transition-colors focus:border-primary-text focus:outline-none aria-invalid:border-live';

/** Etiketli alan; ipucu ve hata metni `aria-describedby` ile alana bağlı. */
export function Field({ label, hint, error, children }: {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean; className: string }) => ReactNode;
}) {
  const id = useId();
  const described = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children({ id, 'aria-describedby': described, 'aria-invalid': error ? true : undefined, className: control })}
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-[0.8125rem] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[0.8125rem] font-medium text-live">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextInput({ label, hint, error, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode; error?: string }) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(p) => <input {...rest} {...p} className={`${p.className} h-12 ${className}`} />}
    </Field>
  );
}

export function TextArea({ label, hint, error, className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: ReactNode; error?: string }) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(p) => <textarea {...rest} {...p} className={`${p.className} min-h-24 resize-y py-3 leading-relaxed ${className}`} />}
    </Field>
  );
}
