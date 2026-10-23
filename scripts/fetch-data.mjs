// Collecte les données publiques et génère public/data/*.json + public/feed.xml.
// Lancé à chaque déploiement (GitHub Actions, toutes les 3 h) ou via `npm run fetch`.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COUNTRIES, locate, locateRansom } from './lib/countries.mjs';
import { SHARDS, shardOf, writePages } from './lib/pages.mjs';
import { ransomwareSector, scoreBreach, scoreOfficial, scorePress, scoreRansomware } from './lib/score.mjs';

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
      if (e[0] === '#') {
        const cp = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : '';
      }
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

// Victimes revendiquées sur les sites de fuite des groupes de rançongiciels.
// Deux agrégateurs fusionnés : RansomLook (AGPL-3.0) et ransomware.live, qui fournit souvent le pays et le secteur.
const cleanDomain = (w) => (w || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[/?#].*$/, '') || null;
const SECTOR_OF_ACTIVITY = [[/health|hospital|medical|pharma|clinic|dental/i, 'Health'], [/financ|bank|insurance|credit/i, 'Financial'], [/government|public sector|municipal/i, 'Government'], [/education|school|universit/i, 'Education']];

async function buildRansomware() {
  const days = Math.ceil((Date.now() - SINCE) / 86400000);
  const [look, live] = await Promise.allSettled([
    get(`https://www.ransomlook.io/api/last/${days}`, 'json'),
    get('https://data.ransomware.live/victims.json', 'json'),
  ]);
  if (look.status === 'rejected' && live.status === 'rejected') throw look.reason;
  if (look.status === 'rejected') console.warn(`⚠ RansomLook indisponible : ${look.reason.message}`);
  if (live.status === 'rejected') console.warn(`⚠ ransomware.live indisponible : ${live.reason.message}`);

  const victims = new Map();
  const add = (title, group, date, extra) => {
    title = toText(title).replace(/\s+/g, ' ').trim();
    if (!title || !group || !(date >= SINCE)) return;
    const key = `${group.toLowerCase()}|${title.toLowerCase()}`;
    const v = victims.get(key) || { title, group, date, feeds: [] };
    if (date < v.date) v.date = date;
    for (const [k, val] of Object.entries(extra)) if (val && !v[k]) v[k] = val;
    v.feeds.push(extra.feed);
    victims.set(key, v);
  };
  for (const p of look.value || []) {
    if (p.private) continue;
    add(p.post_title, p.group_name, new Date(`${String(p.discovered).replace(' ', 'T').slice(0, 19)}Z`), { feed: 'RansomLook', rawDesc: p.description });
  }
  for (const v of live.value || []) {
    add(v.post_title, v.group_name, new Date(v.discovered), {
      feed: 'ransomware.live', rawDesc: v.description, website: cleanDomain(v.website),
      country: /^[A-Z]{2}$/.test(v.country || '') ? v.country : null,
      activity: v.activity && v.activity !== 'Not Found' ? v.activity : null,
    });
  }

  const now = Date.now();
  return [...victims.values()].map((v) => {
    // On retire liens et adresses e-mail : aucun renvoi vers les sites des criminels.
    const description = toText(v.rawDesc || '')
      .replace(/\S+@\S+/g, '[e-mail]').replace(/\b(?:https?:\/\/|www\.)\S+|\S+\.onion\S*/gi, '[lien retiré]')
      .slice(0, 300);
    const domain = v.website || (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(v.title) ? v.title.toLowerCase() : null);
    const { code, source } = v.country && COUNTRIES[v.country]
      ? { code: v.country, source: 'déclarée' }
      : locateRansom(domain, toText(v.rawDesc || ''));
    const sector = SECTOR_OF_ACTIVITY.find(([re]) => re.test(v.activity || ''))?.[1] || ransomwareSector(description);
    const { score, level, factors } = scoreRansomware({ date: v.date.toISOString(), description, sector }, now);
    const viaLook = v.feeds.includes('RansomLook');
    return {
      id: `rl-${slug(v.group)}-${slug(v.title)}`,
      type: 'ransomware',
      title: v.title,
      domain,
      group: v.group,
      breachDate: v.date.toISOString().slice(0, 10),
      addedDate: v.date.toISOString(),
      count: null,
      size: factors.find((f) => f.k === 'rwSize')?.v || null,
      classes: ['Ransomware claim', ...(sector ? [`${sector} sector`] : [])],
      description: description === v.title ? '' : description,
      disclosureUrl: viaLook
        ? `https://www.ransomlook.io/group/${encodeURIComponent(v.group)}`
        : `https://www.ransomware.live/group/${encodeURIComponent(v.group)}`,
      feeds: [...new Set(v.feeds)],
      sector: v.activity || null,
      verified: false,
      country: code,
      countrySource: source,
      score, level, factors,
    };
  });
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

// Registre du ministère de la Justice de l'Oregon : tableau HTML (organisation, dates, personnes touchées).
function parseOregon(html) {
  const cells = (row) => [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => toText(m[1]));
  return [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => cells(m[1])).filter((c) => c.length >= 6)
    .map(([name, reported, breachDates, , , affected]) => ({ name, reported: usDate(reported), breach: usDate(breachDates), count: Number(String(affected).replace(/\D/g, '')) || null }));
}

// Notifications officielles déposées auprès des procureurs généraux de Californie, de Washington et de l'Oregon.
async function buildOfficial() {
  const sinceDay = SINCE.toISOString().slice(0, 10);
  const [caCsv, wa, or] = await Promise.all([
    get('https://oag.ca.gov/privacy/databreach/list-export'),
    get(`https://data.wa.gov/resource/sb4j-ca4h.json?$limit=5000&$where=datesubmitted>='${sinceDay}'`, 'json'),
    get('https://justice.oregon.gov/consumer/DataBreach/').then(parseOregon).catch((e) => { console.warn(`⚠ Oregon indisponible : ${e.message}`); return []; }),
  ]);
  const byOrg = new Map();
  for (const [name, breachDates, reported] of parseCsv(caCsv).slice(1)) {
    const addedDay = usDate(reported);
    if (!name || !addedDay || addedDay < sinceDay) continue;
    const key = orgKey(name);
    const prev = byOrg.get(key);
    if (prev && prev.addedDay >= addedDay) continue;
    byOrg.set(key, { name: name.trim(), addedDay, breachDay: usDate(breachDates) || addedDay, states: ['CA'] });
  }
  for (const r of wa) {
    const key = orgKey(r.name);
    const rec = byOrg.get(key) || { name: r.name.trim(), addedDay: r.datesubmitted.slice(0, 10), breachDay: (r.datestart || r.datesubmitted).slice(0, 10), states: [] };
    rec.states.push('WA');
    rec.count = Math.max(rec.count || 0, Number(r.washingtoniansaffected) || 0) || null;
    rec.sector = r.industrytype;
    rec.attackType = r.cyberattacktype || r.databreachcause;
    if (r.datesubmitted.slice(0, 10) > rec.addedDay) rec.addedDay = r.datesubmitted.slice(0, 10);
    byOrg.set(key, rec);
  }
  for (const r of or) {
    if (!r.name || !r.reported || r.reported < sinceDay) continue;
    const key = orgKey(r.name);
    const rec = byOrg.get(key) || { name: r.name.trim(), addedDay: r.reported, breachDay: r.breach && r.breach > '2001-01-01' ? r.breach : r.reported, states: [] };
    if (!rec.states.includes('OR')) rec.states.push('OR');
    if (r.count) rec.count = Math.max(rec.count || 0, r.count);
    if (r.reported > rec.addedDay) rec.addedDay = r.reported;
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
      classes,
      authorities: r.states,
      sector: r.sector || null,
      attackType: r.attackType || null,
      description: '', // rédigée dans la langue du visiteur à partir de authorities/attackType
      disclosureUrl: r.states.includes('CA')
        ? `https://oag.ca.gov/privacy/databreach/list?field_sb24_org_name_value=${encodeURIComponent(r.name)}`
        : r.states.includes('WA') ? 'https://www.atg.wa.gov/data-breach-notifications' : 'https://justice.oregon.gov/consumer/DataBreach/',
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

// Fuites signalées par la presse spécialisée. Les flux RSS ne gardent que les derniers articles :
// on repart des incidents publiés lors du déploiement précédent pour couvrir toute la fenêtre.
const PRESS_FEEDS = new Set(['DataBreaches.net']);
// Article consacré à une fuite précise (et non une revue hebdomadaire ou une faille logicielle).
const PRESS_WORDS = /data breach|breach (at|of|hits|exposes|impacts)|(customer|patient|personal|user) data|stolen data|data (leak|theft)|leaked (data|records|database)|records exposed|fuite de données|données (personnelles|clients|de clients|de patients)|piratage (de|des|d)|cyberattaque (contre|chez|vise|frappe)|ransomware attack|extortion/i;
const PRESS_EXCLUDE = /ThreatsDay|weekly recap|week in review|patch tuesday|roundup|zero-day|vulnerabilit|faille/i;
const hashId = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };

async function buildPress(news) {
  const previous = SITE_URL ? await get(`${SITE_URL}/data/presse-archive.json`, 'json').catch(() => []) : [];
  const now = Date.now();
  const fresh = news
    .filter((n) => !n.alert && !PRESS_EXCLUDE.test(n.title) && (PRESS_FEEDS.has(n.source) || PRESS_WORDS.test(`${n.title} ${n.summary}`)))
    .map((n) => {
      const text = `${n.title}. ${n.summary}`;
      // Les articles citent souvent des pays tiers (attaquants, victimes multiples) : on ne localise
      // que les articles francophones qui mentionnent explicitement la France.
      const fr = n.lang === 'fr' && /France|français|française/i.test(text);
      const { code, source } = fr ? { code: 'FR', source: 'description' } : { code: null, source: null };
      const { score, level, factors } = scorePress({ date: n.date, text }, now);
      return {
        id: `pr-${hashId(n.url)}`,
        type: 'presse',
        title: n.title,
        domain: null,
        outlet: n.source,
        lang: n.lang,
        breachDate: n.date.slice(0, 10),
        addedDate: n.date,
        count: null,
        classes: ['Press report'],
        description: n.summary,
        disclosureUrl: n.url,
        verified: false,
        country: code,
        countrySource: source,
        score, level, factors,
      };
    });
  const byId = new Map([...previous, ...fresh].map((b) => [b.id, b]));
  return [...byId.values()].filter((b) => new Date(b.addedDate) >= SINCE).slice(0, 2000);
}

const xmlEscape = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

const RSS_TYPES = { hibp: 'fuite confirmée', ransomware: 'rançongiciel', officiel: 'notification officielle', presse: 'presse' };

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
  collect('Notifications officielles (CA, WA, OR)', buildOfficial),
  buildNews(),
]);
const press = await collect('Presse spécialisée', () => buildPress(news));
const breaches = [...hibp, ...ransomware, ...official, ...press].sort((a, b) => b.addedDate.localeCompare(a.addedDate));
// Ne jamais publier un site vide si toutes les sources sont tombées.
if (!breaches.length) throw new Error('Aucune donnée collectée, déploiement annulé.');

// Une même organisation peut apparaître dans plusieurs sources : on garde une ligne
// principale (fuite confirmée > notification officielle > rançongiciel, puis score)
// et on rattache les autres signalements à celle-ci.
const TYPE_RANK = { hibp: 0, officiel: 1, ransomware: 2, presse: 3 };
const groups = new Map();
for (const b of breaches) {
  const key = orgKey(b.title.replace(/\(.*?\)/g, ''));
  if (key.length < 3) continue;
  (groups.get(key) || groups.set(key, []).get(key)).push(b);
}
let merged = 0;
for (const items of groups.values()) {
  if (items.length < 2) continue;
  items.sort((a, b) => TYPE_RANK[a.type] - TYPE_RANK[b.type] || b.score - a.score);
  const [main, ...others] = items;
  main.rel = others.map((o) => o.id);
  for (const o of others) { o.dup = main.id; merged++; }
}

const byCountry = {};
for (const b of breaches) {
  if (!b.country) continue;
  const c = (byCountry[b.country] ||= { code: b.country, name: COUNTRIES[b.country][0], lat: COUNTRIES[b.country][1], lng: COUNTRIES[b.country][2] });
  c.count = (c.count || 0) + 1;
}

// Tendance : incidents rendus publics par semaine (lundi) et par source.
const monday = (d) => { const x = new Date(d); x.setUTCHours(0, 0, 0, 0); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x.toISOString().slice(0, 10); };
const weekly = {};
for (let t = SINCE.getTime(); t <= Date.now(); t += 7 * 86400000) weekly[monday(t)] = { hibp: 0, ransomware: 0, officiel: 0, presse: 0 };
for (const b of breaches) if (!b.dup && weekly[monday(b.addedDate)]) weekly[monday(b.addedDate)][b.type]++;

const meta = {
  generatedAt: new Date().toISOString(),
  windowMonths: WINDOW_MONTHS,
  since: SINCE.toISOString(),
  breaches: breaches.length,
  merged,
  critical: breaches.filter((b) => b.level === 'critique').length,
  accountsHibp: hibp.reduce((s, b) => s + (b.count || 0), 0),
  byType: { hibp: hibp.length, ransomware: ransomware.length, officiel: official.length, presse: press.length },
  located: breaches.filter((b) => b.country).length,
  weekly: Object.entries(weekly).map(([week, v]) => ({ week, ...v })),
  sources: ['Have I Been Pwned (CC BY 4.0)', 'RansomLook (AGPL-3.0)', 'ransomware.live', 'California OAG', 'Washington AGO (data.wa.gov)', 'Oregon DOJ', ...FEEDS.map((f) => f.name)],
};

// Chargement rapide : un index léger par source, et le détail (description, calcul
// du score) réparti en 64 fichiers chargés seulement à l'ouverture d'une fiche.
const DETAIL_KEYS = ['description', 'factors', 'disclosureUrl', 'attackType'];
const shards = Array.from({ length: SHARDS }, () => ({}));
const index = { hibp: [], ransomware: [], officiel: [], presse: [] };
for (const b of breaches) {
  const light = {};
  for (const [k, v] of Object.entries(b)) if (!DETAIL_KEYS.includes(k) && v != null && v !== false) light[k] = v;
  index[b.type].push(light);
  shards[shardOf(b.id)][b.id] = Object.fromEntries(DETAIL_KEYS.filter((k) => b[k] != null).map((k) => [k, b[k]]));
}

await rm(OUT, { recursive: true, force: true });
await mkdir(join(OUT, 'details'), { recursive: true });
for (const [type, list] of Object.entries(index)) await writeFile(join(OUT, `index-${type}.json`), JSON.stringify(list));
await Promise.all(shards.map((s, i) => writeFile(join(OUT, 'details', `${i}.json`), JSON.stringify(s))));
await writeFile(join(OUT, 'countries.json'), JSON.stringify(Object.values(byCountry)));
await writeFile(join(OUT, 'news.json'), JSON.stringify(news));
await writeFile(join(OUT, 'presse-archive.json'), JSON.stringify(press));
await writeFile(join(OUT, 'meta.json'), JSON.stringify(meta));
await writeFile(join(ROOT, 'public', 'feed.xml'), buildRss(breaches));
const pages = await writePages(breaches, { root: join(ROOT, 'public'), siteUrl: SITE_URL });
console.log(`✔ ${breaches.length} fuites sur ${WINDOW_MONTHS} mois (${meta.located} localisées, ${merged} rattachées à une autre source), ${pages} pages incident, ${news.length} actualités`);
