// Webhook Stripe : met à jour public.subscriptions à chaque changement d'abonnement.
// Déployé sans vérification JWT (Stripe n'a pas de jeton Supabase) : l'authenticité vient de la signature.
import Stripe from 'npm:stripe@17.7.0'
import { admin, env, stripe } from '../_shared/serveur.ts'
import { portsWebhook } from '../_shared/stripe-ports.ts'
import { traiterEvenement } from '../_shared/webhook.ts'

const fournisseurCrypto = Stripe.createSubtleCryptoProvider()

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Méthode non autorisée', { status: 405 })
  const signature = req.headers.get('Stripe-Signature')
  if (!signature) return new Response('Signature absente', { status: 400 })

  const st = stripe()
  const secret = env('STRIPE_WEBHOOK_SECRET')
  let evenement: Stripe.Event
  try {
    evenement = await st.webhooks.constructEventAsync(await req.text(), signature, secret, undefined, fournisseurCrypto)
  } catch {
    return new Response('Signature invalide', { status: 400 })
  }

  try {
    const issue = await traiterEvenement(evenement, portsWebhook(st, admin()))
    console.log(`stripe-webhook ${evenement.id} ${evenement.type} → ${issue}`)
    return new Response(issue)
  } catch (e) {
    console.error(`stripe-webhook ${evenement.id} ${evenement.type}`, e)
    return new Response('erreur', { status: 500 })
  }
})
