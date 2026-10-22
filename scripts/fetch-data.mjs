// Collecte les données publiques et génère public/data/*.json + public/feed.xml.
// Lancé à chaque déploiement (GitHub Actions, toutes les 3 h) ou via `npm run fetch`.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COUNTRIES, locate } from './lib/countries.mjs';
import { ransomwareSector, scoreBreach, scoreOfficial, scoreRansomware } from './lib/score.mjs';

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
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(45000) });
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
        type: 'hibp',
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

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
// Nom d'organisation normalisé pour rapprocher les notifications de plusieurs États.
const orgKey = (s) => slug(s).replace(/-(inc|llc|ltd|corp|corporation|co|company|lp|llp|pc|pa|plc|group)\b/g, '').replace(/-+$/, '');

// Victimes revendiquées sur les sites de fuite des groupes de rançongiciels (RansomLook, AGPL-3.0).
async function buildRansomware() {
  const days = Math.ceil((Date.now() - SINCE) / 86400000);
  const raw = await get(`https://www.ransomlook.io/api/last/${days}`, 'json');
  const now = Date.now();
  const seen = new Set();
  const out = [];
  for (const p of raw) {
    const title = toText(p.post_title).replace(/\s+/g, ' ').trim();
    const date = new Date(`${p.discovered.replace(' ', 'T').slice(0, 19)}Z`);
    if (!title || p.private || !(date >= SINCE)) continue;
    const key = `${p.group_name}|${title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // On retire liens et adresses e-mail : aucun renvoi vers les sites des criminels.
    const description = toText(p.description || '')
      .replace(/\S+@\S+/g, '[e-mail]').replace(/\b(?:https?:\/\/|www\.)\S+|\S+\.onion\S*/gi, '[lien retiré]')
      .slice(0, 300);
    const domain = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(title) ? title.toLowerCase() : null;
    const { code, source } = locate(domain, description);
    const { score, level, factors } = scoreRansomware({ date: date.toISOString(), description }, now);
    const sector = ransomwareSector(description);
    out.push({
      id: `rl-${slug(p.group_name)}-${slug(title)}`,
      type: 'ransomware',
      title,
      domain,
      group: p.group_name,
      breachDate: date.toISOString().slice(0, 10),
      addedDate: date.toISOString(),
      count: null,
      size: factors.find((f) => f.label.startsWith('Volume annoncé'))?.label.split(' : ')[1] || null,
      classes: ['Ransomware claim', ...(sector ? [`${sector} sector`] : [])],
      description: description === title ? '' : description,
      disclosureUrl: `https://www.ransomlook.io/group/${encodeURIComponent(p.group_name)}`,
      verified: false,
      country: code,
      countrySource: source,
      score, level, factors,
    });
  }
  return out;
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
const usDate = (s) => {
  const m = (s || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null;
};

// Notifications officielles déposées auprès des procureurs généraux de Californie et de Washington.
async function buildOfficial() {
  const sinceDay = SINCE.toISOString().slice(0, 10);
  const [caCsv, wa] = await Promise.all([
    get('https://oag.ca.gov/privacy/databreach/list-export'),
    get(`https://data.wa.gov/resource/sb4j-ca4h.json?$limit=5000&$where=datesubmitted>='${sinceDay}'`, 'json'),
  ]);
  const byOrg = new Map();
  for (const [name, breachDates, reported] of parseCsv(caCsv).slice(1)) {
    const addedDay = usDate(reported);
    if (!name || !addedDay || addedDay < sinceDay) continue;
    const key = orgKey(name);
    const prev = byOrg.get(key);
    if (prev && prev.addedDay >= addedDay) continue;
    byOrg.set(key, { name: name.trim(), addedDay, breachDay: usDate(breachDates) || addedDay, states: ['Californie'] });
  }
  for (const r of wa) {
    const key = orgKey(r.name);
    const rec = byOrg.get(key) || { name: r.name.trim(), addedDay: r.datesubmitted.slice(0, 10), breachDay: (r.datestart || r.datesubmitted).slice(0, 10), states: [] };
    rec.states.push('Washington');
    rec.count = Math.max(rec.count || 0, Number(r.washingtoniansaffected) || 0) || null;
    rec.sector = r.industrytype;
    rec.attackType = r.cyberattacktype || r.databreachcause;
    if (r.datesubmitted.slice(0, 10) > rec.addedDay) rec.addedDay = r.datesubmitted.slice(0, 10);
    byOrg.set(key, rec);
  }
  const now = Date.now();
  return [...byOrg.entries()].map(([key, r]) => {
    const { score, level, factors } = scoreOfficial({ date: r.breachDay, count: r.count, sector: r.sector, attackType: r.attackType }, now);
    const classes = ['Official notification'];
    if (r.sector === 'Health') classes.push('Health sector');
    if (r.sector === 'Financial') classes.push('Financial sector');
    return {
      id: `us-${key}`,
      type: 'officiel',
      title: r.name,
      domain: null,
      breachDate: r.breachDay,
      addedDate: `${r.addedDay}T12:00:00Z`,
      count: r.count || null,
      countLabel: r.count ? 'résidents de l’État de Washington touchés (minimum)' : null,
      classes,
      authorities: r.states,
      sector: r.sector || null,
      attackType: r.attackType || null,
      description: `Fuite notifiée au procureur général de ${r.states.join(' et de ')}${r.attackType ? ` (cause déclarée : ${r.attackType})` : ''}.`,
      disclosureUrl: r.states.includes('Californie')
        ? `https://oag.ca.gov/privacy/databreach/list?field_sb24_org_name_value=${encodeURIComponent(r.name)}`
        : 'https://www.atg.wa.gov/data-breach-notifications',
      verified: true,
      country: 'US',
      countrySource: 'notification officielle',
      score, level, factors,
    };
  });
}

// Une source en panne ne bloque pas la mise à jour des autres.
async function collect(name, fn) {
  try {
    const items = await fn();
    console.log(`  ${name} : ${items.length}`);
    return items;
  } catch (e) {
    console.warn(`⚠ source ignorée (${name}) : ${e.message}`);
    return [];
  }
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

const RSS_TYPES = { hibp: 'fuite confirmée', ransomware: 'rançongiciel', officiel: 'notification officielle' };

// Flux RSS des fuites critiques/élevées pour s'abonner aux alertes.
function buildRss(breaches) {
  const items = breaches.filter((b) => b.level === 'critique' || b.level === 'eleve').slice(0, 50).map((b) => `
    <item>
      <title>${xmlEscape(`[${b.score}/100] ${b.title} — ${RSS_TYPES[b.type]}${b.count ? ` — ${b.count.toLocaleString('fr-FR')} comptes` : ''}`)}</title>
      <link>${xmlEscape(`${SITE_URL}/#fuite=${encodeURIComponent(b.id)}`)}</link>
      <guid isPermaLink="false">${xmlEscape(b.id)}</guid>
      <pubDate>${new Date(b.addedDate).toUTCString()}</pubDate>
      <description>${xmlEscape(`${b.type === 'hibp' ? `Données exposées : ${b.classes.join(', ')}. ` : ''}${b.description.slice(0, 400)}`)}</description>
    </item>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Breach Radar — fuites critiques</title>
    <link>${xmlEscape(SITE_URL || '/')}</link>
    <description>Fuites de données à criticité élevée ou critique (sources : Have I Been Pwned CC BY 4.0, RansomLook, procureurs généraux de Californie et de Washington)</description>
    <language>fr</language>${items}
  </channel>
</rss>
`;
}

console.log('Collecte :');
const [hibp, ransomware, official, news] = await Promise.all([
  collect('Have I Been Pwned', buildBreaches),
  collect('RansomLook (rançongiciels)', buildRansomware),
  collect('Notifications officielles (CA, WA)', buildOfficial),
  buildNews(),
]);
const breaches = [...hibp, ...ransomware, ...official].sort((a, b) => b.addedDate.localeCompare(a.addedDate));
// Ne jamais publier un site vide si toutes les sources sont tombées.
if (!breaches.length) throw new Error('Aucune donnée collectée, déploiement annulé.');

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
  accounts: breaches.reduce((s, b) => s + (b.count || 0), 0),
  byType: { hibp: hibp.length, ransomware: ransomware.length, officiel: official.length },
  located: breaches.filter((b) => b.country).length,
  sources: ['Have I Been Pwned (CC BY 4.0)', 'RansomLook (AGPL-3.0)', 'California OAG', 'Washington AGO (data.wa.gov)', ...FEEDS.map((f) => f.name)],
};

await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'breaches.json'), JSON.stringify(breaches));
await writeFile(join(OUT, 'countries.json'), JSON.stringify(Object.values(byCountry)));
await writeFile(join(OUT, 'news.json'), JSON.stringify(news));
await writeFile(join(OUT, 'meta.json'), JSON.stringify(meta, null, 2));
await writeFile(join(ROOT, 'public', 'feed.xml'), buildRss(breaches));
console.log(`✔ ${breaches.length} fuites sur ${WINDOW_MONTHS} mois (${meta.located} localisées), ${news.length} actualités`);
