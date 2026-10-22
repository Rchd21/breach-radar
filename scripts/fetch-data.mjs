// Collecte les données publiques et génère public/data/*.json + public/feed.xml.
// Lancé à chaque déploiement (GitHub Actions, toutes les 3 h) ou via `npm run fetch`.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COUNTRIES, locate } from './lib/countries.mjs';
import { scoreBreach } from './lib/score.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'data');
const SITE_URL = process.env.SITE_URL || '';
const UA = 'BreachRadar/1.0 (+https://github.com/)';
// Fenêtre glissante : seules les fuites rendues publiques sur les N derniers mois sont conservées.
const WINDOW_MONTHS = Number(process.env.WINDOW_MONTHS) || 6;
const SINCE = new Date();
SINCE.setMonth(SINCE.getMonth() - WINDOW_MONTHS);

const FEEDS = [
  { name: 'DataBreaches.net', url: 'https://databreaches.net/feed/', lang: 'en', filter: false },
  { name: 'ZATAZ', url: 'https://www.zataz.com/feed/', lang: 'fr', filter: false },
  { name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/', lang: 'en', filter: true },
  { name: 'The Hacker News', url: 'https://feeds.feedburner.com/TheHackersNews', lang: 'en', filter: true },
  { name: 'The Register', url: 'https://www.theregister.com/security/headlines.atom', lang: 'en', filter: true },
  { name: 'CERT-FR (alertes)', url: 'https://www.cert.ssi.gouv.fr/alerte/feed/', lang: 'fr', filter: false, alert: true },
];
const BREACH_WORDS = /breach|leak|stolen data|exposed|hack(ed|ers?)|ransomware|data theft|extort|fuite|piratage|cyberattaque|données/i;

async function get(url, type = 'text') {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return type === 'json' ? res.json() : res.text();
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
function toText(html = '') {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
      if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}
const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : null);

async function buildBreaches() {
  const raw = await get('https://haveibeenpwned.com/api/v3/breaches', 'json');
  const now = Date.now();
  return raw
    .filter((b) => !b.IsRetired && new Date(b.AddedDate) >= SINCE)
    .map((b) => {
      const description = toText(b.Description);
      const { code, source } = locate(b.Domain, description);
      const { score, level, factors } = scoreBreach(b, now);
      return {
        id: b.Name,
        title: b.Title,
        domain: b.Domain || null,
        breachDate: b.BreachDate,
        addedDate: b.AddedDate,
        count: b.PwnCount,
        classes: b.DataClasses,
        description,
        disclosureUrl: safeUrl(b.DisclosureUrl),
        logo: safeUrl(b.LogoPath),
        verified: b.IsVerified,
        sensitive: b.IsSensitive,
        malware: b.IsMalware || b.IsStealerLog,
        fabricated: b.IsFabricated,
        spam: b.IsSpamList,
        country: code,
        countrySource: source,
        score,
        level,
        factors,
      };
    })
    .sort((a, b) => b.addedDate.localeCompare(a.addedDate));
}

function parseFeed(xml, feed) {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/g) || [];
  return blocks.map((blk) => {
    const tag = (t) => (blk.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1];
    const link = tag('link') ? toText(tag('link')) : (blk.match(/<link[^>]*href="([^"]+)"/) || [])[1];
    const date = tag('pubDate') || tag('published') || tag('updated') || tag('dc:date');
    return {
      source: feed.name,
      lang: feed.lang,
      alert: !!feed.alert,
      title: toText(tag('title')),
      summary: toText(tag('description') || tag('summary') || '').slice(0, 280),
      url: safeUrl(link),
      date: date ? new Date(toText(date)).toISOString() : null,
    };
  }).filter((n) => n.title && n.url && n.date && (!feed.filter || BREACH_WORDS.test(`${n.title} ${n.summary}`)));
}

async function buildNews() {
  const results = await Promise.allSettled(FEEDS.map(async (f) => parseFeed(await get(f.url), f)));
  const news = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') news.push(...r.value);
    else console.warn(`⚠ flux ignoré (${FEEDS[i].name}) : ${r.reason.message}`);
  });
  return news.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 80);
}

const xmlEscape = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

// Flux RSS des fuites critiques/élevées pour s'abonner aux alertes.
function buildRss(breaches) {
  const items = breaches.filter((b) => b.level === 'critique' || b.level === 'eleve').slice(0, 50).map((b) => `
    <item>
      <title>${xmlEscape(`[${b.score}/100] ${b.title} — ${b.count.toLocaleString('fr-FR')} comptes`)}</title>
      <link>${xmlEscape(`${SITE_URL}/#fuite=${encodeURIComponent(b.id)}`)}</link>
      <guid isPermaLink="false">${xmlEscape(b.id)}</guid>
      <pubDate>${new Date(b.addedDate).toUTCString()}</pubDate>
      <description>${xmlEscape(`Données exposées : ${b.classes.join(', ')}. ${b.description.slice(0, 400)}`)}</description>
    </item>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Breach Radar — fuites critiques</title>
    <link>${xmlEscape(SITE_URL || '/')}</link>
    <description>Fuites de données à criticité élevée ou critique (source : Have I Been Pwned, CC BY 4.0)</description>
    <language>fr</language>${items}
  </channel>
</rss>
`;
}

const breaches = await buildBreaches();
const news = await buildNews();

const byCountry = {};
for (const b of breaches) {
  if (!b.country) continue;
  const c = (byCountry[b.country] ||= { code: b.country, name: COUNTRIES[b.country][0], lat: COUNTRIES[b.country][1], lng: COUNTRIES[b.country][2] });
  c.count = (c.count || 0) + 1;
}

const meta = {
  generatedAt: new Date().toISOString(),
  windowMonths: WINDOW_MONTHS,
  since: SINCE.toISOString(),
  breaches: breaches.length,
  accounts: breaches.reduce((s, b) => s + b.count, 0),
  located: breaches.filter((b) => b.country).length,
  sources: ['Have I Been Pwned (CC BY 4.0)', ...FEEDS.map((f) => f.name)],
};

await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'breaches.json'), JSON.stringify(breaches));
await writeFile(join(OUT, 'countries.json'), JSON.stringify(Object.values(byCountry)));
await writeFile(join(OUT, 'news.json'), JSON.stringify(news));
await writeFile(join(OUT, 'meta.json'), JSON.stringify(meta, null, 2));
await writeFile(join(ROOT, 'public', 'feed.xml'), buildRss(breaches));
console.log(`✔ ${breaches.length} fuites sur ${WINDOW_MONTHS} mois (${meta.located} localisées), ${news.length} actualités`);
