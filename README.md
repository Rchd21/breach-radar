# Breach Radar

Site public de suivi des fuites de données mondiales rendues publiques sur les **6 derniers mois** (fenêtre glissante, recalculée à chaque mise à jour ; modifiable avec la variable `WINDOW_MONTHS`) :

- **Trois types de sources**, filtrables : fuites confirmées (Have I Been Pwned), victimes revendiquées par les groupes de rançongiciels (RansomLook), notifications officielles aux procureurs généraux de Californie et de Washington.
- **Score de criticité 0-100** pour chaque fuite (Critique / Élevé / Modéré / Faible), avec le détail du calcul.
- **Carte mondiale** des organisations touchées, filtrable par niveau et par période.
- **Conseils d’action** adaptés aux données exposées (carte bancaire, IBAN, pièce d’identité, mot de passe, santé…), avec les contacts utiles en France.
- **Suis-je concerné ?** : surveillance de vos services (stockée dans le navigateur), test anonyme de mot de passe (k-anonymat), liens HIBP / Mozilla Monitor.
- **Actualités en direct** : DataBreaches.net, ZATAZ, BleepingComputer, The Hacker News, The Register, alertes CERT-FR.
- **Flux RSS** `feed.xml` des fuites critiques et élevées.

Site 100 % statique, sans dépendance npm, sans clé d’API, sans base de données.

## Lancer en local

Node.js 20 ou plus :

```bash
npm run dev
```

Puis ouvrir http://localhost:8080. `npm run fetch` régénère seulement les données.

## Déploiement automatique (GitHub Pages)

1. Créez un dépôt sur GitHub, puis poussez le projet :
   ```bash
   git init -b main
   git add .
   git commit -m "Breach Radar"
   git remote add origin https://github.com/<vous>/breach-radar.git
   git push -u origin main
   ```
2. Dans le dépôt : **Settings → Pages → Source : GitHub Actions**.
3. Le workflow `.github/workflows/deploy.yml` collecte les données et publie le site à chaque push, **toutes les 3 heures**, ou à la demande (onglet Actions → *Run workflow*).

Le site est servi à `https://<vous>.github.io/breach-radar/`.

> GitHub suspend les workflows planifiés d’un dépôt sans activité depuis 60 jours : un clic sur *Enable workflow* dans l’onglet Actions les réactive.

Autres hébergeurs (Netlify, Cloudflare Pages, Vercel) : commande de build `node scripts/fetch-data.mjs`, dossier publié `public`, et un « deploy hook » appelé par un cron pour rafraîchir les données.

## Structure

```
scripts/fetch-data.mjs     collecte HIBP, RansomLook, CA, WA + flux RSS → public/data/*.json, public/feed.xml
scripts/lib/score.mjs      calcul du score de criticité
scripts/lib/countries.mjs  localisation (siège connu, domaine national, description)
public/                    le site (index.html, assets/)
```

## Méthode

**Score (fuites confirmées)** = sensibilité de la donnée la plus critique (≤ 50, +20 % des suivantes) + volume (≤ 25, échelle logarithmique) + récence (≤ 15) ± indicateurs (logiciel espion +8, fuite sensible +5, non vérifiée −5, fabriquée −15, liste de spam −5).

**Score (rançongiciels)** = vol revendiqué (32) + taille annoncée en Go/To (jusqu’à 25, 6 si inconnue) + récence + secteur santé (+8) ou financier (+5) − 5 (non confirmé).

**Score (notifications officielles)** = secteur (santé 40, finance 35, public 30, éducation 28, autre 27) + personnes touchées (8 si non publié) + récence + 5 si rançongiciel ou malware.

**Localisation** : Les sources ne fournissent pas toujours de pays (les notifications officielles sont placées aux États-Unis). Il est estimé à partir d’une table des grands services, du domaine national (.fr, .de…) puis de la description. Environ 40 % des fuites sont localisées ; les autres restent visibles dans la liste (« Non localisé »). Compléter `DOMAIN_OVERRIDES` améliore la carte.

## Sources et licence des données

- Fuites confirmées : [Have I Been Pwned](https://haveibeenpwned.com/) — CC BY 4.0, attribution affichée sur le site.
- Rançongiciels : [RansomLook](https://www.ransomlook.io/) (projet AGPL-3.0). Ce sont des revendications non confirmées ; les liens et adresses e-mail des descriptions sont retirés, aucun renvoi vers les sites des groupes.
- Notifications officielles : [procureur général de Californie](https://oag.ca.gov/privacy/databreach/list) (export CSV) et [État de Washington](https://data.wa.gov/) (API open data). Les notifications des deux États pour une même organisation sont fusionnées.
- Une source indisponible est ignorée sans bloquer la mise à jour ; le déploiement est annulé si toutes échouent.
- Vérification de mot de passe : [Pwned Passwords](https://haveibeenpwned.com/Passwords) (seuls 5 caractères du hash SHA-1 sont envoyés).
- Aucune donnée personnelle issue des fuites n’est hébergée.
