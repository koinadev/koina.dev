import { Hono } from 'hono';
import type { AppEnv } from '../../../core/types/env';
import { serveMedia } from '../service/serve-media';
import { uploadMedia } from '../service/upload-media';

/** `POST /v1/media`: yükleme. */
export const mediaUploadRoutes = new Hono<AppEnv>().post('/', (c) => uploadMedia(c));

/** `GET /media/<anahtar>`: herkese açık sunum (sürüm öneki yok; adres gönderide saklanmaz, her yanıtta yeniden kurulur). */
export const mediaServeRoutes = new Hono<AppEnv>().get('/*', (c) => serveMedia(c));
