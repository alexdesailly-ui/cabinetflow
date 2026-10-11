# Avant la première vente

Ce qui doit être fait **avant de signer le premier client payant** (industrialisation). Rien de ceci n'est lancé tant que la décision n'est pas prise, à la suite des retours d'utilisateurs ([validation](tests-utilisateurs.md)). Les détails techniques sont dans [Exploitation](exploitation.md), [Sécurité et données](securite-et-donnees.md) et [Qualité](qualite.md).

## 1. Société et juridique

- [ ] Choisir l'entité qui facture ; compléter les mentions légales (raison sociale, numéro d'immatriculation, adresse, contact RGPD) dans `legal/`.
- [ ] Faire relire par un avocat les conditions d'utilisation, la politique de confidentialité et le modèle de contrat (budget : 1 à 2 k€ pour l'ensemble).
- [ ] Compléter les clauses laissées entre crochets : prix TTC, droit de rétractation (clientèle professionnelle), plafond de responsabilité, juridiction.
- [ ] Souscrire l'assurance responsabilité civile de l'éditeur (≈ 40 € par mois).
- [ ] Choisir le régime de TVA (franchise en base ou 20 %) et paramétrer la facturation.
- [ ] Tenir le registre des traitements et désigner un contact RGPD.

## 2. Paiement

- [ ] Activer le compte Stripe (vérification d'identité), recréer produits, prix et webhook en production ; ne poser `STRIPE_LIVE_AUTORISE=oui` qu'après validation.
- [ ] Rejouer le cycle complet en mode test : essai, abonnement, échec de paiement, relance, résiliation.
- [ ] Décider du traitement des mois offerts après souscription (crédit sur le solde de l'abonné).

## 3. Données et exploitation

- [ ] Passer la base de données sur une offre payante (sauvegardes, pas de mise en pause) avant la première donnée réelle ; tester une restauration.
- [ ] Brancher un serveur d'envoi d'emails dédié, avec domaine authentifié (SPF, DKIM).
- [ ] Exercer le mode comptes réels de bout en bout sur le projet de production : connexion par code, isolation entre deux vrais comptes, export, suppression de compte, purge programmée.
- [ ] Mettre en place une surveillance : alertes sur les erreurs des fonctions serveur et du webhook, échecs de paiement.

## 4. Hygiène du dépôt

- [ ] **Définir l'hôte et l'identifiant FTP en variables de dépôt** (`HOSTINGER_FTP_HOST`, `HOSTINGER_FTP_USER`, `HOSTINGER_REMOTE_DIR`), puis retirer leurs valeurs par défaut du workflow de déploiement. *Reporté jusqu'à l'industrialisation : ces valeurs par défaut font fonctionner le déploiement actuel.*
- [ ] Changer le mot de passe FTP à cette occasion et vérifier que les secrets (FTP, Stripe, clé de chiffrement) ne vivent que dans leurs coffres respectifs.
- [ ] Supprimer le script de build résiduel `scripts/build-artifact.mjs` (il produit un fichier `dist/artifact.html` inutilisé) et ses références dans les workflows.

## Peut suivre les premières ventes

- Notifications par email et SMS (publication, expiration d'une pièce, échéance de reversement).
- Tests de bout en bout dans un navigateur.
- Visibilité de l'annuaire (restreindre au département) et libellé « Absence » pour le motif d'absence.
- Signature électronique qualifiée et contrôle des pièces à la source.
- Rotation de la clé de chiffrement des fiches.
