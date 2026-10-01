# Données de santé : la décision structurante

> Analyse technique, pas un avis juridique. À faire confirmer par un avocat ou un DPO spécialisé santé avant la première donnée réelle.

## 1. Inventaire champ par champ

| Table / champ | Contenu | Donnée de santé ? | Commentaire |
|---|---|---|---|
| `fiches_tournee.patients[]` (initiales, rue, créneau, **soins**, particularités) | Une ligne par patient de la tournée | **OUI** | Initiales + rue + commune suffisent à identifier une personne dans un village ; « insuline », « chimiothérapie », « PICC » révèlent son état de santé. Donnée de santé à caractère personnel (art. 4 §15 RGPD). |
| `fiches_tournee.consignes` | Texte libre | **Potentiellement** | Dans la démo : « Commencer par M. R. (insuline à 6 h 45) ». Un texte libre finit toujours par contenir un patient. |
| `fiches_tournee.accesCabinet` | Codes de boîte à clé, d'alarme | Non, mais **secret de sécurité** | Chiffré au même titre. |
| `fiches_tournee.medecinReferent`, `pharmacie` | Coordonnées professionnelles | Non | |
| `missions.soins_requis`, `comptes.soins_maitrises` | Catégories de soins (« Pansements complexes ») | Non | Compétences du professionnel, aucun patient. |
| `missions.patients_jour`, `comptes.patients_tournee`, `ca_journalier` | Volumes agrégés | Non | |
| `missions.motif = 'Maladie'`, `'Maternité / paternité'` | Motif d'absence du **titulaire** | **Sensible** | Information sur la santé de l'infirmier lui-même (pas d'un patient), visible des candidats. Proposé : afficher « Absence » côté remplaçant. Question au rapport. |
| `pieces.*` (RPPS, autorisation, RCP, URSSAF, RIB tronqué) | Dossier professionnel | Non | RPPS est public (Annuaire santé). Visibilité restreinte aux relations de travail. |
| `contrats.signature_*.saisie` | Nom saisi | Non | Preuve, conservée 5 ans. |
| `recommandations.texte` | Texte libre | Risque faible | « Les patients ont demandé quand il revenait » : OK. Modération à prévoir. |

**Conclusion : une seule fonctionnalité fait basculer Relève dans les données de santé : la liste des patients de la fiche de passation.** Tout le reste est de la donnée professionnelle classique.

## 2. Pourquoi c'est structurant

Héberger des données de santé pour le compte de professionnels impose un **hébergeur certifié HDS** (art. L.1111-8 du Code de la santé publique). Supabase cloud **n'est pas certifié HDS**. Le basculement concerne tout : hébergeur, contrat, procédures, journalisation, analyse d'impact.

## 3. Les deux scénarios

### A. MVP sans donnée de santé (recommandé)

La fiche de passation garde la logistique (accès, pharmacie, médecin, consignes générales) ; **la liste des patients reste dans le logiciel de facturation du cabinet** (lui-même HDS) ou passe de main à main.

| Chantier | Effort |
|---|---|
| Interdire les lignes patient côté serveur | **Fait** (`fiche_patients_autorises = false`, refus dans `fiche_enregistrer`) |
| Adapter l'écran de passation en mode cloud | **Fait** |
| Mention « ne saisissez aucune donnée patient » (CGU, onboarding, écran) | **Fait** |
| Détection de texte suspect dans `consignes` (initiales + verbe de soin) | 0,5 j — non fait, à décider |
| Revue avocat CGU/confidentialité | 1 à 2 h d'avocat (300–600 €) |
| **Total restant** | **≈ 1 jour + avocat** |

Ce que l'on perd : la promesse « passation structurée patient par patient ». Ce que l'on gagne : sortir **cette semaine**, et un argument commercial (« Relève ne voit jamais un patient »).

### B. Données de santé dès la V1

| Chantier | Effort / coût |
|---|---|
| Migrer Postgres + Auth vers un hébergeur HDS (OVHcloud, Scaleway, Clever Cloud, Outscale…) : Postgres managé HDS, Auth à réimplémenter (GoTrue auto-hébergé ou autre), Edge Functions à porter | 10 à 15 j de dev |
| Contrat HDS + coût d'infrastructure | 150 à 400 €/mois minimum (instances dédiées, sauvegardes HDS), quel que soit le nombre de clients |
| Analyse d'impact (AIPD) obligatoire (traitement de données de santé) | 2 à 5 j, ou 2–5 k€ en cabinet |
| DPO (désignation recommandée, obligatoire si traitement à grande échelle) | DPO externalisé 150–500 €/mois |
| Politique de sécurité, gestion des incidents, PCA, tests d'intrusion | 3 à 5 j + pentest 3–8 k€ |
| Authentification forte (CPS / Pro Santé Connect) recommandée par l'ANS | 3 à 5 j |
| **Total** | **≈ 25 à 35 j + 8 à 20 k€ la 1re année + 300 à 900 €/mois** |

## 4. Ce qui est déjà implémenté (commun A et B)

| Exigence | Implémentation | Fichier |
|---|---|---|
| Chiffrement au repos des champs sensibles | Fiche chiffrée AES-256 (pgcrypto), clé dans Supabase Vault, jamais lisible par les utilisateurs | `migrations/…0300_donnees_sensibles_rgpd.sql` |
| Accès minimal | Fiche lisible par le cabinet, et par le remplaçant **uniquement** de J-7 à J+3, contrat signé des deux côtés — vérifié par le serveur | `private.peut_lire_fiche` |
| RLS stricte par cabinet | RLS **forcée** sur 100 % des tables, privilèges par colonne, 140 assertions d'isolation | `migrations/…0200_securite_rls.sql`, `tests/02_isolation_cabinets.sql` |
| Journal d'audit | Chaque lecture/écriture de fiche, chaque modification de compte/contrat/pièce, consultable par le compte concerné | `audit_log`, `private.audit_trigger` |
| Rétention | Fiches purgées 90 j après la fin du remplacement, journal 1 an, tâche `pg_cron` quotidienne | `private.purger()` |
| Droits RGPD | Export JSON complet et suppression (anonymisation si contrat à conserver) en libre-service | `rgpd_export()`, `rgpd_supprimer_mon_compte()` |
| Limitation de débit | Quotas par utilisateur sur les RPC sensibles | `private.quota()` |
| Bascule A → B | **Un paramètre** : `update private.parametres set valeur = 'true' where cle = 'fiche_patients_autorises'` (une fois l'hébergement HDS en place) | |

## 5. Recommandation : **A**

1. **Le marché ne paie pas pour la fiche patient.** La douleur décrite dans `CONCEPT.md` est de *trouver* un remplaçant fiable, sécuriser le contrat et la rétrocession. La liste des patients existe déjà dans le logiciel de facturation du cabinet.
2. **B coûte 1 à 2 ans de chiffre d'affaires** au rythme réaliste du lancement (voir `COUTS.md`) avant le premier client.
3. **A est réversible, B ne l'est pas.** Tout est prêt pour basculer : le jour où 30 cabinets demandent la passation patient, on migre avec un revenu qui la finance.
4. **Angle original** : plutôt qu'héberger la tournée, *l'importer à la volée* depuis le logiciel de facturation (export PDF/CSV chiffré de bout en bout entre les deux téléphones, clé échangée par QR code au moment de la passation, jamais stockée en clair côté serveur). À faire valider juridiquement : même chiffrée, une donnée de santé hébergée reste en principe soumise à HDS. La seule voie certaine sans HDS reste « aucune donnée patient ne transite par Relève ».

Ne pas partir en certification maintenant.
