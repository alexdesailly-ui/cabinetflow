import { AVANTAGES, conformite, etatPiece, joursEntre, niveauPour, scoreDepuisCriteres, type Fiabilite } from './domain'
import type { Etat } from './store'
import { contratsDuRemplacant, recosVers } from './store'
import type { Account } from './types'

/**
 * Les badges récompensent des comportements qui protègent réellement le
 * cabinet et le remplaçant : conformité, anticipation, paiement à l'heure.
 * Pas de badge pour « ouvrir l'application trois jours de suite ».
 */
export interface Badge {
  key: string
  nom: string
  description: string
  emoji: string
  pour: 'cabinet' | 'remplacant' | 'tous'
  condition: (a: Account, e: Etat) => boolean
}

export const BADGES: Badge[] = [
  {
    key: 'premier-besoin', nom: 'Premier appel', emoji: '📣', pour: 'cabinet',
    description: 'Première demande de remplacement publiée.',
    condition: (a, e) => e.missions.some(m => m.cabinetId === a.id && m.statut !== 'brouillon'),
  },
  {
    key: 'ete-anticipe', nom: 'Été anticipé', emoji: '🌞', pour: 'cabinet',
    description: 'Un remplacement d’été publié avant le 15 mai. Les meilleurs remplaçants partent tôt.',
    condition: (a, e) => e.missions.some(m => {
      if (m.cabinetId !== a.id || !m.publieeLe) return false
      const mois = new Date(m.du).getMonth()
      const pub = new Date(m.publieeLe)
      return (mois === 6 || mois === 7) && (pub.getMonth() < 4 || (pub.getMonth() === 4 && pub.getDate() <= 15))
    }),
  },
  {
    key: 'premier-contrat', nom: 'Contrat en poche', emoji: '🤝', pour: 'tous',
    description: 'Premier contrat de remplacement signé des deux côtés.',
    condition: (a, e) => e.contrats.some(c =>
      (c.cabinetId === a.id || c.remplacantId === a.id) && c.signatureTitulaire && c.signatureRemplacant),
  },
  {
    key: 'ordre-ok', nom: 'Dans les règles', emoji: '📜', pour: 'cabinet',
    description: 'Contrat transmis au conseil départemental au moins 7 jours avant le début.',
    condition: (a, e) => e.contrats.some(c => {
      if (c.cabinetId !== a.id || !c.transmisCDOILe) return false
      const m = e.missions.find(x => x.id === c.missionId)
      return !!m && joursEntre(c.transmisCDOILe, m.du) >= 7
    }),
  },
  {
    key: 'passation', nom: 'Passation impeccable', emoji: '🗺️', pour: 'cabinet',
    description: 'Une fiche de tournée complète, avec consignes et contacts.',
    condition: (a, e) => e.fiches.some(f => {
      const m = e.missions.find(x => x.id === f.missionId)
      return m?.cabinetId === a.id && f.patients.length >= 3 && !!f.consignes && !!f.medecinReferent
    }),
  },
  {
    key: 'retro-a-lheure', nom: 'Réglé à l’heure', emoji: '⏱️', pour: 'cabinet',
    description: 'Une rétrocession reversée avant son échéance. Les remplaçants s’en souviennent.',
    condition: (a, e) => e.lignes.some(l => {
      const c = e.contrats.find(x => x.id === l.contratId)
      return c?.cabinetId === a.id && !!l.payeeLe && l.payeeLe.slice(0, 10) <= l.echeance
    }),
  },
  {
    key: 'dossier-complet', nom: 'Dossier vérifié', emoji: '🛡️', pour: 'remplacant',
    description: 'Toutes les pièces critiques valides. Les cabinets vous voient en premier.',
    condition: (a) => a.role === 'remplacant' && conformite(a).verifie,
  },
  {
    key: 'premiere-mission', nom: 'Première tournée', emoji: '🚗', pour: 'remplacant',
    description: 'Premier remplacement contractualisé sur Relève.',
    condition: (a, e) => a.role === 'remplacant' && contratsDuRemplacant(e, a.id).length >= 1,
  },
  {
    key: 'recommande', nom: 'Recommandé', emoji: '⭐', pour: 'remplacant',
    description: 'Première recommandation vérifiée d’un titulaire.',
    condition: (a, e) => recosVers(e, a.id).length >= 1,
  },
  {
    key: 'valeur-sure', nom: 'Valeur sûre', emoji: '🏅', pour: 'remplacant',
    description: 'Trois recommandations vérifiées. Vous êtes ce que tout cabinet cherche en juillet.',
    condition: (a, e) => recosVers(e, a.id).length >= 3,
  },
  {
    key: 'cercle', nom: 'Cercle ouvert', emoji: '🔗', pour: 'tous',
    description: 'Un confrère invité par vous a signé son premier contrat. Un mois offert pour chacun.',
    condition: (a, e) => e.invitations.some(i => i.parId === a.id && i.actifLe),
  },
]

export function badgesPour(a: Account): Badge[] {
  return BADGES.filter(b => b.pour === 'tous' || b.pour === a.role)
}

/** Badges dont la condition est remplie mais qui n'ont pas encore été attribués. */
export function nouveauxBadges(a: Account, e: Etat): Badge[] {
  const deja = new Set((e.badges[a.id] ?? []).map(b => b.key))
  return badgesPour(a).filter(b => !deja.has(b.key) && b.condition(a, e))
}

/**
 * Le chiffre qui compte vraiment pour un titulaire : combien de jours
 * il a pu ne pas travailler cette année en étant remplacé.
 */
export function joursDeReposSecurises(a: Account, e: Etat): number {
  const annee = new Date().getFullYear()
  return e.contrats
    .filter(c => c.cabinetId === a.id && c.signatureTitulaire && c.signatureRemplacant)
    .map(c => e.missions.find(m => m.id === c.missionId))
    .filter((m): m is NonNullable<typeof m> => !!m && new Date(m.du).getFullYear() === annee)
    .reduce((s, m) => s + joursEntre(m.du, m.au) + 1, 0)
}

/**
 * Fiabilité : composée uniquement d'actes vérifiables sur la plateforme.
 * Aucun critère ne dépend du nombre de personnes recrutées.
 */
export function fiabilite(a: Account, e: Etat): Fiabilite {
  const criteres: Fiabilite['criteres'] = []
  if (a.role === 'cabinet') {
    const signes = e.contrats.filter(c => c.cabinetId === a.id && c.signatureTitulaire && c.signatureRemplacant)
    const missions = signes.map(c => e.missions.find(m => m.id === c.missionId)!).filter(Boolean)
    const aTemps = signes.filter(c => { const m = e.missions.find(x => x.id === c.missionId); return m && c.transmisCDOILe && c.transmisCDOILe.slice(0, 10) <= m.du }).length
    criteres.push({ label: 'Contrat transmis à l’Ordre avant le début', ok: aTemps, total: signes.length, poids: 30 })
    const lignes = e.lignes.filter(l => signes.some(c => c.id === l.contratId) && (l.payeeLe || l.echeance < new Date().toISOString().slice(0, 10)))
    const reglees = lignes.filter(l => l.payeeLe && l.payeeLe.slice(0, 10) <= l.echeance).length
    criteres.push({ label: 'Rétrocession reversée avant l’échéance', ok: reglees, total: lignes.length, poids: 30 })
    const commencees = missions.filter(m => m.du <= new Date().toISOString().slice(0, 10))
    const fiches = commencees.filter(m => { const f = e.fiches.find(x => x.missionId === m.id); return f && f.patients.length >= 3 && f.consignes }).length
    criteres.push({ label: 'Fiche de passation complète', ok: fiches, total: commencees.length, poids: 20 })
    const terminees = missions.filter(m => m.au < new Date().toISOString().slice(0, 10))
    const recos = terminees.filter(m => e.recos.some(r => r.deId === a.id && signes.some(c => c.id === r.contratId && c.missionId === m.id))).length
    criteres.push({ label: 'Recommandation laissée après le remplacement', ok: recos, total: terminees.length, poids: 20 })
  } else {
    const conf = conformite(a)
    criteres.push({ label: 'Pièces critiques valides', ok: conf.verifie ? 1 : 0, total: 1, poids: 30 })
    const aJour = (a.pieces ?? []).filter(p => etatPiece(p) === 'valide').length
    criteres.push({ label: 'Pièces à jour, sans échéance proche', ok: aJour, total: Math.max(1, (a.pieces ?? []).length), poids: 10 })
    const contrats = contratsDuRemplacant(e, a.id)
    criteres.push({ label: 'Remplacements menés à terme', ok: Math.min(3, contrats.filter(x => x.mission.au < new Date().toISOString().slice(0, 10)).length), total: 3, poids: 30 })
    criteres.push({ label: 'Recommandations vérifiées reçues', ok: Math.min(3, recosVers(e, a.id).length), total: 3, poids: 30 })
  }
  const score = scoreDepuisCriteres(criteres)
  const niveau = niveauPour(score)
  return { score, niveau, criteres, avantage: AVANTAGES[niveau] }
}

export interface Evenement { le: string; texte: string; type: 'contrat' | 'annonce' | 'reco' | 'dossier' | 'cercle' }

const initiale = (a?: Account) => a ? `${a.prenom} ${a.nom[0]}.` : 'Un confrère'
const cab = (a?: Account) => a?.nomCabinet ?? initiale(a)

/** Le pouls d'un département : ce qui s'y est passé récemment, sans rien inventer. */
export function pouls(e: Etat, departement: string): Evenement[] {
  const dans = (id?: string) => { const a = e.accounts.find(x => x.id === id); return a?.departement === departement ? a : undefined }
  const out: Evenement[] = []
  for (const c of e.contrats) {
    if (!c.signatureTitulaire || !c.signatureRemplacant) continue
    const cabinet = dans(c.cabinetId); const r = e.accounts.find(x => x.id === c.remplacantId)
    const m = e.missions.find(x => x.id === c.missionId)
    if (cabinet && m) out.push({ le: [c.signatureTitulaire.le, c.signatureRemplacant.le].sort()[1], type: 'contrat', texte: `${cab(cabinet)} et ${initiale(r)} ont signé un remplacement de ${joursEntre(m.du, m.au) + 1} jours` })
  }
  for (const m of e.missions) {
    const cabinet = dans(m.cabinetId)
    if (cabinet && m.statut === 'publiee' && m.publieeLe) out.push({ le: m.publieeLe, type: 'annonce', texte: `${cab(cabinet)} cherche un remplaçant du ${new Date(m.du).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${new Date(m.au).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` })
  }
  for (const r of e.recos) {
    const de = dans(r.deId); const vers = e.accounts.find(x => x.id === r.versId)
    if (de) out.push({ le: r.le, type: 'reco', texte: `${cab(de)} a recommandé ${initiale(vers)}` })
  }
  for (const a of e.accounts) {
    if (a.role === 'remplacant' && a.departement === departement && conformite(a).verifie) out.push({ le: a.creeLe, type: 'dossier', texte: `${initiale(a)} a complété son dossier de confiance` })
  }
  for (const i of e.invitations) {
    const parrain = dans(i.parId); const f = e.accounts.find(x => x.id === i.filleulId)
    if (parrain && i.actifLe) out.push({ le: i.actifLe, type: 'cercle', texte: `${initiale(f)} a rejoint le cercle de ${initiale(parrain)}` })
  }
  return out.sort((x, y) => y.le.localeCompare(x.le))
}

export function ilYA(iso: string): string {
  const j = joursEntre(new Date(iso), new Date())
  if (j <= 0) { const h = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000)); return h < 24 ? `il y a ${h} h` : 'hier' }
  if (j === 1) return 'hier'
  if (j < 30) return `il y a ${j} j`
  return `il y a ${Math.round(j / 30)} mois`
}
