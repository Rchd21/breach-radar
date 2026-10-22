// Score de criticité 0-100 = sensibilité des données (≤50) + volume (≤25)
// + récence (≤15) + indicateurs (malware, sensible, non vérifié...).

const WEIGHTS = {
  'Credit card CVV': 50, 'Social security numbers': 50, 'Biometric data': 50, 'Mnemonic phrases': 50, 'HIV statuses': 50,
  'Credit cards': 45, 'PINs': 45, 'Government issued IDs': 45, 'Passport numbers': 45, 'Personal health data': 45,
  'Bank account numbers': 40, 'Health insurance information': 40, 'Sexual orientations': 40, 'Sexual fetishes': 40,
  'Auth tokens': 40, 'Encrypted keys': 40,
  "Driver's licenses": 35, 'Security questions and answers': 35, 'Taxation records': 35,
  'Private messages': 30, 'Email messages': 30, 'Chat logs': 30, 'SMS messages': 30, 'Mothers maiden names': 30,
  'Financial transactions': 30, 'Political views': 30,
  'Partial credit card data': 25, 'Partial government issued IDs': 25, 'Cryptocurrency wallet addresses': 25,
  'Account balances': 25, 'Credit status information': 25, 'Credit scores': 25, 'Loan information': 25,
  'Religions': 25, 'Ethnicities': 25, 'Audio recordings': 25, 'Browsing histories': 25, 'AI prompts': 25,
  'Historical passwords': 20, 'Payment histories': 20, 'Latitude and longitude pairs': 20, 'IMEI numbers': 20,
  'IMSI numbers': 20, 'Financial investments': 20, 'Vehicle identification numbers (VINs)': 15,
  'Physical addresses': 15, 'Phone numbers': 15, 'Dates of birth': 15, 'Password hints': 15, 'Income levels': 15,
  'Photos': 15, 'Places of birth': 15, "Family members' names": 12, 'Employers': 10, 'IP addresses': 10,
  'Usernames': 8, 'Email addresses': 8, 'Names': 5,
};

function passwordWeight(description) {
  const d = description.toLowerCase();
  if (/plain ?text|unhashed|not hashed|in the clear/.test(d)) return [40, 'Mots de passe en clair'];
  if (/\bmd5\b|sha-?1\b|unsalted|base64/.test(d)) return [33, 'Mots de passe faiblement chiffrés'];
  if (/bcrypt|argon2|scrypt|pbkdf2/.test(d)) return [20, 'Mots de passe chiffrés (bcrypt…)'];
  return [30, 'Mots de passe exposés'];
}

export function scoreBreach(b, now = Date.now()) {
  const factors = [];
  const weights = b.DataClasses.map((c) => {
    if (c === 'Passwords') {
      const [w, label] = passwordWeight(b.Description || '');
      return { c, w, label };
    }
    return { c, w: WEIGHTS[c] ?? 5 };
  }).sort((x, y) => y.w - x.w);

  // La donnée la plus sensible compte pleinement, les suivantes s'additionnent partiellement.
  const [top, ...rest] = weights;
  let sensitivity = top ? top.w : 0;
  sensitivity += rest.slice(0, 6).reduce((s, x) => s + x.w * 0.2, 0);
  sensitivity = Math.min(50, sensitivity);
  if (top) factors.push({ label: top.label || `Donnée la plus sensible : ${top.c}`, points: Math.round(sensitivity) });

  const volume = volumePoints(b.PwnCount || 0);
  factors.push({ label: `Volume : ${(b.PwnCount || 0).toLocaleString('fr-FR')} comptes`, points: volume });
  const recency = recencyFactor(b.BreachDate, now, factors);

  let flags = 0;
  if (b.IsMalware || b.IsStealerLog) { flags += 8; factors.push({ label: 'Issue d’un logiciel espion (identifiants actifs)', points: 8 }); }
  if (b.IsSensitive) { flags += 5; factors.push({ label: 'Fuite classée sensible', points: 5 }); }
  if (!b.IsVerified) { flags -= 5; factors.push({ label: 'Fuite non vérifiée', points: -5 }); }
  if (b.IsFabricated) { flags -= 15; factors.push({ label: 'Données probablement fabriquées', points: -15 }); }
  if (b.IsSpamList) { flags -= 5; factors.push({ label: 'Liste de spam', points: -5 }); }

  return finish(sensitivity + volume + recency + flags, factors);
}

// 1 000 comptes ≈ 5 pts, 1 M ≈ 15 pts, 1 Md ≈ 25 pts.
const volumePoints = (count) => Math.round(Math.max(0, Math.min(25, ((Math.log10(Math.max(count, 1)) - 2) * 25) / 7)));

function recencyFactor(date, now, factors) {
  const ageDays = (now - Date.parse(date)) / 86400000;
  const recency = ageDays < 90 ? 15 : ageDays < 365 ? 12 : ageDays < 730 ? 8 : ageDays < 1825 ? 4 : 1;
  factors.push({ label: `Ancienneté : ${ageDays < 90 ? 'moins de 3 mois' : ageDays < 365 ? 'moins d’un an' : `${Math.floor(ageDays / 365)} an(s)`}`, points: recency });
  return recency;
}

function finish(total, factors) {
  const score = Math.max(0, Math.min(100, Math.round(total)));
  return { score, level: levelOf(score), factors };
}

// Revendication de rançongiciel : données internes volées et menacées de publication.
// Le volume est estimé à partir de la taille annoncée (Go/To) quand elle est connue.
export function scoreRansomware({ date, description = '' }, now = Date.now()) {
  const factors = [{ label: 'Vol de données revendiqué par un groupe de rançongiciel', points: 32 }];
  const m = description.match(/(\d+(?:[.,]\d+)?)\s*(TB|GB|To|Go)\b/i);
  let volume = 6;
  if (m) {
    const gb = parseFloat(m[1].replace(',', '.')) * (/^t/i.test(m[2]) ? 1000 : 1);
    volume = Math.round(Math.max(3, Math.min(25, 5 + 5 * Math.log10(Math.max(gb, 1)))));
    factors.push({ label: `Volume annoncé : ${m[1]} ${m[2].toUpperCase().replace('TO', 'To').replace('GO', 'Go')}`, points: volume });
  } else {
    factors.push({ label: 'Volume inconnu', points: volume });
  }
  const recency = recencyFactor(date, now, factors);
  const sector = ransomwareSector(description);
  const bonus = sector === 'Health' ? 8 : sector === 'Financial' ? 5 : 0;
  if (bonus) factors.push({ label: sector === 'Health' ? 'Secteur santé probable' : 'Secteur financier probable', points: bonus });
  factors.push({ label: 'Revendication non confirmée par la victime', points: -5 });
  return finish(32 + volume + recency + bonus - 5, factors);
}

export function ransomwareSector(description) {
  if (/hospital|clinic|health|medical|dental|pharma|patient|h[ôo]pital|sant[ée]|m[ée]dical/i.test(description)) return 'Health';
  if (/\bbank|credit union|insurance|financ|banque|assurance/i.test(description)) return 'Financial';
  return null;
}

// Notification officielle à une autorité (procureurs généraux des États américains).
const SECTOR_WEIGHTS = { Health: [40, 'Secteur santé'], Financial: [35, 'Secteur financier'], Government: [30, 'Secteur public'], Education: [28, 'Secteur éducation'] };
export function scoreOfficial({ date, count, sector, attackType }, now = Date.now()) {
  const factors = [];
  const [sens, label] = SECTOR_WEIGHTS[sector] || [27, 'Données personnelles notifiées'];
  factors.push({ label: `${label} (fuite notifiée aux autorités)`, points: sens });
  const volume = count ? volumePoints(count) : 8;
  factors.push({ label: count ? `Volume : ${count.toLocaleString('fr-FR')} personnes (au moins)` : 'Volume non publié', points: volume });
  const recency = recencyFactor(date, now, factors);
  const attack = /ransomware|malware/i.test(attackType || '') ? 5 : 0;
  if (attack) factors.push({ label: `Attaque : ${attackType}`, points: attack });
  return finish(sens + volume + recency + attack, factors);
}

export function levelOf(score) {
  if (score >= 75) return 'critique';
  if (score >= 55) return 'eleve';
  if (score >= 35) return 'modere';
  return 'faible';
}
