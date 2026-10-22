// Géolocalisation approximative des organisations touchées.
// HIBP ne fournit pas de pays : on le déduit (1) d'une table de correspondance
// pour les grands services, (2) du domaine national (ccTLD), (3) de la description.

// code ISO -> [nom FR, latitude, longitude]
export const COUNTRIES = {
  AE: ['Émirats arabes unis', 24.0, 54.0], AM: ['Arménie', 40.1, 45.0], AR: ['Argentine', -34.0, -64.0],
  AT: ['Autriche', 47.5, 14.5], AU: ['Australie', -25.3, 133.8], AZ: ['Azerbaïdjan', 40.1, 47.6],
  BD: ['Bangladesh', 23.7, 90.4], BE: ['Belgique', 50.6, 4.6], BG: ['Bulgarie', 42.7, 25.5],
  BR: ['Brésil', -10.8, -52.9], BY: ['Biélorussie', 53.7, 27.9], CA: ['Canada', 56.1, -106.3],
  CH: ['Suisse', 46.8, 8.2], CL: ['Chili', -35.7, -71.5], CN: ['Chine', 35.9, 104.2],
  CO: ['Colombie', 4.6, -74.3], CZ: ['Tchéquie', 49.8, 15.5], DE: ['Allemagne', 51.2, 10.4],
  DK: ['Danemark', 56.3, 9.5], DZ: ['Algérie', 28.0, 1.7], EC: ['Équateur', -1.8, -78.2],
  EE: ['Estonie', 58.6, 25.0], EG: ['Égypte', 26.8, 30.8], ES: ['Espagne', 40.5, -3.7],
  FI: ['Finlande', 61.9, 25.7], FR: ['France', 46.6, 2.4], GB: ['Royaume-Uni', 54.0, -2.5],
  GE: ['Géorgie', 42.3, 43.4], GH: ['Ghana', 7.9, -1.0], GR: ['Grèce', 39.1, 21.8],
  HK: ['Hong Kong', 22.3, 114.2], HR: ['Croatie', 45.1, 15.2], HU: ['Hongrie', 47.2, 19.5],
  ID: ['Indonésie', -2.5, 118.0], IE: ['Irlande', 53.4, -8.2], IL: ['Israël', 31.0, 34.9],
  IN: ['Inde', 21.0, 78.0], IQ: ['Irak', 33.2, 43.7], IR: ['Iran', 32.4, 53.7],
  IS: ['Islande', 64.9, -19.0], IT: ['Italie', 42.8, 12.6], JO: ['Jordanie', 30.6, 36.2],
  JP: ['Japon', 36.2, 138.3], KE: ['Kenya', 0.0, 37.9], KH: ['Cambodge', 12.6, 104.9],
  KR: ['Corée du Sud', 35.9, 127.8], KW: ['Koweït', 29.3, 47.5], KZ: ['Kazakhstan', 48.0, 66.9],
  LB: ['Liban', 33.9, 35.9], LK: ['Sri Lanka', 7.9, 80.8], LT: ['Lituanie', 55.2, 23.9],
  LU: ['Luxembourg', 49.8, 6.1], LV: ['Lettonie', 56.9, 24.6], MA: ['Maroc', 31.8, -7.1],
  MD: ['Moldavie', 47.4, 28.4], MN: ['Mongolie', 46.9, 103.8], MX: ['Mexique', 23.6, -102.6],
  MY: ['Malaisie', 4.2, 101.9], NG: ['Nigeria', 9.1, 8.7], NL: ['Pays-Bas', 52.1, 5.3],
  NO: ['Norvège', 60.5, 8.5], NP: ['Népal', 28.4, 84.1], NZ: ['Nouvelle-Zélande', -40.9, 174.9],
  PE: ['Pérou', -9.2, -75.0], PH: ['Philippines', 12.9, 121.8], PK: ['Pakistan', 30.4, 69.3],
  PL: ['Pologne', 51.9, 19.1], PT: ['Portugal', 39.4, -8.2], QA: ['Qatar', 25.4, 51.2],
  RO: ['Roumanie', 45.9, 24.9], RS: ['Serbie', 44.0, 21.0], RU: ['Russie', 61.5, 105.3],
  SA: ['Arabie saoudite', 23.9, 45.1], SE: ['Suède', 60.1, 18.6], SG: ['Singapour', 1.35, 103.8],
  SI: ['Slovénie', 46.2, 15.0], SK: ['Slovaquie', 48.7, 19.7], TH: ['Thaïlande', 15.9, 100.9],
  TN: ['Tunisie', 33.9, 9.5], TR: ['Turquie', 39.0, 35.2], TW: ['Taïwan', 23.7, 121.0],
  UA: ['Ukraine', 48.4, 31.2], UG: ['Ouganda', 1.4, 32.3], US: ['États-Unis', 39.8, -98.6],
  UY: ['Uruguay', -32.5, -55.8], UZ: ['Ouzbékistan', 41.4, 64.6], VE: ['Venezuela', 6.4, -66.6],
  VN: ['Vietnam', 14.1, 108.3], ZA: ['Afrique du Sud', -30.6, 22.9], ZW: ['Zimbabwe', -19.0, 29.2],
  ET: ['Éthiopie', 9.1, 40.5], TZ: ['Tanzanie', -6.4, 34.9], CY: ['Chypre', 35.1, 33.4],
  MT: ['Malte', 35.9, 14.4], BA: ['Bosnie-Herzégovine', 43.9, 17.7], MK: ['Macédoine du Nord', 41.6, 21.7],
  AL: ['Albanie', 41.2, 20.2], PY: ['Paraguay', -23.4, -58.4], BO: ['Bolivie', -16.3, -63.6],
  CR: ['Costa Rica', 9.7, -83.8], PA: ['Panama', 8.5, -80.8], DO: ['République dominicaine', 18.7, -70.2],
  GT: ['Guatemala', 15.8, -90.2], SN: ['Sénégal', 14.5, -14.5], CI: ["Côte d'Ivoire", 7.5, -5.5],
  CM: ['Cameroun', 7.4, 12.4], MM: ['Birmanie', 21.9, 95.9], OM: ['Oman', 21.5, 55.9],
  BH: ['Bahreïn', 26.0, 50.6], KG: ['Kirghizistan', 41.2, 74.8], MU: ['Maurice', -20.3, 57.6],
};

// Domaines de premier niveau "de fantaisie" : ne traduisent pas un pays.
const VANITY_TLDS = new Set(['io', 'co', 'tv', 'me', 'ai', 'gg', 'fm', 'ly', 'to', 'ws', 'cc', 'nu', 'la', 'am', 'im', 'sh', 'ac', 'vc', 'gl', 'gs', 'tk', 'ms', 'st', 'pw', 'cx', 'ag', 'bz', 'xyz']);
const TLD_ALIASES = { uk: 'GB', su: 'RU', edu: 'US', gov: 'US', mil: 'US' };

// Grands services en .com/.net/.org dont le siège est connu.
export const DOMAIN_OVERRIDES = {
  'linkedin.com': 'US', 'adobe.com': 'US', 'facebook.com': 'US', 'myspace.com': 'US', 'canva.com': 'AU',
  'dropbox.com': 'US', 'twitter.com': 'US', 'x.com': 'US', 'yahoo.com': 'US', 'zynga.com': 'US',
  'dubsmash.com': 'DE', 'myfitnesspal.com': 'US', 'mgmresorts.com': 'US', 'wattpad.com': 'CA',
  'gravatar.com': 'US', 'deezer.com': 'FR', 'ledger.com': 'FR', 'trello.com': 'US', 'dailymotion.com': 'FR',
  'ticketmaster.com': 'US', 'tumblr.com': 'US', 'verifications.io': 'US', 'bitly.com': 'US', 'imgur.com': 'US',
  '000webhost.com': 'LT', 'last.fm': 'GB', 'evite.com': 'US', 'houzz.com': 'US', 'chegg.com': 'US',
  'armorgames.com': 'US', 'animoto.com': 'US', 'edmodo.com': 'US', 'kickstarter.com': 'US', 'patreon.com': 'US',
  'disqus.com': 'US', 'badoo.com': 'GB', 'vk.com': 'RU', 'mail.ru': 'RU', 'rambler.ru': 'RU', 'ok.ru': 'RU',
  'yandex.ru': 'RU', 'weibo.com': 'CN', '163.com': 'CN', 'sina.com.cn': 'CN', 'youku.com': 'CN', 'xiaomi.com': 'CN',
  'nexusmods.com': 'GB', 'zomato.com': 'IN', 'bigbasket.com': 'IN', 'unacademy.com': 'IN', 'mobikwik.com': 'IN',
  'tokopedia.com': 'ID', 'bukalapak.com': 'ID', 'lazada.com': 'SG', 'mathway.com': 'US', 'poshmark.com': 'US',
  'zoosk.com': 'US', 'appen.com': 'AU', 'wishbone.io': 'US', 'twitch.tv': 'US', 'roll20.net': 'US',
  'gamigo.com': 'DE', 'lifebear.com': 'JP', 'livejournal.com': 'RU', 'quidd.co': 'US', 'shein.com': 'CN',
  'ashleymadison.com': 'CA', 'adultfriendfinder.com': 'US', 'neopets.com': 'US', 'epicgames.com': 'US',
  'minecraft.net': 'SE', 'stockx.com': 'US', 'wongnai.com': 'TH', 'dominos.co.in': 'IN', 'boatlifestyle.com': 'IN',
  'twilio.com': 'US', 'duolingo.com': 'US', 'mashable.com': 'US', 'luxottica.com': 'IT', 'boulanger.com': 'FR',
  'cultura.com': 'FR', 'freebox.fr': 'FR', 'free.fr': 'FR', 'sfr.fr': 'FR', 'leboncoin.fr': 'FR',
  'tencent.com': 'CN', 'taobao.com': 'CN', 'alibaba.com': 'CN',
  'kaspersky.com': 'RU', 'trade.me': 'NZ', 'atlassian.com': 'AU', 'medibank.com.au': 'AU', 'optus.com.au': 'AU',
  'bitcointalk.org': 'US', 'coinmarketcap.com': 'US', 'gemini.com': 'US', 'kucoin.com': 'SG', 'binance.com': 'MT',
  'crunchbase.com': 'US', 'neogen.com': 'US', 'cyrusone.com': 'US', 'chess.com': 'US', 'mckesson.com': 'US',
  'carhartt.com': 'US', 'ringcentral.com': 'US', 'alcon.com': 'CH', 'brinkshome.com': 'US', 'exactsciences.com': 'US',
  'icsecurity.com': 'US', 'suno.com': 'US', 'paidwork.com': 'PL', 'fluke.com': 'US', 'goosecreek.com': 'US',
  'sysco.com': 'US', 'msgsports.com': 'US', 'jcpenny.com': 'US', 'limeleads.com': 'US', 'magairports.com': 'GB',
  'sharecare.com': 'US', 'unico.com.br': 'BR', 'netshoes.com.br': 'BR', 'paypal.com': 'US', 'ubisoft.com': 'FR', 'cdprojekt.com': 'PL',
};

// Mentions de pays dans les descriptions HIBP ("the French website...", "in Brazil", ...).
const MENTIONS = [
  ['FR', 'French|France|Paris'], ['DE', 'German|Germany'], ['RU', 'Russian|Russia'], ['CN', 'Chinese|China'],
  ['IN', 'Indian|India'], ['BR', 'Brazilian|Brazil'], ['ID', 'Indonesian|Indonesia'], ['JP', 'Japanese|Japan'],
  ['KR', 'South Korean|Korean|South Korea'], ['VN', 'Vietnamese|Vietnam'], ['TH', 'Thai|Thailand'],
  ['MY', 'Malaysian|Malaysia'], ['PH', 'Filipino|Philippine|Philippines'], ['AU', 'Australian|Australia'],
  ['CA', 'Canadian|Canada'], ['US', 'American|Americans|United States|US-based|US|USA|New York|California|Texas|Florida|Houston|Chicago|Los Angeles|Seattle|Massachusetts|Ohio|Michigan|Pennsylvania|Illinois'], ['GB', 'British|United Kingdom|UK-based|UK|London|Manchester|England|Scotland|Wales'],
  ['IT', 'Italian|Italy'], ['ES', 'Spanish|Spain'], ['NL', 'Dutch|Netherlands'], ['BE', 'Belgian|Belgium'],
  ['CH', 'Swiss|Switzerland'], ['PL', 'Polish|Poland'], ['TR', 'Turkish|Turkey|Türkiye'], ['UA', 'Ukrainian|Ukraine'],
  ['IL', 'Israeli|Israel'], ['IR', 'Iranian|Iran'], ['MX', 'Mexican|Mexico'], ['AR', 'Argentinian|Argentine|Argentina'],
  ['CL', 'Chilean|Chile'], ['CO', 'Colombian|Colombia'], ['PE', 'Peruvian|Peru'], ['ZA', 'South African|South Africa'],
  ['NG', 'Nigerian|Nigeria'], ['KE', 'Kenyan|Kenya'], ['EG', 'Egyptian|Egypt'], ['SA', 'Saudi'],
  ['AE', 'Emirati|UAE|United Arab Emirates|Dubai'], ['PK', 'Pakistani|Pakistan'], ['BD', 'Bangladeshi|Bangladesh'],
  ['SG', 'Singaporean|Singapore'], ['TW', 'Taiwanese|Taiwan'], ['HK', 'Hong Kong'], ['NZ', 'New Zealand'],
  ['IE', 'Irish|Ireland'], ['PT', 'Portuguese|Portugal'], ['SE', 'Swedish|Sweden'], ['NO', 'Norwegian|Norway'],
  ['DK', 'Danish|Denmark'], ['FI', 'Finnish|Finland'], ['CZ', 'Czech'], ['SK', 'Slovak|Slovakia'],
  ['HU', 'Hungarian|Hungary'], ['RO', 'Romanian|Romania'], ['BG', 'Bulgarian|Bulgaria'], ['GR', 'Greek|Greece'],
  ['AT', 'Austrian|Austria'], ['RS', 'Serbian|Serbia'], ['HR', 'Croatian|Croatia'], ['LT', 'Lithuanian|Lithuania'],
  ['LV', 'Latvian|Latvia'], ['EE', 'Estonian|Estonia'], ['KZ', 'Kazakh|Kazakhstan'], ['MA', 'Moroccan|Morocco'],
  ['DZ', 'Algerian|Algeria'], ['TN', 'Tunisian|Tunisia'], ['LB', 'Lebanese|Lebanon'], ['QA', 'Qatari|Qatar'],
  ['LK', 'Sri Lankan|Sri Lanka'], ['NP', 'Nepalese|Nepali|Nepal'], ['KH', 'Cambodian|Cambodia'],
  ['VE', 'Venezuelan|Venezuela'], ['IS', 'Icelandic|Iceland'], ['SI', 'Slovenian|Slovenia'], ['BY', 'Belarusian|Belarus'],
  ['GH', 'Ghanaian|Ghana'], ['LU', 'Luxembourg'], ['CY', 'Cypriot|Cyprus'], ['UY', 'Uruguayan|Uruguay'],
].map(([code, words]) => [code, new RegExp(`\\b(?:${words})\\b`)]);

export function locate(domain, description) {
  const d = (domain || '').toLowerCase().replace(/^www\./, '');
  if (d && DOMAIN_OVERRIDES[d]) return { code: DOMAIN_OVERRIDES[d], source: 'référence' };

  const tld = d.split('.').pop();
  const fromTld = TLD_ALIASES[tld] || (tld && tld.length === 2 && !VANITY_TLDS.has(tld) ? tld.toUpperCase() : null);
  if (fromTld && COUNTRIES[fromTld]) return { code: fromTld, source: 'domaine' };

  // Seule la première phrase décrit l'organisation ; la suite cite souvent d'autres pays.
  const code = firstMention((description || '').split(/(?<=[a-z0-9)])\. /)[0]);
  return code ? { code, source: 'description' } : { code: null, source: null };
}

function firstMention(text) {
  let best = null;
  for (const [code, re] of MENTIONS) {
    const m = re.exec(text || '');
    if (m && (!best || m.index < best.index)) best = { code, index: m.index };
  }
  return best?.code || null;
}

const US_STATES = /\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming|[A-Z][a-z]+, (?:AL|AZ|CA|CO|CT|FL|GA|IL|IN|MA|MD|MI|MN|MO|NC|NJ|NY|OH|OR|PA|SC|TN|TX|VA|WA|WI)\b)/;

// Victimes de rançongiciels : on exploite la description brute (champ « Country: », domaines cités).
export function locateRansom(domain, rawDescription) {
  if (domain) {
    const r = locate(domain, '');
    if (r.code) return r;
  }
  const raw = rawDescription || '';
  const field = raw.match(/Country:\s*([^|\n]{2,60})/i);
  if (field) {
    const code = /\b(US|USA)\b/.test(field[1]) || US_STATES.test(field[1]) ? 'US' : firstMention(field[1]);
    if (code) return { code, source: 'description' };
  }
  for (const m of raw.matchAll(/\b(?:[a-z0-9-]+\.)+([a-z]{2,6})\b/gi)) {
    const tld = m[1].toLowerCase();
    if (tld === 'onion') continue;
    const code = TLD_ALIASES[tld] || (tld.length === 2 && !VANITY_TLDS.has(tld) ? tld.toUpperCase() : null);
    if (code && COUNTRIES[code]) return { code, source: 'domaine' };
  }
  const r = locate(null, raw);
  if (r.code) return r;
  return US_STATES.test(raw.slice(0, 200)) ? { code: 'US', source: 'description' } : r;
}
