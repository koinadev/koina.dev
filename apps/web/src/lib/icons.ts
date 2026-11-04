import type * as icons from '@hugeicons/core-free-icons';

/** Hugeicons ikon adı (`UserGroupIcon` gibi). İçerik dosyaları bu tipi kullanır; yanlış ad derlemede yakalanır. */
export type IconName = Extract<keyof typeof icons, `${string}Icon`>;
