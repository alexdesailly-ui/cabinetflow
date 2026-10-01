# Rapport d'autonomie : Relève (1er octobre 2026)

PR : **https://github.com/alexdesailly-ui/cabinetflow/pull/1** (brouillon, branche `ccr-e70710f7-d7tk7n` → `main`)

**En une phrase** : le backend sécurisé, la facturation et la CI sont prêts mais **non branchés**. Il faut votre feu vert et environ 1 h 30 (comptes Supabase, Stripe, avocat) pour passer de la démo à une vraie version multi-appareils.

## Plan de travail

- [x] 1. État des lieux → `ETAT_DES_LIEUX.md`
- [x] 2. Données de santé → `DONNEES_SANTE.md` + socle commun implémenté
- [x] 3. Architecture BDD → migrations, `SCHEMA.md`, seed, tests d'isolation
- [x] 4. Stripe (test) → Edge Functions + `STRIPE.md`
- [x] 5. Qualité et sécurité → lint, tests, CSP, quotas, gitleaks, `REVUE_CODE_BRIEF.md`
- [x] 6. Prêt à livrer → CI/CD, onboarding, `/legal`, README
- [x] 7. Économie → `COUTS.md`

## 1. Fait / Non fait / Bloqué

| Chantier | Statut | Détail | Fichiers |
|---|---|---|---|
| État des lieux, `npm audit`, couverture | ✅ Fait | Couverture 0 % au départ. Une démo partageable existait déjà | `ETAT_DES_LIEUX.md` |
| Schéma Supabase, RLS sur 100 % des tables | ✅ Fait | Migrations rejouables (testées deux fois de suite) | `supabase/migrations/*` |
| Tests d'isolation entre cabinets | ✅ Fait | 140 assertions (matrice 4×4 des cabinets × 10 tables), 225 au total | `supabase/tests/*` |
| Chiffrement, audit, rétention, export et suppression RGPD | ✅ Fait | Fiche AES-256 via Vault, purge `pg_cron` | `…0300_donnees_sensibles_rgpd.sql` |
| Règles métier côté serveur | ✅ Fait | Autorisation, RCP, 2 remplacements simultanés, signature, parrainage, gating | `…0200_securite_rls.sql` |
| Seed fictif réaliste | ✅ Fait | Le monde de la démo, avec contrats historiques cohérents | `supabase/seed.sql` |
| Front branché sur Supabase (mode cloud) | ✅ Fait, ⚠️ non testé en réel | Testé en unitaire et en rendu ; jamais connecté à un vrai projet | `src/lib/cloud/*` |
| Stripe Checkout, Portal, Webhook (test) | ✅ Fait, ⚠️ non exécuté | Typage Deno OK, logique testée ; aucun compte Stripe | `supabase/functions/*` |
| Lint, typage strict, 40 tests unitaires | ✅ Fait | Un vrai bug corrigé (hook React conditionnel) | `eslint.config.js`, `src/lib/__tests__` |
| Scan des secrets dans l'historique | ✅ Fait | Aucun secret trouvé ; gitleaks ajouté en CI | `.gitleaks.toml` |
| En-têtes de sécurité, CSP, quotas, validation des entrées | ✅ Fait | Contraintes SQL, validation dans les Edge Functions | `public/_headers`, `index.html` |
| CI sur chaque PR | ✅ Fait, ⏳ 1re exécution sur la PR | | `.github/workflows/ci.yml` |
| Preview automatique | 🟡 Prête, inactive | Attend les secrets Cloudflare | `preview.yml` |
| Prod manuelle uniquement | ✅ Fait | Confirmation `DEPLOYER` exigée | `pages.yml` |
| Onboarding < 2 min, parcours démo, aperçu WhatsApp | ✅ Fait | `?demo=cabinet`, image `og.png`, case CGU | `src/screens/*`, `public/og.png` |
| Mentions légales, confidentialité, CGU | ✅ Brouillons | « À valider par avocat » | `legal/*.md` |
| Coûts, prix, benchmark | ✅ Fait | Prix concurrents non publics ou inaccessibles | `COUTS.md` |
| Projet Supabase, compte Stripe, domaine, Cloudflare | ⛔ Non fait | Ressources externes : votre validation est requise | — |
| Tests E2E navigateur, notifications email/SMS | ❌ Non fait | Hors MVP WhatsApp | — |
| Montée Vite 5 → 8 | ❌ Reporté | La faille ne touche que le serveur de dev | `DECISIONS.md` #14 |

## 2. Décisions prises seul (détail : `DECISIONS.md`, 19 entrées)

| Décision | Alternative écartée |
|---|---|
| Scénario A (aucune donnée patient), imposé par le serveur, réversible en 1 ligne | B : HDS dès la V1 |
| Sécurité dans Postgres (RLS, privilèges par colonne, triggers, RPC) | API Node intermédiaire |
| Synchro par différence d'état : écrans inchangés | Réécrire chaque action en appel API |
| Connexion par code à 6 chiffres (survit au passage WhatsApp → Mail) | Lien magique, mot de passe |
| Essai 14 j sans carte, reporté dans Stripe | Essai Stripe avec carte d'entrée |
| Prod GitHub Pages manuelle, previews Cloudflare | Déploiement auto sur `main`, Vercel (usage commercial interdit en gratuit) |
| Branche imposée par l'environnement (`ccr-…`) | `autonomie/2026-10-01` |

## 3. Ce qui requiert VOUS (QCM, classé par impact sur la sortie WhatsApp)

### Lot 1 : bloquant pour une V1 multi-appareils

**Q1. Quelle version partager cette semaine ?**
- a) La démo actuelle + `?demo=cabinet`, sans compte réel, disponible dès la fusion *(recommandé pour les 10 entretiens)*
- b) La version cloud avec vrais comptes (≈ 1 h de configuration, voir Q2)
- c) Les deux : démo pour découvrir, cloud pour 3 collègues pilotes
- d) Autre

**Q2. Projet Supabase ?**
- a) Free pour la phase pilote (0 €, pause après 7 j d'inactivité, pas de sauvegarde)
- b) Pro dès maintenant (≈ 23 €/mois, sauvegardes) *(recommandé dès qu'une vraie donnée entre)*
- c) Autre

**Q3. Données de santé ?**
- a) Scénario A : aucune liste de patients, elle reste dans le logiciel de facturation *(recommandé)*
- b) Scénario B : HDS dès la V1 (≈ 25–35 j + 8–20 k€ la 1re année)
- c) A maintenant, B si 30 cabinets la demandent
- d) Autre

**Q4. Fusionner la PR #1 ?**
- a) Oui, après lecture du brief de revue
- b) Après la revue du développeur de votre réseau *(recommandé : `REVUE_CODE_BRIEF.md` est prêt à lui envoyer)*
- c) Autre

### Lot 2 : avant le premier euro

**Q5. Prix de lancement ?**
- a) 29 €/mois ou 290 €/an *(recommandé)*
- b) 19 €/mois ou 190 €/an
- c) 39 € par contrat signé, sans abonnement
- d) Forfait saisonnier « été » 99 € (mars–septembre)
- e) Autre

**Q6. Entité qui facture ?**
- a) Société existante (SIREN : ___)
- b) Micro-entreprise à créer
- c) SAS/SASU à créer
- d) Autre

**Q7. Relecture juridique (CGU, confidentialité, modèle de contrat) ?**
- a) Avocat santé/numérique, forfait 1–2 k€ *(recommandé avant le 1er client payant)*
- b) Juriste de votre réseau
- c) Plus tard (pilote gratuit uniquement)
- d) Autre

**Q8. Mois offerts par parrainage après souscription ?**
- a) Crédit sur le solde Stripe (−29 € par mois offert, 0,5 j de dev)
- b) Uniquement avant paiement (comme aujourd'hui)
- c) Autre

### Lot 3 : produit et confort

**Q9. Motif « Maladie / Maternité » du titulaire, visible des candidats ?**
- a) Afficher « Absence » côté remplaçant *(recommandé, 15 min)*
- b) Laisser tel quel
- c) Autre

**Q10. Annuaire : qui voit les profils des remplaçants ?**
- a) Tout membre connecté (actuel)
- b) Seulement les cabinets du même département et des départements voisins
- c) Seulement les cabinets abonnés
- d) Autre

**Q11. Previews de PR ?**
- a) Cloudflare Pages (créer le compte, 2 secrets GitHub) *(recommandé)*
- b) Pas de preview
- c) Autre

**Q12. Domaine ?**
- a) releve-idel.fr ou équivalent (≈ 10 €/an)
- b) Rester sur github.io pour le pilote
- c) Autre

## 4. Vos 5 prochaines actions (≤ 1 h chacune)

1. **D'ici vendredi, 20 min** : lire `DONNEES_SANTE.md` §5 et `COUTS.md` §5, puis répondre à Q1, Q3 et Q5 en commentaire de la PR #1.
2. **D'ici lundi, 15 min** : envoyer `REVUE_CODE_BRIEF.md` et le lien de la PR #1 au développeur de votre réseau, avec un retour demandé sous 7 jours.
3. **Cette semaine, 30 min** : créer un compte d'essai chez Infizen, IDHELP et App'Ines, et noter dans `COUTS.md` leur prix réel et ce qu'ils font du contrat et de la rétrocession. Le contrat en ligne n'est plus un différenciateur.
4. **Cette semaine, 45 min** : envoyer `…/cabinetflow/?demo=cabinet` (après fusion) à 5 titulaires sur WhatsApp et obtenir 3 avis via « Donner mon avis », avec la question « pour quelle étape paieriez-vous ? ».
5. **Dans 10 jours, 1 h** (si Q1 = b ou c) : créer le projet Supabase (UE), puis suivre le README §« Mettre en ligne le mode cloud » et `STRIPE.md` §1 en mode test. Résultat attendu : un compte réel créé par code email sur deux téléphones.

## 5. Risques résiduels

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Le mode cloud n'a jamais tourné contre un vrai Supabase (Auth, Vault, `delete from auth.users`) | Moyenne | Élevé | Recette de 1 h (action 5) avant tout partage ; tests SQL déjà au vert sur Postgres 16 |
| Synchro non transactionnelle (`retenir` = plusieurs requêtes) | Faible | Moyen | Rechargement automatique après erreur ; RPC transactionnelles si la revue le demande |
| Un utilisateur saisit un patient dans les consignes en texte libre | Moyenne | Élevé (HDS) | CGU, avertissements à l'écran ; détection automatique non faite (0,5 j) |
| Concurrence (Infizen fait déjà le contrat signé en ligne) | **Élevée** | Élevé | Recentrer sur les contrôles bloquants, la rétrocession, la réputation portable ; vérifier les prix (action 3) |
| CI jamais exécutée sur GitHub (seulement en local) | Moyenne | Faible | Première exécution sur la PR #1 ; corriger si elle est rouge |
| Brouillons juridiques non validés | Certaine | Élevé si payant | Pas de client payant avant Q7 |
| Annuaire lisible par tout inscrit (aspiration des noms et villes) | Faible | Moyen | Q10 |
| Fichier unique avec `'unsafe-inline'` dans la CSP | Faible | Moyen | Pas de contenu HTML utilisateur rendu ; aucun `innerHTML` dans le code |
