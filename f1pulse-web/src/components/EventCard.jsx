import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './EventCard.module.css';

const CATEGORY_COLORS = {
  'race result': '#14B8A6',
  'qualifying': '#F59E0B',
  'practice & testing': '#60A5FA',
  'driver transfer': '#818CF8',
  'contract news': '#2DD4BF',
  'penalty': '#F87171',
  'team news': '#34D399',
  'technical update': '#A78BFA',
  'official statement': '#FBBF24',
  'interesting': '#9CA3AF',
};

// ---------------------------------------------------------------------------
// F1 CDN base paths
// ---------------------------------------------------------------------------
const D = 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers';
const T24 = 'https://media.formula1.com/d_team_car_fallback_image.png/content/dam/fom-website/teams/2024';
const T25 = 'https://media.formula1.com/d_team_car_fallback_image.png/content/dam/fom-website/teams/2025';
const T23 = 'https://media.formula1.com/d_team_car_fallback_image.png/content/dam/fom-website/teams/2023';
const LOGO = 'https://media.formula1.com/content/dam/fom-website/teams/2024';
const NUM = 'https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/drivers/number-logos';
const TRACK = 'https://media.formula1.com/image/upload/f_auto,c_limit,q_75,w_1320/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9';

const dImg = (letter, code, name, short) =>
  `${D}/${letter}/${code}_${name}/${short}.png.transform/2col-retina/image.png`;
const numImg = (code) =>
  `${NUM}/${code}.png.transform/2col-retina/image.png`;
const carImg = (cdn, slug) =>
  `${cdn}/${slug}.png.transform/4col-retina/image.png`;
const logoImg = (slug) =>
  `${LOGO}/${slug}-logo.png.transform/2col-retina/image.png`;

// ---------------------------------------------------------------------------
// Image pools — multiple images per entity for variety
// ---------------------------------------------------------------------------
const DRIVERS = [
  { names: ['verstappen'], imgs: [
    dImg('M','MAXVER01','Max_Verstappen','maxver01'),
    numImg('MAXVER01'),
    carImg(T25,'red-bull-racing'), carImg(T24,'red-bull-racing'), carImg(T23,'red-bull-racing'),
    logoImg('red-bull-racing'),
  ], label: 'VER', color: '#1E41FF' },
  { names: ['hamilton'], imgs: [
    dImg('L','LEWHAM01','Lewis_Hamilton','lewham01'),
    numImg('LEWHAM01'),
    carImg(T25,'ferrari'), carImg(T24,'ferrari'), carImg(T23,'ferrari'),
    logoImg('ferrari'),
  ], label: 'HAM', color: '#E8002D' },
  { names: ['leclerc'], imgs: [
    dImg('C','CHALEC01','Charles_Leclerc','chalec01'),
    numImg('CHALEC01'),
    carImg(T25,'ferrari'), carImg(T24,'ferrari'),
    logoImg('ferrari'),
  ], label: 'LEC', color: '#E8002D' },
  { names: ['norris', 'lando'], imgs: [
    dImg('L','LANNOR01','Lando_Norris','lannor01'),
    numImg('LANNOR01'),
    carImg(T25,'mclaren'), carImg(T24,'mclaren'), carImg(T23,'mclaren'),
    logoImg('mclaren'),
  ], label: 'NOR', color: '#FF8000' },
  { names: ['sainz'], imgs: [
    dImg('C','CARSAI01','Carlos_Sainz','carsai01'),
    numImg('CARSAI01'),
    carImg(T25,'williams'), carImg(T24,'williams'),
    logoImg('williams'),
  ], label: 'SAI', color: '#64C4FF' },
  { names: ['piastri'], imgs: [
    dImg('O','OSCPIA01','Oscar_Piastri','oscpia01'),
    numImg('OSCPIA01'),
    carImg(T25,'mclaren'), carImg(T24,'mclaren'),
    logoImg('mclaren'),
  ], label: 'PIA', color: '#FF8000' },
  { names: ['russell'], imgs: [
    dImg('G','GEORUS01','George_Russell','georus01'),
    numImg('GEORUS01'),
    carImg(T25,'mercedes'), carImg(T24,'mercedes'), carImg(T23,'mercedes'),
    logoImg('mercedes'),
  ], label: 'RUS', color: '#27F4D2' },
  { names: ['alonso', 'fernando'], imgs: [
    dImg('F','FERALO01','Fernando_Alonso','feralo01'),
    numImg('FERALO01'),
    carImg(T25,'aston-martin'), carImg(T24,'aston-martin'), carImg(T23,'aston-martin'),
    logoImg('aston-martin'),
  ], label: 'ALO', color: '#229971' },
  { names: ['gasly'], imgs: [
    dImg('P','PIEGAS01','Pierre_Gasly','piegas01'),
    numImg('PIEGAS01'),
    carImg(T25,'alpine'), carImg(T24,'alpine'),
    logoImg('alpine'),
  ], label: 'GAS', color: '#FF87BC' },
  { names: ['ocon'], imgs: [
    dImg('E','ESTOCO01','Esteban_Ocon','estoco01'),
    numImg('ESTOCO01'),
    carImg(T25,'haas'), carImg(T24,'haas'),
    logoImg('haas'),
  ], label: 'OCO', color: '#B6BABD' },
  { names: ['stroll'], imgs: [
    dImg('L','LANSTR01','Lance_Stroll','lanstr01'),
    numImg('LANSTR01'),
    carImg(T25,'aston-martin'), carImg(T24,'aston-martin'),
    logoImg('aston-martin'),
  ], label: 'STR', color: '#229971' },
  { names: ['tsunoda', 'yuki'], imgs: [
    dImg('Y','YUKTSU01','Yuki_Tsunoda','yuktsu01'),
    numImg('YUKTSU01'),
    carImg(T25,'red-bull-racing'), carImg(T24,'rb'),
    logoImg('red-bull-racing'),
  ], label: 'TSU', color: '#1E41FF' },
  { names: ['bottas', 'valtteri'], imgs: [
    dImg('V','VALBOT01','Valtteri_Bottas','valbot01'),
    carImg(T25,'kick-sauber'), carImg(T24,'kick-sauber'),
    logoImg('kick-sauber'),
  ], label: 'BOT', color: '#52E252' },
  { names: ['ricciardo'], imgs: [
    dImg('D','DANRIC01','Daniel_Ricciardo','danric01'),
    carImg(T24,'rb'), carImg(T23,'alphatauri'),
    logoImg('rb'),
  ], label: 'RIC', color: '#6692FF' },
  { names: ['hulkenberg', 'hülkenberg'], imgs: [
    dImg('N','NICHUL01','Nico_Hulkenberg','nichul01'),
    numImg('NICHUL01'),
    carImg(T25,'kick-sauber'), carImg(T24,'haas'),
    logoImg('kick-sauber'),
  ], label: 'HUL', color: '#52E252' },
  { names: ['albon'], imgs: [
    dImg('A','ALEALB01','Alexander_Albon','alealb01'),
    numImg('ALEALB01'),
    carImg(T24,'williams'), carImg(T23,'williams'),
    logoImg('williams'),
  ], label: 'ALB', color: '#64C4FF' },
  { names: ['perez', 'checo', 'pérez'], imgs: [
    dImg('S','SERPER01','Sergio_Perez','serper01'),
    carImg(T24,'red-bull-racing'), carImg(T23,'red-bull-racing'),
    logoImg('red-bull-racing'),
  ], label: 'PER', color: '#1E41FF' },
  { names: ['bearman', 'ollie'], imgs: [
    dImg('O','OLIBEA01','Oliver_Bearman','olibea01'),
    numImg('OLIBEA01'),
    carImg(T25,'haas'), carImg(T24,'haas'),
    logoImg('haas'),
  ], label: 'BEA', color: '#B6BABD' },
  { names: ['antonelli', 'kimi'], imgs: [
    dImg('A','ANDANT01','Andrea_Kimi_Antonelli','andant01'),
    numImg('ANDANT01'),
    carImg(T25,'mercedes'), carImg(T24,'mercedes'),
    logoImg('mercedes'),
  ], label: 'ANT', color: '#27F4D2' },
  { names: ['lawson', 'liam'], imgs: [
    dImg('L','LIALAW01','Liam_Lawson','lialaw01'),
    numImg('LIALAW01'),
    carImg(T25,'red-bull-racing'), carImg(T24,'rb'),
    logoImg('red-bull-racing'),
  ], label: 'LAW', color: '#1E41FF' },
  { names: ['colapinto', 'franco'], imgs: [
    dImg('F','FRACOL01','Franco_Colapinto','fracol01'),
    numImg('FRACOL01'),
    carImg(T25,'alpine'), carImg(T24,'alpine'),
    logoImg('alpine'),
  ], label: 'COL', color: '#FF87BC' },
  { names: ['doohan', 'jack'], imgs: [
    dImg('J','JACDOO01','Jack_Doohan','jacdoo01'),
    numImg('JACDOO01'),
    carImg(T25,'alpine'), carImg(T24,'alpine'),
    logoImg('alpine'),
  ], label: 'DOO', color: '#FF87BC' },
  { names: ['hadjar', 'isack'], imgs: [
    dImg('I','ISAHAD01','Isack_Hadjar','isahad01'),
    numImg('ISAHAD01'),
    carImg(T25,'rb'), carImg(T24,'rb'),
    logoImg('rb'),
  ], label: 'HAD', color: '#6692FF' },
  { names: ['newey', 'adrian'], imgs: [], label: 'NEW', color: '#229971' },
  { names: ['horner', 'christian'], imgs: [], label: 'HOR', color: '#1E41FF' },
  { names: ['wolff', 'toto'], imgs: [], label: 'WOL', color: '#27F4D2' },
  { names: ['domenicali', 'stefano'], imgs: [], label: 'F1', color: '#14B8A6' },
  { names: ['vasseur', 'fred'], imgs: [], label: 'FER', color: '#E8002D' },
  { names: ['stella', 'andrea'], imgs: [], label: 'MCL', color: '#FF8000' },
];

const TEAMS = [
  { names: ['red bull', 'redbull'], imgs: [
    carImg(T25,'red-bull-racing'), carImg(T24,'red-bull-racing'), carImg(T23,'red-bull-racing'), logoImg('red-bull-racing'),
  ], label: 'RBR', color: '#1E41FF' },
  { names: ['ferrari', 'scuderia'], imgs: [
    carImg(T25,'ferrari'), carImg(T24,'ferrari'), carImg(T23,'ferrari'), logoImg('ferrari'),
  ], label: 'FER', color: '#E8002D' },
  { names: ['mercedes', 'merc'], imgs: [
    carImg(T25,'mercedes'), carImg(T24,'mercedes'), carImg(T23,'mercedes'), logoImg('mercedes'),
  ], label: 'MER', color: '#27F4D2' },
  { names: ['mclaren'], imgs: [
    carImg(T25,'mclaren'), carImg(T24,'mclaren'), carImg(T23,'mclaren'), logoImg('mclaren'),
  ], label: 'MCL', color: '#FF8000' },
  { names: ['aston martin'], imgs: [
    carImg(T25,'aston-martin'), carImg(T24,'aston-martin'), carImg(T23,'aston-martin'), logoImg('aston-martin'),
  ], label: 'AMR', color: '#229971' },
  { names: ['alpine'], imgs: [
    carImg(T25,'alpine'), carImg(T24,'alpine'), carImg(T23,'alpine'), logoImg('alpine'),
  ], label: 'ALP', color: '#FF87BC' },
  { names: ['williams'], imgs: [
    carImg(T25,'williams'), carImg(T24,'williams'), carImg(T23,'williams'), logoImg('williams'),
  ], label: 'WIL', color: '#64C4FF' },
  { names: ['haas'], imgs: [
    carImg(T25,'haas'), carImg(T24,'haas'), carImg(T23,'haas'), logoImg('haas'),
  ], label: 'HAS', color: '#B6BABD' },
  { names: ['rb ', 'visa cash app', 'racing bulls', 'vcarb'], imgs: [
    carImg(T25,'rb'), carImg(T24,'rb'), carImg(T23,'alphatauri'), logoImg('rb'),
  ], label: 'RB', color: '#6692FF' },
  { names: ['sauber', 'kick sauber'], imgs: [
    carImg(T25,'kick-sauber'), carImg(T24,'kick-sauber'), carImg(T23,'alfa-romeo'), logoImg('kick-sauber'),
  ], label: 'SAU', color: '#52E252' },
  { names: ['cadillac'], imgs: [], label: 'CAD', color: '#1d1d1b' },
];

const TRACKS = [
  { names: ['bahrain', 'sakhir'], imgs: [`${TRACK}/Bahrain_Circuit`], label: 'BHR', color: '#C4A747' },
  { names: ['jeddah', 'saudi'], imgs: [`${TRACK}/Saudi_Arabia_Circuit`], label: 'SAU', color: '#1FA149' },
  { names: ['melbourne', 'australia', 'australian gp'], imgs: [`${TRACK}/Australia_Circuit`], label: 'AUS', color: '#003F87' },
  { names: ['suzuka', 'japan', 'japanese gp'], imgs: [`${TRACK}/Japan_Circuit`], label: 'JPN', color: '#BC002D' },
  { names: ['shanghai', 'china', 'chinese gp'], imgs: [`${TRACK}/China_Circuit`], label: 'CHN', color: '#DE2910' },
  { names: ['miami'], imgs: [`${TRACK}/Miami_Circuit`], label: 'MIA', color: '#F4C300' },
  { names: ['imola', 'emilia'], imgs: [`${TRACK}/Emilia_Romagna_Circuit`], label: 'IMO', color: '#009246' },
  { names: ['monaco', 'monte carlo'], imgs: [`${TRACK}/Monaco_Circuit`], label: 'MON', color: '#CE1126' },
  { names: ['barcelona', 'spanish gp'], imgs: [`${TRACK}/Spain_Circuit`], label: 'ESP', color: '#AA151B' },
  { names: ['silverstone', 'british gp'], imgs: [`${TRACK}/Great_Britain_Circuit`], label: 'GBR', color: '#012169' },
  { names: ['spa', 'belgian gp'], imgs: [`${TRACK}/Belgium_Circuit`], label: 'BEL', color: '#FDDA24' },
  { names: ['hungaroring', 'hungary', 'budapest'], imgs: [`${TRACK}/Hungary_Circuit`], label: 'HUN', color: '#477050' },
  { names: ['zandvoort', 'dutch'], imgs: [`${TRACK}/Netherlands_Circuit`], label: 'NED', color: '#FF6600' },
  { names: ['monza', 'italian gp'], imgs: [`${TRACK}/Italy_Circuit`], label: 'ITA', color: '#009246' },
  { names: ['singapore', 'marina bay'], imgs: [`${TRACK}/Singapore_Circuit`], label: 'SGP', color: '#EF3340' },
  { names: ['austin', 'cota', 'us grand prix'], imgs: [`${TRACK}/USA_Circuit`], label: 'USA', color: '#3C3B6E' },
  { names: ['mexico', 'hermanos'], imgs: [`${TRACK}/Mexico_Circuit`], label: 'MEX', color: '#006847' },
  { names: ['interlagos', 'sao paulo', 'brazil'], imgs: [`${TRACK}/Brazil_Circuit`], label: 'BRA', color: '#009C3B' },
  { names: ['las vegas', 'vegas'], imgs: [`${TRACK}/Las_Vegas_Circuit`], label: 'LVG', color: '#B4975A' },
  { names: ['qatar', 'losail'], imgs: [`${TRACK}/Qatar_Circuit`], label: 'QAT', color: '#8D1B3D' },
  { names: ['abu dhabi', 'yas marina'], imgs: [`${TRACK}/Abu_Dhabi_Circuit`], label: 'ABD', color: '#C8102E' },
];

// ---------------------------------------------------------------------------
// Image selection — unique per card, no repeats in a single feed render
// ---------------------------------------------------------------------------
const usedImages = new Set();
let lastResetTime = 0;

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickImage(imgs, articleId, index) {
  if (!imgs || imgs.length === 0) return null;

  // Reset used set every 2 seconds (new render cycle)
  const now = Date.now();
  if (now - lastResetTime > 2000) {
    usedImages.clear();
    lastResetTime = now;
  }

  const seed = hashCode(articleId || String(index));

  // Try each image in a deterministic-but-varied order
  for (let attempt = 0; attempt < imgs.length; attempt++) {
    const idx = (seed + attempt + index) % imgs.length;
    const img = imgs[idx];
    if (!usedImages.has(img)) {
      usedImages.add(img);
      return img;
    }
  }

  // All images from this pool used — pick one offset by index anyway
  const fallbackIdx = (seed + index * 7) % imgs.length;
  return imgs[fallbackIdx];
}

function matchImage(title, summary, articleId, index) {
  const text = `${title} ${summary || ''}`.toLowerCase();

  for (const d of DRIVERS) {
    if (d.names.some((n) => text.includes(n))) {
      return { img: pickImage(d.imgs, articleId, index), label: d.label, color: d.color };
    }
  }
  for (const t of TEAMS) {
    if (t.names.some((n) => text.includes(n))) {
      return { img: pickImage(t.imgs, articleId, index), label: t.label, color: t.color };
    }
  }
  for (const t of TRACKS) {
    if (t.names.some((n) => text.includes(n))) {
      return { img: pickImage(t.imgs, articleId, index), label: t.label, color: t.color };
    }
  }
  return { img: null, label: 'F1', color: '#14B8A6' };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function EventCard({ event, index = 0 }) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const cat = (event.category || '').toLowerCase();
  const badgeColor = CATEGORY_COLORS[cat] || '#9CA3AF';
  const match = matchImage(event.title, event.summary, event.id, index);

  // Prefer the actual article image from the RSS feed
  const rssImage = event.image_url || null;
  const displayImg = rssImage || match.img;

  return (
    <article className={styles.card} onClick={() => navigate(`/article/${event.id}`)}>
      <div className={styles.imageWrap}>
        {displayImg && !imgError ? (
          <img
            className={styles.image}
            src={displayImg}
            alt=""
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className={styles.placeholder}
            style={{ background: `linear-gradient(135deg, ${match.color}, ${match.color}88)` }}
          >
            <span className={styles.placeholderText}>{match.label}</span>
          </div>
        )}
      </div>
      <div className={styles.body}>
        <div className={styles.header}>
          <span className={styles.badge} style={{ background: badgeColor }}>
            {event.category || 'General'}
          </span>
          <span className={styles.time}>
            {timeAgo(event.timestamp || event.createdAt || event.date)}
          </span>
        </div>
        <h3 className={styles.title}>{event.title}</h3>
        <p className={styles.summary}>{event.summary}</p>
        <span className={styles.source}>{event.source}</span>
      </div>
    </article>
  );
}
