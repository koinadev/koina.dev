// Marker'lı: JSON olamaz — kaldırılan özelliğe ait madde burada satır bazında sökülür.
export const features = {
  eyebrow: 'Özellikler',
  title: 'İhtiyacınız olan her şey, fazlası yok',
  description: 'Performanstan SEO’ya, animasyonlardan erişilebilirliğe — landing page için gereken tüm parçalar hazır.',
  items: [
    { icon: 'zap', title: 'Işık hızında', description: 'Sıfır JS hydration, statik çıktı ve optimize asset’lerle 95+ Lighthouse skoru.' },
    { icon: 'shield', title: 'Güvenli formlar', description: 'Turnstile bot koruması ve sunucu tarafı doğrulama ile spam’siz iletişim.' }, // @feature:forms
    { icon: 'globe', title: 'Çok dilli', description: 'TR/EN hazır i18n altyapısı; hreflang ve locale yönlendirmesi otomatik.' }, // @feature:i18n
    { icon: 'chart', title: 'SEO hazır', description: 'Meta, OG image, sitemap ve JSON-LD structured data kutudan çıkar.' },
    { icon: 'sparkles', title: 'Canlı animasyonlar', description: 'GSAP scroll-reveal ve mikro etkileşimler; reduced-motion’a saygılı.' },
    { icon: 'code', title: 'Temiz mimari', description: 'İçerik data dosyalarında, komponentler saf; her özellik tek komutla sökülür.' },
  ],
};
