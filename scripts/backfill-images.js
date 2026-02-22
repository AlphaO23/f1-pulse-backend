/**
 * One-time script to backfill image_url for existing events
 * by re-fetching RSS feeds and matching items by title+source.
 */
require('dotenv').config();
const Parser = require('rss-parser');
const db = require('../src/db/connection');

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'FormulaPulse/1.0' },
  customFields: {
    item: [['media:content', 'mediaContent', { keepArray: true }]],
  },
});

const RSS_FEEDS = [
  { name: 'Formula 1', url: 'https://www.formula1.com/content/fom-website/en/latest/all.xml' },
  { name: 'FIA', url: 'https://www.fia.com/rss/news' },
  { name: 'Autosport', url: 'https://www.autosport.com/rss/feed/f1' },
  { name: 'Motorsport.com', url: 'https://www.motorsport.com/rss/f1/news/' },
  { name: 'RaceFans', url: 'https://www.racefans.net/feed/' },
  { name: 'Crash.net', url: 'https://www.crash.net/rss/f1' },
  { name: 'The Race', url: 'https://www.the-race.com/feed/' },
  { name: 'GPFans', url: 'https://www.gpfans.com/en/rss.xml' },
];

function extractImageUrl(item) {
  if (item.enclosure && item.enclosure.url && /image/i.test(item.enclosure.type || '')) {
    return item.enclosure.url;
  }
  if (item.enclosure && item.enclosure.url && /\.(jpe?g|png|webp|gif)/i.test(item.enclosure.url)) {
    return item.enclosure.url;
  }
  if (item.mediaContent && Array.isArray(item.mediaContent)) {
    for (const mc of item.mediaContent) {
      const url = mc.$ && mc.$.url;
      if (url) return url;
    }
  }
  const html = item['content:encoded'] || item.content || '';
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) return imgMatch[1];
  return null;
}

async function backfill() {
  let updated = 0;

  for (const feed of RSS_FEEDS) {
    try {
      console.log(`Fetching ${feed.name}...`);
      const result = await parser.parseURL(feed.url);

      for (const item of result.items) {
        const imageUrl = extractImageUrl(item);
        if (!imageUrl) continue;

        const title = item.title || '';
        const count = await db('events')
          .where({ source: feed.name, title })
          .whereNull('image_url')
          .update({ image_url: imageUrl });

        if (count > 0) {
          updated += count;
          console.log(`  Updated: ${title.substring(0, 60)}...`);
        }
      }
    } catch (err) {
      console.error(`  Error fetching ${feed.name}: ${err.message}`);
    }
  }

  console.log(`\nDone. Updated ${updated} events with image URLs.`);

  // Show stats
  const [{ total }] = await db('events').count('id as total');
  const [{ withImages }] = await db('events').whereNotNull('image_url').count('id as withImages');
  console.log(`Total events: ${total}, with images: ${withImages}`);

  await db.destroy();
}

backfill().catch((err) => {
  console.error(err);
  process.exit(1);
});
