# Sécurité et données

> Analyse technique, pas un avis juridique. À faire confirmer par un avocat ou un délégué à la protection des données spécialisé en santé avant toute donnée réelle.

## En bref

**Au lancement, Relève n'héberge aucune donnée de santé.** Une seule fonctionnalité l'aurait fait basculer dans ce régime : la liste des patients d'une tournée, dans la fiche de passation. Elle est désactivée côté serveur ; tout le reste relève de la donnée professionnelle classique. Cette décision évite un hébergeur certifié HDS (hébergeur de données de santé), ce qui représente plusieurs mois de travail et des coûts fixes importants avant le premier client. Elle est réversible en une ligne.

## Inventaire champ par champ

| Table / champ | Contenu | Donnée de santé ? | Commentaire |
|---|---|---|---|
| `fiches_tournee.patients[]` (initiales, rue, créneau, **soins**, particularités) | Une ligne par patient de la tournée | **Oui** | Initiales, rue et commune suffisent à identifier une personne dans un village ; « insuline » ou « chimiothérapie » révèlent son état de santé |
| `fiches_tournee.consignes` | Texte libre | **Potentiellement** | Un texte libre finit toujours par contenir un patient |
| `fiches_tournee.accesCabinet` | Codes de boîte à clé, d'alarme | Non, mais **secret de sécurité** | Chiffré au même titre |
| `fiches_tournee.medecinReferent`, `pharmacie` | Coordonnées professionnelles | Non | |
| `missions.soins_requis`, `comptes.soins_maitrises` | Catégories de soins (« pansements complexes ») | Non | Compétences du professionnel, aucun patient |
| `missions.patients_jour`, `comptes.ca_journalier` | Volumes agrégés | Non | |
| `missions.motif` (maladie, maternité) | Motif d'absence du **titulaire** | **Sensible** | Concerne l'infirmier lui-même et non un patient ; piste : afficher « Absence » côté remplaçant |
| `pieces.*` (RPPS, autorisation, assurance, URSSAF) | Dossier professionnel | Non | Le numéro RPPS est public ; visibilité limitée aux relations de travail |
| `contrats.signature_*` | Nom saisi | Non | Preuve, conservée 5 ans |
| `recommandations.texte` | Texte libre | Risque faible | Modération à prévoir |

## Deux scénarios

### Scénario A — sans donnée de santé (retenu)

La fiche de passation garde la logistique (accès, pharmacie, médecin, consignes générales). **La liste des patients reste dans le logiciel de facturation du cabinet**, lui-même certifié, ou passe de main à main.

| Chantier | État |
|---|---|
| Interdire les lignes de patients côté serveur | Fait (paramètre `fiche_patients_autorises = false`, refus dans `fiche_enregistrer`) |
| Adapter l'écran de passation en mode comptes réels | Fait |
| Mention « ne saisissez aucune donnée patient » (conditions d'utilisation, onboarding, écran) | Fait |
| Détection de texte suspect dans les consignes | Non fait, à décider |
| Relecture juridique des conditions d'utilisation et de la politique de confidentialité | À faire (1 à 2 heures d'avocat) |

Ce que l'on perd : la promesse d'une passation structurée patient par patient. Ce que l'on gagne : une mise en service immédiate et un argument commercial (« Relève ne voit jamais un patient »).

### Scénario B — données de santé dès la première version

| Chantier | Effort estimé |
|---|---|
| Migrer la base et l'authentification vers un hébergeur certifié HDS ; porter les fonctions serveur | 10 à 15 jours de développement |
| Contrat HDS et infrastructure dédiée | 150 à 400 € par mois minimum, quel que soit le nombre de clients |
| Analyse d'impact (AIPD) obligatoire | 2 à 5 jours, ou 2 à 5 k€ en cabinet |
| Délégué à la protection des données | 150 à 500 € par mois en externalisé |
| Politique de sécurité, gestion des incidents, plan de continuité, test d'intrusion | 3 à 5 jours + 3 à 8 k€ |
| Authentification forte (Pro Santé Connect) | 3 à 5 jours |
| **Total** | **≈ 25 à 35 jours + 8 à 20 k€ la première année + 300 à 900 € par mois** |

*Estimations d'ordre de grandeur, à affiner avec des devis.*

### Pourquoi le scénario A

1. **Le marché ne paie pas pour la fiche patient.** La douleur est de *trouver* un remplaçant fiable, de sécuriser le contrat et le reversement. La liste des patients existe déjà dans le logiciel du cabinet.
2. **Le scénario B coûte un à deux ans de chiffre d'affaires** au rythme réaliste d'un lancement, avant le premier client.
3. **A est réversible, B ne l'est pas.** Le jour où des cabinets demandent la passation patient, la bascule se fait avec un revenu qui la finance.
4. **Pas de certification maintenant.**

**Piste étudiée** : plutôt qu'héberger la tournée, l'importer à la volée depuis le logiciel de facturation (export chiffré de bout en bout entre les deux téléphones, clé échangée par QR code, jamais stockée en clair côté serveur). À valider juridiquement : même chiffrée, une donnée de santé hébergée reste en principe soumise à la certification. La seule voie certaine sans certification reste « aucune donnée patient ne transite par Relève ».

## Mesures en place

| Exigence | Implémentation |
|---|---|
| Chiffrement au repos des champs sensibles | Fiche chiffrée en AES-256 (pgcrypto) ; clé dans Supabase Vault, jamais lisible par les utilisateurs |
| Accès minimal | Fiche lisible par le cabinet ; par le remplaçant **uniquement de J-7 à J+3**, contrat signé des deux côtés, vérifié par le serveur (`private.peut_lire_fiche`) |
| Isolation par cabinet | RLS **forcée** sur 100 % des tables, droits par colonne, 140 assertions d'isolation |
| Journal d'audit | Lecture et écriture des fiches, modifications de compte, de contrat et de pièces ; consultable par le compte concerné |
| Rétention | Fiches purgées 90 jours après la fin du remplacement, journal conservé un an, tâche quotidienne `pg_cron` |
| Droits RGPD | Export JSON complet et suppression (anonymisation si un contrat doit être conservé) en libre-service : `rgpd_export()`, `rgpd_supprimer_mon_compte()` |
| Limitation de débit | Quotas par utilisateur sur les fonctions sensibles |
| Transport et navigateur | HTTPS forcé, en-têtes de sécurité, politique de contenu restrictive |
| Secrets | Aucun secret dans le dépôt (scan en CI) ; clés de paiement uniquement côté serveur |

## Passer au scénario B

Un paramètre : `update private.parametres set valeur = 'true' where cle = 'fiche_patients_autorises'`, une fois l'hébergement certifié en place. Les pages légales sont à réécrire en conséquence.

## Points de vigilance

La liste des points à challenger (annuaire visible de tous les membres, clé de chiffrement unique sans rotation, suppression de compte à valider sur un projet réel, politique de contenu) est dans [Qualité](qualite.md).
