import type { IconName } from '../../lib/icons';

// Kayıt sayfası. Bilerek kısa: ad, e-posta ve eğlenceli birkaç seçim. Sezon başvurusu bir
// onay kutusu; ayrıntılar daha sonra, kişi hazır olduğunda istenir.
export const signup = {
  meta: {
    title: 'Ücretsiz kayıt ol',
    description:
      'Koina’ya ücretsiz kayıt ol: iki dakika, birkaç tıklama. İmece usulü açık kaynak topluluğuna katıl, ilk sezondan haberdar ol.',
  },
  note: 'iki dakika, söz!',
  title: 'Aramıza katıl',
  lead: 'Kayıt ücretsiz ve kısa. Uzun formlar, özgeçmiş ya da sınav yok. Ne kadar katılacağına sen karar verirsin.',
  form: {
    name: 'Adın ya da takma adın',
    email: 'E-posta',
    github: 'GitHub kullanıcı adın',
    githubHint: 'isteğe bağlı',
    interestsLabel: 'Burada en çok ne yapmak istersin?',
    interestsHint: 'İstediğin kadar seç, sonra değiştirebilirsin.',
    interests: [
      { value: 'izlemek', icon: 'Video01Icon', label: 'Takılmak ve izlemek' },
      { value: 'kod', icon: 'SourceCodeIcon', label: 'Kod yazmak' },
      { value: 'ogretmek', icon: 'MentoringIcon', label: 'Öğretmek ve review yapmak' },
      { value: 'fikir', icon: 'Idea01Icon', label: 'Fikrimi anlatmak' },
      { value: 'tasarim', icon: 'PaintBrush01Icon', label: 'Tasarım, yazı, video' },
      { value: 'destek', icon: 'HandshakeIcon', label: 'Destekçi olmak' },
    ] as { value: string; icon: IconName; label: string }[],
    levelLabel: 'Yazılımda neredesin?',
    levels: ['Yeni başlıyorum', 'Biraz deneyimim var', 'Yıllardır içindeyim', 'Yazılımcı değilim'],
    season: 'Sezon 1 başvurusu açılınca bana haber ver',
    consent: 'Bana Koina ile ilgili e-posta gönderilmesini kabul ediyorum. İstediğim an çıkabilirim.',
    privacy: 'Gizlilik',
    submit: 'Aramıza katıl',
    sending: 'Gönderiliyor...',
    success: 'Hoş geldin! Birkaç dakika içinde e-postana Discord daveti gelecek.',
    error: 'Kayıt gönderilemedi. Bağlantını kontrol edip tekrar dene ya da merhaba@koina.dev adresine yaz.',
  },
  next: {
    title: 'Sonra ne olacak?',
    items: [
      { icon: 'Mail01Icon', title: 'Hoş geldin e-postası', text: 'Discord daveti ve kısa bir rehber.' },
      {
        icon: 'SmileIcon',
        title: 'İlk minik görev',
        text: '#tanış kanalında kendini bir emojiyle anlat. Hepsi bu.',
      },
      {
        icon: 'Calendar03Icon',
        title: 'İlk yayın',
        text: 'Salı 21:00’de Kodla Buluşma. İstersen sadece izle.',
      },
      { icon: 'PartyIcon', title: 'Sezon haberi', text: 'Sezon 1 başvurusu açılınca ilk sen öğrenirsin.' },
    ] as { icon: IconName; title: string; text: string }[],
  },
  free: 'Koina tamamen ücretsizdir ve imece usulü işler. Bilgilerin satılmaz, reklam için paylaşılmaz.',
};
