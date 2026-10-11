# Modèle économique

> Ordres de grandeur d'octobre 2026, en euros hors taxes (1 $ ≈ 0,93 €). Ce sont des hypothèses de travail, pas des prévisions.

## Principe

- **Cabinet : abonnement.** Hypothèse de départ : 29 € par mois (ou 290 € par an), essai de 14 jours sans carte, mois offerts par parrainage dans la limite de douze par an. Le cabinet a le besoin et le budget : 29 € représentent moins d'une demi-journée de tournée.
- **Remplaçant : gratuit, toujours.** C'est la ressource rare, on ne taxe pas l'offre.
- **Pas de commission sur la rétrocession au lancement** : elle inciterait à contourner la plateforme. À terme, un service optionnel de reversement automatisé pourrait se rémunérer sur le service rendu, pas sur le contrat.

## Marché

D'après la DREES (Études et Résultats n° 1319, décembre 2024) :

- en 2021, environ **98 600 infirmières exerçaient en libéral**, soit 16 % des quelque 600 000 infirmières en emploi ;
- cette part devrait atteindre **21 % en 2050**, soit environ **75 % de libéraux en plus** ;
- les besoins en soins croissent plus vite que le nombre d'infirmières : il en manquerait environ 80 000 en 2050 par rapport à la couverture actuelle.

Estimation du nombre de clients potentiels, avec une hypothèse non sourcée de 3 à 4 infirmiers par structure : **25 000 à 33 000 cabinets**.

| Part de cabinets abonnés (29 € par mois) | Cabinets | Revenu annuel récurrent |
|---|---|---|
| 1 % | 250 à 330 | ≈ 90 à 115 k€ |
| 5 % | 1 250 à 1 650 | ≈ 430 à 570 k€ |

Ces scénarios supposent que tous les cabinets sont atteignables et paient le prix plein : ils donnent un ordre de grandeur, pas une trajectoire.

## Coûts d'infrastructure

Hypothèses d'usage : un cabinet payant correspond à environ deux remplaçants actifs (gratuits), 25 emails par mois et quelques mégaoctets de données ; aucun hébergement certifié pour données de santé (voir [Sécurité et données](securite-et-donnees.md), où le scénario avec certification ajoute 300 à 900 € de coûts fixes par mois).

| Poste | Offre | Prix |
|---|---|---|
| Base de données, authentification, fonctions serveur | Supabase Free : gratuit, mais pause après 7 jours d'inactivité et pas de sauvegarde, donc réservé à la démonstration | 0 € |
| | Supabase Pro : 25 $ par mois, 100 000 utilisateurs actifs, 8 Go, instance de base incluse | ≈ 23 € par mois |
| | Instance supérieure si besoin (au-delà de 500 cabinets) | + ≈ 14 € par mois |
| Hébergement du front | Hébergement mutualisé existant, ou Cloudflare Pages (gratuit, usage commercial autorisé) | ≈ 0 € |
| Email transactionnel | Resend : gratuit jusqu'à 3 000 par mois, puis 20 $ par mois jusqu'à 50 000 | 0 à ≈ 19 € par mois |
| Nom de domaine (.fr) | Bureau d'enregistrement français | ≈ 1 € par mois |
| Paiement | Stripe, carte européenne standard : ≈ 1,5 % + 0,25 € ; Billing : ≈ 0,7 % | **≈ 0,89 € par paiement de 29 €** |

## Coût de revient mensuel par cabinet

| | 10 cabinets | 100 cabinets | 1 000 cabinets |
|---|---|---|---|
| Supabase | 23 € (Pro) | 23 € | 37 € (Pro + instance supérieure) |
| Email | 0 € | 19 € | 19 € |
| Domaine et front | 1 € | 1 € | 1 € |
| **Fixe technique total** | **24 €** | **43 €** | **57 €** |
| Fixe par cabinet | 2,40 € | 0,43 € | 0,06 € |
| Paiement par cabinet (à 29 €) | 0,89 € | 0,89 € | 0,89 € |
| **Coût de revient par cabinet** | **≈ 3,30 €** | **≈ 1,30 €** | **≈ 0,95 €** |

Coûts non techniques à prévoir : relecture juridique des conditions d'utilisation et du contrat (1 à 2 k€, une fois), assurance responsabilité de l'éditeur (≈ 40 € par mois), expert-comptable si société (≈ 80 à 150 € par mois). **Le vrai coût d'un logiciel de niche est le temps de l'équipe et l'acquisition de clients, pas l'infrastructure.**

## Hypothèses de prix

| | H1 — Accessible | H2 — Référence | H3 — Au succès | H4 — Par paliers |
|---|---|---|---|---|
| Prix | 19 € par mois ou 190 € par an | **29 € par mois ou 290 € par an** | 0 € d'abonnement, **39 € par contrat signé** | Socle gratuit ou très bas, options payantes (contrat, signature, flux financiers) |
| Marge brute par cabinet et par mois (100 cabinets) | ≈ 17,7 € (93 %) | ≈ 27,7 € (95 %) | ≈ 9,4 € (3 contrats par an) | Dépend des options retenues |
| Point mort technique | 2 cabinets | 1 cabinet | 1 contrat par mois | À définir |
| Revenu annuel pour 100 cabinets | ≈ 22,8 k€ | ≈ 34,8 k€ | ≈ 11,7 k€ | À définir |
| Force | Sous le seuil du « je ne réfléchis pas » | Prix d'une demi-journée de tournée | Zéro friction, aligné sur la valeur | Entrée sans barrière ; le paiement suit la valeur perçue |
| Faiblesse | Image de « petit outil » | À justifier hors saison | Revenu saisonnier, incite à signer hors plateforme | Si le socle suffit, peu de conversion vers les options |

**Orientation actuelle : H2 avec un ancrage annuel**, et deux variantes à tester : un forfait saisonnier payé à l'avance (99 € de mars à septembre), car la douleur est saisonnière, et le modèle par paliers (H4). Les entretiens avec des infirmiers libéraux trancheront : *« pour quelle étape paieriez-vous ? »* ([protocole](tests-utilisateurs.md)).

## Réserves

- Les tarifs des prestataires (Supabase, Stripe, Resend) viennent de leurs grilles publiques connues et de guides tiers ; **ils sont à vérifier avant de figer un prix**.
- Les chiffres du marché proviennent de résumés publics de l'étude de la DREES ; ils sont à confirmer sur la publication elle-même.
- Les offres des concurrents sont décrites dans [Produit](produit.md) ; leurs prix n'étaient pas publiés lors de la rédaction.
