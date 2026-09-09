import { dansNJours, genererCode } from './domain'
import { maintenant, mutate, type Etat } from './store'
import type { Account, Piece } from './types'

/**
 * Monde de démonstration. Toutes les personnes sont fictives ; la fiche de
 * tournée n'emploie que des initiales — aucune donnée de patient réelle
 * ne doit jamais être saisie dans une démo.
 */

export const SOINS = [
  'Pansements complexes', 'Perfusions / PICC', 'Chimiothérapie à domicile',
  'Diabète / insuline', 'Soins palliatifs', 'Stomies', 'Nursing / toilettes',
  'Pédiatrie', 'Psychiatrie', 'Dialyse péritonéale',
]

function pieces(opts: {
  autorisation?: number; rcp?: number; urssaf?: number; cps?: number;
  sans?: ('diplome' | 'ordre' | 'rib' | 'urssaf' | 'cps' | 'autorisation' | 'rcp')[]
  rpps: string
}): Piece[] {
  const sans = new Set(opts.sans ?? [])
  const il = maintenant()
  const out: Piece[] = []
  if (!sans.has('diplome')) out.push({ key: 'diplome', reference: '2014', fournieLe: il })
  if (!sans.has('ordre')) out.push({ key: 'ordre', reference: opts.rpps, fournieLe: il })
  if (!sans.has('autorisation')) out.push({ key: 'autorisation', reference: 'AR-49-' + opts.rpps.slice(-4), fournieLe: il, expireLe: dansNJours(opts.autorisation ?? 300) })
  if (!sans.has('rcp')) out.push({ key: 'rcp', reference: 'MACSF n° 78' + opts.rpps.slice(-5), fournieLe: il, expireLe: dansNJours(opts.rcp ?? 250) })
  if (!sans.has('urssaf')) out.push({ key: 'urssaf', reference: '812 ' + opts.rpps.slice(-6), fournieLe: il, expireLe: dansNJours(opts.urssaf ?? 150) })
  if (!sans.has('cps')) out.push({ key: 'cps', reference: 'CPS ' + opts.rpps.slice(-4), fournieLe: il, expireLe: dansNJours(opts.cps ?? 700) })
  if (!sans.has('rib')) out.push({ key: 'rib', reference: '•••• 4471', fournieLe: il })
  return out
}

function compte(base: Partial<Account> & Pick<Account, 'id' | 'role' | 'prenom' | 'nom' | 'ville' | 'codePostal'>): Account {
  return {
    email: `${base.prenom}.${base.nom}@exemple.fr`.toLowerCase(),
    creeLe: maintenant(),
    departement: base.codePostal.slice(0, 2),
    codeParrain: genererCode(base.prenom, base.nom),
    plan: base.role === 'cabinet' ? 'essai' : 'gratuit',
    moisOfferts: 0,
    ...base,
  }
}

export const DEMO_CABINET = 'cab-tilleuls'
export const DEMO_REMPLACANT = 'rmp-julien'

export function semerDemo() {
  mutate((e: Etat) => {
    const il = maintenant()
    const j = dansNJours

    const cabinet = compte({
      id: DEMO_CABINET, role: 'cabinet', prenom: 'Marie', nom: 'Dubois',
      nomCabinet: 'Cabinet infirmier des Tilleuls', ville: 'Angers', codePostal: '49000',
      telephone: '06 12 34 56 78', nbTitulaires: 3, patientsTournee: 28, caJournalierMoyen: 480,
      pieces: [{ key: 'ordre', reference: '10004512345', fournieLe: il }],
      codeParrain: 'MARDUB-7K2', plan: 'essai', moisOfferts: 1,
    })
    const cab2 = compte({ id: 'cab-loire', role: 'cabinet', prenom: 'Sophie', nom: 'Lemaire', nomCabinet: 'Cabinet de la Loire', ville: 'Saumur', codePostal: '49400', parrainePar: 'MARDUB-7K2', caJournalierMoyen: 420 })
    const cab3 = compte({ id: 'cab-mauges', role: 'cabinet', prenom: 'Karim', nom: 'Benali', nomCabinet: 'SCP Infirmiers des Mauges', ville: 'Cholet', codePostal: '49300', parrainePar: 'MARDUB-7K2', caJournalierMoyen: 510 })
    const cab4 = compte({ id: 'cab-nantes', role: 'cabinet', prenom: 'Claire', nom: 'Rousseau', nomCabinet: 'Cabinet Rousseau', ville: 'Nantes', codePostal: '44000' })

    const julien = compte({
      id: DEMO_REMPLACANT, role: 'remplacant', prenom: 'Julien', nom: 'Morel',
      ville: 'Angers', codePostal: '49100', telephone: '06 98 76 54 32',
      rayonKm: 40, vehicule: true, anneesExperience: 7,
      soinsMaitrises: ['Pansements complexes', 'Perfusions / PICC', 'Diabète / insuline', 'Soins palliatifs', 'Nursing / toilettes'],
      pieces: pieces({ rpps: '10009876543', autorisation: 210 }),
      disponibilites: [{ du: j(20), au: j(75) }, { du: j(100), au: j(130) }],
      codeParrain: 'JULMOR-3P9', parrainePar: 'MARDUB-7K2',
    })
    const amina = compte({
      id: 'rmp-amina', role: 'remplacant', prenom: 'Amina', nom: 'Cherif', ville: 'Trélazé', codePostal: '49800',
      rayonKm: 30, vehicule: true, anneesExperience: 4,
      soinsMaitrises: ['Pansements complexes', 'Diabète / insuline', 'Nursing / toilettes', 'Stomies'],
      pieces: pieces({ rpps: '10005551234', autorisation: 38 }),
      disponibilites: [{ du: j(10), au: j(60) }],
    })
    const thomas = compte({
      id: 'rmp-thomas', role: 'remplacant', prenom: 'Thomas', nom: 'Girard', ville: 'Avrillé', codePostal: '49240',
      rayonKm: 25, vehicule: false, anneesExperience: 2,
      soinsMaitrises: ['Nursing / toilettes', 'Diabète / insuline'],
      pieces: pieces({ rpps: '10007771122', sans: ['rcp', 'cps'] }),
      disponibilites: [{ du: j(30), au: j(90) }],
    })
    const lea = compte({
      id: 'rmp-lea', role: 'remplacant', prenom: 'Léa', nom: 'Fontaine', ville: 'Saumur', codePostal: '49400',
      rayonKm: 50, vehicule: true, anneesExperience: 11,
      soinsMaitrises: ['Chimiothérapie à domicile', 'Perfusions / PICC', 'Soins palliatifs', 'Pansements complexes', 'Dialyse péritonéale'],
      pieces: pieces({ rpps: '10003334455', autorisation: 330, rcp: 45 }),
      disponibilites: [{ du: j(45), au: j(80) }],
    })
    const nadia = compte({
      id: 'rmp-nadia', role: 'remplacant', prenom: 'Nadia', nom: 'Petit', ville: 'Angers', codePostal: '49000',
      rayonKm: 20, vehicule: true, anneesExperience: 1,
      soinsMaitrises: ['Nursing / toilettes'],
      pieces: pieces({ rpps: '10002223344', sans: ['autorisation', 'urssaf', 'cps', 'rib'] }),
      disponibilites: [],
    })

    e.accounts = [cabinet, cab2, cab3, cab4, julien, amina, thomas, lea, nadia]

    // Missions -------------------------------------------------------
    const ete = {
      id: 'mis-ete', cabinetId: DEMO_CABINET, motif: 'Congés' as const,
      du: j(32), au: j(52), joursTravailles: 18, dimanchesFeries: 3,
      caJournalier: 480, retrocessionPct: 85, patientsJour: 28, kmJour: 65,
      horaires: '6 h 30 – 13 h / 17 h – 19 h 30',
      soinsRequis: ['Pansements complexes', 'Diabète / insuline', 'Perfusions / PICC'],
      vehiculeFourni: true, logementFourni: false,
      commentaire: 'Tournée rurale au nord d’Angers, patientèle fidèle et bienveillante. Passation sur une journée avec moi avant le départ.',
      statut: 'publiee' as const, publieeLe: j(-4), invitesDirects: ['Julien Morel'],
    }
    const passe = {
      id: 'mis-printemps', cabinetId: DEMO_CABINET, motif: 'Formation' as const,
      du: j(-40), au: j(-33), joursTravailles: 7, dimanchesFeries: 1,
      caJournalier: 460, retrocessionPct: 85, patientsJour: 26, kmJour: 60,
      horaires: '6 h 30 – 13 h / 17 h – 19 h',
      soinsRequis: ['Pansements complexes', 'Diabète / insuline'],
      vehiculeFourni: true, logementFourni: false,
      statut: 'terminee' as const, publieeLe: j(-70), remplacantRetenuId: DEMO_REMPLACANT, invitesDirects: [],
    }
    const noel = {
      id: 'mis-noel', cabinetId: DEMO_CABINET, motif: 'Congés' as const,
      du: j(105), au: j(112), joursTravailles: 7, dimanchesFeries: 2,
      caJournalier: 480, retrocessionPct: 85, patientsJour: 28, kmJour: 65,
      horaires: '6 h 30 – 13 h / 17 h – 19 h 30',
      soinsRequis: ['Pansements complexes'], vehiculeFourni: true, logementFourni: false,
      statut: 'brouillon' as const, invitesDirects: [],
    }
    const saumur = {
      id: 'mis-saumur', cabinetId: 'cab-loire', motif: 'Maternité / paternité' as const,
      du: j(15), au: j(100), joursTravailles: 70, dimanchesFeries: 10,
      caJournalier: 420, retrocessionPct: 88, patientsJour: 24, kmJour: 45,
      horaires: '7 h – 13 h / 16 h 30 – 19 h', soinsRequis: ['Nursing / toilettes', 'Diabète / insuline'],
      vehiculeFourni: false, logementFourni: true,
      commentaire: 'Long remplacement, idéal pour une remplaçante qui cherche de la stabilité. Logement indépendant fourni.',
      statut: 'publiee' as const, publieeLe: j(-2), invitesDirects: [],
    }
    const cholet = {
      id: 'mis-cholet', cabinetId: 'cab-mauges', motif: 'Congés' as const,
      du: j(40), au: j(54), joursTravailles: 13, dimanchesFeries: 2,
      caJournalier: 510, retrocessionPct: 82, patientsJour: 32, kmJour: 80,
      horaires: '6 h – 13 h / 17 h – 20 h', soinsRequis: ['Chimiothérapie à domicile', 'Perfusions / PICC'],
      vehiculeFourni: true, logementFourni: false,
      statut: 'publiee' as const, publieeLe: j(-1), invitesDirects: [],
    }
    e.missions = [ete, passe, noel, saumur, cholet]

    // Candidatures -------------------------------------------------------
    e.candidatures = [
      { id: 'cand-1', missionId: 'mis-ete', remplacantId: DEMO_REMPLACANT, envoyeeLe: j(-3), statut: 'envoyee',
        message: 'Bonjour Marie, je connais déjà la tournée pour vous avoir remplacée en avril. Disponible sur toute la période, avec plaisir.' },
      { id: 'cand-2', missionId: 'mis-ete', remplacantId: 'rmp-amina', envoyeeLe: j(-2), statut: 'envoyee',
        message: 'Bonjour, disponible et véhiculée. Je maîtrise les pansements complexes et le suivi diabétique.' },
      { id: 'cand-3', missionId: 'mis-ete', remplacantId: 'rmp-thomas', envoyeeLe: j(-1), statut: 'envoyee',
        message: 'Bonjour, très motivé, je peux me libérer sur ces dates.' },
      { id: 'cand-4', missionId: 'mis-printemps', remplacantId: DEMO_REMPLACANT, envoyeeLe: j(-60), statut: 'retenue', message: 'Disponible.' },
    ]

    // Contrat terminé + rétrocession -------------------------------------
    e.contrats = [{
      id: 'ctr-printemps', missionId: 'mis-printemps', cabinetId: DEMO_CABINET, remplacantId: DEMO_REMPLACANT,
      creeLe: j(-55), retrocessionPct: 85, echeanceReversement: j(-3), clauseNonConcurrence: false,
      signatureTitulaire: { parId: DEMO_CABINET, le: j(-55), saisie: 'Marie Dubois' },
      signatureRemplacant: { parId: DEMO_REMPLACANT, le: j(-54), saisie: 'Julien Morel' },
      transmisCDOILe: j(-50),
    }]
    e.lignes = [
      { id: 'lg-1', contratId: 'ctr-printemps', libelle: 'Semaine 1 (du lundi au jeudi)', du: j(-40), au: j(-37), caEncaisse: 1_860, pct: 85, echeance: j(-20), payeeLe: j(-22) },
      { id: 'lg-2', contratId: 'ctr-printemps', libelle: 'Semaine 1 (vendredi à dimanche)', du: j(-36), au: j(-33), caEncaisse: 1_540, pct: 85, echeance: j(-3) },
    ]
    e.recos = [
      { id: 'reco-1', contratId: 'ctr-printemps', deId: DEMO_CABINET, versId: DEMO_REMPLACANT, note: 5, le: j(-30),
        texte: 'Julien a pris la tournée comme si c’était la sienne. Les patients ont demandé quand il revenait.' },
      { id: 'reco-2', contratId: 'ctr-ext-1', deId: 'cab-loire', versId: DEMO_REMPLACANT, note: 5, le: j(-120),
        texte: 'Ponctuel, rigoureux sur la facturation, passation propre au retour.' },
      { id: 'reco-3', contratId: 'ctr-ext-2', deId: 'cab-nantes', versId: DEMO_REMPLACANT, note: 4, le: j(-200),
        texte: 'Très bon relationnel. Je le rappellerai.' },
      { id: 'reco-4', contratId: 'ctr-ext-3', deId: 'cab-mauges', versId: 'rmp-lea', note: 5, le: j(-90),
        texte: 'Léa gère la chimio à domicile sans stress. Une pointure.' },
      { id: 'reco-5', contratId: 'ctr-ext-4', deId: 'cab-nantes', versId: 'rmp-lea', note: 5, le: j(-300), texte: 'Parfait.' },
      { id: 'reco-6', contratId: 'ctr-ext-5', deId: 'cab-loire', versId: 'rmp-amina', note: 4, le: j(-150),
        texte: 'Sérieuse, à l’écoute des patients.' },
    ]

    // Fiche de tournée de la mission passée, réutilisable comme modèle ----
    e.fiches = [{
      missionId: 'mis-printemps', majLe: j(-45),
      accesCabinet: 'Clé dans la boîte à code du cabinet (code transmis par SMS). Alarme : code #1907.',
      pharmacie: 'Pharmacie des Tilleuls — 02 41 00 00 00 (ouverte 8 h 30 – 19 h 30)',
      medecinReferent: 'Dr Lambert — 02 41 11 11 11 (MSP de Montreuil-Juigné)',
      consignes: 'Commencer par M. R. (insuline à 6 h 45 précises). Mme B. a un chien peureux, entrer par le garage. Le cahier de transmissions reste au cabinet.',
      patients: [
        { id: 'p1', initiales: 'M. R.', rue: 'Rue des Vignes, Feneu', creneau: '6 h 45', soins: 'Glycémie + insuline, pansement talon', duree: 25, particularites: 'Sonnette en panne : frapper fort.' },
        { id: 'p2', initiales: 'Mme B.', rue: 'La Grande Cour, Cantenay', creneau: '7 h 20', soins: 'Toilette complète, bas de contention', duree: 40, particularites: 'Chien peureux, passer par le garage.' },
        { id: 'p3', initiales: 'M. et Mme L.', rue: 'Route de Sceaux, Feneu', creneau: '8 h 10', soins: 'Pansement ulcère (protocole au dossier), pilulier', duree: 30 },
        { id: 'p4', initiales: 'Mme T.', rue: 'Impasse du Lavoir, Montreuil-Juigné', creneau: '8 h 50', soins: 'Perfusion antibiotique sur PICC, réfection pansement', duree: 35, particularites: 'Fille présente le matin, très aidante.' },
        { id: 'p5', initiales: 'M. D.', rue: 'Chemin du Moulin, Feneu', creneau: '9 h 30', soins: 'Glycémie, injection', duree: 15 },
      ],
    }]

    // Parrainage : Marie a déjà 2 filleuls actifs, il lui en manque 1 pour « Référent »
    e.invitations = [
      { id: 'inv-1', parId: DEMO_CABINET, nom: 'Sophie Lemaire (Saumur)', canal: 'whatsapp', le: j(-140), filleulId: 'cab-loire', actifLe: j(-120) },
      { id: 'inv-2', parId: DEMO_CABINET, nom: 'Karim Benali (Cholet)', canal: 'sms', le: j(-95), filleulId: 'cab-mauges', actifLe: j(-80) },
      { id: 'inv-3', parId: DEMO_CABINET, nom: 'Julien Morel', canal: 'lien', le: j(-70), filleulId: DEMO_REMPLACANT },
      { id: 'inv-4', parId: DEMO_CABINET, nom: 'Cabinet Bellevue (Segré)', canal: 'email', le: j(-12) },
      { id: 'inv-5', parId: 'cab-loire', nom: 'Amina Cherif', canal: 'lien', le: j(-100), filleulId: 'rmp-amina', actifLe: j(-90) },
    ]

    e.badges = {
      [DEMO_CABINET]: [
        { key: 'premier-besoin', le: j(-70) }, { key: 'premier-contrat', le: j(-54) },
        { key: 'ordre-ok', le: j(-50) }, { key: 'passation', le: j(-45) },
        { key: 'retro-a-lheure', le: j(-22) }, { key: 'confrere', le: j(-120) },
      ],
      [DEMO_REMPLACANT]: [
        { key: 'dossier-complet', le: j(-200) }, { key: 'premiere-mission', le: j(-54) }, { key: 'recommande', le: j(-200) },
      ],
    }
    e.seedeLe = il
    e.session = null
  })
}
