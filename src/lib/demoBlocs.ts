import { BLOCS_IDS, type BlocId, type EtatDemo, type Note } from './demoState'

/**
 * Les cinq blocs de la démonstration. Le numéro et le nom court servent
 * d'identifiants de retour : « Bloc 3 · Signature électronique ».
 */
export interface BlocMeta {
  id: BlocId
  /** Nom du thème, repris dans les retours. */
  court: string
  /** Titre en mots simples, affiché sur la carte. */
  titre: string
  promesse: string
  niveau: 'gratuit' | 'premium' | 'inclus'
  statut: 'Disponible' | 'Simulé' | 'En partie'
}

export const BLOCS: BlocMeta[] = [
  { id: 1, court: 'Partage WhatsApp', titre: 'Annoncer mon absence sur WhatsApp', promesse: 'Choisissez vos dates, envoyez : vos remplaçants répondent « partant » en un tap.', niveau: 'gratuit', statut: 'Disponible' },
  { id: 2, court: 'Souscription et onboarding', titre: 'Créer mon compte et choisir mon offre', promesse: 'Un compte en 20 secondes. Vous ne payez que pour sécuriser un remplacement.', niveau: 'gratuit', statut: 'Simulé' },
  { id: 3, court: 'Signature électronique', titre: 'Signer le contrat depuis mon téléphone', promesse: 'Un contrat conforme, prêt en un tap, signé des deux côtés sans rien imprimer.', niveau: 'premium', statut: 'Disponible' },
  { id: 4, court: 'Facturation et encaissement', titre: 'Calculer et suivre ce que je reverse', promesse: 'Honoraires, part du remplaçant, échéances : calculés pour vous. L’encaissement arrive.', niveau: 'premium', statut: 'En partie' },
  { id: 5, court: 'Conformité et données de santé', titre: 'Rester en règle et protéger les données', promesse: 'Relève bloque ce qui n’est pas en règle et ne voit jamais vos patients.', niveau: 'inclus', statut: 'Disponible' },
]

export const bloc = (id: BlocId): BlocMeta => BLOCS.find(b => b.id === id)!

export const NOTES: Record<Note, { emoji: string; libelle: string; court: string }> = {
  top: { emoji: '😍', libelle: 'Utile', court: 'utile' },
  bof: { emoji: '😐', libelle: 'Bof', court: 'bof' },
  non: { emoji: '🙅', libelle: 'Pas pour moi', court: 'pas pour moi' },
}

const PRIX: Record<NonNullable<EtatDemo['prix']>, string> = { cher: 'trop cher', correct: 'correct', bon: 'bon marché' }

/** Le message de retour : lisible tel quel dans une conversation WhatsApp ou un e-mail. */
export function messageAvis(e: EtatDemo): string {
  const lignes = ['Mes retours sur la démo Relève']
  if (e.profil) lignes.push(`Profil : ${e.profil}`)
  for (const id of BLOCS_IDS) {
    const b = bloc(id)
    const n = e.notes[id]
    const complements: string[] = []
    if (id === 2 && e.prix) complements.push(`prix : ${PRIX[e.prix]}`)
    if (id === 4 && e.interetEncaissement) complements.push('encaissement automatique : ça m’intéresse')
    const suite = complements.length ? ` (${complements.join(' ; ')})` : ''
    lignes.push(`Bloc ${id} · ${b.court} : ${n ? `${NOTES[n].emoji} ${NOTES[n].court}` : 'pas testé'}${suite}`)
  }
  if (e.commentaire.trim()) lignes.push(`Un mot : ${e.commentaire.trim()}`)
  return lignes.join('\n')
}
