import { getRequest } from '@tanstack/react-start/server';
import { upstream } from './env.server';

// Sunucuda (SSR yükleyicileri) API çağrısı: gelen isteğin çerezi aktarılır ki girişli üyenin sayfası kişisel oluşsun.
const PASS = ['cookie', 'accept-language', 'cf-connecting-ip', 'user-agent'];

export function serverApi(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  let incoming: Request | undefined;
  try {
    incoming = getRequest();
  } catch {
    incoming = undefined;
  }
  for (const name of PASS) {
    const value = incoming?.headers.get(name);
    if (value && !headers.has(name)) headers.set(name, value);
  }
  return upstream(path, { ...init, headers });
}
