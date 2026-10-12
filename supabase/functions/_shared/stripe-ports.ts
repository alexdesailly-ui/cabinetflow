// Accès à Stripe et à la base pour les Edge Functions (environnement Deno de Supabase).
import type Stripe from 'npm:stripe@17.7.0'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import type { AbonnementStripe, LigneAbonnement } from './abonnement.ts'
import type { PortsWebhook, ResultatEcriture } from './webhook.ts'

const VIOLATION_CLE_ETRANGERE = '23503'

/** Écrit l'abonnement par la fonction SQL, qui écarte une lecture plus ancienne que l'état enregistré. */
export async function enregistrerAbonnement(
  sb: SupabaseClient,
  ligne: LigneAbonnement,
): Promise<ResultatEcriture> {
  const { data, error } = await sb.rpc('enregistrer_abonnement', { ligne })
  if (error?.code === VIOLATION_CLE_ETRANGERE) return 'cabinet-inconnu'
  if (error) throw error
  return data ? 'ecrit' : 'obsolete'
}

export function portsWebhook(st: Stripe, sb: SupabaseClient): PortsWebhook {
  return {
    async dejaTraite(evenementId) {
      const { data, error } = await sb
        .from('stripe_events')
        .select('id')
        .eq('id', evenementId)
        .maybeSingle()
      if (error) throw error
      return data !== null
    },
    async lireAbonnement(abonnementId) {
      return (await st.subscriptions.retrieve(abonnementId)) as unknown as AbonnementStripe
    },
    async cabinetDuClient(clientId) {
      const { data, error } = await sb
        .from('subscriptions')
        .select('cabinet_id')
        .eq('stripe_customer_id', clientId)
        .maybeSingle()
      if (error) throw error
      return data?.cabinet_id
    },
    enregistrer: ligne => enregistrerAbonnement(sb, ligne),
    async marquerTraite(evenementId, type) {
      const { error } = await sb
        .from('stripe_events')
        .upsert({ id: evenementId, type }, { onConflict: 'id', ignoreDuplicates: true })
      if (error) throw error
    },
    maintenant: () => new Date(),
  }
}
