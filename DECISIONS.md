# Décisions prises en autonomie (1er octobre 2026)

Chaque décision est réversible. Format : décision → alternative écartée → pourquoi.

| # | Décision | Alternative écartée | Pourquoi |
|---|---|---|---|
| 1 | Travail sur la branche `ccr-e70710f7-d7tk7n` (imposée par l'environnement) + PR vers `main` | Branche `autonomie/2026-10-01` | L'environnement n'autorise le push que sur cette branche. Renommage possible à la fusion. |
| 2 | **Scénario A** (aucune donnée de santé) appliqué par défaut, côté serveur, via un paramètre | Scénario B dès la V1 | Voir `DONNEES_SANTE.md`. Bascule = une ligne SQL. |
| 3 | Modèle « un compte = un cabinet ou un remplaçant » + `compte_membres` pour le multi-utilisateur | Tables séparées `cabinets` / `profils` | Correspondance 1:1 avec `types.ts` : les écrans ne changent pas. |
| 4 | Synchronisation par **différence d'état** (`mapping.ts`) | Réécrire `actions.ts` en appels API | ~300 lignes au lieu de toucher chaque action et chaque écran ; testable sans réseau. Limite : pas transactionnel (voir brief de revue). |
| 5 | Sécurité **dans Postgres** (RLS forcée, GRANT par colonne, triggers garde, RPC) | API Node intermédiaire | Pas de serveur à héberger, règles impossibles à contourner depuis le client. |
| 6 | Connexion par **code à 6 chiffres** (OTP email) | Lien magique / mot de passe | Le lien ouvert depuis WhatsApp puis Mail change de navigateur et perd le contexte ; pas de mot de passe à oublier. |
| 7 | Démo locale conservée même en build cloud (bouton « Essayer sans compte », `?demo=cabinet`) | Démo sur base partagée | Premier contact en 10 s, sans pollution de la base réelle. |
| 8 | Essai **sans carte** de 14 j (+ mois offerts) géré dans l'app, reporté dans Stripe au Checkout | Essai Stripe avec carte dès l'inscription | Friction minimale pour un lien WhatsApp ; s'abonner tôt ne fait rien perdre. |
| 9 | `past_due` garde l'accès pendant les relances Stripe | Coupure immédiate | Ne pas bloquer un cabinet en pleine saison pour une carte expirée. |
| 10 | Fiche de passation conservée 90 j après la fin, journal 1 an | 30 j / 6 mois | Permet de réutiliser la fiche au remplacement suivant ; 1 an = recommandation CNIL pour les journaux. |
| 11 | Compte supprimé **anonymisé** s'il a des contrats | Suppression totale | Le contrat est une preuve pour l'autre partie (prescription 5 ans). |
| 12 | Déploiement prod GitHub Pages **manuel** avec confirmation « DEPLOYER » | Push sur `main` = prod | Demandé ; évite qu'une fusion parte en ligne. |
| 13 | Previews de PR sur **Cloudflare Pages** (inactives sans secrets) | Vercel / Netlify | Gratuit avec usage commercial autorisé (Vercel Hobby l'interdit), bande passante illimitée, en-têtes `_headers`. |
| 14 | Pas de montée de version Vite 5 → 8 | `npm audit fix --force` | La faille ne touche que le serveur de dev ; montée majeure = risque de régression sans bénéfice pour la démo. |
| 15 | Pas de reformatage Prettier du code existant | Prettier sur tout le dépôt | Diff illisible pour le relecteur. ESLint seul. |
| 16 | supabase-js inclus dans le bundle même en démo (166 Ko gzip) | Chargement différé | Le build en fichier unique empêche le découpage ; 166 Ko restent sous le budget CI de 250 Ko. |
| 17 | Contrôles d'éligibilité (autorisation, RCP, 2 remplacements) **rejoués au moment de signer** côté serveur | Contrôle à la candidature | On ne bloque pas un remplaçant qui renouvelle sa RCP entre-temps ; on bloque l'acte engageant. |
| 18 | Pages légales en Markdown dans `/legal`, rendues dans l'app (`#/legal/…`) | HTML codé en dur | L'avocat corrige directement le fichier. |
| 19 | Aucune ressource externe créée (projet Supabase, Stripe, Cloudflare, domaine) | Créer un projet Supabase gratuit | Hors périmètre autorisé ; tout est prêt à brancher (README). |
