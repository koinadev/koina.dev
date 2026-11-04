// İçerik süzgecinin sözlüğü. Biçim: sadeleştirilmiş yazım (Türkçe küçük harf, yinelenen harfler teke inmiş). Türkçe harfler korunur:
// "şikayet" ile "sikayet" farklıdır ve hiçbiri listede değildir.
//
// - `WORDS`: kelimenin tamamı eşleşmeli ("amk", "piç").
// - `STEMS`: kelime bu kökle başlarsa eşleşir; yalnız masum bir kelimenin başı olamayacak kadar belirgin kökler ("orospu", "fuck").
//
// Listeyi genişletirken masum kelimeleri sınayın (test/moderation.test.ts). Bilerek yok: tek başına "sik" (Türkçe klavyesiz
// yazılmış "şık"), "yaram" (yara), "amina" (ad), "ananı", "oç", "dick" (ad), "pic" (resim kısaltması).

export const WORDS = new Set([
  // Türkçe
  'amk', 'amq', 'aq', 'amına', 'aminakoyim', 'amınakoyim', 'amınakoyayım', 'aminakoyayim', 'amcık', 'amcik', 'piç', 'piçlik', 'siker', 'sikerim', 'sikeyim', 'sikiyim', 'sikim', 'sikini', 'sikik', 'sikiş',
  'sikis', 'sikmek', 'siktim', 'siktir', 'siktirgit', 'göt', 'götü', 'götün', 'götveren', 'yarak', 'yarağ', 'yarağım',
  'dalyarak', 'kahpe', 'pezevenk', 'puşt', 'pust', 'ibne', 'gavat', 'yavşak', 'yavsak', 'kaltak', 'fahişe', 'fahise', 'şerefsiz',
  'serefsiz', 'orosbu', 'kevaşe', 'godoş', 'gotveren',
  // İngilizce
  'shit', 'bitch', 'cunt', 'asshole', 'whore', 'slut', 'retard', 'fag', 'faggot', 'nigger', 'nigga', 'wanker', 'twat',
]);

export const STEMS = ['orospu', 'fuck', 'motherfuck', 'amınakoy', 'aminakoy', 'yarrak', 'yarak', 'siktir', 'sikiş', 'nigger', 'faggot', 'bitches'];
