// Pages statiques par incident (aperçu lors du partage, référencement) + sitemap.
// Les revendications de rançongiciels, non confirmées, n'ont volontairement pas de page indexable.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CLASS_FR } from '../../public/assets/advice.js';

export const SHARDS = 64;
// Même fonction côté navigateur (public/assets/app.js) pour retrouver le fichier de détail.
export function shardOf(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (h >>> 0) % SHARDS;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const pageName = (id) => `${id.replace(/[^A-Za-z0-9-]/g, '-')}.html`;
const LEVEL = { critique: 'critique', eleve: 'élevée', modere: 'modérée', faible: 'faible' };
const TYPE = { hibp: 'Fuite confirmée', officiel: 'Notification officielle' };

function page(b, siteUrl) {
  const url = `${siteUrl}/i/${pageName(b.id)}`;
  const target = `../#fuite=${encodeURIComponent(b.id)}`;
  const volume = b.count ? ` · ${b.count.toLocaleString('fr-FR')} ${b.type === 'hibp' ? 'comptes' : 'personnes'}` : '';
  const title = `${b.title} : fuite de données (sévérité ${LEVEL[b.level]} ${b.score}/100) — Breach Radar`;
  const summary = b.type === 'hibp'
    ? `${TYPE[b.type]}${volume}. Données exposées : ${b.classes.slice(0, 6).map((c) => CLASS_FR[c] || c).join(', ').toLowerCase()}. Que faire si vous êtes concerné.`
    : `${TYPE[b.type]} auprès du procureur général de ${b.authorities.map((s) => ({ CA: 'Californie', WA: 'Washington', OR: 'Oregon' })[s]).join(' et de ')}${volume}. Que faire si vous êtes concerné.`;
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; form-action 'none'">
<meta http-equiv="refresh" content="0; url=${esc(target)}">
<title>${esc(title)}</title>
<meta name="description" content="${esc(summary)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Breach Radar">
<meta property="og:title" content="${esc(`${b.title} — sévérité ${LEVEL[b.level]} (${b.score}/100)`)}">
<meta property="og:description" content="${esc(summary)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(`${siteUrl}/og.png`)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="robots" content="index,follow">
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:640px;margin:48px auto;padding:0 16px;color:#101828}a{color:#1d3fae}</style>
</head>
<body>
<p><a href="../">Breach Radar</a></p>
<h1>${esc(b.title)}</h1>
<p>Sévérité ${LEVEL[b.level]} : <strong>${b.score}/100</strong> · Publiée le ${new Date(b.addedDate).toLocaleDateString('fr-FR')}</p>
<p>${esc(summary)}</p>
<p><a href="${esc(target)}">Voir la fiche complète et les recommandations</a></p>
</body>
</html>
`;
}

export async function writePages(breaches, { root, siteUrl = '' }) {
  const dir = join(root, 'i');
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  // Pas de page pour les revendications non confirmées ni pour les articles de presse (contenu de tiers).
  const listed = breaches.filter((b) => (b.type === 'hibp' || b.type === 'officiel') && !b.dup);
  await Promise.all(listed.map((b) => writeFile(join(dir, pageName(b.id)), page(b, siteUrl))));

  const urls = [`${siteUrl}/`, `${siteUrl}/?lang=en`, `${siteUrl}/mentions-legales.html`, ...listed.map((b) => `${siteUrl}/i/${pageName(b.id)}`)];
  await writeFile(join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join('\n')}
</urlset>
`);
  await writeFile(join(root, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
  return listed.length;
}
