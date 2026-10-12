import { describe, expect, it } from 'vitest'
import {
  afficherTelephone,
  analyserTelephone,
  decoderAnnonce,
  encoderAnnonce,
  lienAnnonce,
  messageAnnonce,
  messagePourvu,
  messageReponse,
  messageRelance,
  nettoyerTelephone,
  urlWhatsApp,
  verifierSaisie,
  type Annonce,
  type Saisie,
} from '../annonce'

const annonce: Annonce = {
  cabinet: 'Cabinet des Tilleuls',
  ville: 'Angers',
  du: '2026-10-26',
  au: '2026-11-08',
  tel: '33612345678',
}

const lien = 'https://cabinetflow.fr/#/annonce/CODE'

/** Un lien tel que le fabriquerait un tiers : JSON en base64 URL. */
const lienFabrique = (objet: unknown) =>
  btoa(JSON.stringify(objet)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

describe('lien d’annonce', () => {
  it('survit à un aller-retour, accents, apostrophes et symboles compris', () => {
    const a: Annonce = {
      ...annonce,
      cabinet: 'Cabinet de l’Étoile — Chênes & Co ✚',
      ville: 'Saint-Étienne',
    }
    expect(decoderAnnonce(encoderAnnonce(a))).toEqual(a)
  })

  it('ne contient que des caractères sûrs dans une adresse', () => {
    expect(encoderAnnonce(annonce)).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('reste court : une annonce aux limites tient largement dans un message', () => {
    const maximale: Annonce = { ...annonce, cabinet: 'É'.repeat(80), ville: 'é'.repeat(60) }
    expect(lienAnnonce(maximale, 'https://cabinetflow.fr/').length).toBeLessThan(500)
    expect(lienAnnonce(annonce, 'https://cabinetflow.fr/').length).toBeLessThan(200)
  })

  it('accepte les premiers liens, qui portaient un motif et pouvaient n’avoir pas de numéro', () => {
    const ancien = lienFabrique({
      c: 'Cabinet',
      v: 'Nantes',
      d: '2026-12-01',
      f: '2026-12-14',
      m: 'Congés',
    })
    expect(decoderAnnonce(ancien)).toEqual({
      cabinet: 'Cabinet',
      ville: 'Nantes',
      du: '2026-12-01',
      au: '2026-12-14',
    })
  })

  it('rejette un lien abîmé ou fabriqué', () => {
    const base = { c: 'x', v: 'y', d: '2026-12-01', f: '2026-12-02' }
    const refuses: [string, string][] = [
      ['vide', ''],
      ['pas du base64', 'pas-du-base64!!'],
      ['un tableau', lienFabrique([1, 2, 3])],
      ['fin avant début', lienFabrique({ ...base, d: '2026-12-14', f: '2026-12-01' })],
      ['date en toutes lettres', lienFabrique({ ...base, d: 'demain' })],
      ['jour inexistant', lienFabrique({ ...base, f: '2026-02-31' })],
      ['nom démesuré', lienFabrique({ ...base, c: 'x'.repeat(500) })],
      ['nom vide', lienFabrique({ ...base, c: '   ' })],
      ['ville absente', lienFabrique({ c: 'x', d: base.d, f: base.f })],
      ['plus d’un an', lienFabrique({ ...base, f: '2028-01-01' })],
      ['dates de mauvais type', lienFabrique({ ...base, d: 20261201 })],
    ]
    for (const [description, code] of refuses) expect(decoderAnnonce(code), description).toBeNull()
  })

  it('ne garde que des chiffres dans le numéro, même si le lien est piégé', () => {
    const piege = lienFabrique({
      c: 'x',
      v: 'y',
      d: '2026-12-01',
      f: '2026-12-02',
      t: '+33 6 12 34 56 78<script>',
    })
    expect(decoderAnnonce(piege)?.tel).toBe('33612345678')
  })

  it('ignore un numéro qui ne peut pas être celui de WhatsApp', () => {
    const fixe = lienFabrique({
      c: 'x',
      v: 'y',
      d: '2026-12-01',
      f: '2026-12-02',
      t: '02 41 00 00 00',
    })
    expect(decoderAnnonce(fixe)?.tel).toBeUndefined()
  })

  it('retire la requête et le fragment de l’adresse de base', () => {
    const a = lienAnnonce(annonce, 'https://cabinetflow.fr/?demo=cabinet#/demo')
    expect(a.startsWith('https://cabinetflow.fr/#/annonce/')).toBe(true)
  })
})

describe('numéro de téléphone', () => {
  it.each([
    ['06 12 34 56 78', '33612345678'],
    ['06.12.34.56.78', '33612345678'],
    ['+33 6 12 34 56 78', '33612345678'],
    ['+33 (0)6 12 34 56 78', '33612345678'],
    ['0033 6 12 34 56 78', '33612345678'],
    ['07 98 76 54 32', '33798765432'],
    ['+32 470 12 34 56', '32470123456'],
    ['+590 690 12 34 56', '590690123456'],
  ])('« %s » devient %s', (saisie, attendu) => {
    expect(analyserTelephone(saisie)).toEqual({ numero: attendu })
    expect(nettoyerTelephone(saisie)).toBe(attendu)
  })

  it.each([
    ['', /invalide/],
    ['12', /invalide/],
    ['06 12 34', /invalide/],
    ['+33 6 12 34 56 78 99 12 34', /invalide/],
    ['02 41 00 00 00', /fixe/],
    ['01 40 00 00 00', /fixe/],
    ['06 90 12 34 56', /outre-mer/],
    ['06 94 12 34 56', /outre-mer/],
    ['06 39 12 34 56', /outre-mer/],
  ])('« %s » est refusé', (saisie, motif) => {
    const resultat = analyserTelephone(saisie)
    expect('erreur' in resultat && resultat.erreur).toMatch(motif)
    expect(nettoyerTelephone(saisie)).toBeUndefined()
  })
})

describe('affichage du numéro', () => {
  it('découpe un numéro français et laisse les autres pays tels quels', () => {
    expect(afficherTelephone('33612345678')).toBe('+33 6 12 34 56 78')
    expect(afficherTelephone('590690123456')).toBe('+590690123456')
  })
})

describe('saisie du cabinet', () => {
  const saisie: Saisie = {
    cabinet: '  Cabinet des Tilleuls ',
    ville: 'Angers ',
    du: '2026-10-26',
    au: '2026-11-08',
    tel: '06 12 34 56 78',
  }
  const aujourdhui = '2026-10-12'

  it('produit l’annonce, sans espaces superflus et avec le numéro au format international', () => {
    expect(verifierSaisie(saisie, aujourdhui)).toEqual({ annonce })
  })

  it('accepte une annonce qui commence aujourd’hui et une absence d’un seul jour', () => {
    expect(
      'annonce' in verifierSaisie({ ...saisie, du: aujourdhui, au: aujourdhui }, aujourdhui),
    ).toBe(true)
  })

  it('explique chaque champ à corriger', () => {
    const vide = verifierSaisie({ cabinet: ' ', ville: '', du: '', au: '', tel: '' }, aujourdhui)
    expect(vide).toEqual({
      erreurs: {
        cabinet: 'Indiquez le nom du cabinet.',
        ville: 'Indiquez la ville.',
        du: 'Choisissez le premier jour d’absence.',
        au: 'Choisissez le dernier jour d’absence.',
        tel: expect.stringMatching(/invalide/),
      },
    })
  })

  it.each([
    ['un début passé', { du: '2026-10-11' }, 'du', /passé/],
    ['une fin avant le début', { au: '2026-10-20' }, 'au', /suit/],
    ['plus d’un an', { au: '2028-01-01' }, 'au', /un an/],
    ['un jour inexistant', { au: '2026-02-31' }, 'au', /dernier jour/],
    ['un nom démesuré', { cabinet: 'x'.repeat(81) }, 'cabinet', /80/],
    ['une ville démesurée', { ville: 'x'.repeat(61) }, 'ville', /60/],
    ['un fixe', { tel: '02 41 00 00 00' }, 'tel', /fixe/],
  ] as const)('refuse %s', (_, modif, champ, message) => {
    const resultat = verifierSaisie({ ...saisie, ...modif }, aujourdhui)
    expect('erreurs' in resultat && resultat.erreurs[champ]).toMatch(message)
  })
})

describe('messages', () => {
  it('annonce : tout ce qu’il faut pour décider, et le lien', () => {
    expect(messageAnnonce(annonce, lien)).toBe(
      'Bonjour ! Cabinet des Tilleuls (Angers) cherche un(e) infirmier(ère) remplaçant(e) ' +
        'du lundi 26 octobre au dimanche 8 novembre 2026 (14 jours).\n' +
        `Partant(e) ? Un tap suffit : ${lien}`,
    )
  })

  it('met « jour » au singulier pour une absence d’un jour', () => {
    expect(messageAnnonce({ ...annonce, au: annonce.du }, lien)).toContain('(1 jour)')
  })

  it('relance et clôture reprennent les dates', () => {
    expect(messageRelance(annonce, lien)).toContain('cherche toujours')
    expect(messageRelance(annonce, lien)).toContain(
      'du lundi 26 octobre au dimanche 8 novembre 2026',
    )
    expect(messageRelance(annonce, lien)).toContain(lien)
    expect(messagePourvu(annonce)).toBe(
      'Bonjour, le remplacement du lundi 26 octobre au dimanche 8 novembre 2026 chez Cabinet des Tilleuls est pourvu. ' +
        'Merci à tous pour vos réponses !',
    )
  })

  it('réponse du remplaçant : son message reprend les dates', () => {
    expect(messageReponse(annonce)).toBe(
      'Bonjour, je suis partant(e) pour votre remplacement du lundi 26 octobre au dimanche 8 novembre 2026. Pouvons-nous en parler ?',
    )
  })

  it('adresse WhatsApp : message encodé, conversation choisie si aucun numéro', () => {
    expect(urlWhatsApp('Bonjour & merci', '33612345678')).toBe(
      'https://wa.me/33612345678?text=Bonjour%20%26%20merci',
    )
    expect(urlWhatsApp('Bonjour')).toBe('https://wa.me/?text=Bonjour')
  })
})
