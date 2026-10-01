# Relève

**Le remplacement infirmier libéral, sans la charge mentale.**

Relève est une application SaaS destinée aux cabinets infirmiers libéraux (IDEL). Elle ne se contente pas de publier une annonce de remplacement : elle vérifie le remplaçant, calcule la rétrocession, génère le contrat conforme, rappelle la transmission à l'Ordre, structure la passation de tournée et suit les reversements. Le parrainage est réciproque et plafonné ; l'accès prioritaire aux bons remplaçants se gagne par la fiabilité, pas par le recrutement. Les guides visuels tiennent en une ligne, une seule fois.

Le raisonnement marché, le modèle économique et la mécanique virale sont détaillés dans [CONCEPT.md](CONCEPT.md).

## Tester

**En ligne : https://cabinetflow.fr** (Hostinger) — lien direct pour WhatsApp : `https://cabinetflow.fr/?demo=cabinet` (ou `?demo=remplacant`).

Deux modes, choisis au build :

| Mode | Activé si | Données |
|---|---|---|
| **Démo** (par défaut) | aucune variable | Dans le navigateur (`localStorage`), monde fictif pré-chargé |
| **Cloud** | `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` définis | Supabase (comptes réels, RLS) ; la démo reste accessible sans compte |

## Installation

```bash
npm ci
cp .env.example .env.local   # facultatif : uniquement pour le mode cloud
npm run dev                  # http://localhost:5173
```

| Commande | Rôle |
|---|---|
| `npm run check` | lint + types + tests unitaires + build (ce que fait la CI) |
| `npm test` | Vitest : domaine, actions, synchronisation, logique Stripe |
| `npm run test:db` | Postgres jetable : migrations ×2, seed, tests RLS/isolation/RGPD (`DATABASE_URL` facultatif) |
| `npm run build` | `dist/index.html` autonome |
| `bash scripts/og/generer.sh` | Régénère l'image d'aperçu WhatsApp `public/og.png` |

## Variables d'environnement

| Variable | Où | Secret ? |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Front (`.env.local`, variables de dépôt GitHub) | Non (clé publique, protégée par la RLS) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MENSUEL`, `STRIPE_PRICE_ANNUEL`, `APP_URL` | Secrets Supabase (`supabase secrets set`) | **Oui** |
| `STRIPE_LIVE_AUTORISE` | Secrets Supabase | `oui` seulement après validation du passage en live |
| Secret Vault `releve_cle_donnees` (≥ 32 caractères) | Supabase → Vault | **Oui** (chiffrement des fiches) |

## Mettre en ligne le mode cloud (≈ 30 min, voir aussi `STRIPE.md`)

1. Créer un projet Supabase, région **UE** (Francfort ou Paris).
2. `supabase link --project-ref <ref>` puis `supabase db push` (migrations de `supabase/migrations`). **Ne pas** exécuter `seed.sql` en production.
3. Vault : créer le secret `releve_cle_donnees` (`openssl rand -base64 48`).
4. Vérifier dans Database → Cron que la tâche `releve-purge` existe (créée par la migration si `pg_cron` est disponible ; sinon activer l'extension et relancer `supabase db push`).
5. Auth → Email : connexion par OTP, longueur 6 ; modèle « Magic Link » avec `{{ .Token }}` (voir `supabase/templates/code.html`) ; **SMTP personnalisé** (Resend…) indispensable au-delà de quelques emails par heure.
6. Auth → URL Configuration : URL du site = URL de la prod.
7. GitHub → Settings → Variables : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
8. Actions → « Déployer la prod (Hostinger) » → Run workflow → taper `DEPLOYER`.

## Déploiement

| Quoi | Quand | Comment |
|---|---|---|
| CI (`ci.yml`) | Chaque PR et push sur `main` | Lint, types, tests, build, budget de taille, tests SQL, typage Deno, scan de secrets |
| Preview (`preview.yml`) | Chaque PR | Cloudflare Pages, actif dès que les secrets `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID` existent |
| Prod (`deploy-hostinger.yml`) | **Manuel uniquement** | Actions → « Déployer la prod (Hostinger) », confirmation `DEPLOYER`, branche `main` → https://cabinetflow.fr (FTP, secret `FTP_PASS` ; en-têtes de sécurité dans `public/.htaccess`) |
| Secours (`pages.yml`) | Manuel uniquement | GitHub Pages, à n'utiliser que si Hostinger est indisponible (conditions GitHub : pas d'usage SaaS commercial) |

## Architecture

```
src/
  lib/
    types.ts        modèle métier (vocabulaire IDEL)
    domain.ts       calculs : rétrocession, conformité des pièces, contrôles d'affectation, paliers
    gamification.ts badges et « jours de repos sécurisés »
    contrat.ts      génération du contrat de remplacement
    store.ts        état + sélecteurs ; mode démo (localStorage) ou cloud (cache mémoire)
    actions.ts      toutes les écritures
    cloud/          Supabase : config, auth (OTP), mapping (diff → requêtes), sync
    seed.ts         monde de démonstration
    router.ts       routage par hash
  screens/          un fichier par écran (dont Connexion, Legal)
supabase/
  migrations/       schéma, RLS, chiffrement, RGPD, Stripe (rejouables)
  functions/        Edge Functions Stripe (Deno)
  tests/            tests SQL (isolation entre cabinets, règles métier, RGPD)
  seed.sql          données fictives
legal/              brouillons mentions légales, confidentialité, CGU (à valider par avocat)
```

Documents : `ETAT_DES_LIEUX.md`, `DONNEES_SANTE.md`, `SCHEMA.md`, `STRIPE.md`, `COUTS.md`, `REVUE_CODE_BRIEF.md`, `DECISIONS.md`, `AUTONOMIE_RAPPORT.md`.

## Ce qui n'est pas encore fait

- **Vérification documentaire** : les pièces sont déclarées, pas contrôlées (pièce jointe, annuaire RPPS).
- **Signature électronique qualifiée** : signature simple (nom saisi, date posée par le serveur).
- **Notifications** : email/SMS à la publication, à l'expiration d'une pièce, à l'échéance de rétrocession.
- **Tests de bout en bout** dans un navigateur.

## Avertissement

Démonstration : aucune donnée réelle de patient ne doit y être saisie. Les montants de rétrocession sont des estimations et non un calcul fiscal ; le contrat est un modèle de travail à relire, pas un conseil juridique.
