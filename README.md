# Relève

**Le remplacement infirmier libéral, sans la charge mentale.**

Relève est une application SaaS destinée aux cabinets infirmiers libéraux (IDEL). Elle ne se contente pas de publier une annonce de remplacement : elle vérifie le remplaçant, calcule la rétrocession, génère le contrat conforme, rappelle la transmission à l'Ordre, structure la passation de tournée et suit les reversements. Un système de parrainage récompense ce qui est réellement rare pour un titulaire : l'accès prioritaire aux bons remplaçants.

Le raisonnement marché, le modèle économique et la mécanique virale sont détaillés dans [CONCEPT.md](CONCEPT.md).

## Tester

**Démo en ligne : https://alexdesailly-ui.github.io/cabinetflow/** (déployée automatiquement par GitHub Pages à chaque push).

L'application est livrée sous forme d'un fichier HTML unique, sans backend : toutes les données restent dans le navigateur (`localStorage`). Un monde de démonstration est installé à la première ouverture.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/index.html (autonome) + dist/artifact.html (pour publication)
```

Parcours conseillé :

1. **Côté cabinet** (Marie Dubois, Angers) : examiner les candidatures du remplacement d'été → retenir Julien → signer le contrat → transmettre à l'Ordre → préparer la passation → régler la rétrocession en retard.
2. **Côté remplaçant** (Julien Morel) : compléter le dossier de confiance, candidater, signer.
3. **Parrainage** : copier le lien, ouvrir `#/invite/MARDUB-7K2` dans un autre onglet, créer un compte : le filleul démarre avec un mois offert et apparaît chez le parrain. Le bouton « simuler » fait passer un filleul à « actif » pour voir les paliers monter.

Le menu « Mon compte » permet de basculer d'un compte à l'autre et de réinitialiser la démonstration.

## Architecture

```
src/
  lib/
    types.ts        modèle métier (vocabulaire IDEL)
    domain.ts       calculs : rétrocession, conformité des pièces, contrôles d'affectation, paliers
    gamification.ts badges et « jours de repos sécurisés »
    contrat.ts      génération du contrat de remplacement
    store.ts        état local + sélecteurs (seul point à remplacer pour un backend)
    actions.ts      toutes les écritures
    seed.ts         monde de démonstration
    router.ts       routage par hash
  screens/          un fichier par écran
  components/ui.tsx primitives, icônes, QR, toasts, confettis
scripts/build-artifact.mjs  post-traitement du build en fichier publiable
```

## Ce que la version pilote ne fait pas encore

- **Backend et comptes réels** : le store est local. Brancher Supabase (Postgres + Auth + RLS) revient à réimplémenter `store.ts`/`actions.ts`, les écrans ne changent pas.
- **Vérification documentaire** : les pièces sont déclarées, pas contrôlées (pièce jointe, annuaire RPPS).
- **Signature électronique qualifiée** : la signature est simple (nom saisi). Le contrat imprimé reste signable à la main pour l'Ordre.
- **Paiement** : Stripe pour l'abonnement cabinet et, à terme, le reversement de rétrocession.
- **Notifications** : SMS/email à la publication d'une mission, à l'expiration d'une pièce, à l'échéance de rétrocession.

## Avertissement

Démonstration : aucune donnée réelle de patient ne doit y être saisie. Les montants de rétrocession sont des estimations et non un calcul fiscal ; le contrat est un modèle de travail à relire, pas un conseil juridique.
