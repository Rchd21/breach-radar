// Traductions FR/EN. La langue vient de ?lang=, sinon du choix mémorisé, sinon du navigateur.
import { ADVICE, CLASS_FR } from './advice.js';

const stored = (() => { try { return localStorage.getItem('br-lang'); } catch { return null; } })();
const param = new URLSearchParams(location.search).get('lang');
export const lang = ['fr', 'en'].includes(param) ? param
  : ['fr', 'en'].includes(stored) ? stored
  : (navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en';
export const locale = lang === 'fr' ? 'fr-FR' : 'en-GB';

export function setLang(l) {
  try { localStorage.setItem('br-lang', l); } catch { /* stockage indisponible */ }
  const url = new URL(location.href);
  url.searchParams.set('lang', l);
  location.href = url.toString();
}

const nf = new Intl.NumberFormat(locale);
const STATE_NAMES = { fr: { CA: 'Californie', WA: 'Washington', OR: 'Oregon' }, en: { CA: 'California', WA: 'Washington', OR: 'Oregon' } };

const UI = {
  fr: {
    title: 'Breach Radar — Observatoire des fuites de données',
    metaDescription: 'Suivi consolidé des fuites de données dans le monde : score de sévérité, carte des organisations touchées et recommandations de réponse.',
    tagline: 'Observatoire des fuites',
    navMap: 'Carte', navList: 'Registre', navCheck: 'Mon exposition', navAct: 'Réponse', navNews: 'Veille',
    loading: 'Chargement…',
    eyebrow: 'Veille cybersécurité · 6 mois glissants',
    pageTitle: 'Observatoire des fuites de données',
    pageText: 'Suivi consolidé des fuites confirmées, des revendications de rançongiciels et des notifications officielles. Chaque incident reçoit un score de sévérité de 0 à 100 et des recommandations de réponse adaptées.',
    mapTitle: 'Répartition géographique', mapSub: 'Organisations touchées par pays, colorées selon l’incident le plus sévère',
    fPeriod: 'Période', fSeverity: 'Sévérité', fSource: 'Source', sortLabel: 'Trier par',
    p7: '7 derniers jours', p30: '30 derniers jours', p91: '3 derniers mois', p0: '6 derniers mois',
    latestTitle: 'Incidents récents · sévérité élevée',
    listTitle: 'Registre des incidents', searchPh: 'Organisation ou domaine…',
    thSeverity: 'Sévérité', thOrg: 'Organisation', thType: 'Source', thData: 'Données concernées', thVolume: 'Volume', thCountry: 'Pays', thDate: 'Publié le',
    shownCount: (a, b) => `${a} affichés sur ${b}`,
    otherSources: (n) => `+${n} autre${n > 1 ? 's' : ''} source${n > 1 ? 's' : ''}`,
    relatedTitle: 'Autres signalements pour cette organisation', copyLink: 'Copier le lien', copied: 'Lien copié', reportError: 'Signaler une erreur',
    ransomHint: 'Les revendications de rançongiciels, non confirmées, sont masquées par défaut : activez la source « Rançongiciels » pour les afficher.',
    trendTitle: 'Tendance hebdomadaire', trendSub: 'Incidents rendus publics chaque semaine, par source (échelle propre à chaque graphique)',
    trendTotal: 'sur la période', trendMax: (n) => `max. ${n} / semaine`, weekOf: (d) => `Semaine du ${d}`,
    legal: 'Mentions légales', contact: 'Contact et corrections',
    allCountries: 'Tous les pays', allData: 'Toutes les données', notLocated: 'Non localisé',
    sAdded: 'Plus récents', sScore: 'Score de sévérité', sCount: 'Nombre de comptes', sDate: 'Date de la fuite',
    more: 'Afficher plus',
    checkTitle: 'Vérifier mon exposition', checkSub: 'Outils gratuits, exécutés dans votre navigateur',
    watchTitle: 'Services surveillés',
    watchText: 'Indiquez les services que vous utilisez (ex. <code>deezer</code>, <code>free.fr</code>). Une alerte s’affiche dès qu’un incident les concerne. Liste conservée uniquement sur cet appareil.',
    watchPh: 'Nom ou domaine du service', add: 'Ajouter',
    pwdTitle: 'Mot de passe compromis',
    pwdText: 'Vérification anonyme : seuls les 5 premiers caractères de l’empreinte SHA-1 sont envoyés à Pwned Passwords (k-anonymat). Le mot de passe ne quitte jamais votre appareil.',
    pwdPh: 'Mot de passe à tester', verify: 'Vérifier',
    emailTitle: 'Adresse e-mail exposée',
    emailText: 'La recherche par e-mail nécessite une vérification d’identité : utilisez ces services de référence, gratuits.',
    rssText: 'Alertes : <a href="feed.xml">flux RSS des incidents critiques et élevés</a>.',
    actTitle: 'Guide de réponse', actSub: 'Actions recommandées selon le type de données exposées', hotlinesTitle: 'Contacts utiles (France)',
    hotlines: '<li><b>17Cyber</b> — assistance cyber en ligne 24 h/24 · <a href="https://www.17cyber.gouv.fr/" target="_blank" rel="noopener">17cyber.gouv.fr</a></li><li><b>Opposition carte bancaire</b> — 0 892 705 705</li><li><b>Info Escroqueries</b> — 0 805 805 817 (gratuit)</li><li><b>SMS frauduleux</b> — transférer au 33700</li><li><b>CNIL</b> — <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener">déposer une plainte</a> si l’organisme ne vous a pas informé</li>',
    newsTitle: 'Veille et alertes', newsSub: 'Presse spécialisée et alertes CERT-FR, mises à jour toutes les 3 heures',
    frenchbreaches: 'Pour les fuites touchant la France, consultez aussi <a href="https://frenchbreaches.com/" target="_blank" rel="noopener">FrenchBreaches</a>, un site spécialisé indépendant.',
    footerAbout: 'Observatoire indépendant des fuites de données, alimenté par des sources publiques et mis à jour automatiquement.',
    disclaimer: 'Informations fournies à titre indicatif, sans garantie d’exhaustivité. Aucune donnée personnelle issue des fuites n’est hébergée.',
    methodTitle: 'Méthode du score (0-100)',
    methodText: '<p>Sensibilité de la donnée la plus critique exposée (jusqu’à 50) + volume de comptes (jusqu’à 25) + récence (jusqu’à 15) ± indicateurs (logiciel espion, fuite sensible, non vérifiée, fabriquée). Sans détail des données (rançongiciels, notifications), la sensibilité est estimée d’après le secteur et le volume d’après la taille annoncée ou le nombre de personnes notifiées. <b>Critique</b> ≥ 75 · <b>Élevé</b> ≥ 55 · <b>Modéré</b> ≥ 35 · <b>Faible</b> &lt; 35.</p><p>Localisation : estimée à partir du domaine et de la description ; certaines fuites ne sont pas localisables.</p>',
    sourcesTitle: 'Sources',
    sourcesText: '<p>Fuites confirmées : <a href="https://haveibeenpwned.com/" target="_blank" rel="noopener">Have I Been Pwned</a> (CC BY 4.0). Rançongiciels : <a href="https://www.ransomlook.io/" target="_blank" rel="noopener">RansomLook</a> et <a href="https://www.ransomware.live/" target="_blank" rel="noopener">ransomware.live</a> (revendications non confirmées, aucun lien vers les sites criminels). Notifications officielles : procureurs généraux de <a href="https://oag.ca.gov/privacy/databreach/list" target="_blank" rel="noopener">Californie</a>, de <a href="https://data.wa.gov/" target="_blank" rel="noopener">Washington</a> et de l’<a href="https://justice.oregon.gov/consumer/DataBreach/" target="_blank" rel="noopener">Oregon</a>. Presse : articles consacrés à une fuite, avec lien vers la source. Actualités : DataBreaches.net, ZATAZ, BleepingComputer, The Hacker News, The Register, CERT-FR. Fenêtre glissante des 6 derniers mois, mise à jour automatiquement toutes les 3 heures.</p><p>Ce site n’héberge aucune donnée personnelle issue des fuites.</p>',
    close: 'Fermer',
    updated: (ago) => `Données mises à jour il y a ${ago}`,
    statWindow: (n) => `Incidents recensés (${n} mois)`, statCrit: 'Incidents critiques',
    statConfirmed: 'Fuites confirmées', statConfirmedSub: (c) => `${c} comptes exposés`, statRansom: 'Revendications rançongiciel', statOfficial: 'Notifications officielles',
    mapNote: (a, b) => `${a} fuites localisées sur ${b} affichées. La localisation est estimée (domaine national, siège connu ou description) ; les autres restent consultables dans la liste.`,
    seeAll: (n) => `Voir les ${n} fuites →`, noneForFilters: 'Aucune fuite pour ces filtres.', noResults: 'Aucun résultat.',
    resultCount: (n, s) => `${n} incidents · ${s} comptes ou personnes recensés`,
    volUnknown: 'Volume inconnu', volClaimed: (s) => `${s} revendiqués`, accounts: 'comptes', peopleWa: 'pers.',
    peopleWaLong: 'personnes touchées (au moins, résidents des États déclarants)',
    group: (g) => `Groupe ${g}`, notifiedTo: (s) => `Notifiée : ${s}`,
    criticality: (l) => `Sévérité : ${l}`, estimation: (s) => `estimation : ${s}`,
    scoreTitle: 'Score de sévérité', factsTitle: 'Informations clés', fType: 'Source', fVolume: 'Volume', fCountry: 'Pays', fStatus: 'Statut',
    countrySources: { 'référence': 'siège connu', domaine: 'domaine', description: 'description', 'notification officielle': 'notification officielle', 'déclarée': 'indiqué par la source' },
    warnPress: (o) => `Incident rapporté par <b>${o}</b>. Les informations proviennent de l’article et n’ont pas été vérifiées par Breach Radar.`,
    warnRansom: (g) => `Revendication du groupe <b>${g}</b> sur son site de fuite : elle n’est pas confirmée par la victime et ne précise pas toujours les données volées.`,
    claimedOn: 'Revendiqué le', breachOn: 'Date de l’incident', publishedOn: 'Rendu public le', sector: 'Secteur', verified: 'Vérifiée', unverified: 'Non vérifiée',
    sectors: { Health: 'Santé', Financial: 'Finance', Government: 'Secteur public', Education: 'Éducation', Retail: 'Commerce', Business: 'Entreprises', 'Non-Profit/Charity': 'Associatif' },
    exposedData: 'Données exposées', natureOfBreach: 'Nature de l’incident', whatToDo: 'Actions recommandées',
    beVigilant: 'Restez vigilant face au phishing.',
    descTitle: (src, en) => `Description (source ${src}${en ? ', en anglais' : ''})`, noDesc: 'Aucune description publiée.',
    offDesc: (states, cause) => `Fuite notifiée au procureur général de ${states.join(' et de ')}${cause ? ` (cause déclarée : ${cause})` : ''}.`,
    hibpPage: 'Fiche Have I Been Pwned', disclosure: { hibp: 'Communiqué officiel', ransomware: (g) => `Fiche du groupe ${g}`, officiel: 'Registre officiel', presse: 'Lire l’article' },
    checkEmail: 'Vérifier mon e-mail',
    noneKnown: 'Aucune fuite connue pour ces services.', watchAlert: (n) => `${n} fuite(s) récente(s) touchent vos services`,
    whatToDoBtn: 'Voir les recommandations', remove: (w) => `Retirer ${w}`,
    checking: 'Vérification…', pwdFound: (n) => `Ce mot de passe apparaît ${n} fois dans des fuites. Changez-le partout où il est utilisé.`,
    pwdNotFound: 'Ce mot de passe n’apparaît dans aucune fuite connue.', pwdError: 'Service de vérification indisponible, réessayez plus tard.',
    newsAll: 'Tout', newsAlert: 'Alertes CERT-FR', newsFr: 'En français', newsEn: 'En anglais', noNews: 'Aucune actualité.',
    levels: { critique: 'Critique', eleve: 'Élevé', modere: 'Modéré', faible: 'Faible' },
    types: {
      hibp: ['Fuites confirmées', 'Fuite confirmée'], ransomware: ['Rançongiciels', 'Rançongiciel'], officiel: ['Notifications officielles', 'Notification officielle'], presse: ['Presse', 'Presse'],
    },
    typeSources: { hibp: 'Have I Been Pwned', ransomware: 'RansomLook / ransomware.live', officiel: 'procureurs généraux (CA, WA, OR)', presse: 'presse spécialisée' },
    statPress: 'Signalées par la presse',
    factors: {
      topClass: (c) => `Donnée la plus sensible : ${c}`, pwdPlain: 'Mots de passe en clair', pwdWeak: 'Mots de passe faiblement chiffrés',
      pwdHashed: 'Mots de passe chiffrés (bcrypt…)', pwdExposed: 'Mots de passe exposés', accounts: (n) => `Volume : ${nf.format(n)} comptes`,
      age: (d) => `Ancienneté : ${d < 90 ? 'moins de 3 mois' : d < 365 ? 'moins d’un an' : `${Math.floor(d / 365)} an(s)`}`,
      malware: 'Issue d’un logiciel espion (identifiants actifs)', sensitive: 'Fuite classée sensible', unverified: 'Fuite non vérifiée',
      fabricated: 'Données probablement fabriquées', spam: 'Liste de spam',
      rwClaim: 'Vol de données revendiqué par un groupe de rançongiciel', rwSize: (s) => `Volume annoncé : ${s}`, rwSizeUnknown: 'Volume inconnu',
      rwSector: (s) => (s === 'Health' ? 'Secteur santé probable' : 'Secteur financier probable'), rwUnconfirmed: 'Revendication non confirmée par la victime',
      offSector: (s) => `${{ Health: 'Secteur santé', Financial: 'Secteur financier', Government: 'Secteur public', Education: 'Secteur éducation' }[s] || 'Données personnelles notifiées'} (fuite notifiée aux autorités)`,
      people: (n) => `Volume : ${nf.format(n)} personnes (au moins)`, volumeUnpublished: 'Volume non publié', attack: (t) => `Attaque : ${t}`,
      pressReport: 'Fuite rapportée par un média spécialisé', pressSensitive: 'Données sensibles évoquées (banque, santé, identité, mots de passe)',
    },
    ago: { min: 'min', h: 'h', d: 'j' },
  },
  en: {
    title: 'Breach Radar — Data Breach Observatory',
    metaDescription: 'Consolidated tracking of data breaches worldwide: severity score, map of affected organisations and response guidance.',
    tagline: 'Data Breach Observatory',
    navMap: 'Map', navList: 'Register', navCheck: 'My exposure', navAct: 'Response', navNews: 'Intelligence',
    loading: 'Loading…',
    eyebrow: 'Cyber threat intelligence · rolling 6 months',
    pageTitle: 'Data Breach Observatory',
    pageText: 'Consolidated tracking of confirmed breaches, ransomware claims and official notifications. Every incident receives a 0–100 severity score and tailored response guidance.',
    mapTitle: 'Geographic distribution', mapSub: 'Affected organisations by country, coloured by the most severe incident',
    fPeriod: 'Period', fSeverity: 'Severity', fSource: 'Source', sortLabel: 'Sort by',
    p7: 'Last 7 days', p30: 'Last 30 days', p91: 'Last 3 months', p0: 'Last 6 months',
    latestTitle: 'Recent incidents · high severity',
    listTitle: 'Incident register', searchPh: 'Organisation or domain…',
    thSeverity: 'Severity', thOrg: 'Organisation', thType: 'Source', thData: 'Data involved', thVolume: 'Volume', thCountry: 'Country', thDate: 'Published',
    shownCount: (a, b) => `Showing ${a} of ${b}`,
    otherSources: (n) => `+${n} other source${n > 1 ? 's' : ''}`,
    relatedTitle: 'Other reports for this organisation', copyLink: 'Copy link', copied: 'Link copied', reportError: 'Report an error',
    ransomHint: 'Unconfirmed ransomware claims are hidden by default: enable the “Ransomware” source to show them.',
    trendTitle: 'Weekly trend', trendSub: 'Incidents made public each week, by source (each chart has its own scale)',
    trendTotal: 'over the period', trendMax: (n) => `max ${n} / week`, weekOf: (d) => `Week of ${d}`,
    legal: 'Legal notice', contact: 'Contact and corrections',
    allCountries: 'All countries', allData: 'All data types', notLocated: 'Unknown location',
    sAdded: 'Most recent', sScore: 'Severity score', sCount: 'Number of accounts', sDate: 'Breach date',
    more: 'Show more',
    checkTitle: 'Check my exposure', checkSub: 'Free tools that run in your browser',
    watchTitle: 'Watched services',
    watchText: 'Enter the services you use (e.g. <code>adobe.com</code>, <code>linkedin</code>). An alert appears as soon as an incident affects them. The list is only kept on this device.',
    watchPh: 'Service name or domain', add: 'Add',
    pwdTitle: 'Compromised password',
    pwdText: 'Anonymous check: only the first 5 characters of the SHA-1 hash are sent to Pwned Passwords (k-anonymity). Your password never leaves your device.',
    pwdPh: 'Password to test', verify: 'Check',
    emailTitle: 'Exposed email address',
    emailText: 'Searching by email requires identity verification: use these free reference services.',
    rssText: 'Alerts: <a href="feed.xml">RSS feed of critical and high incidents</a> (in French).',
    actTitle: 'Response guide', actSub: 'Recommended actions by type of exposed data', hotlinesTitle: 'Useful contacts (France)',
    hotlines: '<li><b>17Cyber</b> — 24/7 online cyber assistance: <a href="https://www.17cyber.gouv.fr/" target="_blank" rel="noopener">17cyber.gouv.fr</a></li><li><b>Card blocking (France)</b> — +33 892 705 705</li><li><b>Info Escroqueries</b> — 0 805 805 817 (free, from France)</li><li><b>Scam texts</b> — forward to 33700 (French numbers)</li><li><b>CNIL</b> — <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener">file a complaint</a> if the organisation did not inform you</li><li>Outside France: contact your bank, your national cybercrime reporting service and your data protection authority.</li>',
    newsTitle: 'Intelligence and alerts', newsSub: 'Specialist press and CERT-FR alerts, refreshed every 3 hours',
    frenchbreaches: 'For breaches affecting France, see also <a href="https://frenchbreaches.com/" target="_blank" rel="noopener">FrenchBreaches</a>, an independent specialist site.',
    footerAbout: 'Independent data breach observatory, built on public sources and updated automatically.',
    disclaimer: 'Information provided for guidance only, with no guarantee of completeness. No personal data from breaches is hosted.',
    methodTitle: 'Scoring method (0-100)',
    methodText: '<p>Sensitivity of the most critical exposed data (up to 50) + number of accounts (up to 25) + recency (up to 15) ± indicators (infostealer malware, sensitive breach, unverified, fabricated). When the data types are unknown (ransomware, notifications), sensitivity is estimated from the sector and volume from the claimed size or number of people notified. <b>Critical</b> ≥ 75 · <b>High</b> ≥ 55 · <b>Moderate</b> ≥ 35 · <b>Low</b> &lt; 35.</p><p>Location: estimated from the domain and description; some breaches cannot be located.</p>',
    sourcesTitle: 'Sources',
    sourcesText: '<p>Confirmed breaches: <a href="https://haveibeenpwned.com/" target="_blank" rel="noopener">Have I Been Pwned</a> (CC BY 4.0). Ransomware: <a href="https://www.ransomlook.io/" target="_blank" rel="noopener">RansomLook</a> and <a href="https://www.ransomware.live/" target="_blank" rel="noopener">ransomware.live</a> (unconfirmed claims, no links to criminal sites). Official notifications: Attorneys General of <a href="https://oag.ca.gov/privacy/databreach/list" target="_blank" rel="noopener">California</a>, <a href="https://data.wa.gov/" target="_blank" rel="noopener">Washington</a> and <a href="https://justice.oregon.gov/consumer/DataBreach/" target="_blank" rel="noopener">Oregon</a>. Press: articles about a specific breach, linking to the source. News: DataBreaches.net, ZATAZ, BleepingComputer, The Hacker News, The Register, CERT-FR. Rolling 6-month window, updated automatically every 3 hours.</p><p>This site does not host any personal data from the breaches.</p>',
    close: 'Close',
    updated: (ago) => `Data updated ${ago} ago`,
    statWindow: (n) => `Incidents tracked (${n} months)`, statCrit: 'Critical incidents',
    statConfirmed: 'Confirmed breaches', statConfirmedSub: (c) => `${c} accounts exposed`, statRansom: 'Ransomware claims', statOfficial: 'Official notifications',
    mapNote: (a, b) => `${a} of ${b} displayed breaches are located. Location is estimated (national domain, known headquarters or description); the others are still listed below.`,
    seeAll: (n) => `See all ${n} breaches →`, noneForFilters: 'No breach for these filters.', noResults: 'No results.',
    resultCount: (n, s) => `${n} incidents · ${s} accounts or people recorded`,
    volUnknown: 'Unknown volume', volClaimed: (s) => `${s} claimed`, accounts: 'accounts', peopleWa: 'people',
    peopleWaLong: 'people affected (at least, residents of reporting states)',
    group: (g) => `${g} group`, notifiedTo: (s) => `Notified: ${s}`,
    criticality: (l) => `Severity: ${l}`, estimation: (s) => `estimated: ${s}`,
    scoreTitle: 'Severity score', factsTitle: 'Key facts', fType: 'Source', fVolume: 'Volume', fCountry: 'Country', fStatus: 'Status',
    countrySources: { 'référence': 'known headquarters', domaine: 'domain', description: 'description', 'notification officielle': 'official notification', 'déclarée': 'reported by source' },
    warnPress: (o) => `Incident reported by <b>${o}</b>. Details come from the article and have not been verified by Breach Radar.`,
    warnRansom: (g) => `Claimed by the <b>${g}</b> group on its leak site: not confirmed by the victim, and the stolen data is not always specified.`,
    claimedOn: 'Claimed on', breachOn: 'Incident date', publishedOn: 'Made public on', sector: 'Sector', verified: 'Verified', unverified: 'Unverified',
    sectors: { Health: 'Health', Financial: 'Finance', Government: 'Public sector', Education: 'Education', Retail: 'Retail', Business: 'Business', 'Non-Profit/Charity': 'Non-profit' },
    exposedData: 'Exposed data', natureOfBreach: 'Nature of the incident', whatToDo: 'Recommended actions',
    beVigilant: 'Stay alert to phishing.',
    descTitle: (src) => `Description (source: ${src})`, noDesc: 'No description published.',
    offDesc: (states, cause) => `Breach notified to the Attorney General of ${states.join(' and ')}${cause ? ` (reported cause: ${cause})` : ''}.`,
    hibpPage: 'Have I Been Pwned page', disclosure: { hibp: 'Official statement', ransomware: (g) => `${g} group page`, officiel: 'Official register', presse: 'Read the article' },
    checkEmail: 'Check my email',
    noneKnown: 'No known breach for these services.', watchAlert: (n) => `${n} recent breach(es) affect your services`,
    whatToDoBtn: 'View guidance', remove: (w) => `Remove ${w}`,
    checking: 'Checking…', pwdFound: (n) => `This password appears ${n} times in breaches. Change it everywhere you use it.`,
    pwdNotFound: 'This password does not appear in any known breach.', pwdError: 'Checking service unavailable, please try again later.',
    newsAll: 'All', newsAlert: 'CERT-FR alerts', newsFr: 'In French', newsEn: 'In English', noNews: 'No news.',
    levels: { critique: 'Critical', eleve: 'High', modere: 'Moderate', faible: 'Low' },
    types: {
      hibp: ['Confirmed breaches', 'Confirmed breach'], ransomware: ['Ransomware', 'Ransomware'], officiel: ['Official notifications', 'Official notification'], presse: ['Press', 'Press'],
    },
    typeSources: { hibp: 'Have I Been Pwned', ransomware: 'RansomLook / ransomware.live', officiel: 'Attorneys General (CA, WA, OR)', presse: 'specialist press' },
    statPress: 'Reported by the press',
    factors: {
      topClass: (c) => `Most sensitive data: ${c}`, pwdPlain: 'Plain-text passwords', pwdWeak: 'Weakly hashed passwords',
      pwdHashed: 'Hashed passwords (bcrypt…)', pwdExposed: 'Passwords exposed', accounts: (n) => `Volume: ${nf.format(n)} accounts`,
      age: (d) => `Age: ${d < 90 ? 'under 3 months' : d < 365 ? 'under a year' : `${Math.floor(d / 365)} year(s)`}`,
      malware: 'From infostealer malware (active credentials)', sensitive: 'Flagged as sensitive', unverified: 'Unverified breach',
      fabricated: 'Data likely fabricated', spam: 'Spam list',
      rwClaim: 'Data theft claimed by a ransomware group', rwSize: (s) => `Claimed size: ${s}`, rwSizeUnknown: 'Unknown volume',
      rwSector: (s) => (s === 'Health' ? 'Likely health sector' : 'Likely financial sector'), rwUnconfirmed: 'Claim not confirmed by the victim',
      offSector: (s) => `${{ Health: 'Health sector', Financial: 'Financial sector', Government: 'Public sector', Education: 'Education sector' }[s] || 'Personal data notified'} (reported to authorities)`,
      people: (n) => `Volume: ${nf.format(n)} people (at least)`, volumeUnpublished: 'Volume not published', attack: (t) => `Attack: ${t}`,
      pressReport: 'Breach reported by a specialist outlet', pressSensitive: 'Sensitive data mentioned (banking, health, identity, passwords)',
    },
    ago: { min: 'min', h: 'h', d: 'd' },
  },
};

export const T = UI[lang];

const CLASS_EN_EXTRA = {
  'Ransomware claim': 'Stolen internal data (claim)', 'Official notification': 'Official notification',
  'Health sector': 'Health sector', 'Financial sector': 'Financial sector', 'Press report': 'Reported by the press',
};
export const cls = (c) => (lang === 'fr' ? CLASS_FR[c] || c : CLASS_EN_EXTRA[c] || c);
export const stateNames = (codes) => codes.map((c) => STATE_NAMES[lang][c] || c);

const regions = new Intl.DisplayNames([locale], { type: 'region' });
export const countryName = (code) => { try { return regions.of(code); } catch { return code; } };

export function factorLabel(f) {
  const fn = T.factors[f.k];
  if (typeof fn !== 'function') return fn || f.k;
  return fn(f.k === 'topClass' ? cls(f.v) : f.v);
}

// Version anglaise des fiches de conseils (le français est la source, dans advice.js).
const ADVICE_EN = {
  carte: { title: 'Bank card exposed', urgency: 'Immediately', steps: [
    'Block the card (banking app or your bank’s emergency line) if the full number or CVV leaked.',
    'Check your statements for the last 3 months and turn on payment notifications.',
    'Report any fraudulent transaction to your bank and request a refund (in France: Perceval; refunds possible for 13 months).',
    'Beware of fake “fraud department” calls: your bank will never ask you to approve a transaction or give a code.'] },
  iban: { title: 'Bank details (IBAN) exposed', urgency: 'Within 24 h', steps: [
    'Tell your bank and ask for the list of active direct debit mandates.',
    'Set up an allow/block list of authorised creditors if your bank offers it.',
    'Dispute any unknown direct debit: unauthorised debits must be refunded.',
    'Watch out for fake bank advisers quoting your IBAN to sound credible.'] },
  identite: { title: 'ID document / social security number exposed', urgency: 'Within 48 h', steps: [
    'Identity theft risk: watch for accounts, loans or subscriptions opened in your name.',
    'If a copy of your documents is circulating, file a police report and keep the receipt (useful to dispute fraudulent debts).',
    'Social security number: beware of fake health insurance messages asking for payments or details.',
    'Check your credit file (in France: Banque de France FICP/FCC; elsewhere: your credit bureaus).'] },
  mdp: { title: 'Password exposed', urgency: 'Immediately', steps: [
    'Change the password for the affected service, and everywhere you reused it.',
    'Turn on two-factor authentication (authenticator app or security key rather than SMS).',
    'Use a password manager to have a unique password for every site.',
    'Sign out active sessions and check the forwarding / recovery emails on your accounts.',
    'Security questions exposed: change them, or answer with a random phrase stored in your manager.'] },
  crypto: { title: 'Crypto wallet exposed', urgency: 'Immediately', steps: [
    'If your recovery phrase leaked, move your funds to a new wallet immediately.',
    'No legitimate person will ever ask for your recovery phrase.',
    'Wallet address exposed: beware of phishing and booby-trapped parcels (fake hardware wallets).'] },
  sante: { title: 'Health data exposed', urgency: 'Within 72 h', steps: [
    'Do not respond to blackmail: do not pay, keep the evidence and report it to the police.',
    'Beware of targeted approaches (fake refunds, fake labs, fake doctors).',
    'You can exercise your rights with the organisation and complain to your data protection authority if you were not properly informed.'] },
  intime: { title: 'Private messages or intimate data exposed', urgency: 'Within 72 h', steps: [
    'Risk of blackmail (“sextortion”): never pay, do not reply, keep the evidence.',
    'Report published content (in France: Pharos) and ask platforms to remove it.',
    'Review what was shared in those conversations (passwords, documents…).'] },
  rancon: { title: 'Organisation hit by ransomware', urgency: 'Stay alert', steps: [
    'If you are a customer, patient, employee or supplier, your data may be in the stolen files.',
    'Change your password for that organisation and everywhere you reused it.',
    'Expect fraudulent emails or calls impersonating it (fake invoices, fake bank detail changes).',
    'Watch for official letters from the organisation: it must tell you if your data is affected.',
    'Never download data published by the attackers: it is illegal and often booby-trapped.'] },
  presse: { title: 'Breach reported by the press', urgency: 'Stay alert', steps: [
    'Read the article to find out which data and which customers are affected.',
    'If you have an account with this organisation, change its password and turn on two-factor authentication.',
    'Expect scam emails, texts or calls exploiting this breach: do not click any link.',
    'Watch for the organisation’s official communication, which must inform the people affected.'] },
  officiel: { title: 'Breach reported to the authorities', urgency: 'Within 48 h', steps: [
    'Read the notification letter sent by the organisation: it states which data was affected.',
    'Enrol in the free monitoring services offered in the letter (credit or identity monitoring).',
    'In the US, a free credit freeze with the 3 credit bureaus blocks new accounts being opened in your name.',
    'Check your bank and health insurance statements over the coming months.'] },
  contact: { title: 'Phone number and postal address exposed', urgency: 'Stay alert', steps: [
    'Expect scam texts and calls (parcels, fines, fake bank advisers): do not click any link.',
    'Report scam texts (in France: forward them to 33700).',
    'Combined, this data makes identity theft easier: watch out for unusual mail.'] },
  email: { title: 'Email address exposed', urgency: 'Stay alert', steps: [
    'Expect personalised phishing mentioning the affected service: always check the sender.',
    'Never enter credentials through a link received by email; go to the official site instead.',
    'Use a separate email alias per service to limit the impact of future breaches.'] },
};
const LINKS_EN = {
  'Plainte CNIL': 'CNIL complaint (France)', 'Perceval (fraude carte)': 'Perceval (card fraud, France)', 'Pharos (signalement)': 'Pharos (reporting, France)',
  '33700 (SMS/appels frauduleux)': '33700 (scam texts, France)', 'Plainte en ligne': 'Online police report (France)',
  'Perte/vol de papiers (ANTS)': 'Lost/stolen ID (ANTS, France)', 'Fraude Ameli : bons réflexes': 'Health insurance fraud (Ameli, France)',
  '17Cyber (assistance)': '17Cyber (assistance, France)', 'Gel de crédit (FTC)': 'Credit freeze (FTC)',
};
const URGENT = new Set(['Immédiat', 'Immediately']);

export function localAdvice(a) {
  const en = lang === 'en' ? ADVICE_EN[a.id] : null;
  return {
    id: a.id,
    watch: a.urgency === 'Vigilance',
    title: en?.title || a.title,
    urgency: en?.urgency || a.urgency,
    urgent: URGENT.has(a.urgency),
    steps: en?.steps || a.steps,
    links: a.links.map((l) => ({ url: l.url, label: (lang === 'en' && LINKS_EN[l.label]) || l.label })),
  };
}
export const allAdvice = () => ADVICE.map(localAdvice);

// Textes statiques de la page : data-i18n (texte), data-i18n-html (HTML de confiance), data-i18n-ph, data-i18n-aria.
export function applyStatic() {
  document.documentElement.lang = lang;
  document.title = T.title;
  document.querySelector('meta[name=description]')?.setAttribute('content', T.metaDescription);
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = T[el.dataset.i18n]; });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = T[el.dataset.i18nHtml]; });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = T[el.dataset.i18nPh]; });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', T[el.dataset.i18nAria]); });
}
