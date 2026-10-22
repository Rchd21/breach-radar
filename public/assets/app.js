import { LEVELS, TYPES, adviceFor } from './advice.js';
import { T, allAdvice, applyStatic, cls, countryName, factorLabel, lang, locale, localAdvice, setLang, stateNames } from './i18n.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nf = new Intl.NumberFormat(locale);
const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });
const fmtDate = (d) => new Date(d).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
const DAY = 86400000;
const PAGE = 25;

// Icônes au trait (24×24), à la place des emojis.
const PATHS = {
  carte: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
  iban: '<path d="M3 9l9-5 9 5M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18"/>',
  identite: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16c.6-1.4 1.7-2 3-2s2.4.6 3 2M14 10h4M14 14h3"/>',
  mdp: '<circle cx="7.5" cy="14.5" r="3.5"/><path d="M10 12l9-9M15 7l2.5 2.5M17.5 4.5L20 7"/>',
  crypto: '<circle cx="12" cy="12" r="9"/><path d="M9.5 8h4a2 2 0 010 4h-4h4.5a2 2 0 010 4h-4.5zM11 6.5v1.5M11 16v1.5"/>',
  sante: '<path d="M20.5 8.5c0 5.5-8.5 11-8.5 11s-8.5-5.5-8.5-11A4.5 4.5 0 0112 6a4.5 4.5 0 018.5 2.5z"/><path d="M7 12h2.5l1.5-2.5 2 5 1.5-2.5H17"/>',
  intime: '<path d="M20 15a2 2 0 01-2 2H8l-4 4V5a2 2 0 012-2h12a2 2 0 012 2z"/>',
  rancon: '<rect x="4" y="10.5" width="16" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 018 0v3.5M12 14.5v2.5"/>',
  officiel: '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  contact: '<path d="M21 16.5v3a2 2 0 01-2.2 2A19.8 19.8 0 012.5 5.2 2 2 0 014.5 3h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8.5 10.8a16 16 0 006.7 6.7l1.2-1.2a2 2 0 012.1-.5c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z"/>',
  email: '<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="M3 6l9 7 9-7"/>',
  alert: '<path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  close: '<path d="M18 6L6 18M6 6l12 12"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/>',
};
const icon = (name, cls = 'icon') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name] || ''}</svg>`;
const extLink = (url, label) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}${icon('external')}</a>`;

applyStatic();
document.querySelectorAll('#lang-seg [data-lang]').forEach((b) => {
  b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
  b.addEventListener('click', () => { if (b.dataset.lang !== lang) setLang(b.dataset.lang); });
});

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } },
};

const state = {
  breaches: [], countries: {}, news: [], byId: new Map(),
  // Les revendications de rançongiciels (non confirmées) sont masquées par défaut.
  levels: new Set(Object.keys(LEVELS)), types: new Set(['hibp', 'officiel']), period: 0,
  q: '', country: '', dataclass: '', sort: 'added', shown: PAGE,
  watch: store.get('br-watch', []), newsFilter: 'all',
};

const getJson = (f) => fetch(`data/${f}.json`).then((r) => r.json());
// Chargement rapide : fuites confirmées et notifications d'abord, rançongiciels ensuite en arrière-plan.
const [countries, news, meta, hibp, officiel] = await Promise.all(['countries', 'news', 'meta', 'index-hibp', 'index-officiel'].map(getJson));
state.news = news;
countries.forEach((c) => { state.countries[c.code] = { ...c, name: countryName(c.code) }; });
function addBreaches(list) {
  state.breaches.push(...list);
  list.forEach((b) => state.byId.set(b.id, b));
  state.breaches.sort((a, b) => b.addedDate.localeCompare(a.addedDate));
}
addBreaches([...hibp, ...officiel]);

// Détail d'une fiche (description, calcul du score) : réparti en 64 fichiers, même hachage que scripts/lib/pages.mjs.
const SHARDS = 64;
function shardOf(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (h >>> 0) % SHARDS;
}
const shardCache = new Map();
async function detailsOf(id) {
  const n = shardOf(id);
  if (!shardCache.has(n)) shardCache.set(n, getJson(`details/${n}`).catch(() => ({})));
  return (await shardCache.get(n))[id] || {};
}
const pageName = (id) => `${id.replace(/[^A-Za-z0-9-]/g, '-')}.html`;

/* ---------- Filtres et formats communs ---------- */
function inPeriod(b) {
  return !state.period || Date.now() - Date.parse(b.addedDate) <= state.period * DAY;
}
// Un signalement rattaché à une autre source n'apparaît pas si la ligne principale est déjà affichée.
function visible() {
  const list = state.breaches.filter((b) => state.levels.has(b.level) && state.types.has(b.type) && inPeriod(b));
  const ids = new Set(list.map((b) => b.id));
  return list.filter((b) => !b.dup || !ids.has(b.dup));
}
const relatedOf = (b) => {
  const main = b.dup ? state.byId.get(b.dup) : b;
  return [main, ...(main?.rel || []).map((id) => state.byId.get(id))].filter((x) => x && x.id !== b.id);
};
// Volume affiché : les rançongiciels et certaines notifications n'en publient pas.
const volume = (b, long = false) => {
  if (b.count == null) return b.size ? T.volClaimed(b.size) : T.volUnknown;
  if (b.type === 'officiel') return long ? `${nf.format(b.count)} ${T.peopleWaLong}` : `${compact.format(b.count)} ${T.peopleWa}`;
  return `${(long ? nf : compact).format(b.count)} ${T.accounts}`;
};
const sumCount = (list) => list.reduce((s, b) => s + (b.count || 0), 0);
const typeLabel = (k) => T.types[k][0];
const typeShort = (k) => T.types[k][1];
const countryOf = (b) => (b.country && state.countries[b.country] ? state.countries[b.country].name : T.notLocated);
const descriptionOf = (b) => (b.type === 'officiel' ? T.offDesc(stateNames(b.authorities), b.attackType) : b.description);
const sev = (b, label = false) => `<span class="sev lvl-${b.level}"><b>${b.score}</b>${label ? T.levels[b.level] : ''}</span>`;
const typeTag = (k) => `<span class="type t-${k}">${typeShort(k)}</span>`;
const HOT = new Set(['Passwords', 'Credit cards', 'Credit card CVV', 'Bank account numbers', 'Government issued IDs', 'Social security numbers', 'Passport numbers', 'Personal health data', 'Mnemonic phrases', 'Auth tokens', 'Private messages']);
const tags = (classes, max = Infinity) => {
  const sorted = [...classes].sort((x, y) => HOT.has(y) - HOT.has(x));
  return sorted.slice(0, max).map((c) => `<span class="tag${HOT.has(c) ? ' hot' : ''}">${esc(cls(c))}</span>`).join('')
    + (sorted.length > max ? `<span class="tag">+${sorted.length - max}</span>` : '');
};

function isWatched(b) {
  const hay = `${b.domain || ''} ${b.title}`.toLowerCase();
  return state.watch.some((w) => hay.includes(w));
}

/* ---------- En-tête et indicateurs ---------- */
function renderHeader() {
  const mins = Math.round((Date.now() - Date.parse(meta.generatedAt)) / 60000);
  const ago = mins < 60 ? `${mins} ${T.ago.min}` : mins < 1440 ? `${Math.round(mins / 60)} ${T.ago.h}` : `${Math.round(mins / 1440)} ${T.ago.d}`;
  $('#updated').textContent = T.updated(ago);
  const t = meta.byType;
  $('#stats').innerHTML = [
    [T.statWindow(meta.windowMonths), nf.format(meta.breaches)],
    [T.statCrit, nf.format(meta.critical), '', 'crit'],
    [T.statConfirmed, nf.format(t.hibp), T.statConfirmedSub(compact.format(meta.accountsHibp))],
    [T.statRansom, nf.format(t.ransomware)],
    [T.statOfficial, nf.format(t.officiel)],
  ].map(([l, v, sub = '', c = '']) => `<div class="kpi ${c}"><span>${esc(l)}</span><b>${v}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`).join('');
}

/* ---------- Filtres de sévérité et de source ---------- */
function renderToggles() {
  $('#level-chips').innerHTML = Object.keys(LEVELS).map((k) =>
    `<button class="toggle lvl-${k}" data-level="${k}" aria-pressed="${state.levels.has(k)}"><i></i>${T.levels[k]}</button>`).join('');
  $('#type-chips').innerHTML = Object.keys(TYPES).map((k) =>
    `<button class="toggle t-${k}" data-type="${k}" aria-pressed="${state.types.has(k)}"><i></i>${typeLabel(k)}</button>`).join('');
}
function toggleIn(set, k) {
  if (set.has(k) && set.size > 1) set.delete(k); else set.add(k);
  refresh();
}
$('#level-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-level]'); if (b) toggleIn(state.levels, b.dataset.level); });
$('#type-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-type]'); if (b) toggleIn(state.types, b.dataset.type); });
$('#period').addEventListener('change', (e) => { state.period = Number(e.target.value); refresh(); });

/* ---------- Carte ---------- */
// Fond de carte vectoriel (Natural Earth via world-atlas) : aucune clé d'API requise.
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const map = L.map('map', { minZoom: 1.5, maxZoom: 7, zoomSnap: 0.5, maxBounds: [[-75, -200], [88, 200]] }).setView([28, 10], 2);
map.attributionControl.setPrefix(false).addAttribution('Natural Earth · Leaflet');
fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json').then((r) => r.json()).then((topo) => {
  L.geoJSON(topojson.feature(topo, topo.objects.countries), {
    interactive: false,
    style: { color: cssVar('--border-strong'), weight: 0.6, fillColor: cssVar('--surface'), fillOpacity: 1 },
  }).addTo(map).bringToBack();
});
const layer = L.layerGroup().addTo(map);
const LEVEL_COLORS = { critique: cssVar('--crit'), eleve: cssVar('--high'), modere: cssVar('--med'), faible: cssVar('--low') };

function renderMap(list) {
  layer.clearLayers();
  const groups = {};
  for (const b of list) if (b.country && state.countries[b.country]) (groups[b.country] ||= []).push(b);
  for (const [code, items] of Object.entries(groups)) {
    const c = state.countries[code];
    items.sort((a, b) => b.score - a.score);
    const color = LEVEL_COLORS[items[0].level];
    const marker = L.circleMarker([c.lat, c.lng], {
      radius: Math.min(36, 4 + Math.sqrt(items.length) * 2), color, weight: 1.5, fillColor: color, fillOpacity: 0.22,
    }).addTo(layer);
    marker.bindTooltip(`${esc(c.name)} · ${items.length}`);
    marker.bindPopup(() => {
      const el = document.createElement('div');
      el.innerHTML = `<h4>${esc(c.name)}</h4>
        <p class="pop-meta">${Object.keys(TYPES).map((k) => [items.filter((b) => b.type === k).length, typeLabel(k).toLowerCase()])
          .filter(([n]) => n).map(([n, l]) => `${n} ${l}`).join(' · ')}</p>
        <ul class="pop-list">${items.slice(0, 6).map((b) => `<li>${sev(b)}<button data-open="${esc(b.id)}">${esc(b.title)}</button></li>`).join('')}</ul>
        <button class="btn secondary" data-country="${code}">${T.seeAll(items.length)}</button>`;
      el.addEventListener('click', (e) => {
        const open = e.target.closest('[data-open]');
        if (open) openBreach(open.dataset.open);
        if (e.target.closest('[data-country]')) {
          state.country = code; $('#country').value = code; state.shown = PAGE; renderList();
          location.hash = 'registre';
        }
      });
      return el;
    });
  }
  $('#map-note').textContent = T.mapNote(nf.format(list.filter((b) => b.country).length), nf.format(list.length))
    + (state.types.has('ransomware') ? '' : ` ${T.ransomHint}`);
}

function renderLatest(list) {
  const top = list.filter((b) => b.level === 'critique' || b.level === 'eleve').slice(0, 20);
  $('#latest').innerHTML = top.map((b) => `<li><button data-open="${esc(b.id)}">${sev(b)}
      <span class="t">${esc(b.title)}</span><span class="s">${typeShort(b.type)} · ${fmtDate(b.addedDate)}</span></button></li>`).join('')
    || `<li class="empty">${T.noneForFilters}</li>`;
}

/* ---------- Registre ---------- */
function logo(b) {
  return b.logo
    ? `<img class="logo" src="${esc(b.logo)}" alt="" loading="lazy" data-initial="${esc(b.title[0])}">`
    : `<span class="logo ph">${esc(b.title[0])}</span>`;
}
// Logo introuvable : on affiche l'initiale à la place.
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img.tagName !== 'IMG' || !img.classList.contains('logo')) return;
  img.replaceWith(Object.assign(document.createElement('span'), { className: 'logo ph', textContent: img.dataset.initial }));
}, true);

function subtitle(b) {
  if (b.domain) return b.domain;
  if (b.group) return T.group(b.group);
  if (b.authorities) return T.notifiedTo(b.authorities.join(', '));
  return '';
}

const row = (b) => `<tr data-open="${esc(b.id)}" tabindex="0"${isWatched(b) ? ' class="watched"' : ''}>
    <td>${sev(b, true)}</td>
    <td><div class="org">${logo(b)}<div><b>${esc(b.title)}</b><small>${esc(subtitle(b))}${b.rel ? ` · <span class="rel">${T.otherSources(b.rel.length)}</span>` : ''}</small></div></div></td>
    <td class="col-type">${typeTag(b.type)}</td>
    <td class="col-data">${tags(b.classes, 3)}</td>
    <td class="col-volume r num">${volume(b)}</td>
    <td class="col-country">${esc(countryOf(b))}</td>
    <td class="col-date num">${fmtDate(b.addedDate)}</td>
  </tr>`;

function filteredList() {
  const q = state.q.trim().toLowerCase();
  const list = visible().filter((b) =>
    (!q || `${b.title} ${b.domain || ''}`.toLowerCase().includes(q))
    && (!state.country || (state.country === '_none' ? !b.country : b.country === state.country))
    && (!state.dataclass || b.classes.includes(state.dataclass)));
  const sorters = {
    added: (a, b) => b.addedDate.localeCompare(a.addedDate),
    score: (a, b) => b.score - a.score || (b.count || 0) - (a.count || 0),
    count: (a, b) => (b.count ?? -1) - (a.count ?? -1),
    date: (a, b) => b.breachDate.localeCompare(a.breachDate),
  };
  return list.sort(sorters[state.sort]);
}

function renderList() {
  const list = filteredList();
  const shown = Math.min(state.shown, list.length);
  $('#result-count').textContent = T.resultCount(nf.format(list.length), compact.format(sumCount(list)));
  $('#list').innerHTML = list.slice(0, shown).map(row).join('') || `<tr><td colspan="7" class="empty">${T.noResults}</td></tr>`;
  $('#shown-count').textContent = list.length ? T.shownCount(nf.format(shown), nf.format(list.length)) : '';
  $('#more').hidden = list.length <= state.shown;
}

function fillSelects() {
  const breaches = state.breaches;
  for (const id of ['country', 'dataclass']) { const sel = $(`#${id}`); sel.length = 1; sel.value = state[id]; }
  const counts = {};
  breaches.forEach((b) => { if (b.country) counts[b.country] = (counts[b.country] || 0) + 1; });
  $('#country').insertAdjacentHTML('beforeend', Object.entries(counts)
    .sort((a, b) => state.countries[a[0]].name.localeCompare(state.countries[b[0]].name, locale))
    .map(([c, n]) => `<option value="${c}">${esc(state.countries[c].name)} (${n})</option>`).join('')
    + `<option value="_none">${T.notLocated}</option>`);
  const dc = {};
  breaches.forEach((b) => b.classes.forEach((c) => { dc[c] = (dc[c] || 0) + 1; }));
  $('#dataclass').insertAdjacentHTML('beforeend', Object.entries(dc).filter(([, n]) => n >= 5)
    .sort((a, b) => cls(a[0]).localeCompare(cls(b[0]), locale))
    .map(([c, n]) => `<option value="${esc(c)}">${esc(cls(c))} (${n})</option>`).join(''));
  $('#country').value = state.country;
  $('#dataclass').value = state.dataclass;
}

let qTimer;
$('#q').addEventListener('input', (e) => { clearTimeout(qTimer); qTimer = setTimeout(() => { state.q = e.target.value; state.shown = PAGE; renderList(); }, 150); });
for (const id of ['country', 'dataclass', 'sort']) {
  $(`#${id}`).addEventListener('change', (e) => { state[id] = e.target.value; state.shown = PAGE; renderList(); });
}
$('#more').addEventListener('click', () => { state.shown += PAGE; renderList(); });
$('#list').addEventListener('keydown', (e) => {
  const tr = e.target.closest('tr[data-open]');
  if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openBreach(tr.dataset.open); }
});

/* ---------- Panneau de détail ---------- */
function adviceBlock(a, tag = 'h4') {
  return `<div class="advice"><div class="advice-head"><span class="advice-ico">${icon(a.id)}</span><div>
      <${tag}>${esc(a.title)}</${tag}><span class="urgency${a.urgent ? ' now' : a.watch ? ' watch' : ''}">${esc(a.urgency)}</span></div></div>
    <ol>${a.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    <div class="links">${a.links.map((l) => extLink(l.url, l.label)).join('')}</div></div>`;
}

async function openBreach(id) {
  const light = state.byId.get(id);
  if (!light) return;
  const b = { ...light, ...(await detailsOf(id)) };
  const related = relatedOf(b);
  const shareUrl = new URL(b.type !== 'ransomware' && !b.dup ? `i/${pageName(b.id)}` : `./#fuite=${encodeURIComponent(b.id)}`, location.href.split('#')[0].split('?')[0]).href;
  const country = b.country ? `${countryOf(b)} (${T.estimation(T.countrySources[b.countrySource] || b.countrySource)})` : T.notLocated;
  const advice = adviceFor(b.classes).map(localAdvice);
  const description = descriptionOf(b);
  const disclosure = T.disclosure[b.type];
  const facts = [
    [T.fType, typeTag(b.type)],
    [T.fVolume, esc(volume(b, true))],
    [b.type === 'ransomware' ? T.claimedOn : T.breachOn, fmtDate(b.breachDate)],
    ...(b.type === 'ransomware' ? [] : [[T.publishedOn, fmtDate(b.addedDate)]]),
    [T.fCountry, esc(country)],
    ...(b.sector ? [[T.sector, esc(T.sectors[b.sector] || b.sector)]] : []),
    [T.fStatus, b.verified ? T.verified : T.unverified],
  ];
  $('#modal-body').innerHTML = `
    <div class="d-head">${logo(b)}<div><h2 id="m-title">${esc(b.title)}</h2><small>${esc(subtitle(b))}</small></div>
      <button class="close" data-close aria-label="${T.close}">${icon('close')}</button></div>
    <div class="d-body">
      <div class="score-box lvl-${b.level}">
        <div><div class="score-lvl">${T.criticality(T.levels[b.level])}</div><div class="score-num">${b.score}<small> / 100</small></div></div>
        <div><div class="score-bar"><i style="width:${b.score}%"></i></div><div class="score-scale">${[0, 35, 55, 75, 100].map((v) => `<span style="left:${v}%">${v}</span>`).join('')}</div></div>
      </div>
      ${b.type === 'ransomware' ? `<div class="notice">${T.warnRansom(esc(b.group))}</div>` : ''}
      ${related.length ? `<div class="d-section"><h3>${T.relatedTitle}</h3><ul class="rel-list">${related.map((r) =>
        `<li>${sev(r)}<button data-open="${esc(r.id)}">${esc(r.title)}</button>${typeTag(r.type)}<span class="hint">${fmtDate(r.addedDate)}</span></li>`).join('')}</ul></div>` : ''}
      <div class="d-section"><h3>${T.factsTitle}</h3><dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></div>
      <div class="d-section"><h3>${b.type === 'hibp' ? T.exposedData : T.natureOfBreach}</h3><div>${tags(b.classes)}</div></div>
      <div class="d-section"><h3>${T.scoreTitle}</h3>
        <table class="factors">${(b.factors || []).map((f) => `<tr><td>${esc(factorLabel(f))}</td><td>${f.points > 0 ? '+' : ''}${f.points}</td></tr>`).join('')}</table></div>
      <div class="d-section"><h3>${T.whatToDo}</h3>
        <div class="d-actions">${advice.map((a) => adviceBlock(a)).join('') || `<p class="d-desc">${T.beVigilant}</p>`}</div></div>
      <div class="d-section"><h3>${esc(T.descTitle(T.typeSources[b.type], b.type !== 'officiel'))}</h3>
        <p class="d-desc">${esc(description || T.noDesc)}</p>
        <div class="links">
          ${b.type === 'hibp' ? extLink(`https://haveibeenpwned.com/Breach/${encodeURIComponent(b.id)}`, T.hibpPage) : ''}
          ${b.disclosureUrl ? extLink(b.disclosureUrl, typeof disclosure === 'function' ? disclosure(b.group) : disclosure) : ''}
          ${extLink('https://haveibeenpwned.com/', T.checkEmail)}
        </div></div>
      <div class="d-share"><button class="btn secondary" data-copy="${esc(shareUrl)}">${T.copyLink}</button>
        <a class="btn secondary" href="https://github.com/Rchd21/breach-radar/issues/new?template=correction.md&title=${encodeURIComponent(`Correction : ${b.title}`)}" target="_blank" rel="noopener">${T.reportError}</a></div>
    </div>`;
  const dlg = $('#modal');
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
  history.replaceState(null, '', `${location.search}#fuite=${encodeURIComponent(id)}`);
}
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' || e.target.closest('[data-close]')) $('#modal').close(); });
$('#modal').addEventListener('close', () => { if (location.hash.startsWith('#fuite=')) history.replaceState(null, '', location.pathname + location.search); });
document.addEventListener('click', async (e) => {
  const copy = e.target.closest('[data-copy]');
  if (copy) {
    try { await navigator.clipboard.writeText(copy.dataset.copy); copy.textContent = T.copied; } catch { prompt(T.copyLink, copy.dataset.copy); }
    return;
  }
  const el = e.target.closest('[data-open]');
  if (el && !el.closest('.leaflet-popup')) openBreach(el.dataset.open);
});
function openFromHash() {
  const m = location.hash.match(/^#fuite=(.+)$/);
  if (m) openBreach(decodeURIComponent(m[1]));
}
window.addEventListener('hashchange', openFromHash);

/* ---------- Surveillance de services ---------- */
function renderWatch() {
  $('#watch-tags').innerHTML = state.watch.map((w) =>
    `<span class="watch-tag">${esc(w)}<button data-unwatch="${esc(w)}" aria-label="${esc(T.remove(w))}">×</button></span>`).join('');
  const hits = state.breaches.filter(isWatched).sort((a, b) => b.addedDate.localeCompare(a.addedDate));
  $('#watch-results').innerHTML = state.watch.length
    ? hits.slice(0, 20).map((b) => `<li>${sev(b)}<button data-open="${esc(b.id)}">${esc(b.title)}</button>
        <span class="note">${fmtDate(b.addedDate)}</span></li>`).join('') || `<li class="note">${T.noneKnown}</li>`
    : '';
  const recent = hits.filter((b) => Date.now() - Date.parse(b.addedDate) <= 90 * DAY);
  const alert = $('#watch-alert');
  alert.hidden = !recent.length;
  if (recent.length) {
    alert.innerHTML = `${icon('alert')}<div><b>${T.watchAlert(recent.length)}</b><div class="note">${recent.slice(0, 3).map((b) => esc(b.title)).join(', ')}</div></div>
      <button class="btn secondary" data-open="${esc(recent[0].id)}">${T.whatToDoBtn}</button>`;
  }
}
$('#watch-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = $('#watch-input').value.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '');
  if (v.length >= 2 && !state.watch.includes(v)) { state.watch.push(v); store.set('br-watch', state.watch); }
  $('#watch-input').value = '';
  renderWatch(); renderList();
});
$('#watch-tags').addEventListener('click', (e) => {
  const b = e.target.closest('[data-unwatch]');
  if (!b) return;
  state.watch = state.watch.filter((w) => w !== b.dataset.unwatch);
  store.set('br-watch', state.watch);
  renderWatch(); renderList();
});

/* ---------- Vérification de mot de passe (k-anonymat) ---------- */
$('#pwd-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const out = $('#pwd-result');
  const pwd = $('#pwd').value;
  if (!pwd) return;
  out.className = 'pwd-result'; out.textContent = T.checking;
  try {
    const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(pwd));
    const hash = [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
    const res = await fetch(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, { headers: { 'Add-Padding': 'true' } });
    const text = await res.text();
    const line = text.split('\n').find((l) => l.startsWith(hash.slice(5)));
    const n = line ? Number(line.split(':')[1]) : 0;
    if (n > 0) { out.classList.add('bad'); out.textContent = T.pwdFound(nf.format(n)); }
    else { out.classList.add('ok'); out.textContent = T.pwdNotFound; }
  } catch {
    out.textContent = T.pwdError;
  }
  $('#pwd').value = '';
});

/* ---------- Guide de réponse et veille ---------- */
$('#advice').innerHTML = allAdvice().map((a) => adviceBlock(a, 'h3')).join('');

const NEWS_FILTERS = { all: T.newsAll, alert: T.newsAlert, fr: T.newsFr, en: T.newsEn };
function renderNews() {
  $('#news-chips').innerHTML = Object.entries(NEWS_FILTERS).map(([k, v]) =>
    `<button data-news="${k}" aria-pressed="${state.newsFilter === k}">${v}</button>`).join('');
  const f = state.newsFilter;
  const items = state.news.filter((n) => f === 'all' || (f === 'alert' ? n.alert : n.lang === f && !n.alert)).slice(0, 25);
  $('#news').innerHTML = items.map((n) => `<li>
      <div class="src"><b>${esc(n.source)}</b>${new Date(n.date).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}${n.alert ? ` · <em>CERT-FR</em>` : ''}</div>
      <div><a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.title)}</a>${n.summary ? `<p>${esc(n.summary)}</p>` : ''}</div></li>`).join('')
    || `<li class="empty">${T.noNews}</li>`;
}
$('#news-chips').addEventListener('click', (e) => {
  const b = e.target.closest('[data-news]');
  if (b) { state.newsFilter = b.dataset.news; renderNews(); }
});

/* ---------- Démarrage ---------- */
function refresh() {
  const list = visible();
  renderToggles();
  renderMap(list);
  renderLatest([...list].sort((a, b) => b.addedDate.localeCompare(a.addedDate)));
  state.shown = PAGE;
  renderList();
}
/* ---------- Tendance hebdomadaire (petits multiples, une échelle par source) ---------- */
const tip = Object.assign(document.createElement('div'), { className: 'tip', hidden: true });
document.body.append(tip);
function renderTrend() {
  const weeks = meta.weekly;
  const W = 300, H = 110, gap = 2, bw = (W - gap * (weeks.length - 1)) / weeks.length;
  $('#trend').innerHTML = ['hibp', 'officiel', 'ransomware'].map((k) => {
    const vals = weeks.map((w) => w[k]);
    const max = Math.max(1, ...vals);
    const total = vals.reduce((s, v) => s + v, 0);
    const bars = weeks.map((w, i) => {
      const h = Math.max(w[k] ? 2 : 0, (w[k] / max) * (H - 14));
      const x = i * (bw + gap);
      return `<g data-tip="${esc(`${T.weekOf(fmtDate(w.week))} · ${typeLabel(k)}${lang === 'fr' ? ' :' : ':'} <b>${w[k]}</b>`)}">
        <rect class="bar-hit" x="${x}" y="0" width="${bw + gap}" height="${H}"/>
        <rect class="bar" x="${x}" y="${H - h}" width="${bw}" height="${h}" rx="${Math.min(2, bw / 2)}"/></g>`;
    }).join('');
    return `<div class="trend-col t-${k}"><h3>${typeLabel(k)}</h3><div class="total">${nf.format(total)} <small>${T.trendTotal}</small></div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(typeLabel(k))}">
        <line class="grid" x1="0" x2="${W}" y1="14" y2="14"/><line class="grid" x1="0" x2="${W}" y1="${H}" y2="${H}"/>${bars}
      </svg>
      <div class="trend-axis"><span>${fmtDate(weeks[0].week)}</span><span>${T.trendMax(nf.format(max))}</span><span>${fmtDate(weeks.at(-1).week)}</span></div></div>`;
  }).join('');
}
$('#trend').addEventListener('mousemove', (e) => {
  const g = e.target.closest('[data-tip]');
  tip.hidden = !g;
  if (!g) return;
  tip.innerHTML = g.dataset.tip;
  tip.style.left = `${Math.min(e.clientX + 12, innerWidth - tip.offsetWidth - 8)}px`;
  tip.style.top = `${e.clientY - 36}px`;
});
$('#trend').addEventListener('mouseleave', () => { tip.hidden = true; });

renderHeader();
renderTrend();
fillSelects();
refresh();
renderWatch();
renderNews();
openFromHash();

getJson('index-ransomware').then((list) => {
  addBreaches(list);
  fillSelects();
  refresh();
  renderWatch();
  openFromHash();
}).catch(() => { /* source indisponible : le reste du site fonctionne */ });
