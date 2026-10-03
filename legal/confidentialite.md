# Politique de confidentialité

> **BROUILLON — À valider par avocat.** Rédigée pour le scénario A de `DONNEES_SANTE.md` (aucune donnée de santé hébergée). À réécrire si le scénario B est retenu.

## Qui est responsable de vos données ?

[Raison sociale de l'éditeur], [adresse], joignable à [email RGPD], est responsable du traitement des données collectées par Relève.

## Quelles données, pour quoi faire, sur quelle base ?

| Données | Finalité | Base légale | Durée de conservation |
|---|---|---|---|
| Identité, email, téléphone, ville, code postal | Créer et gérer votre compte, vous mettre en relation | Exécution du contrat (CGU) | Durée du compte, puis suppression ou anonymisation |
| Profil professionnel (soins maîtrisés, rayon, disponibilités, expérience) | Apparaître dans le vivier des cabinets | Exécution du contrat | Durée du compte |
| Dossier de confiance (n° RPPS, autorisation de remplacement, RCP…) | Vérifier qu'un remplacement est possible | Exécution du contrat ; intérêt légitime de sécurité des remplacements | Durée du compte |
| Contrats, signatures simples, suivi de rétrocession | Preuve de l'accord entre confrères | Exécution du contrat ; obligation légale de conservation | 5 ans après la fin du remplacement (prescription), sous forme anonymisée si vous supprimez votre compte |
| Fiche de passation (consignes logistiques, accès cabinet) | Organiser la continuité des soins | Exécution du contrat | 90 jours après la fin du remplacement, puis suppression automatique |
| Recommandations | Réputation professionnelle vérifiée | Exécution du contrat | Durée du compte de leur auteur |
| Abonnement et facturation (via Stripe) | Gérer le paiement | Exécution du contrat ; obligation comptable | 10 ans pour les pièces comptables |
| Journal d'accès | Sécurité, traçabilité des accès | Intérêt légitime ; obligation de sécurité (art. 32 RGPD) | 1 an |

**Aucune donnée de santé de patient n'est collectée** : la liste des patients d'une tournée reste dans votre logiciel métier. Ne saisissez jamais de nom de patient ni d'information médicale dans Relève.

## Qui voit vos données ?

- Les autres membres connectés voient votre **profil public** (prénom, nom, ville, profil professionnel, statut de vos pièces), jamais votre email, téléphone ni les références de vos pièces.
- Votre email, votre téléphone et vos références ne sont visibles que des confrères avec qui vous avez une **candidature ou un contrat**.
- Sous-traitants : Supabase (hébergement, région [UE]), [Vercel ou GitHub] (application), Stripe (paiement), [fournisseur d'email]. [Préciser les garanties de transfert hors UE : clauses contractuelles types / Data Privacy Framework.]
- Aucune donnée n'est vendue ni utilisée à des fins publicitaires.

## Sécurité

Chiffrement des échanges (HTTPS), cloisonnement strict des données par compte au niveau de la base (Row Level Security), chiffrement au repos des fiches de passation, journalisation des accès, purge automatique.

## Vos droits

Vous pouvez à tout moment, depuis **Mon compte** :
- **télécharger toutes vos données** (droit d'accès et de portabilité) ;
- **supprimer votre compte** (droit à l'effacement) : vos données sont supprimées, ou anonymisées lorsqu'un contrat doit être conservé pour l'autre partie.

Vous disposez aussi des droits de rectification, de limitation et d'opposition en écrivant à [email RGPD]. Vous pouvez introduire une réclamation auprès de la CNIL (www.cnil.fr).

## Cookies

Relève n'utilise **aucun cookie publicitaire ni de mesure d'audience**. Seul le stockage local nécessaire au fonctionnement (session de connexion, préférences d'affichage) est utilisé ; il ne requiert pas de consentement.
