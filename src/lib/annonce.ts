import { estJourValide, formatPeriodeLongue, nombreDeJours } from './dates'

/**
 * Annonce d'absence partagée sur WhatsApp, sans serveur : tout ce qu'il faut pour la lire est dans
 * le lien lui-même. Le remplaçant ouvre la page, touche « Je suis partant(e) » et WhatsApp s'ouvre
 * sur un message déjà rédigé, adressé au cabinet.
 */
export interface Annonce {
  cabinet: string
  ville: string
  /** Premier et dernier jour d'absence, « aaaa-mm-jj ». */
  du: string
  au: string
  /** Numéro WhatsApp du cabinet : chiffres seuls, format international, sans « + ». */
  tel?: string
}

export const LIMITES = { cabinet: 80, ville: 60, dureeJours: 366 }

/* ------------------------------------------------------------------ */
/* Numéro de téléphone                                                 */
/* ------------------------------------------------------------------ */

export type Telephone = { numero: string } | { erreur: string }

const FIXE_FRANCAIS = /^33[1-5]\d{8}$/
const OUTRE_MER = /^33(?:69[0-4]|69[67]|639)\d{6}$/

/**
 * « 06 12 34 56 78 », « +33 6 12 34 56 78 », « 0033 6… » et « +33 (0)6… » donnent « 33612345678 ».
 * Un numéro dont WhatsApp ne pourrait pas être le bon est refusé avec une explication, pas deviné :
 * une annonce dont les réponses partent dans le vide ne sert à rien.
 */
export function analyserTelephone(saisie: string): Telephone {
  let chiffres = saisie.replace(/\D/g, '')
  if (chiffres.startsWith('00')) chiffres = chiffres.slice(2)
  else if (chiffres.length === 10 && chiffres.startsWith('0')) chiffres = `33${chiffres.slice(1)}`
  if (chiffres.startsWith('330')) chiffres = `33${chiffres.slice(3)}`
  if (chiffres.length < 9 || chiffres.length > 15) {
    return { erreur: 'Numéro invalide : 10 chiffres, par exemple 06 12 34 56 78.' }
  }
  if (FIXE_FRANCAIS.test(chiffres)) {
    return { erreur: 'Ce numéro est un fixe : indiquez le mobile qui a WhatsApp.' }
  }
  if (OUTRE_MER.test(chiffres)) {
    return {
      erreur:
        'Numéro d’outre-mer : saisissez-le au format international, par exemple +590 690 12 34 56.',
    }
  }
  return { numero: chiffres }
}

/** « 33612345678 » devient « +33 6 12 34 56 78 » ; les autres pays s'affichent sans découpage. */
export function afficherTelephone(numero: string): string {
  const francais = /^33(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(numero)
  return francais ? `+33 ${francais.slice(1).join(' ')}` : `+${numero}`
}

export function nettoyerTelephone(saisie: string): string | undefined {
  const resultat = analyserTelephone(saisie)
  return 'numero' in resultat ? resultat.numero : undefined
}

/* ------------------------------------------------------------------ */
/* Saisie du cabinet                                                   */
/* ------------------------------------------------------------------ */

export interface Saisie {
  cabinet: string
  ville: string
  du: string
  au: string
  tel: string
}

export type Erreurs = Partial<Record<keyof Saisie, string>>

/** Vérifie ce que le cabinet a tapé ; `aujourdhui` est le jour local « aaaa-mm-jj ». */
export function verifierSaisie(
  saisie: Saisie,
  aujourdhui: string,
): { annonce: Annonce } | { erreurs: Erreurs } {
  const erreurs: Erreurs = {}
  const cabinet = saisie.cabinet.trim()
  const ville = saisie.ville.trim()

  if (!cabinet) erreurs.cabinet = 'Indiquez le nom du cabinet.'
  else if (cabinet.length > LIMITES.cabinet)
    erreurs.cabinet = `${LIMITES.cabinet} caractères au plus.`
  if (!ville) erreurs.ville = 'Indiquez la ville.'
  else if (ville.length > LIMITES.ville) erreurs.ville = `${LIMITES.ville} caractères au plus.`

  if (!estJourValide(saisie.du)) erreurs.du = 'Choisissez le premier jour d’absence.'
  else if (saisie.du < aujourdhui) erreurs.du = 'Le premier jour ne peut pas être passé.'
  if (!estJourValide(saisie.au)) erreurs.au = 'Choisissez le dernier jour d’absence.'
  else if (!erreurs.du && saisie.au < saisie.du) erreurs.au = 'Le dernier jour suit le premier.'
  else if (!erreurs.du && nombreDeJours(saisie.du, saisie.au) > LIMITES.dureeJours) {
    erreurs.au = 'Une annonce couvre un an au plus.'
  }

  const tel = analyserTelephone(saisie.tel)
  if ('erreur' in tel) erreurs.tel = tel.erreur

  if (Object.keys(erreurs).length > 0 || !('numero' in tel)) return { erreurs }
  return { annonce: { cabinet, ville, du: saisie.du, au: saisie.au, tel: tel.numero } }
}

/* ------------------------------------------------------------------ */
/* Lien                                                                */
/* ------------------------------------------------------------------ */

function versBase64Url(texte: string): string {
  let binaire = ''
  new TextEncoder().encode(texte).forEach(octet => {
    binaire += String.fromCharCode(octet)
  })
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function depuisBase64Url(b64: string): string {
  const standard = b64.replace(/-/g, '+').replace(/_/g, '/')
  const binaire = atob(standard + '='.repeat((4 - (standard.length % 4)) % 4))
  return new TextDecoder().decode(Uint8Array.from(binaire, c => c.charCodeAt(0)))
}

export function encoderAnnonce(a: Annonce): string {
  const compact: Record<string, string> = { c: a.cabinet, v: a.ville, d: a.du, f: a.au }
  if (a.tel) compact.t = a.tel
  return versBase64Url(JSON.stringify(compact))
}

/**
 * Le lien peut être fabriqué par n'importe qui : on ne garde que ce qui a la bonne forme, et rien
 * n'est jamais interprété comme du HTML. Les premiers liens portaient aussi un motif (clé « m »),
 * qui est ignoré.
 */
export function decoderAnnonce(code: string): Annonce | null {
  try {
    const brut: unknown = JSON.parse(depuisBase64Url(code))
    if (typeof brut !== 'object' || brut === null) return null
    const objet = brut as Record<string, unknown>
    const texte = (cle: string, max: number): string | null => {
      const valeur = objet[cle]
      if (typeof valeur !== 'string') return null
      const net = valeur.trim()
      return net.length > 0 && valeur.length <= max ? net : null
    }
    const cabinet = texte('c', LIMITES.cabinet)
    const ville = texte('v', LIMITES.ville)
    const du = texte('d', 10)
    const au = texte('f', 10)
    if (!cabinet || !ville || !du || !au) return null
    if (!estJourValide(du) || !estJourValide(au) || au < du) return null
    if (nombreDeJours(du, au) > LIMITES.dureeJours) return null
    const tel = typeof objet.t === 'string' ? nettoyerTelephone(objet.t) : undefined
    return { cabinet, ville, du, au, ...(tel ? { tel } : {}) }
  } catch {
    return null
  }
}

/** Adresse de la page « Je suis partant(e) ». `base` : adresse de l'application, sans fragment. */
export function lienAnnonce(a: Annonce, base: string): string {
  return `${base.replace(/[?#].*$/, '')}#/annonce/${encoderAnnonce(a)}`
}

/* ------------------------------------------------------------------ */
/* Messages                                                            */
/* ------------------------------------------------------------------ */

const duree = (a: Annonce): string => {
  const n = nombreDeJours(a.du, a.au)
  return `${n} jour${n > 1 ? 's' : ''}`
}

export function messageAnnonce(a: Annonce, lien: string): string {
  return (
    `Bonjour ! ${a.cabinet} (${a.ville}) cherche un(e) infirmier(ère) remplaçant(e) ` +
    `${formatPeriodeLongue(a.du, a.au)} (${duree(a)}).\n` +
    `Partant(e) ? Un tap suffit : ${lien}`
  )
}

export function messageRelance(a: Annonce, lien: string): string {
  return (
    `Bonjour, ${a.cabinet} (${a.ville}) cherche toujours un(e) infirmier(ère) remplaçant(e) ` +
    `${formatPeriodeLongue(a.du, a.au)} (${duree(a)}).\n` +
    `Si vous êtes disponible, un tap suffit : ${lien}`
  )
}

export function messagePourvu(a: Annonce): string {
  return (
    `Bonjour, le remplacement ${formatPeriodeLongue(a.du, a.au)} chez ${a.cabinet} est pourvu. ` +
    'Merci à tous pour vos réponses !'
  )
}

/** Ce que le remplaçant envoie au cabinet en touchant « Je suis partant(e) ». */
export function messageReponse(a: Annonce): string {
  return `Bonjour, je suis partant(e) pour votre remplacement ${formatPeriodeLongue(a.du, a.au)}. Pouvons-nous en parler ?`
}

/** Ouvre WhatsApp avec un message prêt ; sans numéro, WhatsApp laisse choisir la conversation. */
export function urlWhatsApp(texte: string, tel?: string): string {
  return `https://wa.me/${tel ?? ''}?text=${encodeURIComponent(texte)}`
}
