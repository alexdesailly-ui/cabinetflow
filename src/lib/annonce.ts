import { formatPeriode, joursEntre } from './domain'

/**
 * Annonce d'absence partageable sur WhatsApp, sans serveur : tout ce qu'il faut
 * pour la lire est dans le lien lui-même. Le remplaçant ouvre la page, touche
 * « Je suis partant(e) » et WhatsApp s'ouvre sur un message déjà rédigé.
 */
export interface Annonce {
  cabinet: string
  ville: string
  /** Dates ISO (aaaa-mm-jj), début et fin incluses. */
  du: string
  au: string
  motif: string
  /** Numéro WhatsApp du cabinet, chiffres seuls, format international sans « + ». Facultatif. */
  tel?: string
}

const LIMITES = { cabinet: 80, ville: 60, motif: 40 }
const FORMAT_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * « 06 12 34 56 78 », « +33 6 12 34 56 78 » ou « 0033 6 12 34 56 78 » donnent
 * « 33612345678 ». Un numéro trop court ou trop long est écarté plutôt que deviné.
 */
export function nettoyerTelephone(saisie: string): string | undefined {
  let chiffres = saisie.replace(/\D/g, '')
  if (chiffres.startsWith('00')) chiffres = chiffres.slice(2)
  else if (chiffres.startsWith('0') && chiffres.length === 10) chiffres = '33' + chiffres.slice(1)
  return chiffres.length >= 9 && chiffres.length <= 15 ? chiffres : undefined
}

/** Nombre de jours calendaires, début et fin inclus. */
export function nombreDeJours(du: string, au: string): number {
  return joursEntre(du, au) + 1
}

function versBase64Url(texte: string): string {
  let binaire = ''
  new TextEncoder().encode(texte).forEach(o => { binaire += String.fromCharCode(o) })
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function depuisBase64Url(b64: string): string {
  const standard = b64.replace(/-/g, '+').replace(/_/g, '/')
  const binaire = atob(standard + '='.repeat((4 - (standard.length % 4)) % 4))
  return new TextDecoder().decode(Uint8Array.from(binaire, c => c.charCodeAt(0)))
}

export function encoderAnnonce(a: Annonce): string {
  const compact: Record<string, string> = { c: a.cabinet, v: a.ville, d: a.du, f: a.au, m: a.motif }
  if (a.tel) compact.t = a.tel
  return versBase64Url(JSON.stringify(compact))
}

/**
 * Le lien peut être fabriqué par n'importe qui : on ne garde que ce qui a la
 * bonne forme, et rien n'est jamais interprété comme du HTML.
 */
export function decoderAnnonce(code: string): Annonce | null {
  try {
    const brut: unknown = JSON.parse(depuisBase64Url(code))
    if (typeof brut !== 'object' || brut === null) return null
    const o = brut as Record<string, unknown>
    const texte = (k: string, max: number) => (typeof o[k] === 'string' && (o[k] as string).trim().length > 0 && (o[k] as string).length <= max ? (o[k] as string).trim() : null)
    const cabinet = texte('c', LIMITES.cabinet)
    const ville = texte('v', LIMITES.ville)
    const motif = texte('m', LIMITES.motif)
    const du = texte('d', 10)
    const au = texte('f', 10)
    if (!cabinet || !ville || !motif || !du || !au) return null
    if (!FORMAT_DATE.test(du) || !FORMAT_DATE.test(au) || isNaN(new Date(du).getTime()) || isNaN(new Date(au).getTime()) || au < du) return null
    const tel = typeof o.t === 'string' ? nettoyerTelephone(o.t) : undefined
    return { cabinet, ville, du, au, motif, ...(tel ? { tel } : {}) }
  } catch {
    return null
  }
}

/** Adresse de la page « Je suis partant(e) ». `base` : adresse de l'application, sans fragment. */
export function lienAnnonce(a: Annonce, base: string): string {
  return `${base.replace(/#.*$/, '')}#/annonce/${encoderAnnonce(a)}`
}

export function messageAnnonce(a: Annonce, lien: string): string {
  const jours = nombreDeJours(a.du, a.au)
  return `Bonjour ! ${a.cabinet} (${a.ville}) cherche un(e) infirmier(ère) remplaçant(e) ${formatPeriode(a.du, a.au, 'phrase')} (${jours} jours, ${a.motif.toLowerCase()}).\nPartant(e) ? Un tap suffit : ${lien}`
}

export function messageReponse(a: Annonce): string {
  return `Bonjour, je suis partant(e) pour votre remplacement ${formatPeriode(a.du, a.au, 'phrase')}. Pouvons-nous en parler ?`
}

/** Ouvre WhatsApp avec un message prêt ; sans numéro, WhatsApp laisse choisir la conversation. */
export function urlWhatsApp(texte: string, tel?: string): string {
  return `https://wa.me/${tel ?? ''}?text=${encodeURIComponent(texte)}`
}
