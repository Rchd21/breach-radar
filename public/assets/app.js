import { ADVICE, LEVELS, TYPES, adviceFor, fr } from './advice.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nf = new Intl.NumberFormat('fr-FR');
const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });
const dateFr = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const DAY = 86400000;
const PAGE = 24;

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } },
};

const state = {
  breaches: [], countries: {}, news: [], byId: new Map(),
  levels: new Set(Object.keys(LEVELS)), types: new Set(Object.keys(TYPES)), period: 0,
  q: '', country: '', dataclass: '', sort: 'added', shown: PAGE,
  watch: store.get('br-watch', []), newsFilter: 'all',
};

const [breaches, countries, news, meta] = await Promise.all(
  ['breaches', 'countries', 'news', 'meta'].map((f) => fetch(`data/${f}.json`).then((r) => r.json())),
);
state.breaches = breaches;
state.news = news;
countries.forEach((c) => { state.countries[c.code] = c; });
breaches.forEach((b) => state.byId.set(b.id, b));

/* ---------- Filtres communs ---------- */
function inPeriod(b) {
  return !state.period || Date.now() - Date.parse(b.addedDate) <= state.period * DAY;
}
const visible = () => state.breaches.filter((b) => state.levels.has(b.level) && state.types.has(b.type) && inPeriod(b));
// Volume affiché : les rançongiciels et certaines notifications n'en publient pas.
const volume = (b, long = false) => (b.count == null ? (b.size ? `${b.size} revendiqués` : 'Volume inconnu')
  : long ? `${nf.format(b.count)} ${b.countLabel || 'comptes'}` : `${compact.format(b.count)} ${b.type === 'officiel' ? 'pers. (WA)' : 'comptes'}`);
const sumCount = (list) => list.reduce((s, b) => s + (b.count || 0), 0);

function isWatched(b) {
  const hay = `${b.domain || ''} ${b.title}`.toLowerCase();
  return state.watch.some((w) => hay.includes(w));
}

/* ---------- En-tête et statistiques ---------- */
function renderHeader() {
  const mins = Math.round((Date.now() - Date.parse(meta.generatedAt)) / 60000);
  const ago = mins < 60 ? `${mins} min` : mins < 1440 ? `${Math.round(mins / 60)} h` : `${Math.round(mins / 1440)} j`;
  $('#updated').textContent = `Mis à jour il y a ${ago}`;
  const crit = breaches.filter((b) => b.level === 'critique').length;
  const t = meta.byType;
  $('#stats').innerHTML = [
    [nf.format(meta.breaches), `fuites sur ${meta.windowMonths} mois`],
    [nf.format(crit), 'fuites critiques', 'crit'],
    [nf.format(t.hibp), `fuites confirmées · ${compact.format(sumCount(breaches.filter((b) => b.type === 'hibp')))} comptes`],
    [nf.format(t.ransomware), 'victimes de rançongiciels'],
    [nf.format(t.officiel), 'notifications officielles'],
  ].map(([v, l, c = '']) => `<div class="stat ${c}"><b>${v}</b><span>${l}</span></div>`).join('');
}

/* ---------- Chips de niveau ---------- */
function renderLevelChips() {
  $('#level-chips').innerHTML = Object.entries(LEVELS).map(([k, v]) =>
    `<button class="chip" data-level="${k}" aria-pressed="${state.levels.has(k)}"><i style="background:${v.color}"></i>${v.label}</button>`).join('');
}
$('#level-chips').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-level]');
  if (!btn) return;
  const k = btn.dataset.level;
  if (state.levels.has(k) && state.levels.size > 1) state.levels.delete(k); else state.levels.add(k);
  refresh();
});
function renderTypeChips() {
  $('#type-chips').innerHTML = Object.entries(TYPES).map(([k, v]) =>
    `<button class="chip" data-type="${k}" aria-pressed="${state.types.has(k)}"><i class="t-${k}"></i>${v.label}</button>`).join('');
}
$('#type-chips').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-type]');
  if (!btn) return;
  const k = btn.dataset.type;
  if (state.types.has(k) && state.types.size > 1) state.types.delete(k); else state.types.add(k);
  refresh();
});
$('#period').addEventListener('change', (e) => { state.period = Number(e.target.value); refresh(); });

/* ---------- Carte ---------- */
// Fond de carte vectoriel (Natural Earth via world-atlas) : aucune clé d'API requise.
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const map = L.map('map', { minZoom: 1.5, maxZoom: 7, zoomSnap: 0.5, maxBounds: [[-75, -200], [88, 200]] }).setView([28, 10], 2);
map.attributionControl.addAttribution('Natural Earth');
fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json').then((r) => r.json()).then((topo) => {
  L.geoJSON(topojson.feature(topo, topo.objects.countries), {
    interactive: false,
    style: { color: cssVar('--line'), weight: 0.8, fillColor: cssVar('--card-2'), fillOpacity: 1 },
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
    const worst = items[0].level;
    const marker = L.circleMarker([c.lat, c.lng], {
      radius: Math.min(40, 5 + Math.sqrt(items.length) * 2.2), color: LEVEL_COLORS[worst], weight: 2,
      fillColor: LEVEL_COLORS[worst], fillOpacity: 0.35,
    }).addTo(layer);
    marker.bindTooltip(`${esc(c.name)} — ${items.length} fuite(s)`);
    marker.bindPopup(() => {
      const el = document.createElement('div');
      el.innerHTML = `<h4>${esc(c.name)}</h4>
        <p class="note" style="margin:0 0 8px">${Object.entries(TYPES).map(([k, v]) => [items.filter((b) => b.type === k).length, v.label.toLowerCase()])
          .filter(([n]) => n).map(([n, l]) => `${n} ${l}`).join(' · ')}</p>
        <ul class="pop-list">${items.slice(0, 6).map((b) =>
          `<li><span class="score lvl-${b.level}">${b.score}</span><button data-open="${esc(b.id)}">${esc(b.title)}</button></li>`).join('')}</ul>
        <button class="ghost" data-country="${code}">Voir les ${items.length} fuites →</button>`;
      el.addEventListener('click', (e) => {
        const open = e.target.closest('[data-open]');
        if (open) openBreach(open.dataset.open);
        if (e.target.closest('[data-country]')) {
          state.country = code; $('#country').value = code; state.shown = PAGE; renderList();
          location.hash = 'fuites';
        }
      });
      return el;
    });
  }
  const located = list.filter((b) => b.country).length;
  $('#map-note').textContent = `${nf.format(located)} fuites localisées sur ${nf.format(list.length)} affichées. La localisation est estimée (domaine national, siège connu ou description) ; les autres restent consultables dans la liste.`;
}

function renderLatest(list) {
  const top = list.filter((b) => b.level === 'critique' || b.level === 'eleve').slice(0, 15);
  $('#latest').innerHTML = top.map((b) => `<li><button data-open="${esc(b.id)}">
      <span class="score lvl-${b.level}">${b.score}</span><span class="t">${esc(b.title)}</span>
      <span class="s">${TYPES[b.type].short} · ${dateFr(b.addedDate)} · ${volume(b)}</span></button></li>`).join('')
    || '<li class="note">Aucune fuite pour ces filtres.</li>';
}

/* ---------- Liste ---------- */
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
const HOT = new Set(['Passwords', 'Credit cards', 'Credit card CVV', 'Bank account numbers', 'Government issued IDs', 'Social security numbers', 'Passport numbers', 'Personal health data', 'Mnemonic phrases', 'Auth tokens', 'Private messages']);

function card(b) {
  const classes = [...b.classes].sort((x, y) => HOT.has(y) - HOT.has(x));
  const country = b.country && state.countries[b.country] ? state.countries[b.country].name : 'Non localisé';
  return `<button class="card lvl-${b.level}${isWatched(b) ? ' watched' : ''}" data-open="${esc(b.id)}">
    <div class="card-top">${logo(b)}<div><h3>${esc(b.title)}</h3><div class="dom">${esc(b.domain || (b.group ? `Groupe ${b.group}` : b.authorities ? `Notifiée : ${b.authorities.join(', ')}` : '—'))}</div></div>
      <span class="score lvl-${b.level}" title="Score de criticité">${b.score}</span></div>
    <div class="meta"><span class="badge lvl-${b.level}">${LEVELS[b.level].label}</span><span class="src-tag t-${b.type}">${TYPES[b.type].short}</span>
      <span>${volume(b)}</span><span>${dateFr(b.addedDate)}</span><span>${esc(country)}</span></div>
    <div class="pills">${classes.slice(0, 5).map((c) => `<span class="pill${HOT.has(c) ? ' hot' : ''}">${esc(fr(c))}</span>`).join('')}
      ${classes.length > 5 ? `<span class="pill">+${classes.length - 5}</span>` : ''}</div>
  </button>`;
}

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
  $('#result-count').textContent = `${nf.format(list.length)} fuite(s) · ${compact.format(sumCount(list))} comptes ou personnes connus`;
  $('#list').innerHTML = list.slice(0, state.shown).map(card).join('') || '<p class="note">Aucun résultat.</p>';
  $('#more').hidden = list.length <= state.shown;
}

function fillSelects() {
  const counts = {};
  breaches.forEach((b) => { if (b.country) counts[b.country] = (counts[b.country] || 0) + 1; });
  $('#country').insertAdjacentHTML('beforeend', Object.entries(counts)
    .sort((a, b) => state.countries[a[0]].name.localeCompare(state.countries[b[0]].name, 'fr'))
    .map(([c, n]) => `<option value="${c}">${esc(state.countries[c].name)} (${n})</option>`).join('')
    + '<option value="_none">Non localisé</option>');
  const dc = {};
  breaches.forEach((b) => b.classes.forEach((c) => { dc[c] = (dc[c] || 0) + 1; }));
  $('#dataclass').insertAdjacentHTML('beforeend', Object.entries(dc).filter(([, n]) => n >= 5)
    .sort((a, b) => fr(a[0]).localeCompare(fr(b[0]), 'fr'))
    .map(([c, n]) => `<option value="${esc(c)}">${esc(fr(c))} (${n})</option>`).join(''));
}

let qTimer;
$('#q').addEventListener('input', (e) => { clearTimeout(qTimer); qTimer = setTimeout(() => { state.q = e.target.value; state.shown = PAGE; renderList(); }, 150); });
for (const id of ['country', 'dataclass', 'sort']) {
  $(`#${id}`).addEventListener('change', (e) => { state[id] = e.target.value; state.shown = PAGE; renderList(); });
}
$('#more').addEventListener('click', () => { state.shown += PAGE; renderList(); });

/* ---------- Modale de détail ---------- */
function adviceBlock(a, tag = 'h4') {
  return `<div class="advice"><${tag}>${a.icon} ${esc(a.title)}</${tag}>
    <span class="urgency${a.urgency === 'Immédiat' ? ' now' : ''}">${esc(a.urgency)}</span>
    <ol>${a.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    <div class="links">${a.links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join('')}</div></div>`;
}

function openBreach(id) {
  const b = state.byId.get(id);
  if (!b) return;
  const lv = LEVELS[b.level];
  const country = b.country ? `${state.countries[b.country]?.name || b.country} (estimation : ${b.countrySource})` : 'Non localisé';
  const advice = adviceFor(b.classes);
  $('#modal-body').innerHTML = `
    <div class="m-head">${logo(b)}<div><h2 id="m-title">${esc(b.title)}</h2><div class="note">${esc(b.domain || '')}</div></div>
      <button class="close" data-close aria-label="Fermer">✕</button></div>
    <div class="gauge lvl-${b.level}">
      <div class="ring" style="--v:${b.score}"><div><span><b>${b.score}</b><br>/100</span></div></div>
      <div><div class="badge lvl-${b.level}" style="font-size:14px;margin-bottom:6px">Criticité : ${lv.label}</div>
        <ul class="factors">${b.factors.map((f) => `<li><span>${esc(f.label.replace(/^(Donnée la plus sensible : )(.+)$/, (m, p, c) => p + fr(c)))}</span><span>${f.points > 0 ? '+' : ''}${f.points}</span></li>`).join('')}</ul></div>
    </div>
    ${b.type === 'ransomware' ? `<p class="warn">⚠ Revendication du groupe <b>${esc(b.group)}</b> sur son site de fuite : elle n’est pas confirmée par la victime et ne précise pas toujours les données volées.</p>` : ''}
    <div class="meta"><span class="src-tag t-${b.type}">${TYPES[b.type].short}</span><span><b>${volume(b, true)}</b></span>
      <span>${b.type === 'ransomware' ? 'Revendiquée' : 'Fuite'} : ${dateFr(b.breachDate)}</span>
      ${b.type === 'ransomware' ? '' : `<span>Rendue publique : ${dateFr(b.addedDate)}</span>`}<span>${esc(country)}</span>
      ${b.sector ? `<span>Secteur : ${esc(b.sector)}</span>` : ''}
      <span>${b.verified ? '✔ Vérifiée' : '⚠ Non vérifiée'}</span></div>
    <div class="m-section"><h3>${b.type === 'hibp' ? 'Données exposées' : 'Nature de la fuite'}</h3>
      <div class="pills">${b.classes.map((c) => `<span class="pill${HOT.has(c) ? ' hot' : ''}">${esc(fr(c))}</span>`).join('')}</div></div>
    <div class="m-section"><h3>Que faire si vous êtes concerné ?</h3>
      <div class="m-actions">${advice.map((a) => adviceBlock(a)).join('') || '<p class="note">Restez vigilant face au phishing.</p>'}</div></div>
    <div class="m-section"><h3>Description (source ${esc(TYPES[b.type].source)}${b.type === 'officiel' ? '' : ', en anglais'})</h3>
      <p class="m-desc">${esc(b.description || 'Aucune description publiée.')}</p>
      <div class="links">
        ${b.type === 'hibp' ? `<a href="https://haveibeenpwned.com/Breach/${encodeURIComponent(b.id)}" target="_blank" rel="noopener">Fiche Have I Been Pwned ↗</a>` : ''}
        ${b.disclosureUrl ? `<a href="${esc(b.disclosureUrl)}" target="_blank" rel="noopener">${{ hibp: 'Communiqué officiel', ransomware: `Groupe ${esc(b.group)} sur RansomLook`, officiel: 'Registre officiel' }[b.type]} ↗</a>` : ''}
        <a href="https://haveibeenpwned.com/" target="_blank" rel="noopener">Vérifier mon e-mail ↗</a>
      </div></div>`;
  const dlg = $('#modal');
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
  history.replaceState(null, '', `#fuite=${encodeURIComponent(id)}`);
}
function closeModal() {
  $('#modal').close();
}
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' || e.target.closest('[data-close]')) closeModal(); });
$('#modal').addEventListener('close', () => { if (location.hash.startsWith('#fuite=')) history.replaceState(null, '', location.pathname); });
document.addEventListener('click', (e) => {
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
    `<span class="tag">${esc(w)}<button data-unwatch="${esc(w)}" aria-label="Retirer ${esc(w)}">✕</button></span>`).join('');
  const hits = state.breaches.filter(isWatched).sort((a, b) => b.addedDate.localeCompare(a.addedDate));
  $('#watch-results').innerHTML = state.watch.length
    ? hits.map((b) => `<li><span class="score lvl-${b.level}">${b.score}</span><button data-open="${esc(b.id)}">${esc(b.title)}</button>
        <span class="note" style="margin-left:auto">${dateFr(b.breachDate)}</span></li>`).join('') || '<li class="note">Aucune fuite connue pour ces services. 👍</li>'
    : '';
  const recent = hits.filter((b) => Date.now() - Date.parse(b.addedDate) <= 90 * DAY);
  const alert = $('#watch-alert');
  alert.hidden = !recent.length;
  if (recent.length) {
    alert.innerHTML = `<span style="font-size:22px">🚨</span><div><b>${recent.length} fuite(s) récente(s) touchent vos services</b><br>
      <span class="note">${recent.slice(0, 3).map((b) => esc(b.title)).join(', ')}</span></div>
      <button data-open="${esc(recent[0].id)}">Que faire ?</button>`;
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
  out.className = 'pwd-result'; out.textContent = 'Vérification…';
  try {
    const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(pwd));
    const hash = [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
    const res = await fetch(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, { headers: { 'Add-Padding': 'true' } });
    const text = await res.text();
    const line = text.split('\n').find((l) => l.startsWith(hash.slice(5)));
    const n = line ? Number(line.split(':')[1]) : 0;
    if (n > 0) { out.classList.add('bad'); out.textContent = `⚠ Ce mot de passe apparaît ${nf.format(n)} fois dans des fuites. Changez-le partout où il est utilisé.`; }
    else { out.classList.add('ok'); out.textContent = '✔ Ce mot de passe n’apparaît dans aucune fuite connue.'; }
  } catch {
    out.textContent = 'Service de vérification indisponible, réessayez plus tard.';
  }
  $('#pwd').value = '';
});

/* ---------- Guides et actualités ---------- */
$('#advice').innerHTML = ADVICE.map((a) => adviceBlock(a, 'h3')).join('');

const NEWS_FILTERS = { all: 'Tout', alert: 'Alertes CERT-FR', fr: 'En français', en: 'En anglais' };
function renderNews() {
  $('#news-chips').innerHTML = Object.entries(NEWS_FILTERS).map(([k, v]) =>
    `<button class="chip" data-news="${k}" aria-pressed="${state.newsFilter === k}">${v}</button>`).join('');
  const f = state.newsFilter;
  const items = state.news.filter((n) => f === 'all' || (f === 'alert' ? n.alert : n.lang === f && !n.alert)).slice(0, 30);
  $('#news').innerHTML = items.map((n) => `<li class="${n.alert ? 'alert' : ''}">
      <div class="src"><b>${esc(n.source)}</b><span>${new Date(n.date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
      <a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.title)}</a>
      ${n.summary ? `<p>${esc(n.summary)}</p>` : ''}</li>`).join('') || '<li class="note">Aucune actualité.</li>';
}
$('#news-chips').addEventListener('click', (e) => {
  const b = e.target.closest('[data-news]');
  if (b) { state.newsFilter = b.dataset.news; renderNews(); }
});

/* ---------- Démarrage ---------- */
function refresh() {
  const list = visible();
  renderLevelChips();
  renderTypeChips();
  renderMap(list);
  renderLatest([...list].sort((a, b) => b.addedDate.localeCompare(a.addedDate)));
  state.shown = PAGE;
  renderList();
}
renderHeader();
fillSelects();
refresh();
renderWatch();
renderNews();
openFromHash();
