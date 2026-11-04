import { describe, expect, it } from 'vitest';
import { organizationJsonLd, siteConfig } from '../config/site.config';

describe('organizationJsonLd', () => {
  it('boş sosyal profil URL`lerini sameAs listesine yazmaz', () => {
    const organization = organizationJsonLd();
    expect(organization.sameAs).toEqual(Object.values(siteConfig.socials).filter(Boolean));
    expect(organization.sameAs).not.toContain('');
  });

  it('Organization kimliğini URL ve mutlak logo URL`iyle tamamlar', () => {
    expect(organizationJsonLd()).toMatchObject({
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
      logo: siteConfig.url ? new URL(siteConfig.logo, siteConfig.url).href : siteConfig.logo,
    });
  });
});
