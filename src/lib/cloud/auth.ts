/**
 * Comptes réels : connexion par code à 6 chiffres reçu par email (OTP Supabase).
 * Pourquoi un code plutôt qu'un lien magique : un lien ouvert depuis WhatsApp
 * puis depuis l'app Mail s'ouvre souvent dans DEUX navigateurs différents ;
 * le code se tape là où l'utilisateur se trouve déjà.
 * Le profil saisi à l'inscription voyage dans les métadonnées de l'utilisateur :
 * il survit à un changement d'appareil entre l'envoi et la saisie du code.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { passerEnDemo } from '../store'
import { MODE_CLOUD, SUPABASE_ANON_KEY, SUPABASE_URL } from './config'
import { demarrer, signalerErreur, traduire } from './sync'

let client: SupabaseClient | null = null

export function supabase(): SupabaseClient {
  if (!MODE_CLOUD) throw new Error('Mode cloud non configuré')
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  return client
}

export interface Inscription {
  role: 'cabinet' | 'remplacant'
  donnees: Record<string, unknown>
  parrain?: string
}

const CLE_INSCRIPTION = 'releve:inscription'

export function memoriserInscription(i: Inscription) {
  try { sessionStorage.setItem(CLE_INSCRIPTION, JSON.stringify(i)) } catch { /* navigation privée */ }
}
function inscriptionMemorisee(): Inscription | null {
  try { return JSON.parse(sessionStorage.getItem(CLE_INSCRIPTION) ?? 'null') } catch { return null }
}

export async function envoyerCode(email: string): Promise<void> {
  const inscription = inscriptionMemorisee()
  const { error } = await supabase().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, data: inscription ? { inscription } : undefined },
  })
  if (error) throw new Error(/rate|seconds/i.test(error.message) ? 'Patientez une minute avant de redemander un code.' : error.message)
}

export async function verifierCode(email: string, code: string): Promise<'pret' | 'profil-a-completer'> {
  const { error } = await supabase().auth.verifyOtp({ email, token: code.trim(), type: 'email' })
  if (error) throw new Error('Code invalide ou expiré.')
  return ouvrirSession()
}

/** Crée le compte applicatif si besoin, puis charge les données. */
export async function ouvrirSession(): Promise<'pret' | 'profil-a-completer'> {
  const sb = supabase()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Session absente')
  const { data: membres, error } = await sb.from('compte_membres').select('compte_id').limit(1)
  if (error) throw new Error(traduire(error.message))
  if (!membres?.length) {
    const i = inscriptionMemorisee() ?? (user.user_metadata?.inscription as Inscription | undefined)
    if (!i) return 'profil-a-completer'
    await creerCompteCloud(i)
  }
  await demarrer(sb)
  return 'pret'
}

export async function creerCompteCloud(i: Inscription): Promise<void> {
  const { error } = await supabase().rpc('creer_compte', { donnees: { ...i.donnees, role: i.role }, code_parrain_invitant: i.parrain ?? null })
  if (error) throw new Error(traduire(error.message))
  try { sessionStorage.removeItem(CLE_INSCRIPTION) } catch { /* rien */ }
}

/** Au chargement de la page : reprend la session existante, écoute les déconnexions. */
export async function initialiserCloud(): Promise<void> {
  if (!MODE_CLOUD) return
  const sb = supabase()
  sb.auth.onAuthStateChange(evenement => { if (evenement === 'SIGNED_OUT') passerEnDemo() })
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return
  try {
    const r = await ouvrirSession()
    if (r === 'profil-a-completer') location.hash = '#/onboarding/cabinet'
  } catch (e) {
    signalerErreur(e instanceof Error ? e.message : String(e))
  }
}

export async function deconnecter() {
  await supabase().auth.signOut()
  passerEnDemo()
}

export async function exporterMesDonnees() {
  const { data, error } = await supabase().rpc('rgpd_export')
  if (error) throw new Error(traduire(error.message))
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: `releve-mes-donnees-${new Date().toISOString().slice(0, 10)}.json` })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function supprimerMonCompte() {
  const { error } = await supabase().rpc('rgpd_supprimer_mon_compte', { confirmation: 'SUPPRIMER' })
  if (error) throw new Error(traduire(error.message))
  await deconnecter()
}

/** Ouvre Stripe Checkout (abonnement) ou le portail client (gestion). */
export async function ouvrirStripe(action: 'checkout' | 'portal', intervalle: 'month' | 'year' = 'month') {
  const { data, error } = await supabase().functions.invoke(`stripe-${action}`, { body: { intervalle, retour: location.origin + location.pathname + '#/compte' } })
  if (error) throw new Error('Paiement indisponible pour le moment.')
  if (!data?.url) throw new Error('Réponse de paiement invalide.')
  location.href = data.url as string
}
