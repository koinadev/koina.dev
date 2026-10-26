import type { InfoPage } from '../types';

// Bilgi sayfalarının içeriği. Şema: src/messages/types.ts. Ortak mesaj her sayfada aynı:
// Koina ücretsiz ve imece usulü işler; kimse ücret ödemez, herkes bildiğini paylaşır.

const about: InfoPage = {
  meta: {
    title: 'Hakkımızda',
    description:
      'Koina, deneyimli geliştiricilerle yolun başındakileri açık kaynak projelerde buluşturan, ücretsiz ve imece usulü işleyen bir yazılım topluluğu.',
  },
  hero: {
    note: 'merhaba, biz Koina!',
    title: 'Birlikte kod yazan, birbirine omuz veren bir topluluğuz.',
    lead: 'Koina bir kurs, bir ajans ya da bir şirket değil. Deneyimli geliştiricilerin, yolun başındakilerin ve aklında bir fikir olanların aynı repoda buluştuğu, tamamen ücretsiz bir topluluk.',
    photo: 'circle',
    photoAlt: 'Çimlerin üstünde sandalyelerle çember olmuş, sohbet eden bir grup',
  },
  blocks: [
    {
      type: 'prose',
      title: 'Ne yapıyoruz?',
      body: [
        'Altı haftalık sezonlarda küçük ekipler kuruyoruz. Her ekipte bir usta, üç ila beş katılımcı ve çoğu zaman bir fikir sahibi var. Ekip gerçek bir problemi seçiyor, kodu açıkta yazıyor, her PR review alıyor ve sezon sonunda Demo Günü’nde v0.1’ini gösteriyor.',
        'Sezon dışında da topluluk hiç durmuyor: haftada iki canlı yayın, eşli çalışma saatleri, Cuma kahveleri ve Discord’da her gün biri bir şey soruyor, biri cevaplıyor.',
      ],
      aside: 'hepsi ücretsiz, hep ücretsiz',
    },
    {
      type: 'cards',
      title: 'Bizi biz yapan dört şey',
      columns: 2,
      items: [
        {
          icon: 'GiftIcon',
          title: 'Ücretsiz',
          text: 'Katılım, yayınlar, review’lar, atölyeler: hiçbiri ücretli değil ve olmayacak. Para kapı değil.',
        },
        {
          icon: 'HeartHandshakeIcon',
          title: 'İmece usulü',
          text: 'Herkes bildiğini ve ayırabildiği kadar zamanını getirir. Biri test yazmayı öğretir, öbürü dokümantasyonu toparlar.',
        },
        {
          icon: 'SourceCodeIcon',
          title: 'Açık',
          text: 'Kod açık, review’lar açık, kararlar açık, harcamalar açık. Kapalı kapılar ardında iş yok.',
        },
        {
          icon: 'SmileIcon',
          title: 'Eğlenceli',
          text: 'Bir şey öğrenmenin yorucu olması gerekmiyor. Küçük adımlarla başlar, birlikte gülerek devam ederiz.',
        },
      ],
    },
    {
      type: 'split',
      title: 'Kimler var?',
      body: [
        'Öğrenciler, bootcamp mezunları, kariyer değiştirenler; on yıldır kod yazan ustalar; ürün fikri olan girişimciler; tasarımcılar, yazarlar, video yapanlar. Ortak noktaları birlikte bir şey üretmeyi sevmeleri.',
        'Seviye fark etmez. Burada kimse “daha çok bilmiyorsun” diye dışarıda kalmaz; herkesin verebileceği bir şey vardır.',
      ],
      photo: 'selfie',
      photoAlt: 'Renkli bir ofiste birlikte selfie çeken gülümseyen bir grup',
    },
    {
      type: 'rows',
      title: 'Kısaca Koina',
      items: [
        { label: 'Kuruluş', value: '2026, Türkiye' },
        { label: 'Katılım', value: 'Ücretsiz, her zaman' },
        { label: 'Çalışma dili', value: 'Türkçe; kod ve dokümantasyon İngilizce' },
        { label: 'Lisans', value: 'Site AGPL-3.0, içerik CC BY-SA 4.0' },
        { label: 'Giderler', value: 'Sponsorlar ve gönüllü destekle, açık raporla' },
      ],
    },
  ],
  cta: {
    title: 'Aramıza katılmak iki dakika sürüyor.',
    text: 'Ücretsiz kayıt ol, Discord’a gel, bir emojiyle kendini tanıt. Gerisi kendiliğinden gelir.',
    primary: { label: 'Ücretsiz kayıt ol', route: 'signup' },
    secondary: { label: 'Neden kurulduk?', route: 'why' },
  },
};

const why: InfoPage = {
  meta: {
    title: 'Neden kurulduk?',
    description:
      'Yapay zekâ kod yazmayı ucuzlattı ama gerçek deneyim kazanılan yerler daraldı. Koina bu boşluğu imece usulü, ücretsiz bir toplulukla doldurmak için kuruldu.',
  },
  hero: {
    note: 'kısa hikâyemiz',
    title: 'Yapay zekâ kodu ucuzlattı. Birlikte öğrenmeyi değil.',
    lead: 'Bugün bir model birkaç saatte çalışan bir uygulama çıkarabiliyor. Ama ona mimariyi, testi, güvenliği ve “bu neden böyle?” sorusunu soracak birine hâlâ ihtiyaç var.',
    photo: 'demo',
    photoAlt: 'Karanlık bir salonda büyük ekranın önünde sunum yapan biri ve izleyiciler',
  },
  blocks: [
    {
      type: 'prose',
      title: 'Gördüğümüz sorun',
      body: [
        'Junior pozisyonları azaldı. İlk gerçek deneyimin kazanıldığı yer, yani deneyimli birinin kodunu okuyup “şunu böyle yapsak?” dediği an, giderek daralıyor. Yolun başındaki biri tek başına video izleyip tek başına proje yapıyor; geri bildirim alamıyor.',
        'Öte yandan deneyimli geliştiriciler bildiklerini paylaşmak istiyor ama bunun için doğru yer yok. Mentorluk çoğu zaman görünmez kalıyor, CV’de tek satır.',
        'Ve aklında güzel bir fikir olan pek çok insan, onu hayata geçirecek bir ekibe ulaşamıyor.',
      ],
    },
    {
      type: 'quote',
      text: 'Köyde bir ev yapılacaksa herkes bir taş getirirdi. Biz de aynısını kodla yapmak istedik.',
      by: 'Koina kurucu ekibi',
    },
    {
      type: 'prose',
      title: 'Bulduğumuz çözüm: imece',
      body: [
        'Anadolu’da imece, bir işin herkesin elinden geldiğince katılımıyla, karşılıksız ve birlikte yapılmasıdır. Harman kaldırılır, ev yapılır, yol açılır; kimse kimseye ücret ödemez ama herkes kazançlı çıkar.',
        'Koina bu geleneği açık kaynakla birleştiriyor. Ustalar zamanını ve tecrübesini, katılımcılar emeğini ve merakını, fikir sahipleri problemlerini, sponsorlar altyapıyı getiriyor. Ortaya çıkan kod herkese açık kalıyor.',
      ],
      aside: 'para kapı olmasın diye',
    },
    {
      type: 'cards',
      title: 'Neyi değiştirmek istiyoruz?',
      columns: 3,
      items: [
        {
          icon: 'Rocket01Icon',
          title: 'İlk deneyim',
          text: 'Yolun başındaki herkesin gerçek bir projede, gerçek review alarak çalışabildiği bir yer.',
        },
        {
          icon: 'MentoringIcon',
          title: 'Görünür mentorluk',
          text: 'Ustaların emeğinin kayıtlı, doğrulanabilir ve takdir edilen bir iş olması.',
        },
        {
          icon: 'UserGroupIcon',
          title: 'Gerçek bağlar',
          text: 'Kartvizitle değil, birlikte yazılmış kodla kurulan ilişkiler ve iş fırsatları.',
        },
      ],
    },
  ],
  cta: {
    title: 'Manifestomuzu okudun mu?',
    text: 'Neye inandığımızı on kısa maddede yazdık.',
    primary: { label: 'Manifestoyu oku', route: 'manifesto' },
    secondary: { label: 'Ücretsiz kayıt ol', route: 'signup' },
  },
};

const manifesto: InfoPage = {
  meta: {
    title: 'Manifesto',
    description:
      'Koina topluluğunun neye inandığı: ücretsiz katılım, imece usulü dayanışma, açık kod ve eğlenerek öğrenmek.',
  },
  hero: {
    note: 'neye inanıyoruz?',
    title: 'Koina manifestosu',
    lead: 'Kısa, net, ve her yeni üyeyle yeniden okuduğumuz on madde.',
  },
  blocks: [
    {
      type: 'steps',
      items: [
        {
          title: 'Para kapı değildir.',
          text: 'Koina’ya katılmak ücretsizdir ve öyle kalacak. Bilgiye erişim kimsenin cüzdanına bağlı olmamalı.',
        },
        {
          title: 'Herkesin verecek bir şeyi var.',
          text: 'Bir satır kod, bir soru, bir düzeltme, bir “ben de takıldım” mesajı. İmece büyük katkılardan değil, çok sayıda küçük katkıdan oluşur.',
        },
        {
          title: 'Kod açıkta yazılır.',
          text: 'Review’lar, kararlar, hatalar, hepsi herkese açık. Açıklık hem öğretir hem korur.',
        },
        {
          title: 'Soru sormak ayıp değil, sormamak kayıp.',
          text: 'Burada aptalca soru yok. Bir soruyu soran, onu sormaya çekinen on kişiye de yardım eder.',
        },
        {
          title: 'Küçük adımlar büyük adımlardan iyidir.',
          text: 'İlk gün kimseden bir özellik beklemiyoruz. Bir emojiyle tanışmak da katılmaktır.',
        },
        {
          title: 'Review bir hediyedir.',
          text: 'Kodu değil kişiyi eleştirmeyiz. Her yorum, karşıdakini bir adım ileri taşımak için yazılır.',
        },
        {
          title: 'Yapay zekâ araçtır, bahane değil.',
          text: 'Her aracı kullanırız; ama gönderdiğimiz kodu anlamak ve açıklayabilmek bizim sorumluluğumuzdur.',
        },
        {
          title: 'Emek görünür olmalı.',
          text: 'Mentorluk, dokümantasyon, tasarım, moderasyon: hepsi katkıdır ve hepsi kayda geçer.',
        },
        {
          title: 'Eğlence ciddi bir iştir.',
          text: 'İnsanlar keyif aldıkları yerde kalır. Yayınlarda güleriz, Cuma kahvesinde dertleşiriz.',
        },
        {
          title: 'Topluluk herkesindir.',
          text: 'Koina’yı kurucuları değil, her hafta gelen insanlar şekillendirir. Kurallar da, yol haritası da açıkça tartışılır.',
        },
      ],
    },
  ],
  cta: {
    title: 'Bu maddeler sana da yakın geliyor mu?',
    text: 'O zaman zaten aramızdasın, sadece kayıt olman kaldı.',
    primary: { label: 'Ücretsiz kayıt ol', route: 'signup' },
    secondary: { label: 'Davranış kuralları', route: 'conduct' },
  },
};

const imece: InfoPage = {
  meta: {
    title: 'Ücretsiz ve imece usulü',
    description:
      'Koina’ya katılım tamamen ücretsizdir. Topluluk imece usulü işler: herkes bildiğini ve vaktini paylaşır, giderler sponsorlar ve gönüllü destekle açıkça karşılanır.',
  },
  hero: {
    note: 'evet, gerçekten ücretsiz',
    title: 'Ücretsiz katılım, imece usulü dayanışma.',
    lead: 'Koina’da kimse kimseye ücret ödemez. Herkes elinden geleni getirir, karşılığında hep birlikte büyürüz. İşte bunun nasıl işlediği.',
    photo: 'hands',
    photoAlt: 'Ortada elleri üst üste birleşmiş bir grup insan',
  },
  blocks: [
    {
      type: 'cards',
      title: 'Kim ne getiriyor?',
      intro: 'İmece bir alışveriş değil; ama herkesin bir payı var. Payın büyüklüğünü sen belirlersin.',
      columns: 2,
      items: [
        {
          icon: 'MentoringIcon',
          title: 'Ustalar',
          text: 'Haftada birkaç saat: senkron toplantı ve PR review. Karşılığında doğrulanabilir mentorluk kaydı ve harika insanlarla tanışmak.',
        },
        {
          icon: 'Idea01Icon',
          title: 'Katılımcılar',
          text: 'Merak, emek ve sorular. Karşılığında gerçek bir projede commit geçmişi ve review.',
        },
        {
          icon: 'Target02Icon',
          title: 'Fikir sahipleri',
          text: 'Net bir problem ve haftalık ürün sohbeti. Karşılığında açık kaynak bir MVP ve birlikte çalışılmış bir ekip.',
        },
        {
          icon: 'HandshakeIcon',
          title: 'Destekçiler',
          text: 'Sunucu, yayın ekipmanı, etkinlik alanı ya da bağış. Karşılığında görünürlük ve yetenekli bir toplulukla bağ.',
        },
      ],
    },
    {
      type: 'rows',
      title: 'Ücretsiz olan her şey',
      items: [
        { label: 'Topluluğa üyelik', value: 'Ücretsiz' },
        { label: 'Sezonlara katılım', value: 'Ücretsiz', note: 'katılımcı, usta ya da fikir sahibi olarak' },
        { label: 'Canlı yayınlar ve kayıtlar', value: 'Ücretsiz' },
        { label: 'Atölyeler ve Demo Günü', value: 'Ücretsiz' },
        { label: 'Bülten', value: 'Ücretsiz', note: 'istediğin an çıkabilirsin' },
      ],
    },
    {
      type: 'prose',
      title: 'Peki giderler nasıl karşılanıyor?',
      body: [
        'Sunucu, alan adı, yayın araçları ve etkinlikler için gereken para sponsorlardan ve gönüllü bireysel destekten gelir. Hiçbir sponsor katılımı ücretli hale getiremez ya da projeleri kapatamaz.',
        'Her sezon sonunda gelir ve giderleri kalem kalem yayımlarız. Bir kuruşun nereye gittiğini herkes görebilir.',
      ],
      aside: 'açık kitap',
    },
    {
      type: 'list',
      title: 'Hiçbir zaman yapmayacaklarımız',
      tone: 'dont',
      items: [
        'Katılım, sertifika ya da “premium üyelik” için ücret almak.',
        'Üyelerin bilgilerini satmak ya da reklam için paylaşmak.',
        'Topluluk projelerini kapalı kaynağa çevirmek.',
        'Sponsorlara üyeler üzerinde söz hakkı tanımak.',
      ],
    },
  ],
  cta: {
    title: 'İmeceye sen de bir taş koy.',
    text: 'Kayıt olmak ücretsiz; ne kadar katılacağına sen karar verirsin.',
    primary: { label: 'Ücretsiz kayıt ol', route: 'signup' },
    secondary: { label: 'Destekçi ol', route: 'sponsor' },
  },
};

const howItWorks: InfoPage = {
  meta: {
    title: 'Nasıl çalışır?',
    description:
      'Koina sezonları, roller, haftalık ritim ve canlı yayınlar. Ücretsiz, altı haftalık, imece usulü açık kaynak projeler.',
  },
  hero: {
    note: 'adım adım',
    title: 'Altı hafta, küçük bir ekip, gerçek bir proje.',
    lead: 'Koina sezonlarla ilerler. Her sezonda birkaç proje seçilir, ekipler kurulur ve altı hafta sonra her ekip ilk sürümünü canlı yayında gösterir. Katılım ücretsizdir.',
    photo: 'hackathon',
    photoAlt: 'Akşam ışığında uzun masalarda laptoplarıyla çalışan insanlar',
  },
  blocks: [
    {
      type: 'steps',
      title: 'Bir sezonun akışı',
      items: [
        {
          title: 'Hafta 0: Eşleşme',
          text: 'Topluluk oylamasıyla projeler seçilir, ekipler kurulur, kickoff yayını yapılır.',
        },
        { title: 'Hafta 1: Keşif', text: 'Problem tanımı, ilk mimari kararlar ve repo iskeleti.' },
        { title: 'Hafta 2: Temel', text: 'CI, test altyapısı ve uçtan uca çalışan ilk küçük parça.' },
        { title: 'Hafta 3–4: İnşa', text: 'Özellikler, ara demo yayını ve bol review.' },
        { title: 'Hafta 5: Cila', text: 'Dokümantasyon, güvenlik kontrolü, sürüm adayı.' },
        { title: 'Hafta 6: Demo Günü', text: 'v0.1 sürümü, canlı demo, retro ve portföy kartları.' },
      ],
    },
    {
      type: 'cards',
      title: 'Roller',
      intro: 'Hangi rolde olursan ol, verdiğin ve aldığın açıkça yazılı.',
      columns: 3,
      items: [
        {
          icon: 'Plant02Icon',
          title: 'Katılımcı',
          text: 'Yolun başındasın ve gerçek bir projede çalışmak istiyorsun.',
          link: { label: 'Yeni başlayanlar için', route: 'learners' },
        },
        {
          icon: 'MentoringIcon',
          title: 'Usta',
          text: 'Deneyimlisin ve bildiğini paylaşmak istiyorsun.',
          link: { label: 'Ustalar için', route: 'mentors' },
        },
        {
          icon: 'Idea01Icon',
          title: 'Fikir sahibi',
          text: 'Aklında çözülmesini istediğin bir problem var.',
          link: { label: 'Fikir sahipleri için', route: 'founders' },
        },
      ],
    },
    {
      type: 'rows',
      title: 'Haftalık ritim',
      intro: 'Sezon olsun olmasın, her hafta aynı gün aynı şey olur. Saatler Türkiye saatiyle.',
      items: [
        { label: 'Pazartesi 09:00', value: 'Koina Haftası bülteni', note: 'e-posta' },
        { label: 'Salı 21:00', value: 'Kodla Buluşma: canlı kodlama', note: 'YouTube' },
        { label: 'Çarşamba 20:00', value: 'Eşli çalışma saati', note: 'Discord' },
        { label: 'Perşembe 21:00', value: 'Açık Review: gerçek PR’lar canlı', note: 'YouTube' },
        { label: 'Cuma 18:00', value: 'Cuma kahvesi, kamera isteğe bağlı', note: 'Discord' },
      ],
    },
  ],
  cta: {
    title: 'İlk sezona yer ayırt.',
    text: 'Kayıt ol, sezon başvurusu açıldığında ilk sen haber al. Ücretsiz.',
    primary: { label: 'Ücretsiz kayıt ol', route: 'signup' },
    secondary: { label: 'Sık sorulan sorular', route: 'faq' },
  },
};

const learners: InfoPage = {
  meta: {
    title: 'Yeni başlayanlar için',
    description:
      'Yazılıma yeni başlayanlar için ücretsiz açık kaynak deneyimi: gerçek projelerde çalış, deneyimli ustalardan review al, portföyünü birlikte oluştur.',
  },
  hero: {
    note: 'yolun başındaysan',
    title: 'İlk gerçek projeni yalnız yapmak zorunda değilsin.',
    lead: 'Video izleyip tek başına proje yapmaktan sıkıldıysan doğru yerdesin. Koina’da bir ekiple çalışır, her PR’ına deneyimli birinden geri bildirim alırsın. Ücretsiz.',
    photo: 'table',
    photoAlt: 'Bir kafede ahşap masada gülerek sohbet eden iki genç kadın',
  },
  blocks: [
    {
      type: 'tiny',
      title: 'Küçük başla',
      intro: 'İlk günden kimse senden bir özellik beklemiyor. İşte yorulmadan başlamanın yolları:',
      items: [
        { icon: 'SmileIcon', title: 'Discord’da bir emojiyle kendini tanıt', time: '30 sn' },
        { icon: 'Video01Icon', title: 'Salı yayınını izle, sohbete “selam” yaz', time: '5 dk' },
        {
          icon: 'BubbleChatQuestionIcon',
          title: '#soru-cevap kanalına takıldığın bir şeyi sor',
          time: '2 dk',
        },
        { icon: 'ThumbsUpIcon', title: 'Bir issue’yu oku, bir 👍 bırak', time: '3 dk' },
        { icon: 'GitPullRequestIcon', title: '“ilk-katkı” etiketli bir issue seç', time: '30 dk' },
      ],
    },
    {
      type: 'cards',
      title: 'Ne kazanırsın?',
      columns: 2,
      items: [
        {
          icon: 'GitBranchIcon',
          title: 'Gerçek commit geçmişi',
          text: 'Tutorial değil, insanların kullandığı bir projede adının yazdığı commit’ler.',
        },
        {
          icon: 'CheckmarkCircle02Icon',
          title: 'Her PR’a review',
          text: 'Bir usta kodunu okur, neyin neden daha iyi olabileceğini anlatır.',
        },
        {
          icon: 'UserGroupIcon',
          title: 'Bir ekip',
          text: 'Birlikte takıldığın, birlikte çözdüğün, sezon bitince de konuştuğun insanlar.',
        },
        {
          icon: 'Award01Icon',
          title: 'Demo Günü kaydı',
          text: 'Projeni canlı yayında gösterdiğin bir kayıt ve portföy kartı.',
        },
      ],
    },
    {
      type: 'list',
      title: 'Ne kadar bilmem gerekiyor?',
      intro: 'Şunlar yeterli:',
      tone: 'do',
      items: [
        'Git ile commit atıp push edebilmek (bilmiyorsan ilk atölyede öğretiyoruz).',
        'Herhangi bir dilde küçük bir program yazmış olmak.',
        'Haftada birkaç saat ayırabilmek. Ne kadar ayırabileceğini sen söylersin.',
      ],
    },
  ],
  cta: {
    title: 'Hadi, ilk adım 30 saniye.',
    text: 'Ücretsiz kayıt ol, Discord’a gel, kendini bir emojiyle tanıt.',
    primary: { label: 'Ücretsiz kayıt ol', route: 'signup' },
    secondary: { label: 'Bağlantılarımız', route: 'links' },
  },
};

const mentors: InfoPage = {
  meta: {
    title: 'Ustalar için',
    description:
      'Deneyimli yazılımcılar için gönüllü mentorluk: haftada birkaç saatle açık kaynak projelerde ekip yönet, doğrulanabilir mentorluk kaydı kazan.',
  },
  hero: {
    note: 'deneyimliysen',
    title: 'Bildiğini paylaş, izini bırak.',
    lead: 'Yıllardır biriktirdiğin tecrübe birinin ilk işini bulmasını sağlayabilir. Koina’da usta olarak haftada birkaç saatle küçük bir ekibi Demo Günü’ne taşırsın. Gönüllü ve imece usulü.',
    photo: 'pairing',
    photoAlt: 'Monitör başında birlikte kod üzerinde çalışan iki kişi',
  },
  blocks: [
    {
      type: 'rows',
      title: 'Ne kadar zaman?',
      intro: 'Altı hafta boyunca, haftada yaklaşık 2–3 saat:',
      items: [
        { label: '45 dakika', value: 'Haftalık ekip senkronu' },
        { label: '3+ PR', value: 'Haftalık review' },
        { label: '1 kez', value: 'Bir canlı yayına konuk olmak', note: 'isteğe bağlı' },
      ],
    },
    {
      type: 'cards',
      title: 'Ne kazanırsın?',
      columns: 2,
      items: [
        {
          icon: 'Medal01Icon',
          title: 'Doğrulanabilir mentorluk',
          text: 'Review’ların ve ekip geçmişin açık; “mentorluk yaptım” satırının artık bir linki var.',
        },
        {
          icon: 'Megaphone01Icon',
          title: 'Görünürlük',
          text: 'Yayınlarda, bültende ve sosyal medyada ekibinle birlikte tanıtılırsın.',
        },
        {
          icon: 'UserGroupIcon',
          title: 'Yetenekleri erken tanımak',
          text: 'Birlikte çalıştığın insanları gerçekten tanırsın; işe alım kartvizitle değil kodla olur.',
        },
        {
          icon: 'Coffee02Icon',
          title: 'Ustalar odası',
          text: 'Diğer ustalarla deneyim paylaştığın, rahat bir sohbet alanı.',
        },
      ],
    },
    {
      type: 'list',
      title: 'Bizden beklentin',
      tone: 'do',
      items: [
        'Kimseyi küçümsemeden, sabırla review yapmak.',
        'Gelemeyeceğin haftayı önceden haber vermek; yedek usta hep hazır.',
        'Davranış kurallarına uymak ve ekibini de korumak.',
      ],
    },
  ],
  cta: {
    title: 'Usta olarak katıl.',
    text: 'Kayıt formunda “öğretmek ve review yapmak” seçeneğini işaretle, seninle tanışalım.',
    primary: { label: 'Ücretsiz kayıt ol', route: 'signup' },
    secondary: { label: 'Nasıl çalışır?', route: 'howItWorks' },
  },
};

const founders: InfoPage = {
  meta: {
    title: 'Fikir sahipleri için',
    description:
      'Aklında bir problem mi var? Koina topluluğu fikrini altı haftada açık kaynak bir MVP’ye dönüştürür. Ücretsiz ve imece usulü.',
  },
  hero: {
    note: 'aklında bir fikir varsa',
    title: 'Fikrini getir, ekibi birlikte kuralım.',
    lead: 'Çözülmesini istediğin bir problem var ama kodu yazacak ekibin yok mu? Koina’da fikrini anlatırsın, topluluk oylar, seçilirse bir usta ve katılımcılarla altı haftada açık kaynak bir MVP çıkar.',
    photo: 'cowork',
    photoAlt: 'Uzun bir masada laptoplarıyla birlikte çalışan bir grup',
  },
  blocks: [
    {
      type: 'steps',
      title: 'Fikirden demoya',
      items: [
        {
          title: 'Fikrini yaz',
          text: 'GitHub’daki fikir formuna problemi, kimin için olduğunu ve başarının neye benzediğini yaz.',
        },
        { title: 'Topluluk oylasın', text: 'Fikirler iki hafta açık kalır; üyeler oy ve soru bırakır.' },
        { title: 'Lisansını seç', text: 'Serbest, paylaşımcı ya da SaaS korumalı: üç seçenekten biri.' },
        { title: 'Ekiple çalış', text: 'Haftada bir ürün sohbeti yap, öncelikleri birlikte belirleyin.' },
      ],
    },
    {
      type: 'cards',
      title: 'Lisans seçeneklerin',
      columns: 3,
      items: [
        { icon: 'GiftIcon', title: 'Serbest', text: 'MIT veya Apache-2.0. Herkes her amaçla kullanabilir.' },
        {
          icon: 'HeartHandshakeIcon',
          title: 'Paylaşımcı',
          text: 'AGPL-3.0. Kodu SaaS olarak sunan değişikliklerini açmak zorunda.',
        },
        {
          icon: 'Shield01Icon',
          title: 'SaaS korumalı',
          text: 'FSL-1.1. İki yıl rakip SaaS yasak, sonra Apache’ye döner. Kaynağı açık, açık kaynak değil.',
        },
      ],
    },
  ],
  cta: {
    title: 'Fikrini anlatmaya hazır mısın?',
    text: 'Önce kayıt ol; fikir formunun bağlantısı hoş geldin e-postasında.',
    primary: { label: 'Ücretsiz kayıt ol', route: 'signup' },
    secondary: { label: 'Lisans politikası', route: 'licensing' },
  },
};

const projects: InfoPage = {
  meta: {
    title: 'Projeler',
    description:
      'Koina topluluğunun açık kaynak projeleri ve Sezon 1 için oylanan fikirler. Herkes katkı verebilir, katılım ücretsiz.',
  },
  hero: {
    note: 'oylama sürüyor',
    title: 'Birlikte inşa ettiklerimiz',
    lead: 'Her proje Koina’nın GitHub organizasyonunda açık durur. Sezon 1 için topluluğun oyladığı fikirlerden bazıları aşağıda; sen de oy verebilir ya da kendi fikrini ekleyebilirsin.',
    photo: 'hackathon',
    photoAlt: 'Akşam ışığında uzun masalarda laptoplarıyla çalışan insanlar',
  },
  blocks: [
    {
      type: 'cards',
      title: 'Sezon 1 adayları',
      columns: 3,
      items: [
        {
          icon: 'Search01Icon',
          title: 'İş ilanı ayrıştırıcı',
          text: 'Türkçe ilanlardan yetkinlik, maaş aralığı ve uzaktan çalışma bilgisini çıkaran servis ve açık veri seti. Python, NLP.',
        },
        {
          icon: 'GitPullRequestIcon',
          title: 'PR review asistanı',
          text: 'Bir PR’ı ekip kurallarına göre ön incelemeden geçiren GitHub Action. TypeScript, LLM.',
        },
        {
          icon: 'Calendar03Icon',
          title: 'Etkinlik takvimi',
          text: 'Türkiye’deki yazılım etkinliklerini tek takvimde toplayan, ICS ve RSS veren açık dizin. Astro.',
        },
      ],
    },
    {
      type: 'list',
      title: 'Her Koina projesinde',
      tone: 'do',
      items: [
        'Kod herkese açık ve Koina organizasyonunda durur.',
        'README’de lisans etiketi açıkça yazar: açık kaynak ya da kaynağı açık.',
        '“ilk-katkı” etiketli, yeni başlayanlara uygun issue’lar bulunur.',
        'Her PR en az bir kişi tarafından review edilir.',
      ],
    },
  ],
  cta: {
    title: 'Bir projeye ilk katkını ver.',
    text: 'GitHub’da “ilk-katkı” etiketli issue’lara göz at ya da kendi fikrini ekle.',
    primary: { label: 'GitHub’da gör', href: 'https://github.com/koinadev' },
    secondary: { label: 'Fikir sahipleri için', route: 'founders' },
  },
};

const streams: InfoPage = {
  meta: {
    title: 'Canlı yayınlar',
    description:
      'Koina canlı yayınları: Salı Kodla Buluşma, Perşembe Açık Review, aylık atölyeler ve Demo Günü. Ücretsiz izle, sohbete katıl.',
  },
  hero: {
    note: 'Salı ve Perşembe 21:00',
    title: 'İzle, sor, birlikte öğren.',
    lead: 'Koina’da iş açıkta yapılır. Yayınlarda gerçek projeleri, gerçek PR’ları ve gerçek hataları görürsün. İzlemek için kayıt bile gerekmez.',
    photo: 'stream',
    photoAlt: 'Kulaklıklarla mikrofon başında yayın kaydeden iki kişi',
  },
  blocks: [
    {
      type: 'cards',
      title: 'Yayın formatları',
      columns: 2,
      items: [
        {
          icon: 'SourceCodeIcon',
          title: 'Kodla Buluşma (Salı, 90 dk)',
          text: 'Bir ekip, ustasıyla birlikte bir issue’yu canlı kapatıyor. Sohbetten gelen sorular yayının parçası.',
        },
        {
          icon: 'GitPullRequestIcon',
          title: 'Açık Review (Perşembe, 60 dk)',
          text: 'Bir usta topluluk projelerinden gerçek PR’ları canlı inceliyor.',
        },
        {
          icon: 'TeacherIcon',
          title: 'Koina Atölye (ayda bir, 120 dk)',
          text: 'Tematik eğitim: test yazmak, yapay zekâyla güvenli kod, CI/CD.',
        },
        {
          icon: 'Mic01Icon',
          title: 'Usta AMA (ayda bir, 45 dk)',
          text: 'Sektörden bir isimle kariyer ve deneyim üzerine açık soru-cevap.',
        },
        {
          icon: 'PartyIcon',
          title: 'Demo Günü (sezon sonu)',
          text: 'Her ekip v0.1’ini canlı gösteriyor. Alkış serbest.',
        },
        {
          icon: 'Coffee02Icon',
          title: 'Cuma Kahvesi (Discord)',
          text: 'Yayın değil, sohbet. Kamera kapalı da olur, sadece dinlemek de.',
        },
      ],
    },
  ],
  cta: {
    title: 'Yayın başlayınca haber al.',
    text: 'YouTube’da abone ol ya da Discord’da #duyurular kanalını aç.',
    primary: { label: 'YouTube kanalı', href: 'https://www.youtube.com/@koinadev' },
    secondary: { label: 'Tüm bağlantılar', route: 'links' },
  },
};

const sponsor: InfoPage = {
  meta: {
    title: 'Sponsorluk',
    description:
      'Koina’ya destek ol: ücretsiz ve imece usulü yazılım topluluğunun sunucu, yayın ve etkinlik giderlerine katkı ver. Destekçilerimiz ve sponsorluk paketleri.',
  },
  hero: {
    note: 'imeceye katkı',
    title: 'Koina’yı ücretsiz tutan insanlar ve şirketler.',
    lead: 'Katılım herkese ücretsiz; ama sunucular, yayın araçları ve etkinlikler bir yerden karşılanıyor. Destekçilerimiz bu imecenin altyapısını taşıyor.',
    photo: 'talk',
    photoAlt: 'Tuğla duvarlı bir salonda konuşma yapan biri ve onu dinleyen kalabalık',
  },
  blocks: [
    {
      type: 'sponsors',
      title: 'Destekçilerimiz',
      intro: 'Sezon 1 destekçilerimizi arıyoruz.',
      items: [],
      empty: 'Bu alan ilk destekçilerimizi bekliyor. Logon burada, katılım herkese ücretsiz kalır.',
      emptyAction: { label: 'İlk destekçi ol', route: 'contact' },
    },
    {
      type: 'tiers',
      title: 'Destek yolları',
      intro: 'Paketler esnek; size uyan bir yol bulalım. Hiçbir paket katılımı ücretli hale getirmez.',
      items: [
        {
          name: 'Dost',
          who: 'Bireyler ve küçük ekipler',
          perks: ['Sitede ve bültende teşekkür', 'Discord’da destekçi rozeti'],
        },
        {
          name: 'Sezon destekçisi',
          who: 'Şirketler',
          featured: true,
          perks: [
            'Sitede ve yayınlarda logo',
            'Demo Günü’nde teşekkür konuşması',
            'Ustalarınız için gönüllü mentorluk alanı',
            'Sezon raporunda yer',
          ],
        },
        {
          name: 'Ayni destek',
          who: 'Altyapı ve mekân',
          perks: [
            'Sunucu, araç lisansı, etkinlik alanı',
            'İlgili sayfada görünürlük',
            'Etkinliklerde ortak duyuru',
          ],
        },
      ],
    },
    {
      type: 'list',
      title: 'Destekçilerden ricamız',
      tone: 'do',
      items: [
        'Topluluk projelerinin lisansına ve yönüne karışmamak.',
        'Üyelerin iletişim bilgilerini talep etmemek; işe alım üyelerin izniyle ve açıkça.',
        'Davranış kurallarımızı kabul etmek.',
      ],
    },
    {
      type: 'prose',
      title: 'Şeffaflık',
      body: [
        'Her sezon sonunda gelen desteği ve harcamaları kalem kalem yayımlıyoruz. Paranın nereye gittiğini hem destekçilerimiz hem üyelerimiz görür.',
      ],
    },
  ],
  cta: {
    title: 'Birlikte konuşalım.',
    text: 'Sponsorluk için bize yaz; iki iş günü içinde döneriz.',
    primary: { label: 'Bize yaz', route: 'contact' },
    secondary: { label: 'İmece nasıl işliyor?', route: 'imece' },
  },
};

const faq: InfoPage = {
  meta: {
    title: 'Sık sorulan sorular',
    description:
      'Koina hakkında merak edilenler: ücretli mi, kimler katılabilir, ne kadar zaman gerekiyor, projelerin lisansı ne olur?',
  },
  hero: {
    note: 'aklına takılanlar',
    title: 'Sık sorulan sorular',
    lead: 'Cevabını bulamadığın bir soru varsa Discord’da #soru-cevap kanalına yaz ya da bize e-posta at.',
  },
  blocks: [
    {
      type: 'faq',
      title: 'Genel',
      items: [
        {
          question: 'Koina ücretli mi?',
          answer:
            'Hayır. Üyelik, sezonlar, yayınlar ve atölyeler tamamen ücretsiz ve öyle kalacak. Koina imece usulü işler: herkes bildiğini ve vaktini paylaşır, giderler sponsorlar ve gönüllü destekle açıkça karşılanır.',
        },
        {
          question: 'İmece usulü ne demek?',
          answer:
            'Bir işin herkesin elinden geldiğince, karşılıksız ve birlikte yapılması. Koina’da ustalar tecrübesini, katılımcılar emeğini, fikir sahipleri problemlerini, destekçiler altyapıyı getirir; ortaya çıkan kod herkese açık kalır.',
        },
        {
          question: 'Kimler katılabilir?',
          answer:
            'Herkes. Öğrenciler, kariyer değiştirenler, deneyimli geliştiriciler, tasarımcılar, yazarlar, ürün fikri olanlar. Seviye şartı yok.',
        },
        {
          question: 'Kayıt olunca ne oluyor?',
          answer:
            'Hoş geldin e-postası ve Discord daveti gelir. İlk görevin kendini bir emojiyle tanıtmak. Sezon başvurusu açıldığında ilk sen haber alırsın.',
        },
        {
          question: 'Sadece izlemek istesem?',
          answer:
            'Çok iyi! Yayınları izlemek, Discord’da takılmak, bülteni okumak da katılmaktır. Kimse seni koda zorlamaz.',
        },
      ],
    },
    {
      type: 'faq',
      title: 'Sezonlar ve roller',
      items: [
        {
          question: 'Katılımcı olmak için ne kadar bilgi gerekiyor?',
          answer:
            'Git kullanabiliyor ve bir dilde küçük bir program yazabiliyorsan yeterli. Projelerde her seviyeye uygun issue’lar var; takıldığında Çarşamba akşamları eşli çalışma saati açık.',
        },
        {
          question: 'Ne kadar zaman ayırmalıyım?',
          answer:
            'Katılımcılar için haftada 5–8 saat önerilir, ustalar için 2–3 saat. Ama sezon dışında ne kadar katılacağın tamamen sana kalmış.',
        },
        {
          question: 'Yapay zekâ araçları kullanabilir miyim?',
          answer: 'Evet. Tek kural: PR açıklamasında belirt ve gönderdiğin kodu açıklayabil.',
        },
        {
          question: 'Türkiye dışından katılabilir miyim?',
          answer:
            'Evet. Çalışma dili Türkçe; kod ve dokümantasyon İngilizce. Senkronlar Türkiye saatine göre akşamları.',
        },
      ],
    },
    {
      type: 'faq',
      title: 'Projeler ve lisans',
      items: [
        {
          question: 'Projelerin sahibi kim olur?',
          answer:
            'Kod herkese açık kalır ve repo Koina organizasyonunda durur; fikir sahibi kapatamaz. Commit geçmişin ve demon her zaman senin portföyündedir.',
        },
        {
          question: 'Birisi projeyi kopyalayıp SaaS olarak satabilir mi?',
          answer:
            'Lisansa bağlı. MIT/Apache projelerinde evet; AGPL projelerinde ancak değişikliklerini açarak; FSL projelerinde iki yıl boyunca hayır. Ayrıntılar lisans politikası sayfasında.',
        },
      ],
    },
  ],
  cta: {
    title: 'Hâlâ sorun mu var?',
    text: 'Bize yaz ya da Discord’a gel; birisi mutlaka cevaplar.',
    primary: { label: 'Bize yaz', route: 'contact' },
    secondary: { label: 'Bağlantılarımız', route: 'links' },
  },
};

const conduct: InfoPage = {
  meta: {
    title: 'Davranış kuralları',
    description:
      'Koina topluluğunun davranış kuralları: saygı, açıklık ve herkes için güvenli bir ortam. Bildirim ve uygulama süreci.',
  },
  hero: {
    note: 'herkes için güvenli',
    title: 'Davranış kuralları',
    lead: 'Koina herkesin rahatça soru sorabildiği, hata yapabildiği ve öğrenebildiği bir yer olmalı. Bu kurallar Discord’dan GitHub’a, yayınlardan etkinliklere her yerde geçerli.',
  },
  blocks: [
    {
      type: 'list',
      title: 'Beklediğimiz davranışlar',
      tone: 'do',
      items: [
        'Kişiyi değil kodu eleştir; yapıcı ve nazik ol.',
        'Soru sorana sabırla cevap ver. Herkes bir yerden başladı.',
        'Farklı görüşlere, deneyimlere ve geçmişlere saygı göster.',
        'Emeği görünür kıl: yardım edene teşekkür et, katkıyı sahiplenme.',
        'Hata yaptığında özür dile ve düzelt.',
      ],
    },
    {
      type: 'list',
      title: 'Kabul etmediğimiz davranışlar',
      tone: 'dont',
      items: [
        'Taciz, aşağılama, ayrımcı ya da cinsel içerikli dil.',
        'Birinin kişisel bilgisini izinsiz paylaşmak.',
        'Yeni başlayanlarla alay etmek, “bunu bilmiyor musun?” tavrı.',
        'Israrlı istenmeyen iletişim, spam ya da reklam.',
      ],
    },
    {
      type: 'steps',
      title: 'Bir sorun olursa',
      items: [
        {
          title: 'Bildir',
          text: 'Discord’da moderatörlere ya da conduct@koina.dev adresine yaz. Bildirimler gizli tutulur.',
        },
        {
          title: 'Değerlendirme',
          text: 'Moderasyon ekibi 48 saat içinde döner, gerekirse iki tarafı da dinler.',
        },
        {
          title: 'Sonuç',
          text: 'Uyarıdan kalıcı uzaklaştırmaya kadar orantılı bir karar alınır ve bildirene bilgi verilir.',
        },
      ],
    },
  ],
  cta: {
    title: 'Kurallar kısa, niyet net.',
    text: 'Birbirimize iyi davranırsak gerisi kolay.',
    primary: { label: 'Ücretsiz kayıt ol', route: 'signup' },
    secondary: { label: 'Manifesto', route: 'manifesto' },
  },
};

const licensing: InfoPage = {
  meta: {
    title: 'Lisans politikası',
    description:
      'Koina projelerinde lisans seçenekleri: MIT/Apache (serbest), AGPL (paylaşımcı) ve FSL (SaaS korumalı, kaynağı açık). Açık kaynak ile kaynağı açık arasındaki fark.',
  },
  hero: {
    note: 'açık ama adil',
    title: 'Her proje açık, her lisans açıkça etiketli.',
    lead: 'Koina’daki her projenin kodu herkese açıktır. Fikir sahipleri üç lisans grubundan birini seçer; bazıları kodun kopyalanıp SaaS olarak satılmasını engeller.',
  },
  blocks: [
    {
      type: 'prose',
      title: 'Açık kaynak ile kaynağı açık arasındaki fark',
      body: [
        'Açık kaynak tanımı kullanım amacına kısıt koymayı yasaklar; yani hiçbir açık kaynak lisansı “bunu SaaS olarak satamazsın” diyemez. AGPL gibi lisanslar en fazla “SaaS olarak sunarsan değiştirdiğin kodu da aç” der.',
        'SaaS kullanımını gerçekten yasaklayan lisanslar (FSL, BUSL gibi) “kaynağı açık” lisanslardır. Koina ikisini de kabul eder ama hangisi olduğunu her yerde açıkça yazar.',
      ],
    },
    {
      type: 'rows',
      title: 'Üç seçenek',
      items: [
        {
          label: 'Serbest',
          value: 'MIT veya Apache-2.0',
          note: 'açık kaynak; herkes her amaçla kullanabilir',
        },
        {
          label: 'Paylaşımcı',
          value: 'AGPL-3.0',
          note: 'açık kaynak; SaaS olarak sunan değişikliklerini açar',
        },
        {
          label: 'SaaS korumalı',
          value: 'FSL-1.1',
          note: 'kaynağı açık; iki yıl rakip SaaS yasak, sonra Apache-2.0',
        },
      ],
    },
    {
      type: 'list',
      title: 'Hangi lisans olursa olsun',
      tone: 'do',
      items: [
        'Commit geçmişi kalıcıdır ve repo herkese açıktır.',
        'Katılımcı yaptığı işi portföyünde gösterebilir.',
        'Repo Koina organizasyonunda açılır; fikir sahibi kodu sonradan kapatamaz.',
        'Lisans sezon başladıktan sonra daha kısıtlayıcı hale getirilemez.',
      ],
    },
    {
      type: 'prose',
      title: 'Koina’nın kendi kodu',
      body: [
        'Bu sitenin kodu AGPL-3.0, içerikleri CC BY-SA 4.0 lisanslıdır. Koina adı ve logosu marka olarak korunur. Kaynak kodu GitHub’da.',
      ],
    },
  ],
  cta: {
    title: 'Fikrin için lisans mı seçiyorsun?',
    text: 'Fikir sahipleri sayfasında seçenekleri karşılaştırabilirsin.',
    primary: { label: 'Fikir sahipleri için', route: 'founders' },
    secondary: { label: 'Kaynak kodu', href: 'https://github.com/koinadev/koina.dev' },
  },
};

export const pages = {
  about,
  why,
  manifesto,
  imece,
  howItWorks,
  learners,
  mentors,
  founders,
  projects,
  streams,
  sponsor,
  faq,
  conduct,
  licensing,
};
export type InfoPageKey = keyof typeof pages;
