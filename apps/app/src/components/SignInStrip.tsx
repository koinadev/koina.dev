import { useLocation } from '@tanstack/react-router';
import { t } from '@/lib/i18n';
import { ButtonLink } from './ui';

/** Misafire içerik açık; yazma alanının yerinde giriş çağrısı durur. */
export function SignInStrip({ text }: { text: string }) {
  const location = useLocation();
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line bg-tint/50 px-4 py-3">
      <p className="text-[0.9375rem] font-medium">{text}</p>
      <ButtonLink to="/giris" search={{ next: location.href }} size="sm">
        {t.nav.signIn}
      </ButtonLink>
    </div>
  );
}
