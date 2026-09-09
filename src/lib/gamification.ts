import { conformite, joursEntre } from './domain'
import type { Etat } from './store'
import { contratsDuRemplacant, nbFilleulsActifs, recosVers } from './store'
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
    key: 'confrere', nom: 'Confrère', emoji: '🔗', pour: 'tous',
    description: 'Un premier filleul actif : vous avez agrandi le cercle.',
    condition: (a, e) => nbFilleulsActifs(e, a.id) >= 1,
  },
  {
    key: 'referent', nom: 'Référent', emoji: '🌱', pour: 'tous',
    description: 'Trois filleuls actifs. Vous voyez les nouveaux remplaçants 24 h avant les autres.',
    condition: (a, e) => nbFilleulsActifs(e, a.id) >= 3,
  },
  {
    key: 'pilier', nom: 'Pilier', emoji: '🏛️', pour: 'tous',
    description: 'Sept filleuls actifs. Relève est offert tant qu’ils le restent.',
    condition: (a, e) => nbFilleulsActifs(e, a.id) >= 7,
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
