// Sitedeki fotoğraflar tek yerde: içerik dosyaları fotoğrafı ADIYLA anar, bileşen buradan çözer.
// Kaynak ve fotoğrafçılar: src/assets/photos/CREDITS.md
import hero from '../assets/photos/hero.jpg';
import pairing from '../assets/photos/pairing.jpg';
import team from '../assets/photos/team.jpg';
import stream from '../assets/photos/stream.jpg';
import demo from '../assets/photos/demo.jpg';
import cowork from '../assets/photos/cowork.jpg';
import hands from '../assets/photos/hands.jpg';
import circle from '../assets/photos/circle.jpg';
import hackathon from '../assets/photos/hackathon.jpg';
import table from '../assets/photos/table.jpg';
import highfive from '../assets/photos/highfive.jpg';
import talk from '../assets/photos/talk.jpg';
import selfie from '../assets/photos/selfie.jpg';

export const photos = {
  hero,
  pairing,
  team,
  stream,
  demo,
  cowork,
  hands,
  circle,
  hackathon,
  table,
  highfive,
  talk,
  selfie,
};
export type PhotoName = keyof typeof photos;
