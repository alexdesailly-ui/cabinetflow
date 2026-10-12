// Essai des Edge Functions de bout en bout, sans réseau : Stripe et PostgREST sont remplacés par de
// fausses réponses HTTP. Cela vérifie le câblage réel (SDK Stripe, signature des webhooks, requêtes
// de supabase-js) que les tests unitaires de _shared ne voient pas.
//   cd supabase/functions && deno test -A fonctions_test.ts
import assert from 'node:assert/strict'
import Stripe from 'npm:stripe@17.7.0'

const APP = 'https://app.test/'
const SUPABASE = 'http://supabase.test'
const STRIPE = 'https://api.stripe.com'

Deno.env.set('SUPABASE_URL', SUPABASE)
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'cle-service-de-test')
Deno.env.set('STRIPE_SECRET_KEY', 'sk_test_0000')
Deno.env.set('STRIPE_WEBHOOK_SECRET', 'whsec_test')
Deno.env.set('STRIPE_PRICE_MENSUEL', 'price_mensuel')
Deno.env.set('STRIPE_PRICE_ANNUEL', 'price_annuel')
Deno.env.set('APP_URL', APP)

type Gestionnaire = (req: Request) => Response | Promise<Response>

const gestionnaires = new Map<string, Gestionnaire>()

/** Charge une Edge Function (une seule fois) en interceptant Deno.serve pour récupérer son gestionnaire. */
async function charger(fonction: string): Promise<Gestionnaire> {
  const connu = gestionnaires.get(fonction)
  if (connu) return connu
  let gestionnaire: Gestionnaire | undefined
  const serveOrigine = Deno.serve
  Deno.serve = ((h: Gestionnaire) => {
    gestionnaire = h
    return {}
  }) as unknown as typeof Deno.serve
  try {
    await import(`./${fonction}/index.ts`)
  } finally {
    Deno.serve = serveOrigine
  }
  assert(gestionnaire, `${fonction} n'appelle pas Deno.serve`)
  gestionnaires.set(fonction, gestionnaire)
  return gestionnaire
}

interface Appel {
  methode: string
  url: URL
  corps: string
  entetes: Headers
}
type Route = (appel: Appel) => unknown

/** Remplace fetch : chaque requête est routée par « MÉTHODE origine/chemin » et consignée. */
function simuler(routes: Record<string, Route>): Appel[] {
  const appels: Appel[] = []
  globalThis.fetch = async (entree: Request | URL | string, init?: RequestInit) => {
    const requete = new Request(entree, init)
    const url = new URL(requete.url)
    const appel = {
      methode: requete.method,
      url,
      corps: await requete.text(),
      entetes: requete.headers,
    }
    appels.push(appel)
    const route = routes[`${requete.method} ${url.origin}${url.pathname}`]
    if (!route)
      return Response.json(
        { message: `route non prévue : ${requete.method} ${url.origin}${url.pathname}` },
        { status: 599 },
      )
    const reponse = route(appel)
    return reponse instanceof Response ? reponse : Response.json(reponse)
  }
  return appels
}

const appelsVers = (appels: Appel[], methode: string, origine: string, chemin: string) =>
  appels.filter(a => a.methode === methode && a.url.origin === origine && a.url.pathname === chemin)

const formulaire = (appel: Appel) => new URLSearchParams(appel.corps)

// ---------------------------------------------------------------------------------------------
// Fausses données
// ---------------------------------------------------------------------------------------------

const utilisateur = {
  id: 'user-1',
  email: 'marie@exemple.fr',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-10-01T00:00:00Z',
}

const abonnementStripe = (extra: Record<string, unknown> = {}) => ({
  id: 'sub_1',
  object: 'subscription',
  customer: 'cus_1',
  status: 'active',
  created: 1_790_000_000,
  cancel_at_period_end: false,
  trial_end: null,
  metadata: { cabinet_id: 'cab-1' },
  items: {
    object: 'list',
    data: [
      {
        id: 'si_1',
        price: { id: 'price_mensuel', recurring: { interval: 'month' } },
        current_period_end: 1_793_000_000,
      },
    ],
  },
  ...extra,
})

/** Routes communes : jeton valide, utilisateur membre du cabinet « cab-1 », aucune limite de débit atteinte. */
const routesCabinet = (extra: Record<string, Route> = {}): Record<string, Route> => ({
  [`GET ${SUPABASE}/auth/v1/user`]: () => utilisateur,
  [`GET ${SUPABASE}/rest/v1/compte_membres`]: () => [
    { compte_id: 'cab-1', comptes: { role: 'cabinet' } },
  ],
  [`POST ${SUPABASE}/rest/v1/rpc/verifier_quota`]: () => new Response(null, { status: 204 }),
  ...extra,
})

const requeteJson = (corps: unknown, jeton: string | null = 'jeton-valide') =>
  new Request('http://fonction.test/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
    },
    body: JSON.stringify(corps),
  })

// ---------------------------------------------------------------------------------------------
// stripe-webhook
// ---------------------------------------------------------------------------------------------

const evenementMiseAJour = JSON.stringify({
  id: 'evt_1',
  object: 'event',
  type: 'customer.subscription.updated',
  data: { object: { id: 'sub_1', object: 'subscription' } },
})

async function livraison(charge: string, secret = 'whsec_test') {
  const signature = await new Stripe('sk_test_0000').webhooks.generateTestHeaderStringAsync({
    payload: charge,
    secret,
    cryptoProvider: Stripe.createSubtleCryptoProvider(),
  })
  return new Request('http://fonction.test/', {
    method: 'POST',
    headers: { 'Stripe-Signature': signature },
    body: charge,
  })
}

const routesWebhook = (extra: Record<string, Route> = {}): Record<string, Route> => ({
  [`GET ${SUPABASE}/rest/v1/stripe_events`]: () => [],
  [`GET ${STRIPE}/v1/subscriptions/sub_1`]: () => abonnementStripe(),
  [`POST ${SUPABASE}/rest/v1/rpc/enregistrer_abonnement`]: () => true,
  [`POST ${SUPABASE}/rest/v1/stripe_events`]: () => new Response(null, { status: 201 }),
  ...extra,
})

Deno.test('webhook : refuse ce qui n’est pas un POST signé par Stripe', async () => {
  const webhook = await charger('stripe-webhook')
  const appels = simuler({})
  assert.equal((await webhook(new Request('http://fonction.test/', { method: 'GET' }))).status, 405)
  assert.equal(
    (
      await webhook(
        new Request('http://fonction.test/', { method: 'POST', body: evenementMiseAJour }),
      )
    ).status,
    400,
  )
  assert.equal((await webhook(await livraison(evenementMiseAJour, 'whsec_autre'))).status, 400)
  assert.equal(appels.length, 0, 'aucune requête sortante tant que la signature n’est pas vérifiée')
})

Deno.test('webhook : un événement signé met à jour l’abonnement du cabinet', async () => {
  const webhook = await charger('stripe-webhook')
  const appels = simuler(routesWebhook())
  const reponse = await webhook(await livraison(evenementMiseAJour))
  assert.equal(reponse.status, 200)
  assert.equal(await reponse.text(), 'enregistre')

  const [ecriture] = appelsVers(appels, 'POST', SUPABASE, '/rest/v1/rpc/enregistrer_abonnement')
  assert(ecriture, 'l’abonnement doit être enregistré')
  assert.equal(ecriture.entetes.get('apikey'), 'cle-service-de-test')
  const { ligne } = JSON.parse(ecriture.corps)
  assert.equal(ligne.cabinet_id, 'cab-1')
  assert.equal(ligne.stripe_subscription_id, 'sub_1')
  assert.equal(ligne.statut, 'active')
  assert.equal(ligne.intervalle, 'month')
  assert.equal(ligne.current_period_end, new Date(1_793_000_000_000).toISOString())

  const [marque] = appelsVers(appels, 'POST', SUPABASE, '/rest/v1/stripe_events')
  assert.deepEqual(JSON.parse(marque.corps), { id: 'evt_1', type: 'customer.subscription.updated' })
  assert.match(marque.url.search, /on_conflict=id/)
})

Deno.test('webhook : un événement déjà traité n’est pas rejoué', async () => {
  const webhook = await charger('stripe-webhook')
  const appels = simuler(
    routesWebhook({ [`GET ${SUPABASE}/rest/v1/stripe_events`]: () => [{ id: 'evt_1' }] }),
  )
  const reponse = await webhook(await livraison(evenementMiseAJour))
  assert.equal(await reponse.text(), 'deja-traite')
  assert.equal(appelsVers(appels, 'GET', STRIPE, '/v1/subscriptions/sub_1').length, 0)
})

Deno.test('webhook : Stripe injoignable → 500, pour que Stripe renvoie l’événement', async () => {
  const webhook = await charger('stripe-webhook')
  const appels = simuler(
    routesWebhook({
      [`GET ${STRIPE}/v1/subscriptions/sub_1`]: () =>
        Response.json(
          { error: { type: 'invalid_request_error', code: 'resource_missing', message: 'absent' } },
          { status: 404 },
        ),
    }),
  )
  const reponse = await webhook(await livraison(evenementMiseAJour))
  assert.equal(reponse.status, 500)
  assert.equal(
    appelsVers(appels, 'POST', SUPABASE, '/rest/v1/stripe_events').length,
    0,
    'l’événement ne doit pas être marqué',
  )
})

Deno.test('webhook : écriture refusée par la base → 500', async () => {
  const webhook = await charger('stripe-webhook')
  simuler(
    routesWebhook({
      [`POST ${SUPABASE}/rest/v1/rpc/enregistrer_abonnement`]: () =>
        Response.json({ code: '42501', message: 'permission denied' }, { status: 403 }),
    }),
  )
  assert.equal((await webhook(await livraison(evenementMiseAJour))).status, 500)
})

Deno.test('webhook : un cabinet supprimé est acquitté, sans nouvelle tentative', async () => {
  const webhook = await charger('stripe-webhook')
  simuler(
    routesWebhook({
      [`POST ${SUPABASE}/rest/v1/rpc/enregistrer_abonnement`]: () =>
        Response.json(
          { code: '23503', message: 'violates foreign key constraint' },
          { status: 409 },
        ),
    }),
  )
  const reponse = await webhook(await livraison(evenementMiseAJour))
  assert.equal(reponse.status, 200)
  assert.equal(await reponse.text(), 'cabinet-inconnu')
})

// ---------------------------------------------------------------------------------------------
// stripe-checkout
// ---------------------------------------------------------------------------------------------

const routesCheckout = (extra: Record<string, Route> = {}): Record<string, Route> =>
  routesCabinet({
    [`GET ${SUPABASE}/rest/v1/subscriptions`]: () => [],
    [`POST ${SUPABASE}/rest/v1/rpc/essai_restant_jours`]: () => 34,
    [`POST ${SUPABASE}/rest/v1/rpc/enregistrer_abonnement`]: () => true,
    [`POST ${STRIPE}/v1/customers`]: () => ({ id: 'cus_nouveau', object: 'customer' }),
    [`POST ${STRIPE}/v1/checkout/sessions`]: () => ({
      id: 'cs_1',
      object: 'checkout.session',
      url: 'https://checkout.stripe.test/cs_1',
    }),
    ...extra,
  })

Deno.test('checkout : crée le client, reporte l’essai restant et renvoie vers Stripe', async () => {
  const checkout = await charger('stripe-checkout')
  const appels = simuler(routesCheckout())
  const reponse = await checkout(
    requeteJson({ intervalle: 'year', retour: 'https://app.test/#/compte' }),
  )
  assert.equal(reponse.status, 200)
  assert.deepEqual(await reponse.json(), { url: 'https://checkout.stripe.test/cs_1' })

  const [client] = appelsVers(appels, 'POST', STRIPE, '/v1/customers')
  assert.equal(client.entetes.get('Idempotency-Key'), 'client-cab-1')
  assert.equal(formulaire(client).get('metadata[cabinet_id]'), 'cab-1')

  const [provisoire] = appelsVers(appels, 'POST', SUPABASE, '/rest/v1/rpc/enregistrer_abonnement')
  assert.equal(
    JSON.parse(provisoire.corps).ligne.stripe_customer_id,
    'cus_nouveau',
    'le client est noté avant le paiement',
  )

  const [session] = appelsVers(appels, 'POST', STRIPE, '/v1/checkout/sessions')
  const champs = formulaire(session)
  assert.equal(champs.get('mode'), 'subscription')
  assert.equal(champs.get('customer'), 'cus_nouveau')
  assert.equal(champs.get('client_reference_id'), 'cab-1')
  assert.equal(champs.get('line_items[0][price]'), 'price_annuel')
  assert.equal(champs.get('subscription_data[trial_period_days]'), '34')
  assert.equal(champs.get('subscription_data[metadata][cabinet_id]'), 'cab-1')
  assert.equal(champs.get('success_url'), 'https://app.test/?paiement=ok#/compte')
  assert.equal(champs.get('cancel_url'), 'https://app.test/#/compte')
  assert.equal(champs.get('locale'), 'fr')
})

Deno.test(
  'checkout : réutilise le client existant et n’envoie aucun essai quand il est épuisé',
  async () => {
    const checkout = await charger('stripe-checkout')
    const appels = simuler(
      routesCheckout({
        [`GET ${SUPABASE}/rest/v1/subscriptions`]: () => [
          { stripe_customer_id: 'cus_existant', statut: 'canceled' },
        ],
        [`POST ${SUPABASE}/rest/v1/rpc/essai_restant_jours`]: () => 0,
      }),
    )
    assert.equal((await checkout(requeteJson({ intervalle: 'month' }))).status, 200)
    assert.equal(appelsVers(appels, 'POST', STRIPE, '/v1/customers').length, 0)
    const champs = formulaire(appelsVers(appels, 'POST', STRIPE, '/v1/checkout/sessions')[0])
    assert.equal(champs.get('customer'), 'cus_existant')
    assert.equal(champs.get('line_items[0][price]'), 'price_mensuel')
    assert.equal(champs.has('subscription_data[trial_period_days]'), false)
    assert.equal(champs.get('success_url'), 'https://app.test/?paiement=ok')
  },
)

Deno.test(
  'checkout : refuse un second abonnement, une redirection étrangère et un appel sans droit',
  async () => {
    const checkout = await charger('stripe-checkout')

    simuler(
      routesCheckout({
        [`GET ${SUPABASE}/rest/v1/subscriptions`]: () => [
          { stripe_customer_id: 'cus_1', statut: 'active' },
        ],
      }),
    )
    assert.equal((await checkout(requeteJson({ intervalle: 'month' }))).status, 409)

    simuler(routesCheckout())
    const etranger = await checkout(requeteJson({ retour: 'https://pirate.example/' }))
    assert.equal(etranger.status, 400)

    simuler(routesCheckout())
    assert.equal((await checkout(requeteJson({}, null))).status, 401)

    simuler(routesCheckout({ [`GET ${SUPABASE}/rest/v1/compte_membres`]: () => [] }))
    assert.equal((await checkout(requeteJson({}))).status, 403)

    simuler(
      routesCheckout({
        [`GET ${SUPABASE}/auth/v1/user`]: () =>
          Response.json({ message: 'invalid JWT' }, { status: 401 }),
      }),
    )
    assert.equal((await checkout(requeteJson({}))).status, 401)
  },
)

Deno.test('checkout : au-delà de la limite de débit → 429', async () => {
  const checkout = await charger('stripe-checkout')
  simuler(
    routesCheckout({
      [`POST ${SUPABASE}/rest/v1/rpc/verifier_quota`]: () =>
        Response.json({ code: 'P0429', message: 'Trop de requêtes' }, { status: 400 }),
    }),
  )
  assert.equal((await checkout(requeteJson({}))).status, 429)
})

Deno.test(
  'checkout : une panne de la base n’est pas présentée comme une limite de débit',
  async () => {
    const checkout = await charger('stripe-checkout')
    simuler(
      routesCheckout({
        [`POST ${SUPABASE}/rest/v1/rpc/verifier_quota`]: () =>
          Response.json({ code: '57P01', message: 'arrêt' }, { status: 500 }),
      }),
    )
    assert.equal((await checkout(requeteJson({}))).status, 500)
  },
)

Deno.test('checkout : répond au contrôle CORS de l’application et à elle seule', async () => {
  const checkout = await charger('stripe-checkout')
  const reponse = await checkout(new Request('http://fonction.test/', { method: 'OPTIONS' }))
  assert.equal(reponse.headers.get('Access-Control-Allow-Origin'), 'https://app.test')
})

// ---------------------------------------------------------------------------------------------
// stripe-portal
// ---------------------------------------------------------------------------------------------

Deno.test('portail : ouvre le portail du client Stripe du cabinet', async () => {
  const portail = await charger('stripe-portal')
  const appels = simuler(
    routesCabinet({
      [`GET ${SUPABASE}/rest/v1/subscriptions`]: () => [{ stripe_customer_id: 'cus_1' }],
      [`POST ${STRIPE}/v1/billing_portal/sessions`]: () => ({
        id: 'bps_1',
        object: 'billing_portal.session',
        url: 'https://portail.stripe.test/bps_1',
      }),
    }),
  )
  const reponse = await portail(requeteJson({ retour: 'https://app.test/#/compte' }))
  assert.deepEqual(await reponse.json(), { url: 'https://portail.stripe.test/bps_1' })
  const champs = formulaire(appelsVers(appels, 'POST', STRIPE, '/v1/billing_portal/sessions')[0])
  assert.equal(champs.get('customer'), 'cus_1')
  assert.equal(champs.get('return_url'), 'https://app.test/#/compte')
})

Deno.test('portail : 404 tant que le cabinet n’a jamais eu d’abonnement', async () => {
  const portail = await charger('stripe-portal')
  simuler(routesCabinet({ [`GET ${SUPABASE}/rest/v1/subscriptions`]: () => [] }))
  assert.equal((await portail(requeteJson({}))).status, 404)
})

// ---------------------------------------------------------------------------------------------
// stripe-sync
// ---------------------------------------------------------------------------------------------

Deno.test('synchronisation : aligne le cabinet sur l’abonnement en cours chez Stripe', async () => {
  const synchro = await charger('stripe-sync')
  const appels = simuler(
    routesCabinet({
      [`GET ${SUPABASE}/rest/v1/subscriptions`]: () => [{ stripe_customer_id: 'cus_1' }],
      [`GET ${STRIPE}/v1/subscriptions`]: () => ({
        object: 'list',
        data: [
          abonnementStripe({ id: 'sub_ancien', status: 'canceled', created: 1_800_000_000 }),
          abonnementStripe({ id: 'sub_courant', status: 'trialing' }),
        ],
      }),
      [`POST ${SUPABASE}/rest/v1/rpc/enregistrer_abonnement`]: () => true,
    }),
  )
  const reponse = await synchro(requeteJson({}))
  assert.deepEqual(await reponse.json(), { statut: 'trialing' })
  const { ligne } = JSON.parse(
    appelsVers(appels, 'POST', SUPABASE, '/rest/v1/rpc/enregistrer_abonnement')[0].corps,
  )
  assert.equal(ligne.stripe_subscription_id, 'sub_courant')
  assert.equal(ligne.cabinet_id, 'cab-1')
  const liste = appelsVers(appels, 'GET', STRIPE, '/v1/subscriptions')[0]
  assert.equal(liste.url.searchParams.get('customer'), 'cus_1')
})

Deno.test('synchronisation : rien à faire sans client Stripe', async () => {
  const synchro = await charger('stripe-sync')
  const appels = simuler(routesCabinet({ [`GET ${SUPABASE}/rest/v1/subscriptions`]: () => [] }))
  assert.deepEqual(await (await synchro(requeteJson({}))).json(), { statut: null })
  assert.equal(appels.filter(a => a.url.origin === STRIPE).length, 0)
})
