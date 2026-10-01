// Webhook Stripe : seule source de vérité de public.subscriptions.
// Signature vérifiée, événements idempotents (public.stripe_events), réponse 2xx rapide.
// À déployer SANS vérification JWT : `supabase functions deploy stripe-webhook --no-verify-jwt`.
import type Stripe from 'npm:stripe@17.7.0'
import { admin, env, stripe } from '../_shared/serveur.ts'
import { type AbonnementStripe, evenementGere, ligneDepuisAbonnement } from '../_shared/stripe-logique.ts'

const fournisseurCrypto = (await import('npm:stripe@17.7.0')).default.createSubtleCryptoProvider()

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Méthode non autorisée', { status: 405 })
  const signature = req.headers.get('Stripe-Signature')
  if (!signature) return new Response('Signature absente', { status: 400 })
  const st = stripe()
  let evt: Stripe.Event
  try {
    evt = await st.webhooks.constructEventAsync(await req.text(), signature, env('STRIPE_WEBHOOK_SECRET'), undefined, fournisseurCrypto)
  } catch {
    return new Response('Signature invalide', { status: 400 })
  }
  if (!evenementGere(evt.type)) return new Response('ignoré', { status: 200 })

  const sb = admin()
  const { error: doublon } = await sb.from('stripe_events').insert({ id: evt.id, type: evt.type })
  if (doublon) return new Response('déjà traité', { status: 200 })

  try {
    let abonnementId: string | undefined
    let cabinetId: string | undefined
    const objet = evt.data.object as unknown as Record<string, unknown>
    if (evt.type === 'checkout.session.completed') {
      abonnementId = objet.subscription as string | undefined
      cabinetId = objet.client_reference_id as string | undefined
    } else if (evt.type.startsWith('customer.subscription.')) {
      abonnementId = objet.id as string
    } else if (evt.type.startsWith('invoice.')) {
      abonnementId = (objet.subscription as string | undefined)
        ?? ((objet.parent as { subscription_details?: { subscription?: string } } | undefined)?.subscription_details?.subscription)
    }
    if (!abonnementId) return new Response('sans abonnement', { status: 200 })

    // On relit toujours l'abonnement chez Stripe : l'ordre d'arrivée des événements n'est pas garanti.
    const sub = await st.subscriptions.retrieve(abonnementId) as unknown as AbonnementStripe
    cabinetId ??= sub.metadata?.cabinet_id
    if (!cabinetId) {
      const client = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
      const { data } = await sb.from('subscriptions').select('cabinet_id').eq('stripe_customer_id', client).maybeSingle()
      cabinetId = data?.cabinet_id
    }
    if (!cabinetId) throw new Error(`Cabinet introuvable pour ${abonnementId}`)
    const { error } = await sb.from('subscriptions').upsert(ligneDepuisAbonnement(sub, cabinetId), { onConflict: 'cabinet_id' })
    if (error) throw error
    return new Response('ok', { status: 200 })
  } catch (e) {
    // Échec : on retire la trace d'idempotence pour que Stripe puisse réessayer.
    await sb.from('stripe_events').delete().eq('id', evt.id)
    console.error(e)
    return new Response('erreur', { status: 500 })
  }
})
