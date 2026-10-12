# Décisions

Choix structurants, avec l'alternative écartée et la raison. Chacun est réversible, sauf mention contraire.

| # | Décision | Alternative écartée | Pourquoi |
|---|---|---|---|
| 1 | Un compte = un cabinet ou un remplaçant, plus une table de membres pour le multi-utilisateur | Tables séparées pour les cabinets et les profils | Correspondance directe avec le modèle de l'interface : les écrans ne changent pas |
| 2 | Sécurité dans Postgres : RLS forcée, droits par colonne, déclencheurs « garde », fonctions `security definer` | API intermédiaire à héberger | Pas de serveur supplémentaire ; règles impossibles à contourner depuis le client |
| 3 | Synchronisation par **différence d'état** (`mapping.ts`) | Réécrire chaque action en appel d'API | Environ 300 lignes au lieu de toucher chaque action et chaque écran, testable sans réseau. Limite : écritures non transactionnelles |
| 4 | Connexion par **code à 6 chiffres** envoyé par email | Lien magique ou mot de passe | Un lien ouvert depuis une messagerie puis dans un autre navigateur perd son contexte ; pas de mot de passe à oublier |
| 5 | Démonstration locale conservée même en mode comptes réels (« Essayer sans compte », liens directs) | Démonstration sur une base partagée | Premier contact en dix secondes, sans polluer la base réelle |
| 6 | Essai de **14 jours sans carte**, géré dans l'application puis reporté chez le prestataire de paiement | Essai avec carte dès l'inscription | Friction minimale ; s'abonner tôt ne fait rien perdre |
| 7 | Un paiement en retard garde l'accès pendant les relances | Coupure immédiate | Ne pas bloquer un cabinet en pleine saison pour une carte expirée |
| 8 | Fiche de passation conservée 90 jours après la fin du remplacement, journal d'accès un an | 30 jours et 6 mois | Réutiliser la fiche au remplacement suivant ; durée courante pour un journal de sécurité |
| 9 | Compte supprimé **anonymisé** s'il a des contrats | Suppression totale | Le contrat reste une preuve pour l'autre partie pendant la durée de prescription |
| 10 | Contrôles d'éligibilité **rejoués à la signature** côté serveur | Contrôle à la candidature seulement | Ne pas bloquer un remplaçant qui renouvelle son assurance entre-temps ; bloquer l'acte engageant |
| 11 | Pages légales en Markdown dans `legal/`, rendues dans l'application | HTML codé en dur | Un juriste corrige directement le fichier |
| 12 | Production déployée **à la main** avec confirmation explicite | Déploiement automatique à chaque fusion | Éviter qu'un changement parte en ligne sans relecture |
| 13 | Prévisualisations sur Cloudflare Pages (inactives sans accès configurés) | Vercel ou Netlify | Gratuit avec usage commercial autorisé, bande passante illimitée, en-têtes de sécurité via `_headers` |
| 14 | Pas de montée de version majeure de Vite | Mise à jour forcée des dépendances | La faille ne touche que le serveur de développement ; une version majeure ajoute un risque de régression sans bénéfice produit |
| 15 | ~~Pas de reformatage global~~ **Remplacée** : Prettier sur tout le code, contrôlé par la CI | Formatage à la main | Des lignes dépassaient 400 caractères ; le commit de mise en forme est ignoré par `git blame` (`.git-blame-ignore-revs`) |
| 16 | Application produite en **un seul fichier HTML**, SDK Supabase inclus même en démonstration | Chargement différé du SDK | Le build en fichier unique empêche le découpage ; le total reste sous le budget de taille |
| 17 | **Aucune donnée de santé hébergée au lancement** (scénario A) | Hébergement certifié dès la première version | Voir [Sécurité et données](securite-et-donnees.md) ; réversible en une ligne |
| 18 | Production sur un hébergement mutualisé avec en-têtes de sécurité ; GitHub Pages en secours | GitHub Pages en production | Les conditions de GitHub Pages excluent l'usage commercial d'un service ; l'hébergement mutualisé permet les en-têtes de sécurité |
| 19 | **Valider auprès d'utilisateurs avant d'investir dans de nouvelles fonctions**, avec un parcours de test unique | Mener tous les chantiers en parallèle | Base, paiement et relecture juridique restent prêts mais ne se déclenchent qu'à la suite des retours ([protocole](tests-utilisateurs.md)) |
| 20 | ~~Démonstration en cinq blocs~~ **Abandonnée** (commit `b74ab8e`) | — | Trop de retours demandés : le Lot 1 se réduit à l'annonce WhatsApp |
| 21 | Annonce d'absence **partagée par lien WhatsApp, sans serveur** : les dates et le nom du cabinet voyagent dans l'adresse | API WhatsApp Business ; annonce stockée en base | Aucun coût ni donnée stockée pour tester le palier 1. Limite : Relève ne voit pas les réponses, donc aucun décompte |
| 22 | ~~Conditionnement testé dans la démonstration~~ **Abandonnée** | — | Voir 24 |
| 23 | **Supabase conservé** pour la version payante, à deux conditions avant la première donnée réelle : offre Pro et serveur SMTP dédié | Firebase, PocketBase auto-hébergé, Postgres géré avec API maison | Données relationnelles (contrats, rétrocessions) dont les règles d'accès vivent dans la base, avec connexion par code, sauvegardes et fonctions serveur déjà là. Sortie possible : le SQL est du Postgres standard (la CI le fait tourner sur un Postgres nu avec 60 lignes de simulation) et le SDK tient en 500 lignes (`src/lib/cloud`). **Critères d'abandon** proposés : exigence d'hébergement certifié santé, code de connexion livré à moins de 95 % en boîte de réception, coût mensuel de l'infrastructure supérieur à 5 % du chiffre d'affaires récurrent |

| 24 | **Lot 1 = annonce WhatsApp gratuite**, sans compte ni serveur ; le produit complet reste derrière un drapeau de build | Démonstration complète pour tous ; compte obligatoire | Solidité sur un seul geste avant d'investir ; base et paiement se préparent pour le palier payant |

## Questions ouvertes

| Sujet | Options |
|---|---|
| Ordre des paliers de livraison | Voir [Produit](produit.md) ; à arbitrer avec les retours d'utilisateurs |
| Politique tarifaire | Abonnement unique, forfait saisonnier ou modèle par paliers ([Modèle économique](modele-economique.md)) |
| Frontière gratuit / Premium | Annonce WhatsApp gratuite seule (hypothèse de la démonstration), avec ou sans limite d'annonces par an, ou essai du tout pendant 14 jours |
| Plan de la base de données pour les pilotes | Recommandé : gratuit tant qu'aucun utilisateur réel n'y est (pause après 7 jours d'inactivité, pas de sauvegarde), puis Pro (environ 25 $ par mois) dès la première donnée réelle |
| Entité qui facture | Société existante ou à créer |
| Relecture juridique | Avant le premier client payant (conditions d'utilisation, confidentialité, modèle de contrat) |
| Mois offerts par parrainage après souscription | Créditer le solde de l'abonné, ou les limiter à la période d'essai |
| Motif d'absence du titulaire | Afficher « Absence » côté remplaçant plutôt que « Maladie » ou « Maternité » |
| Visibilité de l'annuaire des remplaçants | Tous les membres connectés, le département et ses voisins, ou les cabinets abonnés |