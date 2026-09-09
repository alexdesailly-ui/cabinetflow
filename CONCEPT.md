# Relève — note de cadrage stratégique

*Version pilote, septembre 2026. Ce document justifie le concept ; l'application dans ce dépôt le rend testable.*

## 1. Le marché existe, et il est mal servi

**Taille.** 145 000 infirmiers libéraux en France (Ordre national des infirmiers, 2025), âge moyen 49 ans, 74 % de femmes, 53 % en zone rurale. Les besoins en soins infirmiers augmenteraient de 55 % d'ici 2040 (DREES). Le nombre d'IDEL croît chaque année.

**Douleur.** Un IDEL n'a pas de congés payés : chaque jour non remplacé est un jour de chiffre d'affaires perdu *et* une patientèle abandonnée. Les témoignages convergent : des titulaires qui n'ont jamais pris trois semaines consécutives, une saison estivale vécue comme une chasse au remplaçant, un burn-out documenté. La douleur est récurrente (chaque été, chaque formation, chaque maladie), émotionnelle, et elle touche des professionnels solvables.

**Cadre réglementaire, source de friction.** Le remplacement libéral impose : une autorisation de remplacement personnelle, valable un an, délivrée par le conseil départemental de l'Ordre ; un contrat écrit, transmis à l'Ordre *avant* le début ; l'interdiction de remplacer plus de deux infirmiers simultanément ; une rétrocession d'honoraires encaissée par le titulaire puis reversée. Chacune de ces règles est une occasion d'erreur, de litige ou de sanction.

**Offre actuelle.** Trois familles, aucune ne couvre le besoin :

| Acteur | Cible | Ce qu'il fait | Ce qu'il ne fait pas |
|---|---|---|---|
| Groupes Facebook, Stethonet, Infirmea, ide-liberal.com, annonces de l'Ordre | IDEL | Petites annonces, gratuites ou presque | Vérification, contrat, rétrocession, passation. Aucun suivi, aucune confiance. |
| Hublo, Medelse, Mediflash | **Établissements** (hôpitaux, EHPAD) | Vacations, intérim, contrats salariés | Le remplacement *libéral* de cabinet, qui a ses propres règles (rétrocession, Ordre). |
| Logiciels de facturation IDEL (Albus, Vega, Agathe…) | IDEL | Télétransmission, comptabilité | Le remplacement. Certains publient un guide, aucun n'outille. |

## 2. L'angle mort : l'annonce vaut zéro, tout le reste vaut cher

La majorité des projets sur ce marché reconstruisent un site d'annonces. C'est une erreur : l'annonce est gratuite partout, et Facebook fait ça très bien. **Le prix à payer est nul, donc la valeur perçue aussi.**

La valeur est dans les 95 % restants du parcours, que personne n'outille :

1. **La confiance** — savoir que le remplaçant a une autorisation valide *jusqu'au dernier jour* du remplacement, une RCP en cours, une inscription à l'Ordre, et qu'il n'est pas déjà sur deux remplacements. Relève le vérifie et bloque quand ça ne passe pas.
2. **L'argent** — la rétrocession est le premier sujet de rancœur. Relève l'estime avant la discussion (brut, net après charges, par jour) et la suit ligne par ligne jusqu'au reversement.
3. **La conformité** — contrat aux mentions obligatoires, signé des deux côtés, compte à rebours de transmission à l'Ordre.
4. **La passation** — fiche de tournée structurée (initiales, créneaux, soins, accès, consignes), visible uniquement pendant le remplacement. Ce qui remplace le cahier à spirale et les 40 minutes de téléphone.
5. **La réputation portable** — une recommandation ne peut exister que si un contrat a été signé sur Relève. Zéro faux avis. Le remplaçant emporte son dossier vérifié et ses recommandations de cabinet en cabinet.

Positionnement en une phrase : **Relève n'est pas un site d'annonces, c'est le système d'exploitation du remplacement.** Doctolib a gagné sur l'agenda, pas sur l'annuaire ; le mécanisme est le même.

## 3. Modèle économique

- **Cabinet : 29 € / mois**, premier mois offert, sans engagement. Ordre de grandeur : moins d'une demi-journée de tournée. Le cabinet a la douleur et l'argent.
- **Remplaçant : gratuit, toujours.** C'est la ressource rare ; on ne taxe pas l'offre.
- Pas de commission sur la rétrocession au lancement : elle créerait une incitation à contourner la plateforme. À terme, un service optionnel de reversement automatisé (Stripe) peut se rémunérer sur le service rendu, pas sur le contrat.

Ordre de grandeur : ~30 000 cabinets adressables. 1 % de pénétration = 300 cabinets = ~100 k€ ARR ; 5 % = ~500 k€ ARR. Avec des coûts d'infrastructure quasi nuls, le point mort est très bas — c'est un actif récurrent, pas un pari de croissance.

## 4. Pourquoi c'est viral : la boucle est structurelle avant d'être incitative

**Boucle structurelle** (elle marche même sans récompense) :
- Un contrat implique deux personnes. Retenir un remplaçant l'oblige à créer un compte pour signer → chaque remplacement recrute l'autre côté.
- Le remplaçant veut capitaliser ses recommandations vérifiées → il pousse ses autres cabinets à signer sur Relève.
- Le titulaire veut voir *ses* remplaçants habituels dans son vivier → il invite son carnet.

**Boucle incitative** — la règle : récompenser avec ce qui ne s'achète pas.
- Les deux côtés gagnent : 1 mois offert au parrain *et* au filleul, vérification prioritaire du filleul.
- Paliers (Membre → Confrère → Référent → Pilier) dont l'avantage principal est **l'accès prioritaire à la ressource rare** : annonce en tête de fil, nouveaux remplaçants visibles 24 h avant les autres, vivier régional élargi. Pour un titulaire en juin, être vu en premier vaut plus qu'une remise.
- Un filleul est « actif » quand il a **signé un contrat**, pas quand il a créé un compte : la récompense est indexée sur la valeur réellement délivrée, donc pas de comptes fantômes.
- Classement départemental, remis à zéro chaque saison ; QR code et affiche pour la salle de soins ; lien nominatif (« Marie vous invite »).

**Gamification, avec parcimonie** : badges uniquement pour ce qui protège réellement un remplacement (contrat transmis à J-7, rétrocession réglée à l'heure, été anticipé avant le 15 mai, dossier complet), jauge « jours de repos sécurisés » qui rend visible la seule métrique qui compte pour un titulaire, confettis sur les signatures. Rien pour « ouvrir l'app trois jours de suite ».

## 5. Risques et angles morts à surveiller

- **Densité locale.** La valeur d'un vivier est départementale. Lancer sur 2–3 départements avec des ambassadeurs (les « Piliers ») plutôt que national et dilué.
- **Saisonnalité.** La douleur explose de mars à juin. Le lancement doit précéder la saison ; le hors-saison sert aux formations, arrêts maladie, maternités.
- **Responsabilité juridique.** Relève ne doit jamais se présenter comme conseil juridique : contrat « modèle de travail à relire », estimation « non fiscale ». Faire relire le modèle par un avocat spécialisé avant le premier client payant.
- **RGPD / données patients.** La fiche de tournée n'accepte que des initiales et doit rester chiffrée et éphémère côté backend. C'est un argument de vente autant qu'une contrainte.
- **Ordre des infirmiers.** Un partenariat (ou au minimum une neutralité bienveillante) d'un conseil départemental pilote vaut plus que n'importe quel budget marketing.
- **Copie par un éditeur de logiciel IDEL.** C'est le risque principal à 24 mois. La parade : la couche de confiance (recommandations vérifiées, dossier portable) crée un effet de réseau qu'un module de facturation n'a pas.

## 6. Plan 90 jours, à budget contenu

1. **Semaines 1–2** — Tester cette version pilote auprès de 10 titulaires et 5 remplaçants (entretiens de 20 min, pas de sondage). Question clé : « Pour quelle étape paieriez-vous 29 € ? ».
2. **Semaines 3–6** — Backend Supabase (auth, Postgres, RLS), notifications SMS/email, Stripe. Les écrans ne changent pas : le store est isolé pour ça.
3. **Semaines 7–10** — Lancement sur un département avec 3 ambassadeurs (mois offerts à vie contre 10 cabinets chacun). Affiches en salles de soins, groupes Facebook locaux avec le lien nominatif.
4. **Semaines 11–13** — Mesurer : taux de contrats signés par annonce publiée, délai moyen pour pourvoir, K-factor du parrainage, NPS. Décider du deuxième département.

Le temps fondateur nécessaire est compatible avec une activité principale : le produit est asynchrone, sans support temps réel, et la boucle de croissance repose sur les utilisateurs, pas sur de la prospection.
