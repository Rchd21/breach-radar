# Breach Radar

Site public de suivi des fuites de données mondiales rendues publiques sur les **6 derniers mois** (fenêtre glissante, recalculée à chaque mise à jour ; modifiable avec la variable `WINDOW_MONTHS`) :

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
scripts/fetch-data.mjs     collecte HIBP + flux RSS → public/data/*.json, public/feed.xml
scripts/lib/score.mjs      calcul du score de criticité
scripts/lib/countries.mjs  localisation (siège connu, domaine national, description)
public/                    le site (index.html, assets/)
```

## Méthode

**Score** = sensibilité de la donnée la plus critique (≤ 50, +20 % des suivantes) + volume (≤ 25, échelle logarithmique) + récence (≤ 15) ± indicateurs (logiciel espion +8, fuite sensible +5, non vérifiée −5, fabriquée −15, liste de spam −5).

**Localisation** : Have I Been Pwned ne fournit pas de pays. Il est estimé à partir d’une table des grands services, du domaine national (.fr, .de…) puis de la description. Environ la moitié des fuites récentes sont localisées ; les autres restent visibles dans la liste (« Non localisé »). Compléter `DOMAIN_OVERRIDES` améliore la carte.

## Sources et licence des données

- Fuites : [Have I Been Pwned](https://haveibeenpwned.com/) — CC BY 4.0, attribution affichée sur le site.
- Vérification de mot de passe : [Pwned Passwords](https://haveibeenpwned.com/Passwords) (seuls 5 caractères du hash SHA-1 sont envoyés).
- Aucune donnée personnelle issue des fuites n’est hébergée.
