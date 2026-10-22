// Traductions des catégories de données HIBP et règles de conseils d'action.

export const CLASS_FR = {
  'Email addresses': 'Adresses e-mail', 'Passwords': 'Mots de passe', 'Names': 'Noms', 'Usernames': "Noms d'utilisateur",
  'IP addresses': 'Adresses IP', 'Phone numbers': 'Numéros de téléphone', 'Physical addresses': 'Adresses postales',
  'Dates of birth': 'Dates de naissance', 'Genders': 'Genres', 'Geographic locations': 'Localisations',
  'Purchases': 'Achats', 'Website activity': 'Activité sur le site', 'Job titles': 'Postes', 'Social media profiles': 'Profils réseaux sociaux',
  'Employers': 'Employeurs', 'Partial credit card data': 'Données partielles de carte bancaire', 'Private messages': 'Messages privés',
  'Device information': 'Informations sur les appareils', 'Government issued IDs': "Pièces d'identité / n° officiels",
  'Salutations': 'Civilités', 'Browser user agent details': 'Navigateurs utilisés', 'Spoken languages': 'Langues parlées',
  'Marital statuses': 'Situations familiales', 'Profile photos': 'Photos de profil', 'Income levels': 'Revenus',
  'Bios': 'Biographies', 'Support tickets': 'Tickets de support', 'Education levels': "Niveaux d'études",
  'Bank account numbers': 'Numéros de compte bancaire (IBAN)', 'Security questions and answers': 'Questions/réponses secrètes',
  'Passport numbers': 'Numéros de passeport', 'Avatars': 'Avatars', 'Physical attributes': 'Caractéristiques physiques',
  'Ethnicities': 'Origines ethniques', 'Latitude and longitude pairs': 'Coordonnées GPS', 'Nationalities': 'Nationalités',
  'Auth tokens': "Jetons d'authentification", 'Religions': 'Religions', 'Sexual orientations': 'Orientations sexuelles',
  'Account balances': 'Soldes de compte', 'Payment histories': 'Historiques de paiement', 'Email messages': 'Contenus d’e-mails',
  'Personal health data': 'Données de santé', 'Relationship statuses': 'Situations amoureuses', 'Vehicle details': 'Véhicules',
  'Social security numbers': 'Numéros de sécurité sociale', 'Credit cards': 'Cartes bancaires', "Family members' names": 'Noms des proches',
  'Credit status information': 'Solvabilité', 'Job applications': 'Candidatures', 'Chat logs': 'Conversations',
  'Historical passwords': 'Anciens mots de passe', 'Financial transactions': 'Transactions financières',
  'Health insurance information': 'Assurance santé', "Driver's licenses": 'Permis de conduire', 'Places of birth': 'Lieux de naissance',
  'SMS messages': 'SMS', 'Credit card CVV': 'Cryptogrammes (CVV)', 'Cryptocurrency wallet addresses': 'Portefeuilles crypto',
  'Password hints': 'Indices de mot de passe', 'PINs': 'Codes PIN', 'Biometric data': 'Données biométriques',
  'Mothers maiden names': 'Noms de jeune fille de la mère', 'Mnemonic phrases': 'Phrases de récupération crypto',
  'Taxation records': 'Données fiscales', 'Political views': 'Opinions politiques', 'Photos': 'Photos', 'AI prompts': 'Requêtes IA',
  'Browsing histories': 'Historiques de navigation', 'Loan information': 'Prêts', 'Credit scores': 'Scores de crédit',
  'HIV statuses': 'Statut VIH', 'Encrypted keys': 'Clés chiffrées', 'Partial government issued IDs': "N° d'identité partiels",
  'Audio recordings': 'Enregistrements audio', 'Partial dates of birth': 'Dates de naissance partielles', 'Ages': 'Âges',
  'Occupations': 'Professions', 'Customer service records': 'Échanges service client', 'Payment methods': 'Moyens de paiement',
  'Recovery email addresses': 'E-mails de récupération', 'Login histories': 'Historiques de connexion',
  'Ransomware claim': 'Données internes volées (revendication)', 'Official notification': 'Notification officielle',
  'Health sector': 'Secteur santé', 'Financial sector': 'Secteur financier', 'Press report': 'Signalée par la presse',
};

export const TYPES = {
  hibp: { label: 'Fuites confirmées', short: 'Fuite confirmée', source: 'Have I Been Pwned' },
  ransomware: { label: 'Rançongiciels', short: 'Rançongiciel', source: 'RansomLook' },
  officiel: { label: 'Notifications officielles', short: 'Notification officielle', source: 'Procureurs généraux (CA, WA, OR)' },
  presse: { label: 'Presse', short: 'Presse', source: 'Presse spécialisée' },
};
export const fr = (c) => CLASS_FR[c] || c;

export const LEVELS = {
  critique: { label: 'Critique', color: 'var(--crit)' },
  eleve: { label: 'Élevé', color: 'var(--high)' },
  modere: { label: 'Modéré', color: 'var(--med)' },
  faible: { label: 'Faible', color: 'var(--low)' },
};

const L = {
  cyber: { label: 'Cybermalveillance.gouv.fr', url: 'https://www.cybermalveillance.gouv.fr/' },
  cyber17: { label: '17Cyber (assistance)', url: 'https://www.17cyber.gouv.fr/' },
  cnil: { label: 'Plainte CNIL', url: 'https://www.cnil.fr/fr/plaintes' },
  perceval: { label: 'Perceval (fraude carte)', url: 'https://www.service-public.fr/particuliers/vosdroits/R46526' },
  pharos: { label: 'Pharos (signalement)', url: 'https://www.internet-signalement.gouv.fr/' },
  spam: { label: '33700 (SMS/appels frauduleux)', url: 'https://www.33700.fr/' },
  plainte: { label: 'Plainte en ligne', url: 'https://www.service-public.fr/particuliers/vosdroits/F1435' },
  hibp: { label: 'Have I Been Pwned', url: 'https://haveibeenpwned.com/' },
  ants: { label: 'Perte/vol de papiers (ANTS)', url: 'https://ants.gouv.fr/' },
  ameli: { label: 'Fraude Ameli : bons réflexes', url: 'https://www.ameli.fr/assure/actualites' },
};

// Règles : si la fuite contient l'une des catégories `match`, la fiche s'affiche.
export const ADVICE = [
  {
    id: 'carte', priority: 1, icon: '💳', title: 'Carte bancaire exposée',
    match: ['Credit cards', 'Credit card CVV', 'Partial credit card data', 'PINs', 'Payment methods'],
    urgency: 'Immédiat',
    steps: [
      'Faites opposition à la carte (application bancaire ou serveur interbancaire 0 892 705 705) si le numéro complet ou le CVV a fuité.',
      'Vérifiez vos relevés des 3 derniers mois et activez les notifications de paiement.',
      'Signalez toute opération frauduleuse sur Perceval et demandez le remboursement à votre banque (délai : 13 mois).',
      'Méfiez-vous des faux appels « du service fraude » : votre banque ne vous demande jamais de valider une opération ou de donner un code.',
    ],
    links: [L.perceval, L.cyber17],
  },
  {
    id: 'iban', priority: 2, icon: '🏦', title: 'Coordonnées bancaires (IBAN) exposées',
    match: ['Financial sector', 'Bank account numbers', 'Account balances', 'Financial transactions', 'Loan information', 'Financial investments'],
    urgency: 'Sous 24 h',
    steps: [
      'Prévenez votre banque et demandez la liste des mandats de prélèvement SEPA actifs.',
      'Mettez en place une liste blanche/noire de créanciers autorisés si votre banque le propose.',
      'Contestez tout prélèvement inconnu : remboursement de droit sous 13 mois s’il n’a pas été autorisé.',
      'Attention aux arnaques au faux conseiller qui citent votre IBAN pour paraître crédibles.',
    ],
    links: [L.cyber, L.plainte],
  },
  {
    id: 'identite', priority: 1, icon: '🪪', title: 'Pièce d’identité / n° de sécurité sociale exposés',
    match: ['Government issued IDs', 'Passport numbers', "Driver's licenses", 'Social security numbers', 'Partial government issued IDs', 'Taxation records', 'Biometric data'],
    urgency: 'Sous 48 h',
    steps: [
      'Risque d’usurpation d’identité : surveillez l’ouverture de comptes, crédits ou abonnements à votre nom.',
      'Si une copie de vos papiers circule, déposez plainte et conservez le récépissé (utile pour contester des dettes frauduleuses).',
      'Numéro de sécurité sociale (NIR) : méfiez-vous des faux messages Ameli / carte Vitale qui réclament des paiements ou des coordonnées.',
      'Consultez votre fichier bancaire auprès de la Banque de France (FICP/FCC) en cas de doute.',
    ],
    links: [L.plainte, L.ameli, L.ants],
  },
  {
    id: 'mdp', priority: 1, icon: '🔑', title: 'Mot de passe exposé',
    match: ['Passwords', 'Historical passwords', 'Password hints', 'Auth tokens', 'Security questions and answers', 'Mothers maiden names', 'Encrypted keys'],
    urgency: 'Immédiat',
    steps: [
      'Changez le mot de passe du service concerné, et partout où vous l’avez réutilisé.',
      'Activez la double authentification (application ou clé de sécurité plutôt que SMS).',
      'Utilisez un gestionnaire de mots de passe pour avoir un mot de passe unique par site.',
      'Déconnectez les sessions actives et vérifiez les e-mails de redirection / récupération de vos comptes.',
      'Questions secrètes exposées : changez-les ou répondez par une phrase aléatoire stockée dans votre gestionnaire.',
    ],
    links: [L.cyber],
  },
  {
    id: 'crypto', priority: 1, icon: '🪙', title: 'Portefeuille crypto exposé',
    match: ['Mnemonic phrases', 'Cryptocurrency wallet addresses'],
    urgency: 'Immédiat',
    steps: [
      'Si votre phrase de récupération a fuité, transférez immédiatement vos fonds vers un nouveau portefeuille.',
      'Personne de légitime ne vous demandera jamais votre phrase de récupération.',
      'Adresse de portefeuille exposée : attention au phishing et aux colis piégés (faux portefeuilles physiques).',
    ],
    links: [L.cyber17],
  },
  {
    id: 'sante', priority: 2, icon: '🩺', title: 'Données de santé exposées',
    match: ['Health sector', 'Personal health data', 'Health insurance information', 'HIV statuses'],
    urgency: 'Sous 72 h',
    steps: [
      'Ne répondez à aucune tentative de chantage : ne payez pas, conservez les preuves et portez plainte.',
      'Méfiez-vous des sollicitations ciblées (faux remboursements, faux laboratoires, faux médecins).',
      'Vous pouvez exercer vos droits auprès de l’organisme et saisir la CNIL si l’information a été insuffisante.',
    ],
    links: [L.cnil, L.plainte],
  },
  {
    id: 'intime', priority: 2, icon: '💬', title: 'Messages privés ou données intimes exposés',
    match: ['Private messages', 'Email messages', 'Chat logs', 'SMS messages', 'Sexual orientations', 'Sexual fetishes', 'Photos', 'Audio recordings', 'AI prompts', 'Religions', 'Political views', 'Browsing histories'],
    urgency: 'Sous 72 h',
    steps: [
      'Risque de chantage (« sextorsion ») : ne payez jamais, ne répondez pas, conservez les preuves.',
      'Signalez les contenus diffusés sur Pharos et demandez leur retrait aux plateformes.',
      'Faites le point sur les informations partagées dans ces échanges (mots de passe, documents...).',
    ],
    links: [L.pharos, L.cyber17],
  },
  {
    id: 'rancon', priority: 2, icon: '🏴‍☠️', title: 'Entreprise victime d’un rançongiciel',
    match: ['Ransomware claim'],
    urgency: 'Vigilance',
    steps: [
      'Si vous êtes client, patient, salarié ou fournisseur, vos données peuvent figurer dans les fichiers volés.',
      'Changez le mot de passe de votre compte chez cette organisation et partout où vous l’avez réutilisé.',
      'Attendez-vous à des e-mails ou appels frauduleux qui se font passer pour elle (fausses factures, faux changement d’IBAN).',
      'Surveillez les courriers officiels de l’organisation : elle doit vous informer si vos données sont touchées.',
      'Ne téléchargez jamais les données publiées par les pirates : c’est illégal et souvent piégé.',
    ],
    links: [L.cyber, L.cyber17],
  },
  {
    id: 'officiel', priority: 2, icon: '🏛️', title: 'Fuite notifiée aux autorités',
    match: ['Official notification'],
    urgency: 'Sous 48 h',
    steps: [
      'Lisez la lettre de notification envoyée par l’organisation : elle précise les données touchées.',
      'Activez les services de surveillance gratuits proposés dans la lettre (surveillance de crédit, d’identité).',
      'Aux États-Unis, un gel de crédit (credit freeze) gratuit auprès des 3 bureaux de crédit bloque l’ouverture de comptes à votre nom.',
      'Vérifiez vos relevés bancaires et de remboursements santé des prochains mois.',
    ],
    links: [{ label: 'Gel de crédit (FTC)', url: 'https://consumer.ftc.gov/articles/what-know-about-credit-freezes-fraud-alerts' }, L.cyber],
  },
  {
    id: 'presse', priority: 2, icon: '📰', title: 'Fuite signalée par la presse',
    match: ['Press report'],
    urgency: 'Vigilance',
    steps: [
      'Lisez l’article pour savoir quelles données et quels clients sont concernés.',
      'Si vous avez un compte chez cette organisation, changez son mot de passe et activez la double authentification.',
      'Attendez-vous à des e-mails, SMS ou appels frauduleux qui exploitent cette fuite : ne cliquez sur aucun lien.',
      'Surveillez la communication officielle de l’organisation, qui doit informer les personnes touchées.',
    ],
    links: [L.cyber, L.cyber17],
  },
  {
    id: 'contact', priority: 3, icon: '📱', title: 'Téléphone et adresse postale exposés',
    match: ['Phone numbers', 'Physical addresses', 'Dates of birth', 'Latitude and longitude pairs', "Family members' names", 'Places of birth'],
    urgency: 'Vigilance',
    steps: [
      'Attendez-vous à des SMS et appels frauduleux (colis, amende, CPF, conseiller bancaire) : ne cliquez sur aucun lien.',
      'Transférez les SMS frauduleux au 33700.',
      'Ces données combinées facilitent l’usurpation d’identité : soyez vigilant sur les courriers inhabituels.',
    ],
    links: [L.spam, L.cyber],
  },
  {
    id: 'email', priority: 4, icon: '✉️', title: 'Adresse e-mail exposée',
    match: ['Email addresses', 'Recovery email addresses'],
    urgency: 'Vigilance',
    steps: [
      'Attendez-vous à du phishing personnalisé citant le service touché : vérifiez toujours l’expéditeur.',
      'Ne communiquez jamais d’identifiants via un lien reçu par e-mail ; passez par le site officiel.',
      'Utilisez des alias e-mail par service pour limiter l’impact des prochaines fuites.',
    ],
    links: [L.hibp, L.cyber],
  },
];

export function adviceFor(classes) {
  const set = new Set(classes);
  return ADVICE.filter((a) => a.match.some((m) => set.has(m))).sort((a, b) => a.priority - b.priority);
}
