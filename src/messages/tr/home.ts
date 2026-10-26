import type { Action, IconItem } from '../types';
import type { IconName } from '../../lib/icons';

// Ana sayfanın topluluk bölümleri. Hero, roller, sezon ve ritim kendi dosyalarında.
export const home = {
  banner: {
    text: 'Koina’ya katılım ücretsizdir. İmece usulü, birbirimize destek olarak büyürüz.',
    link: { label: 'Nasıl mı?', route: 'imece' } as Action,
  },
  badges: [
    { icon: 'GiftIcon', label: 'Ücretsiz katılım' },
    { icon: 'HeartHandshakeIcon', label: 'İmece usulü destek' },
    { icon: 'SourceCodeIcon', label: 'Açık kaynak' },
  ] as { icon: IconName; label: string }[],
  pillars: {
    note: 'burası bir kurs değil',
    title: 'Burası bir topluluk.',
    description:
      'Koina’da öğretmen-öğrenci yok, kodu birlikte yazan insanlar var. Kimse ücret ödemez; herkes bildiğini ve ayırabildiği kadar vaktini getirir.',
    items: [
      {
        icon: 'GiftIcon',
        title: 'Ücretsiz, hep ücretsiz',
        text: 'Üyelik, sezonlar, yayınlar, atölyeler. Para kapı değil.',
      },
      {
        icon: 'HeartHandshakeIcon',
        title: 'İmece usulü',
        text: 'Biri review yapar, biri dokümantasyon yazar, biri soru sorar. Hepsi katkı.',
      },
      {
        icon: 'SourceCodeIcon',
        title: 'Her şey açıkta',
        text: 'Kod, review, kararlar ve harcamalar herkese açık.',
      },
      {
        icon: 'SmileIcon',
        title: 'Eğlenceli',
        text: 'Yayında güleriz, Cuma kahvesinde dertleşiriz. Öğrenmek yorucu olmak zorunda değil.',
      },
    ] as IconItem[],
  },
  tiny: {
    note: 'küçük başla',
    title: 'Bugün iki dakikan mı var? Yeter.',
    description: 'Büyük taahhütler yok. Aşağıdakilerden birini seç, gerisi kendiliğinden gelir.',
    items: [
      {
        icon: 'SmileIcon',
        title: 'Discord’a gel, kendini bir emojiyle tanıt',
        time: '30 sn',
        link: { label: 'Discord', href: 'https://discord.gg/koinadev' },
      },
      {
        icon: 'Video01Icon',
        title: 'Salı yayınına uğra, sohbete “selam” yaz',
        time: '1 dk',
        link: { label: 'Yayınlar', route: 'streams' },
      },
      {
        icon: 'BubbleChatQuestionIcon',
        title: 'Haftanın sorusuna tek cümleyle cevap ver',
        time: '2 dk',
        link: { label: 'Discord', href: 'https://discord.gg/koinadev' },
      },
      {
        icon: 'ThumbsUpIcon',
        title: 'Beğendiğin bir fikre oy ver',
        time: '2 dk',
        link: { label: 'Projeler', route: 'projects' },
      },
      {
        icon: 'Coffee02Icon',
        title: 'Cuma kahvesine katıl, sadece dinle',
        time: '30 dk',
        link: { label: 'Nasıl çalışır?', route: 'howItWorks' },
      },
      {
        icon: 'GitPullRequestIcon',
        title: '“ilk-katkı” etiketli bir issue seç',
        time: '1 saat',
        link: { label: 'GitHub', href: 'https://github.com/koinadev' },
      },
    ] as { icon: IconName; title: string; time: string; link: Action }[],
  },
  imece: {
    note: 'eski bir gelenek, yeni bir repo',
    title: 'İmece: herkes bir taş getirir, ev birlikte yükselir.',
    paragraphs: [
      'Anadolu’da bir ev yapılacaksa köylü toplanır, herkes elinden geleni yapardı. Kimse ücret almaz, herkes kazançlı çıkardı.',
      'Koina’da ustalar tecrübesini, katılımcılar emeğini ve merakını, fikir sahipleri problemlerini, destekçiler altyapıyı getiriyor. Ortaya çıkan kod herkese açık kalıyor.',
    ],
    photoAlt: 'Ortada elleri üst üste birleşmiş bir grup insan',
    link: { label: 'İmece nasıl işliyor?', route: 'imece' } as Action,
  },
  sponsors: {
    note: 'imeceye omuz verenler',
    title: 'Destekçilerimiz',
    description:
      'Koina’yı ücretsiz tutan altyapıyı destekçilerimiz taşıyor. Sezon 1 için ilk destekçilerimizi arıyoruz.',
    empty: 'Logon burada olabilir',
    link: { label: 'Sponsorluk', route: 'sponsor' } as Action,
  },
  explore: {
    note: 'biraz daha tanı',
    title: 'Koina’yı keşfet',
    items: [
      {
        icon: 'UserGroupIcon',
        title: 'Hakkımızda',
        text: 'Kimiz, ne yapıyoruz?',
        link: { label: 'Hakkımızda', route: 'about' },
      },
      {
        icon: 'Plant02Icon',
        title: 'Neden kurulduk?',
        text: 'Gördüğümüz sorun ve imece fikri.',
        link: { label: 'Neden kurulduk?', route: 'why' },
      },
      {
        icon: 'Flag02Icon',
        title: 'Manifesto',
        text: 'Neye inandığımız, on maddede.',
        link: { label: 'Manifesto', route: 'manifesto' },
      },
      {
        icon: 'Rocket01Icon',
        title: 'Yeni başlayanlar için',
        text: 'İlk gerçek projeni yalnız yapma.',
        link: { label: 'Yeni başlayanlar için', route: 'learners' },
      },
      {
        icon: 'MentoringIcon',
        title: 'Ustalar için',
        text: 'Bildiğini paylaş, izini bırak.',
        link: { label: 'Ustalar için', route: 'mentors' },
      },
      {
        icon: 'Idea01Icon',
        title: 'Fikir sahipleri için',
        text: 'Fikrini getir, ekibi birlikte kuralım.',
        link: { label: 'Fikir sahipleri için', route: 'founders' },
      },
    ] as IconItem[],
  },
  faqLink: { label: 'Tüm soruları gör', route: 'faq' } as Action,
};
