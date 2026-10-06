# Économie : coût de revient et prix

> Ordres de grandeur d'octobre 2026, en € HT (1 $ ≈ 0,93 €). Les tarifs Supabase, Stripe et Resend viennent des grilles publiques connues et de guides tiers à jour ; **les sites officiels n'étaient pas accessibles depuis l'environnement de travail : vérifiez-les avant de figer un prix.**

## 1. Hypothèses d'usage

- 1 cabinet payant ≈ 2 remplaçants actifs (gratuits), ≈ 25 emails/mois au total (codes de connexion, notifications), quelques Mo de données.
- Scénario A (`DONNEES_SANTE.md`) : pas d'hébergement HDS. **Le scénario B ajoute 300 à 900 €/mois de coûts fixes.**
- Paiement par carte européenne standard.

## 2. Coûts unitaires

| Poste | Offre | Prix |
|---|---|---|
| Base + Auth + Edge Functions | Supabase **Free** : 0 €, mais projet mis en pause après 7 j d'inactivité, pas de sauvegarde → **démo uniquement** | 0 € |
| | Supabase **Pro** : 25 $/mois, 100 k MAU, 8 Go de base, 10 $ de calcul inclus (instance Micro) | ≈ 23 €/mois |
| | Instance *Small* si besoin (> 500 cabinets) | + ≈ 14 €/mois |
| Hébergement du front | GitHub Pages ou Cloudflare Pages (gratuit, usage commercial autorisé chez Cloudflare) | 0 € |
| Email transactionnel | Resend : gratuit jusqu'à 3 000/mois ; Pro 20 $/mois jusqu'à 50 000 | 0 → ≈ 19 €/mois |
| Domaine (.fr) | Registrar français | ≈ 1 €/mois |
| Stripe | Carte UE standard ≈ 1,5 % + 0,25 € ; Billing (abonnements) ≈ 0,7 % | **≈ 0,89 € par paiement de 29 €** |

## 3. Coût de revient mensuel par cabinet

| | 10 cabinets | 100 cabinets | 1 000 cabinets |
|---|---|---|---|
| Supabase | 23 € (Pro) | 23 € | 37 € (Pro + Small) |
| Email | 0 € (250/mois) | 19 € (2 500/mois → Pro par prudence) | 19 € (25 000/mois) |
| Domaine + front | 1 € | 1 € | 1 € |
| **Fixe technique total** | **24 €** | **43 €** | **57 €** |
| Fixe par cabinet | 2,40 € | 0,43 € | 0,06 € |
| Stripe par cabinet (à 29 €) | 0,89 € | 0,89 € | 0,89 € |
| **Coût de revient par cabinet** | **≈ 3,30 €** | **≈ 1,30 €** | **≈ 0,95 €** |

Coûts non techniques à ne pas oublier (hors tableau) : relecture avocat CGU/contrat (1 à 2 k€ une fois), RC Pro éditeur (≈ 40 €/mois), expert-comptable si société (≈ 80–150 €/mois). **Le vrai coût de revient d'un SaaS de niche, c'est le temps fondateur et l'acquisition, pas l'infrastructure.**

## 4. Trois hypothèses de prix

| | H1 — Accessible | H2 — Actuel (`CONCEPT.md`) | H3 — Au succès |
|---|---|---|---|
| Prix | 19 €/mois ou 190 €/an | **29 €/mois ou 290 €/an** (2 mois offerts) | 0 € d'abonnement, **39 € par contrat signé** |
| Marge brute / cabinet / mois (100 cabinets) | ≈ 17,7 € (93 %) | ≈ 27,7 € (95 %) | ≈ 3 contrats/an → ≈ 9,4 €/mois (93 %), 0 coût d'entrée |
| Point mort technique | 2 cabinets | 2 cabinets | 1 contrat/mois |
| 100 cabinets → revenu annuel | ≈ 22,8 k€ | ≈ 34,8 k€ | ≈ 11,7 k€ |
| Force | Sous le seuil « je ne réfléchis pas » | Prix d'une demi-journée de tournée | Zéro friction, aligné sur la valeur |
| Faiblesse | Image « petit outil » | À justifier hors saison | Revenu saisonnier ; incite à signer hors plateforme |

**Recommandation : H2 avec un ancrage annuel**, et une **variante à tester** : « l'été payé à l'avance » (99 € pour mars–septembre). La douleur est saisonnière (`CONCEPT.md` §5) : un prix qui épouse la saison vend mieux qu'un abonnement mensuel qu'on résilie en octobre. Mesurer dans les 10 entretiens : *« pour quelle étape paieriez-vous ? »* (question déjà dans le recueil d'avis).

## 5. Benchmark rapide

| Concurrent | Modèle public | Ce qu'il fait déjà | Prix |
|---|---|---|---|
| **Infizen** | Gratuit pour les remplaçants, « formule sans engagement » choisie par le titulaire à la publication | **Contrat conforme à l'Ordre signé en ligne**, missions en cabinet et en établissement | Non publié sur les pages indexées |
| **IDHELP** | Abonnement titulaire, 1 mois offert, gratuit pour les remplaçants | Mise en relation titulaires / remplaçantes | Non publié sur les pages indexées |
| **App'Ines** | Annonces illimitées gratuites pour les titulaires + option Premium | Application mobile de remplacement IDEL | Premium non publié |
| Groupes Facebook, Stethonet, annonces de l'Ordre | Gratuit | Petites annonces | 0 € |

Sources : [infizen.fr](https://infizen.fr/), [idhelpfrance.fr](https://www.idhelpfrance.fr/application-remplacement-idel.html), [appines.fr](https://appines.fr/lp/idel), [carecare.fr — comparatif](https://www.carecare.fr/blog/meilleures-solutions-pour-trouver-remplacant-idel).

**Angle mort à corriger dans `CONCEPT.md`** : la note de cadrage dit que personne n'outille le contrat. **C'est faux en 2026** : Infizen fait signer un contrat conforme en ligne. La différenciation défendable de Relève se réduit donc à : (1) contrôles *bloquants* d'éligibilité (autorisation jusqu'au dernier jour, RCP, règle des 2 remplacements), (2) suivi de la rétrocession jusqu'au paiement, (3) réputation vérifiée et portable, (4) parrainage non pyramidal. **Action : 3 comptes d'essai chez les concurrents (30 min) avant de figer le prix.**
