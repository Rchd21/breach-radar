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

  const count = b.PwnCount || 0;
  const volume = Math.max(0, Math.min(25, ((Math.log10(Math.max(count, 1)) - 2) * 25) / 7));
  factors.push({ label: `Volume : ${count.toLocaleString('fr-FR')} comptes`, points: Math.round(volume) });

  const ageDays = (now - Date.parse(b.BreachDate)) / 86400000;
  const recency = ageDays < 90 ? 15 : ageDays < 365 ? 12 : ageDays < 730 ? 8 : ageDays < 1825 ? 4 : 1;
  factors.push({ label: `Ancienneté : ${ageDays < 365 ? 'moins d’un an' : `${Math.floor(ageDays / 365)} an(s)`}`, points: recency });

  let flags = 0;
  if (b.IsMalware || b.IsStealerLog) { flags += 8; factors.push({ label: 'Issue d’un logiciel espion (identifiants actifs)', points: 8 }); }
  if (b.IsSensitive) { flags += 5; factors.push({ label: 'Fuite classée sensible', points: 5 }); }
  if (!b.IsVerified) { flags -= 5; factors.push({ label: 'Fuite non vérifiée', points: -5 }); }
  if (b.IsFabricated) { flags -= 15; factors.push({ label: 'Données probablement fabriquées', points: -15 }); }
  if (b.IsSpamList) { flags -= 5; factors.push({ label: 'Liste de spam', points: -5 }); }

  const score = Math.max(0, Math.min(100, Math.round(sensitivity + volume + recency + flags)));
  return { score, level: levelOf(score), factors };
}

export function levelOf(score) {
  if (score >= 75) return 'critique';
  if (score >= 55) return 'eleve';
  if (score >= 35) return 'modere';
  return 'faible';
}
