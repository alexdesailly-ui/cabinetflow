/**
 * Ce que le site propose au public. Le Lot 1, l'annonce d'absence sur WhatsApp, est gratuit, sans
 * compte et sans serveur. Le produit complet (comptes, remplacements, contrat, honoraires) reste
 * dans le code et s'active au build avec VITE_PRODUIT_COMPLET=oui, pour les essais et le Lot 2.
 */
export const PRODUIT_COMPLET = import.meta.env.VITE_PRODUIT_COMPLET === 'oui'

/** Adresse où le public écrit ses remarques ; sans elle, aucun lien d'avis n'est affiché. */
export const CONTACT = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) || undefined
