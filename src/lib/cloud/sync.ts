/**
 * Synchronisation entre le store local et Supabase.
 * - chargement : tout ce que la RLS autorise à voir → état de l'application ;
 * - écriture : chaque mutation est traduite en opérations (mapping.ts) et
 *   envoyée dans l'ordre ; puis l'état est rechargé pour récupérer ce que le
 *   serveur calcule (dates de signature, parrainage, abonnement).
 * En cas de refus serveur (RLS, garde métier), l'état est rechargé : l'écran
 * revient à la vérité du serveur et un message explique pourquoi.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { getEtat, passerEnCloud, remplacerEtat, type Etat } from '../store'
import { difference, type Ligne, type Operation, versEtat } from './mapping'

export type Client = SupabaseClient

export function signalerErreur(message: string) {
  window.dispatchEvent(new CustomEvent('releve:erreur', { detail: message }))
}

async function tout<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p
  if (error) throw new Error(error.message)
  return (data ?? []) as T
}

export async function charger(client: Client): Promise<Etat> {
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Session expirée')
  const [membres, annuaire, comptes, pieces, missions, candidatures, contrats, lignes, recos, invitations, badges, fiches, abonnements, parametres] = await Promise.all([
    tout<Ligne[]>(client.from('compte_membres').select('*')),
    tout<Ligne[]>(client.rpc('annuaire')),
    tout<Ligne[]>(client.from('comptes').select('*')),
    tout<Ligne[]>(client.from('pieces').select('*')),
    tout<Ligne[]>(client.from('missions').select('*')),
    tout<Ligne[]>(client.from('candidatures').select('*')),
    tout<Ligne[]>(client.from('contrats').select('*')),
    tout<Ligne[]>(client.from('lignes_retrocession').select('*')),
    tout<Ligne[]>(client.from('recommandations').select('*')),
    tout<Ligne[]>(client.from('invitations').select('*')),
    tout<Ligne[]>(client.from('badges').select('*')),
    tout<Ligne[]>(client.rpc('fiches_visibles')),
    tout<Ligne[]>(client.from('subscriptions').select('*')),
    tout<Ligne>(client.rpc('parametres_publics')),
  ])
  return versEtat({ membres, annuaire, comptes, pieces, missions, candidatures, contrats, lignes, recos, invitations, badges, fiches, abonnements, parametres, email: user.email, userId: user.id })
}

export async function appliquer(client: Client, ops: Operation[]): Promise<void> {
  for (const op of ops) {
    let res: { error: { message: string } | null }
    if (op.type === 'insert') res = await client.from(op.table).insert(op.valeurs)
    else if (op.type === 'update') res = await client.from(op.table).update(op.valeurs).match(op.cle)
    else if (op.type === 'delete') res = await client.from(op.table).delete().match(op.cle)
    else res = await client.rpc(op.fonction, op.args)
    if (res.error) throw new Error(traduire(res.error.message))
  }
}

/** Messages serveur → phrases lisibles par un infirmier. */
export function traduire(message: string): string {
  if (/row-level security|permission denied/i.test(message)) {
    return /missions/i.test(message)
      ? 'Action refusée : votre période d’essai est terminée ou vous n’avez pas les droits sur ce remplacement.'
      : 'Action refusée : vous n’avez pas les droits nécessaires.'
  }
  if (/Trop de requêtes/i.test(message)) return 'Trop de requêtes : réessayez dans quelques minutes.'
  return message
}

let file: Promise<void> = Promise.resolve()

/** Démarre la synchronisation pour la personne connectée. */
export async function demarrer(client: Client): Promise<void> {
  const initial = await charger(client)
  passerEnCloud(initial, (avant, apres) => {
    const ops = difference(avant, apres)
    if (!ops.length) return
    // Une seule file d'écriture : l'ordre des mutations est préservé.
    file = file.then(async () => {
      marquer('en-cours')
      try {
        await appliquer(client, ops)
      } catch (e) {
        signalerErreur(e instanceof Error ? e.message : String(e))
      }
      try {
        remplacerEtat({ ...(await charger(client)), session: getEtat().session })
      } catch (e) {
        marquer('erreur')
        signalerErreur('Connexion perdue : rechargez la page. Votre dernière modification n’a peut-être pas été enregistrée.')
        console.error(e)
      }
    })
  })
}

function marquer(s: 'ok' | 'en-cours' | 'erreur') {
  const e = getEtat()
  if (e.cloud) remplacerEtat({ ...e, cloud: { ...e.cloud, synchronisation: s } })
}

export async function recharger(client: Client) {
  remplacerEtat(await charger(client))
}
