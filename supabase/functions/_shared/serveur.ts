// Briques communes aux Edge Functions (environnement Deno de Supabase).
import Stripe from 'npm:stripe@17.7.0'
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { enTetesCors, ErreurEntree } from './entrees.ts'

export function env(nom: string): string {
  const valeur = Deno.env.get(nom)
  if (!valeur) throw new Error(`Variable d'environnement manquante : ${nom}`)
  return valeur
}

/** Mode test imposé : une clé live refuse de démarrer tant que STRIPE_LIVE_AUTORISE n'est pas posé. */
export function stripe(): Stripe {
  const cle = env('STRIPE_SECRET_KEY')
  if (cle.startsWith('sk_live_') && Deno.env.get('STRIPE_LIVE_AUTORISE') !== 'oui') {
    throw new Error(
      'Clé Stripe live refusée : poser STRIPE_LIVE_AUTORISE=oui après validation explicite',
    )
  }
  return new Stripe(cle, { httpClient: Stripe.createFetchHttpClient() })
}

export function admin(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  })
}

export const urlApp = () => Deno.env.get('APP_URL') ?? ''

export function json(corps: unknown, statut = 200): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...enTetesCors(urlApp()), 'Content-Type': 'application/json' },
  })
}

export class ErreurHttp extends Error {
  constructor(
    public statut: number,
    message: string,
  ) {
    super(message)
  }
}

export interface Appelant {
  userId: string
  email?: string
  cabinetId: string
}

/** Utilisateur qui appelle (jeton Supabase) et le cabinet dont il est membre. */
export async function cabinetAppelant(req: Request, sb: SupabaseClient): Promise<Appelant> {
  const jeton = req.headers.get('Authorization')?.replace(/^Bearer /, '')
  if (!jeton) throw new ErreurHttp(401, 'Connexion requise')
  const {
    data: { user },
    error,
  } = await sb.auth.getUser(jeton)
  if (error || !user) throw new ErreurHttp(401, 'Session invalide')
  const { data, error: erreurMembre } = await sb
    .from('compte_membres')
    .select('compte_id, comptes!inner(role)')
    .eq('user_id', user.id)
    .eq('comptes.role', 'cabinet')
    .limit(1)
    .maybeSingle()
  if (erreurMembre) throw erreurMembre
  if (!data) throw new ErreurHttp(403, 'Réservé aux comptes cabinet')
  return { userId: user.id, email: user.email, cabinetId: data.compte_id as string }
}

const LIMITE_DEPASSEE = 'P0429'

export async function quota(
  sb: SupabaseClient,
  cle: string,
  max: number,
  secondes: number,
): Promise<void> {
  const { error } = await sb.rpc('verifier_quota', { cle, max, secondes })
  if (error?.code === LIMITE_DEPASSEE)
    throw new ErreurHttp(429, 'Trop de requêtes, réessayez plus tard')
  if (error) throw error
}

/** Enveloppe commune : CORS, POST uniquement, erreurs nettes (jamais de trace interne côté client). */
export function servir(gestionnaire: (req: Request) => Promise<Response>) {
  Deno.serve(async req => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: enTetesCors(urlApp()) })
    if (req.method !== 'POST') return json({ erreur: 'Méthode non autorisée' }, 405)
    try {
      return await gestionnaire(req)
    } catch (e) {
      if (e instanceof ErreurHttp) return json({ erreur: e.message }, e.statut)
      if (e instanceof ErreurEntree) return json({ erreur: e.message }, 400)
      console.error(e)
      return json({ erreur: 'Erreur interne' }, 500)
    }
  })
}
