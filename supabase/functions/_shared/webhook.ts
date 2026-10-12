/**
 * Traitement d'un événement Stripe : de l'événement signé à la ligne d'abonnement du cabinet.
 * Les accès à Stripe et à la base sont injectés (PortsWebhook) : chaque cas se teste sans réseau
 * (webhook.test.ts), et l'Edge Function se réduit à du câblage.
 */
import {
  type AbonnementStripe,
  identifiantClient,
  type LigneAbonnement,
  ligneDepuisAbonnement,
} from './abonnement.ts'

/** Événements traités ; les autres sont acquittés sans effet. Ce sont ceux à cocher dans Stripe. */
export const EVENEMENTS_GERES = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
  'invoice.paid',
  'invoice.payment_failed',
] as const

export interface EvenementStripe {
  id: string
  type: string
  data: { object: object }
}

export type ResultatEcriture = 'ecrit' | 'obsolete' | 'cabinet-inconnu'

export interface PortsWebhook {
  /** L'événement a-t-il déjà été traité jusqu'au bout ? */
  dejaTraite(evenementId: string): Promise<boolean>
  lireAbonnement(abonnementId: string): Promise<AbonnementStripe>
  /** Cabinet auquel notre base rattache déjà ce client Stripe. */
  cabinetDuClient(clientId: string): Promise<string | undefined>
  enregistrer(ligne: LigneAbonnement): Promise<ResultatEcriture>
  marquerTraite(evenementId: string, type: string): Promise<void>
  maintenant(): Date
}

export type Issue =
  | 'ignore'
  | 'deja-traite'
  | 'sans-abonnement'
  | 'hors-application'
  | 'cabinet-inconnu'
  | 'obsolete'
  | 'enregistre'

interface References {
  abonnementId?: string
  cabinetId?: string
}

const identifiant = (valeur: unknown): string | undefined => {
  if (typeof valeur === 'string') return valeur
  const id = (valeur as { id?: unknown } | null)?.id
  return typeof id === 'string' ? id : undefined
}

/** Ce que l'événement dit de l'abonnement concerné, selon le type d'objet que Stripe y joint. */
export function referencesDepuisEvenement(evenement: EvenementStripe): References {
  const objet = evenement.data.object as Record<string, unknown>
  if (evenement.type === 'checkout.session.completed') {
    return {
      abonnementId: identifiant(objet.subscription),
      cabinetId: identifiant(objet.client_reference_id),
    }
  }
  if (evenement.type.startsWith('customer.subscription.'))
    return { abonnementId: identifiant(objet.id) }
  if (evenement.type.startsWith('invoice.')) {
    // Selon la version d'API du point de terminaison, l'abonnement est à la racine ou sous « parent ».
    const parent = objet.parent as { subscription_details?: { subscription?: unknown } } | undefined
    return {
      abonnementId:
        identifiant(objet.subscription) ?? identifiant(parent?.subscription_details?.subscription),
    }
  }
  return {}
}

/**
 * On relit toujours l'abonnement chez Stripe plutôt que de se fier à l'événement : l'ordre
 * d'arrivée n'est pas garanti, et la lecture donne l'état d'aujourd'hui. Une erreur est
 * relancée : l'événement n'est alors pas marqué et Stripe le renverra.
 */
export async function traiterEvenement(
  evenement: EvenementStripe,
  ports: PortsWebhook,
): Promise<Issue> {
  if (!(EVENEMENTS_GERES as readonly string[]).includes(evenement.type)) return 'ignore'
  if (await ports.dejaTraite(evenement.id)) return 'deja-traite'

  const references = referencesDepuisEvenement(evenement)
  if (!references.abonnementId) return 'sans-abonnement'

  const abonnement = await ports.lireAbonnement(references.abonnementId)
  const luLe = ports.maintenant()
  const cabinetId =
    references.cabinetId ??
    abonnement.metadata?.cabinet_id ??
    (await ports.cabinetDuClient(identifiantClient(abonnement)))
  // Un abonnement sans cabinet connu n'est pas le nôtre (autre produit sur le même compte Stripe).
  if (!cabinetId) return 'hors-application'

  const resultat = await ports.enregistrer(ligneDepuisAbonnement(abonnement, cabinetId, luLe))
  if (resultat === 'cabinet-inconnu') return 'cabinet-inconnu'
  await ports.marquerTraite(evenement.id, evenement.type)
  return resultat === 'ecrit' ? 'enregistre' : 'obsolete'
}
