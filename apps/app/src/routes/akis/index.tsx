import { createFileRoute, redirect } from '@tanstack/react-router';

// Eski uygulamadaki akış adresi: akış artık ana sayfada.
export const Route = createFileRoute('/akis/')({
  beforeLoad: () => {
    throw redirect({ to: '/home', statusCode: 301 });
  },
});
