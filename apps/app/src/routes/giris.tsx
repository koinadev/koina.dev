import { Mail01Icon } from '@hugeicons/core-free-icons';
import { AUTH_PATHS, CAPTCHA_HEADER } from '@koina/shared/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { Mark } from '@/components/Brand';
import { TextInput } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { Turnstile } from '@/components/Turnstile';
import { Button } from '@/components/ui';
import { api, request } from '@/lib/api';
import { resolveUrl, safeNext } from '@/lib/format';
import { errorText, sitePaths, t } from '@/lib/i18n';
import { meQuery } from '@/lib/queries';
import { seo } from '@/lib/seo';
import { useConfig } from '@/lib/use-config';

export const Route = createFileRoute('/giris')({
  validateSearch: (s: Record<string, unknown>): { next?: string } => (typeof s.next === 'string' ? { next: s.next.slice(0, 500) } : {}),
  // Girişli üye bu sayfada kalmasın.
  beforeLoad: ({ context, search }) => {
    if (context.me) throw redirect({ href: safeNext(search.next) });
  },
  head: ({ match }) => seo({ appUrl: match.context.config.appUrl, title: t.login.title, description: t.login.lead, path: '/giris', noindex: true }),
  component: Login,
});

/** Şifresiz giriş: e-postaya 6 haneli kod, kodla oturum (Better Auth). Hesap yoksa ilk doğrulamada açılır. */
function Login() {
  const { next } = Route.useSearch();
  const target = safeNext(next);
  const router = useRouter();
  const qc = useQueryClient();
  const config = useConfig();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaRound, setCaptchaRound] = useState(0);
  const [news, setNews] = useState(false);

  const send = useMutation({
    mutationFn: async (address: string) => {
      await request('POST', AUTH_PATHS.sendCode, {
        body: { email: address, type: 'sign-in' },
        headers: captcha ? { [CAPTCHA_HEADER]: captcha } : {},
      });
      // Yalnız geliştirme: e-posta servisi yok, kod yerel posta kutusundan okunur ve ekranda gösterilir.
      if (!config.dev) return null;
      const dev = await api<{ code: string }>('GET', `${AUTH_PATHS.devCode}?email=${encodeURIComponent(address)}`).catch(() => null);
      return dev?.code ?? null;
    },
    onSuccess: () => setStep('code'),
    // Turnstile belirteci tek kullanımlık: her denemeden sonra yenisi alınır.
    onSettled: () => setCaptchaRound((n) => n + 1),
  });
  const verify = useMutation({
    mutationFn: async () => {
      await api('POST', AUTH_PATHS.verify, { email: email.trim(), otp: code });
      // Haber izni bültenin çift onaylı aboneliğine gider; başarısız olsa da giriş sürer.
      if (news) await api('POST', '/v1/newsletter/subscribe', { email: email.trim(), locale: 'tr' }).catch(() => null);
      return qc.fetchQuery({ ...meQuery, staleTime: 0 });
    },
    onSuccess: async () => {
      // Kişisel alanlar (alkış, kaydetme, takip) üye için yeniden çekilsin.
      await qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' && q.queryKey[0] !== 'config' });
      router.history.replace(target);
    },
  });

  const sendCode = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim() && captcha) send.mutate(email.trim());
  };
  const submitCode = (e: FormEvent) => {
    e.preventDefault();
    if (/^\d{6}$/.test(code)) verify.mutate();
  };

  return (
    <>
      <PageHeader title={t.login.title} />
      <div className="mx-auto max-w-md px-4 pt-8 pb-12">
        <Mark size={44} />
        <h2 className="mt-5 text-[1.75rem] leading-tight font-bold tracking-[-0.03em]">{t.login.title}</h2>
        {next && <p className="mt-2 text-[0.9375rem] font-medium text-primary-text">{t.login.required}</p>}

        {step === 'email' ? (
          <form onSubmit={sendCode} className="mt-4 space-y-4">
            <p className="text-[0.9375rem] leading-relaxed text-muted">{t.login.lead}</p>
            <TextInput
              label={t.login.email}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label className="flex items-start gap-3 text-[0.9375rem]">
              <input type="checkbox" checked={news} onChange={(e) => setNews(e.target.checked)} className="mt-1 size-5 accent-[var(--k-primary-text)]" />
              <span>{t.login.news}</span>
            </label>
            <Turnstile siteKey={config.turnstileSiteKey} onToken={setCaptcha} resetKey={captchaRound} />
            {send.isError && (
              <p role="alert" className="text-sm text-live">
                {errorText(send.error)}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={send.isPending || !email.trim() || !captcha}>
              <Icon icon={Mail01Icon} size={20} />
              {captcha ? t.login.send : t.login.captcha}
            </Button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="mt-4 space-y-4">
            <p className="text-[0.9375rem] leading-relaxed text-muted" aria-live="polite">
              {t.login.sentTo(email.trim())}
            </p>
            {send.data && (
              <p className="rounded-2xl border-[1.5px] border-dashed border-primary-text/40 bg-tint px-4 py-3 text-sm font-medium">
                {t.login.devCode(send.data)}
              </p>
            )}
            <TextInput
              label={t.login.code}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-2xl! tracking-[0.4em] tabular-nums"
            />
            {verify.isError && (
              <p role="alert" className="text-sm text-live">
                {errorText(verify.error)}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={verify.isPending || code.length !== 6}>
              {t.login.verify}
            </Button>
            <div className="flex flex-wrap items-start justify-between gap-2 text-sm">
              <button
                type="button"
                className="font-medium text-primary-text hover:underline"
                onClick={() => {
                  setStep('email');
                  setCode('');
                  verify.reset();
                }}>
                {t.login.change}
              </button>
              <div className="flex flex-col items-end gap-2">
                <button
                  type="button"
                  className="font-medium text-primary-text hover:underline disabled:opacity-50"
                  disabled={send.isPending || !captcha}
                  onClick={() => send.mutate(email.trim())}>
                  {t.login.resend}
                </button>
                <Turnstile siteKey={config.turnstileSiteKey} onToken={setCaptcha} resetKey={captchaRound} />
              </div>
            </div>
          </form>
        )}

        <p className="mt-8 text-[0.8125rem] text-muted">
          {t.login.conduct}{' '}
          <a href={resolveUrl(sitePaths.conduct, config.siteUrl)} className="font-medium text-primary-text hover:underline">
            {t.login.conductLink}
          </a>{' '}
          {t.login.privacy}{' '}
          <a href={resolveUrl(sitePaths.privacy, config.siteUrl)} className="font-medium text-primary-text hover:underline">
            {t.login.privacyLink}
          </a>
        </p>
      </div>
    </>
  );
}
