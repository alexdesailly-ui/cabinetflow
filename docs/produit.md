# Produit

## Le problème

Un infirmier libéral n'a pas de congés payés : chaque jour non remplacé est un jour de chiffre d'affaires perdu et une patientèle sans soins. Le besoin est récurrent (été, formations, maladies, maternités) et il touche des professionnels solvables.

Le remplacement est aussi encadré, ce qui multiplie les occasions d'erreur :

- le remplaçant doit détenir une **autorisation de remplacement** personnelle, valable un an, délivrée par le conseil départemental de l'Ordre ;
- un **contrat écrit** est exigé et doit être transmis à l'Ordre ;
- un remplaçant ne peut pas remplacer plus de **deux infirmiers en même temps** ;
- les honoraires sont encaissés par le titulaire, puis **reversés** au remplaçant (rétrocession), ce qui est la première source de désaccord.

Aujourd'hui, les cabinets s'organisent avec des groupes de réseaux sociaux, des petites annonces et du bouche-à-oreille. Ces canaux publient une annonce, mais ne vérifient ni le remplaçant, ni le contrat, ni le reversement.

## La solution : outiller tout le parcours

Une annonce est gratuite partout, donc elle ne vaut rien. La valeur est dans le reste du parcours, que personne n'outille bien :

| Étape | Ce que fait Relève |
|---|---|
| **Confiance** | Vérifie que l'autorisation du remplaçant couvre *jusqu'au dernier jour* du remplacement, que son assurance est en cours et qu'il n'est pas déjà sur deux remplacements. **Bloque la signature** sinon. |
| **Argent** | Estime la rétrocession avant la discussion (brut, net après charges, par jour) puis la suit période par période jusqu'au reversement. |
| **Conformité** | Génère un contrat avec les mentions utiles, signé des deux côtés, et rappelle la transmission à l'Ordre. |
| **Passation** | Structure la fiche de tournée (accès, consignes, créneaux), visible du remplaçant seulement pendant le remplacement. |
| **Réputation** | Une recommandation n'existe que si un contrat a été signé sur Relève. Le remplaçant emporte son dossier vérifié et ses recommandations de cabinet en cabinet. |

## Utilisateurs

- **Le cabinet (titulaire)** a le besoin et le budget : il publie un remplacement, examine les candidatures, signe, suit le reversement. C'est lui qui paie.
- **Le remplaçant** est la ressource rare : il constitue un dossier de confiance, candidate, signe, suit ses reversements. Il est gratuit, toujours.

## Un déploiement par paliers (hypothèse de travail)

La démonstration montre l'ensemble du parcours pour donner la vision. La mise en production peut s'ouvrir par paliers, en commençant par ce qui répond au besoin le plus fort. Les paliers avancés pourraient constituer une offre premium.

| Palier | Apport | Dans la démonstration |
|---|---|---|
| **1. Annoncer une absence** | Le titulaire déclare ses dates, l'annonce est diffusée à ses remplaçants (par exemple via une messagerie), les disponibles se manifestent et sont mis en relation | Bloc 1 : l'annonce et la réponse « partant » passent réellement par WhatsApp (lien de partage) ; le décompte des réponses reste à construire |
| **1+. Suivre congés et remplaçants** | Vue d'ensemble des absences, du carnet de remplaçants habituels, des relances | Partiel, dans l'application complète (liste des remplacements, vivier) |
| **2. Contrat et pièces** | Demande et contrôle des pièces (autorisation, assurance…), contrat conforme, rappel à l'Ordre | Blocs 3 et 5 : contrat généré, contrôles bloquants ; pièces déclaratives |
| **2+. Signature électronique** | Signature à valeur probante renforcée | Bloc 3 : signature simple ; la signature qualifiée reste à faire |
| **3. Flux financiers** | Encaissement et reversement des honoraires par la plateforme | Bloc 4 : calcul et suivi du reversement ; l'encaissement automatique est annoncé « bientôt » pour mesurer l'intérêt, le mouvement de fonds restant à étudier avec un partenaire de paiement agréé |

L'ordre est une **hypothèse** : il sera arbitré avec les retours d'infirmiers libéraux (voir [Validation auprès d'utilisateurs](tests-utilisateurs.md)). La question ouverte du palier 1 : si une messagerie gratuite suffit déjà à annoncer une absence, la valeur payante se situe plutôt aux paliers suivants.

## La démonstration en cinq blocs

Pour obtenir un avis sans effort, la démonstration est découpée en cinq blocs indépendants. Chacun porte un numéro, se teste seul en une trentaine de secondes et se note d'un emoji (😍 utile, 😐 bof, 🙅 pas pour moi) : un testeur peut dire « le bloc 3 ne me sert pas » sans rien décrire. Cinq blocs plutôt qu'une douzaine de fonctions : assez pour séparer des valeurs différentes, assez peu pour que la personne les parcoure tous.

| Bloc | Thème | Offre | Ce qui est réel | Ce qui est simulé |
|---|---|---|---|---|
| 1 | Partage WhatsApp | Gratuit | Annonce rédigée et envoyée sur WhatsApp ; page « Je suis partant(e) » ouverte par le remplaçant, qui répond par un message déjà écrit | Les réponses affichées dans l'application |
| 2 | Souscription et onboarding | Gratuit | Parcours de création de compte, comparaison des offres, calendrier des paiements | Le code reçu par e-mail et le paiement |
| 3 | Signature électronique | Premium | Contrat produit par le vrai modèle, signature par glissement | La signature du remplaçant |
| 4 | Facturation et encaissement | Premium | Calcul de la rétrocession, relevé, envoi par WhatsApp | L'encaissement automatique (on mesure l'intérêt) |
| 5 | Conformité et données de santé | Inclus | Contrôles bloquants (mêmes règles que l'application), fenêtre d'accès à la fiche | Les dossiers de trois remplaçants fictifs |

**Où et quand on paie.** Le testeur arrive en version gratuite : l'annonce WhatsApp fonctionne, sans limite. Les blocs 3 et 4 portent un verrou ; le toucher ouvre une page Premium (essai de 14 jours sans carte, puis 29 € par mois ou 290 € par an) et le bloc 1 se termine sur un appel à « sécuriser avec contrat et signature ». Ces mécanismes reprennent des usages courants des applications professionnelles : offre gratuite utile, fonctions avancées visibles mais verrouillées, essai sans carte, prix annuel, comparaison avec le coût d'un jour sans remplaçant.

**Un conditionnement testé, pas imposé.** La répartition gratuit / Premium est une hypothèse de la démonstration. L'application complète et la base appliquent aujourd'hui une autre règle : la publication d'une annonce est réservée aux cabinets en essai ou abonnés (`cabinet_actif`, voir [Architecture](architecture.md)). Si les retours valident une version gratuite centrée sur l'annonce, cette règle se déplace de la publication vers le contrat et la signature.

## Concurrence

| Alternative | Ce qu'elle fait | Ce qu'elle ne fait pas |
|---|---|---|
| Groupes de réseaux sociaux, sites d'annonces, annonces de l'Ordre | Petites annonces, gratuites ou presque | Vérification, contrat, reversement, suivi |
| Plateformes d'intérim santé pour établissements | Vacations et contrats salariés en hôpital ou EHPAD | Le remplacement *libéral* de cabinet, qui a ses propres règles |
| Logiciels de facturation pour infirmiers libéraux | Télétransmission, comptabilité | Le remplacement |
| Solutions spécialisées (par exemple Infizen, IDHELP, App'Ines) | Mise en relation entre titulaires et remplaçants ; certaines mettent en avant un contrat en ligne | À vérifier au cas par cas : contrôles bloquants, suivi du reversement |

Le contrat en ligne n'est donc pas, à lui seul, un avantage durable. Ce qui peut l'être, à confirmer auprès des utilisateurs :

1. des **contrôles bloquants** d'éligibilité avant la signature ;
2. le **suivi du reversement** jusqu'au paiement ;
3. une **réputation vérifiée et portable** (aucun avis sans contrat signé) ;
4. un **parrainage non pyramidal**.

*Les offres des concurrents sont décrites d'après leurs présentations publiques ; leurs tarifs n'étaient pas publiés lors de la rédaction. À re-vérifier avant toute décision.*

## Croissance

La boucle est structurelle : elle fonctionne sans récompense.

- Un contrat engage deux personnes : retenir un remplaçant l'oblige à créer un compte pour signer, donc chaque remplacement recrute l'autre côté.
- Le remplaçant veut capitaliser ses recommandations vérifiées : il pousse ses autres cabinets à signer sur Relève.
- Le titulaire veut retrouver ses remplaçants habituels : il invite son carnet.

**Parrainage volontairement plat** : le parrain et l'invité gagnent chacun un mois, dans la limite de douze mois par an, lorsque l'invité signe son premier contrat. Aucun palier par nombre de recrues, aucun classement : dès qu'une récompense croît avec le nombre de personnes amenées, le produit prend la forme d'une pyramide, ce qu'une profession réglementée ne pardonne pas.

**La progression vient de la fiabilité, pas du recrutement.** Trois niveaux (Nouveau, Fiable, Référence) sont calculés sur des actes vérifiables : contrat transmis à temps, reversement avant l'échéance, fiche de passation complète, recommandation laissée. L'avantage du niveau Référence est de voir les nouveaux remplaçants 24 heures avant les autres cabinets.

**Guides visuels minimalistes** : aucun tutoriel, un repère d'une ligne affiché une seule fois à l'endroit du geste attendu. Si l'interface a besoin d'être racontée, c'est l'interface qu'il faut changer.

## Risques et parades

| Risque | Parade |
|---|---|
| **Densité locale** : la valeur d'un vivier est départementale | Lancer sur un ou deux départements plutôt que sur tout le territoire |
| **Saisonnalité** : le besoin culmine du printemps à l'été | Lancer avant la saison ; formations, arrêts maladie et maternités lissent le reste de l'année |
| **Responsabilité juridique** | Contrat présenté comme modèle de travail à relire, estimations « non fiscales », relecture par un avocat spécialisé avant le premier client payant |
| **Données de patients** | Aucune donnée de santé hébergée au lancement ([détail](securite-et-donnees.md)) |
| **Légitimité auprès de l'Ordre** | Viser la neutralité bienveillante d'un conseil départemental pilote |
| **Copie par un éditeur de logiciels de facturation** | Une couche de confiance (recommandations vérifiées, dossier portable) crée un effet de réseau qu'un module de facturation n'a pas |

## Prochaines étapes

1. **Valider les priorités** auprès d'infirmiers libéraux : quelles étapes comptent le plus, comment ils trouvent un remplaçant aujourd'hui, pour quelle étape ils paieraient.
2. **Activer les comptes réels** et le paiement en mode test pour un petit groupe de pilotes.
3. **Piloter sur un département** et mesurer : contrats signés par annonce publiée, délai pour pourvoir un remplacement, effet du parrainage, satisfaction.
4. Arbitrer le contenu de chaque palier et la politique tarifaire ([modèle économique](modele-economique.md)).
