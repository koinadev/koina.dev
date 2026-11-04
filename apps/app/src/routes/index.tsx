import { createFileRoute, redirect } from '@tanstack/react-router';

// `/` adresinin sahibi giriş kapısıdır (server.ts: girişli üye → /home, misafir → tanıtım sitesi). Buraya yalnız uygulama içi
// gezinme düşer.
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/home' });
  },
});
