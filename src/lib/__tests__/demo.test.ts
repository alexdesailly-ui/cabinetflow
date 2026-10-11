import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  decoderAnnonce, encoderAnnonce, lienAnnonce, messageAnnonce, messageReponse, nettoyerTelephone, nombreDeJours, urlWhatsApp,
  type Annonce,
} from '../annonce'
import { BLOCS, messageAvis } from '../demoBlocs'
import { controlesDe, mondeDemo, texteContratDemo } from '../demoFixtures'
import { formatDate, formatPeriode } from '../domain'
import {
  basculerInteretEncaissement, choisirOffre, definirCommentaire, definirPrix, definirProfil, estVerrouille, lireEtat, marquerBlocVu,
  noter, progression, rechargerEtat, reinitialiserDemo, validerEtat,
} from '../demoState'

/** localStorage minimal : les tests tournent sous Node. */
function brancherStockage(initial: Record<string, string> = {}) {
  const donnees = new Map(Object.entries(initial))
  ;(globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => donnees.get(k) ?? null,
    setItem: (k: string, v: string) => { donnees.set(k, v) },
    removeItem: (k: string) => { donnees.delete(k) },
  }
  return donnees
}

const annonce: Annonce = { cabinet: 'Cabinet des Tilleuls', ville: 'Angers', du: '2026-12-01', au: '2026-12-14', motif: 'Congés', tel: '33612345678' }

describe('annonce WhatsApp sans serveur', () => {
  it('survit à un aller-retour dans le lien, accents compris', () => {
    const a: Annonce = { ...annonce, cabinet: 'Cabinet de l’Étoile — Chênes & Co', ville: 'Saint-Étienne' }
    expect(decoderAnnonce(encoderAnnonce(a))).toEqual(a)
  })

  it('ne contient que des caractères sûrs dans une adresse', () => {
    expect(encoderAnnonce(annonce)).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('rejette un lien abîmé ou fabriqué', () => {
    expect(decoderAnnonce('')).toBeNull()
    expect(decoderAnnonce('pas-du-base64!!')).toBeNull()
    expect(decoderAnnonce(btoa('[1,2,3]'))).toBeNull()
    expect(decoderAnnonce(btoa(JSON.stringify({ c: 'x', v: 'y', d: '2026-12-14', f: '2026-12-01', m: 'Congés' })))).toBeNull() // fin avant début
    expect(decoderAnnonce(btoa(JSON.stringify({ c: 'x', v: 'y', d: 'demain', f: '2026-12-01', m: 'Congés' })))).toBeNull()
    expect(decoderAnnonce(btoa(JSON.stringify({ c: 'x'.repeat(500), v: 'y', d: '2026-12-01', f: '2026-12-02', m: 'Congés' })))).toBeNull()
  })

  it('ne garde que des chiffres dans le numéro, même si le lien est piégé', () => {
    const piege = btoa(JSON.stringify({ c: 'x', v: 'y', d: '2026-12-01', f: '2026-12-02', m: 'Cong', t: '+33 6 12 34 56 78<script>' }))
    expect(decoderAnnonce(piege)?.tel).toBe('33612345678')
  })

  it('met un numéro français au format international', () => {
    expect(nettoyerTelephone('06 12 34 56 78')).toBe('33612345678')
    expect(nettoyerTelephone('+33 6 12 34 56 78')).toBe('33612345678')
    expect(nettoyerTelephone('0033 6 12 34 56 78')).toBe('33612345678')
    expect(nettoyerTelephone('12')).toBeUndefined()
    expect(nettoyerTelephone('')).toBeUndefined()
  })

  it('compte les jours début et fin inclus', () => {
    expect(nombreDeJours('2026-12-01', '2026-12-14')).toBe(14)
    expect(nombreDeJours('2026-12-01', '2026-12-01')).toBe(1)
  })

  it('compose le message, le lien et les adresses WhatsApp', () => {
    const lien = lienAnnonce(annonce, 'https://cabinetflow.fr/?demo=cabinet#/demo')
    expect(lien.startsWith('https://cabinetflow.fr/?demo=cabinet#/annonce/')).toBe(true)
    expect(lien).not.toContain('#/demo')
    const msg = messageAnnonce(annonce, lien)
    expect(msg).toContain('Cabinet des Tilleuls (Angers)')
    expect(msg).toContain('du 1 déc. au 14 déc. 2026')
    expect(msg).toContain('14 jours')
    expect(msg).toContain(lien)
    expect(messageReponse(annonce)).toContain('partant(e) pour votre remplacement du 1 déc. au 14 déc. 2026')
    expect(urlWhatsApp('Bonjour & merci', '33612345678')).toBe('https://wa.me/33612345678?text=Bonjour%20%26%20merci')
    expect(urlWhatsApp('Bonjour')).toBe('https://wa.me/?text=Bonjour')
  })
})

describe('dates du calendrier', () => {
  it('compacte une période et n’écrit l’année qu’une fois quand elle est commune', () => {
    expect(formatPeriode('2026-11-25', '2026-12-08')).toBe('25 nov. → 8 déc. 2026')
    expect(formatPeriode('2026-12-28', '2027-01-10')).toBe('28 déc. 2026 → 10 janv. 2027')
    expect(formatPeriode('2026-11-25', '2026-12-08', 'phrase')).toBe('du 25 nov. au 8 déc. 2026')
  })

  it('ne décale jamais un jour, même à l’ouest de Greenwich (Antilles, Polynésie)', () => {
    vi.stubEnv('TZ', 'Pacific/Tahiti')
    try {
      expect(new Date('2026-11-25').getDate()).toBe(24) // le piège : minuit UTC est la veille là-bas
      expect(formatDate('2026-11-25')).toBe('25 nov. 2026')
      expect(formatPeriode('2026-11-25', '2026-12-08')).toBe('25 nov. → 8 déc. 2026')
    } finally {
      vi.unstubAllEnvs()
    }
  })
})

describe('état de la démonstration', () => {
  beforeEach(() => { brancherStockage(); rechargerEtat() })

  it('démarre sur la version gratuite : les blocs Premium sont verrouillés, le partage WhatsApp ne l’est pas', () => {
    const e = lireEtat()
    expect(e.offre).toBe('gratuite')
    expect(estVerrouille(1, e.offre)).toBe(false)
    expect(estVerrouille(2, e.offre)).toBe(false)
    expect(estVerrouille(3, e.offre)).toBe(true)
    expect(estVerrouille(4, e.offre)).toBe(true)
    expect(estVerrouille(5, e.offre)).toBe(false)
  })

  it('l’essai déverrouille les blocs Premium, et on peut revenir au gratuit', () => {
    choisirOffre('essai')
    expect(estVerrouille(3, lireEtat().offre)).toBe(false)
    choisirOffre('gratuite')
    expect(estVerrouille(3, lireEtat().offre)).toBe(true)
  })

  it('retient les notes, les blocs vus et la progression', () => {
    marquerBlocVu(1); marquerBlocVu(1); marquerBlocVu(3)
    noter(1, 'top'); noter(3, 'non'); noter(1, 'bof')
    expect(progression(lireEtat())).toEqual({ vus: 2, notes: 2, total: 5 })
    expect(lireEtat().notes[1]).toBe('bof')
  })

  it('persiste puis se relit depuis le stockage', () => {
    const donnees = brancherStockage(); rechargerEtat()
    choisirOffre('essai'); noter(2, 'top'); definirPrix('correct'); definirProfil('Titulaire')
    const ecrit = donnees.get('releve:demo-blocs')
    expect(ecrit).toBeDefined()
    brancherStockage({ 'releve:demo-blocs': ecrit! }); rechargerEtat()
    expect(lireEtat()).toMatchObject({ offre: 'essai', notes: { 2: 'top' }, prix: 'correct', profil: 'Titulaire' })
  })

  it('ignore un contenu stocké corrompu ou piégé', () => {
    brancherStockage({ 'releve:demo-blocs': '{pas du json' }); rechargerEtat()
    expect(lireEtat().offre).toBe('gratuite')
    expect(validerEtat({ offre: 'admin', notes: { 9: 'top', 2: 'génial', 3: 'non' }, vus: [1, 1, 7, '2'], prix: 'gratuit', profil: 'Chef', commentaire: 12 }))
      .toEqual({ offre: 'gratuite', notes: { 3: 'non' }, vus: [1], commentaire: '', interetEncaissement: false })
  })

  it('fonctionne même sans stockage (navigation privée)', () => {
    ;(globalThis as { localStorage?: unknown }).localStorage = { getItem: () => { throw new Error('bloqué') }, setItem: () => { throw new Error('bloqué') } }
    rechargerEtat()
    noter(1, 'top')
    expect(lireEtat().notes[1]).toBe('top')
  })

  it('se remet à zéro', () => {
    choisirOffre('essai'); noter(1, 'top'); basculerInteretEncaissement(); definirCommentaire('super')
    reinitialiserDemo()
    expect(lireEtat()).toEqual({ offre: 'gratuite', notes: {}, vus: [], commentaire: '', interetEncaissement: false })
  })
})

describe('message de retour', () => {
  beforeEach(() => { brancherStockage(); rechargerEtat() })

  it('nomme chaque bloc par son numéro et son thème, testé ou non', () => {
    noter(1, 'top'); noter(4, 'non'); definirProfil('Titulaire'); definirPrix('cher'); noter(2, 'bof'); basculerInteretEncaissement(); definirCommentaire('  Clair  ')
    const m = messageAvis(lireEtat())
    expect(m).toContain('Profil : Titulaire')
    expect(m).toContain('Bloc 1 · Partage WhatsApp : 😍 utile')
    expect(m).toContain('Bloc 2 · Souscription et onboarding : 😐 bof (prix : trop cher)')
    expect(m).toContain('Bloc 3 · Signature électronique : pas testé')
    expect(m).toContain('Bloc 4 · Facturation et encaissement : 🙅 pas pour moi (encaissement automatique : ça m’intéresse)')
    expect(m).toContain('Un mot : Clair')
    expect(m.split('\n').filter(l => l.startsWith('Bloc ')).length).toBe(BLOCS.length)
  })
})

describe('jeu de données des blocs', () => {
  it('Julien est en règle ; Amina et Thomas sont bloqués pour de bonnes raisons', () => {
    const { candidats, mission } = mondeDemo()
    const [julien, amina, thomas] = candidats.map(c => controlesDe(c, mission))
    expect(julien.filter(c => c.gravite === 'bloquant')).toHaveLength(0)
    expect(amina.map(c => c.titre)).toContain('Autorisation expirée avant la fin du remplacement')
    expect(thomas.map(c => c.titre)).toContain('RCP non valide')
  })

  it('remplit le vrai modèle de contrat', () => {
    const texte = texteContratDemo()
    expect(texte).toContain('CONTRAT DE REMPLACEMENT')
    expect(texte).toContain('Marie Dubois')
    expect(texte).toContain('Julien Morel')
    expect(texte).toContain('85 %')
  })
})
