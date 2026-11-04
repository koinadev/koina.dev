import type { IconName } from '../../lib/icons';

// Kayıt sayfası. Katılmak bir Koina hesabı açmaktır; ayrıntılar (ilgi, GitHub) sonra profilde.
export const signup = {
  meta: {
    title: 'Kayıt ol',
    description:
      'Koina hesabını aç: e-postanı yaz, gelen kodu gir. Şifre ve uzun form yok. Açık kaynağa destek olan, imece usulü bir topluluğa katıl.',
  },
  note: 'bir dakika, söz!',
  title: 'Aramıza katıl',
  lead: 'Katılmak bir Koina hesabı açmak demek: e-postanı yazarsın, gelen 6 haneli kodu girersin. Şifre, özgeçmiş ya da sınav yok. Her yeni hesap, sıradaki özelliği açmaya bir adım daha yaklaştırır.',
  next: {
    title: 'Sonra ne olacak?',
    items: [
      { icon: 'Mail01Icon', title: 'Kodla giriş', text: 'E-postana 6 haneli kod gelir; hesabın ilk girişte açılır.' },
      { icon: 'SmileIcon', title: 'Profilin', text: 'Adını, ilgi alanlarını ve GitHub’ını eklersin. İstersen boş bırak.' },
      {
        icon: 'Calendar03Icon',
        title: 'İlk yayın',
        text: 'Salı 21:00’de Kodla Buluşma. İstersen sadece izle.',
      },
      { icon: 'PartyIcon', title: 'Yeni adımlar', text: 'Girişte haber iznini işaretlersen yeni bir adım açılınca e-posta gelir.' },
    ] as { icon: IconName; title: string; text: string }[],
  },
  account: 'Koina hesabını aç',
  free: 'Topluluğa katılmak için ücret ödemezsin; ana amacımız açık kaynağa destek. Bilgilerin satılmaz, reklam için paylaşılmaz.',
};
