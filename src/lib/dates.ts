/**
 * Jours du calendrier. Une date « aaaa-mm-jj » désigne un jour, pas un instant : lue à minuit UTC,
 * elle s'affiche la veille à l'ouest de Greenwich (Antilles, Guyane, Polynésie). Pour l'affichage,
 * on la lit donc à midi, heure locale ; pour les écarts et les ajouts de jours, on calcule en UTC,
 * où ni le fuseau ni le changement d'heure ne comptent.
 */

export const JOUR_MS = 86_400_000

const FORMAT_JOUR = /^\d{4}-\d{2}-\d{2}$/

/** Vrai pour un jour qui existe : « 2026-02-31 » est refusé. */
export function estJourValide(iso: string): boolean {
  if (!FORMAT_JOUR.test(iso)) return false
  const [annee, mois, jour] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(annee, mois - 1, jour))
  return (
    date.getUTCFullYear() === annee && date.getUTCMonth() === mois - 1 && date.getUTCDate() === jour
  )
}

export const jourCalendaire = (iso: string): Date =>
  FORMAT_JOUR.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso)

/** Le jour du calendrier local, au format « aaaa-mm-jj » (et non celui de Greenwich). */
export function jourLocal(date: Date = new Date()): string {
  const mois = String(date.getMonth() + 1).padStart(2, '0')
  const jour = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mois}-${jour}`
}

export function ajouterJours(iso: string, n: number): string {
  const [annee, mois, jour] = iso.split('-').map(Number)
  return new Date(Date.UTC(annee, mois - 1, jour + n)).toISOString().slice(0, 10)
}

export const dansNJours = (n: number): string => ajouterJours(jourLocal(), n)

export function aujourdhui(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function joursEntre(a: string | Date, b: string | Date): number {
  const d1 = typeof a === 'string' ? new Date(a) : a
  const d2 = typeof b === 'string' ? new Date(b) : b
  return Math.round((d2.getTime() - d1.getTime()) / JOUR_MS)
}

/** Nombre de jours calendaires, début et fin inclus. */
export const nombreDeJours = (du: string, au: string): number => joursEntre(du, au) + 1

export function formatDate(iso?: string): string {
  if (!iso) return '—'
  return jourCalendaire(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateCourte(iso?: string): string {
  if (!iso) return '—'
  return jourCalendaire(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

/**
 * « 25 nov. → 8 déc. 2026 » (ou « du 25 nov. au 8 déc. 2026 » dans une phrase) :
 * l'année n'est écrite qu'une fois quand elle est commune.
 */
export function formatPeriode(
  du: string,
  au: string,
  forme: 'fleche' | 'phrase' = 'fleche',
): string {
  const annee = (iso: string) => jourCalendaire(iso).getFullYear()
  const jourMois = (iso: string) =>
    jourCalendaire(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const [debut, fin] =
    annee(du) === annee(au)
      ? [jourMois(du), `${jourMois(au)} ${annee(au)}`]
      : [formatDate(du), formatDate(au)]
  return forme === 'phrase' ? `du ${debut} au ${fin}` : `${debut} → ${fin}`
}

/** « lundi 26 octobre » : le jour de la semaine permet de vérifier son agenda d'un coup d'œil. */
export function formatJourLong(iso: string): string {
  return jourCalendaire(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** « du lundi 26 octobre au dimanche 8 novembre 2026 » ; l'année est écrite aux deux bouts si elle change. */
export function formatPeriodeLongue(du: string, au: string): string {
  const annee = (iso: string) => jourCalendaire(iso).getFullYear()
  const avecAnnee = (iso: string) => `${formatJourLong(iso)} ${annee(iso)}`
  const debut = annee(du) === annee(au) ? formatJourLong(du) : avecAnnee(du)
  return `du ${debut} au ${avecAnnee(au)}`
}
