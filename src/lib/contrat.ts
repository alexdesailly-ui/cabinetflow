import { formatDate } from './domain'
import type { Account, Contrat, Mission } from './types'

/**
 * Texte du contrat de remplacement. Reprend les mentions attendues par
 * l'Ordre : durée, motif, dates, moyens mis à disposition, rétrocession,
 * indépendance professionnelle, responsabilité, non-concurrence.
 * Modèle de travail à relire — il ne remplace pas un conseil juridique.
 */
export function texteContrat(c: Contrat, m: Mission, cabinet: Account, remplacant: Account): string {
  const rpps = (a: Account) => a.pieces?.find(p => p.key === 'ordre')?.reference ?? '—'
  const moyens = [
    'les locaux et le matériel du cabinet',
    'le logiciel de facturation et de télétransmission',
    m.vehiculeFourni ? 'le véhicule professionnel' : null,
    m.logementFourni ? 'un logement sur place' : null,
  ].filter(Boolean).join(', ')

  return `CONTRAT DE REMPLACEMENT D’INFIRMIER EXERÇANT À TITRE LIBÉRAL

Entre les soussignés :

${cabinet.prenom} ${cabinet.nom}, infirmier(ère) diplômé(e) d’État exerçant à titre libéral, ${cabinet.nomCabinet ?? ''} — ${cabinet.codePostal} ${cabinet.ville}, inscrit(e) au tableau de l’Ordre sous le n° RPPS ${rpps(cabinet)},
ci-après « le remplacé »,

et

${remplacant.prenom} ${remplacant.nom}, infirmier(ère) diplômé(e) d’État, ${remplacant.codePostal} ${remplacant.ville}, inscrit(e) au tableau de l’Ordre sous le n° RPPS ${rpps(remplacant)}, titulaire d’une autorisation de remplacement en cours de validité,
ci-après « le remplaçant »,

il a été convenu ce qui suit.

Article 1 — Objet et motif
Le remplacé, empêché d’exercer pour le motif suivant : ${m.motif.toLowerCase()}, confie au remplaçant, qui l’accepte, le soin d’assurer la continuité des soins auprès de sa patientèle.

Article 2 — Durée
Le remplacement est conclu du ${formatDate(m.du)} au ${formatDate(m.au)} inclus, soit ${m.joursTravailles} jours travaillés. Il prend fin de plein droit à cette date, sans reconduction tacite.

Article 3 — Moyens mis à disposition
Le remplacé met à la disposition du remplaçant : ${moyens}. Le remplaçant en fait un usage conforme à leur destination et les restitue en l’état.

Article 4 — Indépendance professionnelle
Le remplaçant exerce en toute indépendance. Il décide seul des soins qu’il dispense, dans le respect du code de déontologie et des prescriptions médicales. Le présent contrat ne crée aucun lien de subordination.

Article 5 — Responsabilité
Le remplaçant demeure personnellement responsable des actes qu’il accomplit. Il justifie d’une assurance de responsabilité civile professionnelle couvrant toute la durée du remplacement.

Article 6 — Honoraires et rétrocession
Les honoraires des actes réalisés pendant le remplacement sont facturés au nom du remplacé et encaissés sur son compte. Le remplacé reverse au remplaçant ${c.retrocessionPct} % des honoraires encaissés, au plus tard le ${formatDate(c.echeanceReversement)}, sur présentation d’un relevé des actes. Les espèces reçues des patients sont remises intégralement au remplacé.

Article 7 — Autorisation et transmission
Le remplaçant déclare être titulaire d’une autorisation de remplacement délivrée par le conseil (inter)départemental de l’Ordre, valable pour toute la durée du présent contrat, et ne pas remplacer plus de deux infirmiers simultanément. Le présent contrat est transmis au conseil départemental de l’Ordre dont relève le remplacé avant le début du remplacement.

Article 8 — Non-concurrence${c.clauseNonConcurrence ? `
À l’issue d’un remplacement d’une durée totale supérieure à trois mois, le remplaçant s’interdit de s’installer dans un rayon lui permettant d’entrer en concurrence directe avec le remplacé pendant une durée de deux ans, sauf accord écrit de ce dernier.` : `
Les parties conviennent de ne pas assortir le présent contrat de clause de non-concurrence.`}

Article 9 — Litiges
En cas de différend, les parties s’engagent à rechercher une conciliation auprès du conseil départemental de l’Ordre avant toute action.

Fait en deux exemplaires, le ${formatDate(c.creeLe)}.

Le remplacé : ${cabinet.prenom} ${cabinet.nom}
Le remplaçant : ${remplacant.prenom} ${remplacant.nom}`
}
