import { Sad01Icon } from '@hugeicons/core-free-icons';
import { useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { t } from '@/lib/i18n';
import { PageHeader } from './PageHeader';
import { ButtonLink, EmptyState, ErrorState } from './ui';

export function NotFoundBlock({ text }: { text: string }) {
  return (
    <EmptyState
      icon={Sad01Icon}
      text={text}
      action={
        <ButtonLink to="/home" size="sm">
          {t.common.goHome}
        </ButtonLink>
      }
    />
  );
}

/** 404: rota yoksa ya da yükleyici `notFound()` attıysa. Başlık `__root`'taki varsayılandan gelir. */
export function NotFoundPage({ data }: { data?: unknown }) {
  const text = (data as { text?: string } | undefined)?.text ?? t.common.notFoundText;
  return (
    <>
      <PageHeader title={t.common.notFound} back="/home" />
      <NotFoundBlock text={text} />
    </>
  );
}

/** Yükleyici hatası (ağ, sunucu): sayfa çerçevesi kalır, yeniden deneme düğmesi çıkar. */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <>
      <PageHeader title={t.common.error} back="/home" />
      <ErrorState
        error={error}
        onRetry={() => {
          reset();
          router.invalidate();
        }}
      />
    </>
  );
}
