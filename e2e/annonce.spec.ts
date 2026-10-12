import AxeBuilder from '@axe-core/playwright'
import { expect, test, type BrowserContext, type Page } from '@playwright/test'

/** WhatsApp n'est pas joignable depuis les essais : on le remplace par une page vide. */
async function simulerWhatsApp(context: BrowserContext) {
  await context.route('https://wa.me/**', route =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<title>WhatsApp</title>' }),
  )
}

/** Ouvre le lien WhatsApp d'un bouton et rend l'adresse demandée (numéro et message décodés). */
async function ouvrirWhatsApp(page: Page, nomDuLien: string | RegExp) {
  const [fenetre] = await Promise.all([
    page.context().waitForEvent('page'),
    page.getByRole('link', { name: nomDuLien }).click(),
  ])
  const adresse = new URL(fenetre.url())
  await fenetre.close()
  return { numero: adresse.pathname.slice(1), texte: adresse.searchParams.get('text') ?? '' }
}

const lienDans = (texte: string) => texte.match(/https?:\/\/\S+/)?.[0] ?? ''

async function remplirFormulaire(page: Page, tel = '06 12 34 56 78') {
  await page.getByLabel('Nom du cabinet').fill('Cabinet des Tilleuls')
  await page.getByLabel('Ville').fill('Angers')
  await page.getByLabel('Votre numéro WhatsApp').fill(tel)
}

test.beforeEach(async ({ context }) => {
  await simulerWhatsApp(context)
})

test.describe('parcours du cabinet et du remplaçant', () => {
  test('le cabinet annonce, le remplaçant répond d’un tap, le cabinet suit son annonce', async ({
    page,
    context,
  }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Annoncer mon absence' }).click()
    await expect(page).toHaveURL(/#\/annoncer$/)
    await remplirFormulaire(page)

    // Les deux semaines proposées par défaut suffisent : on vérifie seulement que l'aperçu est complet.
    const apercu = page.locator('.wa-bulle')
    await expect(apercu).toContainText('Cabinet des Tilleuls (Angers) cherche un(e) infirmier(ère)')
    await expect(apercu).toContainText('(14 jours)')

    const envoi = await ouvrirWhatsApp(page, 'Envoyer sur WhatsApp')
    expect(envoi.numero).toBe('')
    expect(envoi.texte).toContain('Cabinet des Tilleuls (Angers)')
    const lien = lienDans(envoi.texte)
    expect(lien).toContain('#/annonce/')

    // L'outil montre alors le suivi de l'annonce, avec les réponses attendues sur le bon numéro.
    await expect(page.getByRole('heading', { name: 'Votre annonce' })).toBeVisible()
    await expect(page.getByText('+33 6 12 34 56 78')).toBeVisible()

    // Un remplaçant, sur un autre appareil, ouvre le lien reçu.
    const remplacant = await context.newPage()
    await remplacant.goto(lien)
    await expect(
      remplacant.getByRole('heading', { name: 'Cabinet des Tilleuls cherche un·e remplaçant·e' }),
    ).toBeVisible()
    await expect(remplacant.getByText('14 jours')).toBeVisible()
    const reponse = await ouvrirWhatsApp(remplacant, 'Je suis partant(e)')
    expect(reponse.numero).toBe('33612345678')
    expect(reponse.texte).toMatch(/^Bonjour, je suis partant\(e\) pour votre remplacement du /)

    // Le cabinet relance, puis clôture.
    const relance = await ouvrirWhatsApp(page, 'Relancer sur WhatsApp')
    expect(relance.texte).toContain('cherche toujours')
    expect(lienDans(relance.texte)).toBe(lien)
    await ouvrirWhatsApp(page, /Remplacement pourvu/)
    await expect(page.getByText('Pourvue')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Relancer sur WhatsApp' })).toHaveCount(0)
  })

  test('le suivi survit au rechargement et les coordonnées sont retenues', async ({ page }) => {
    await page.goto('/#/annoncer')
    await remplirFormulaire(page)
    await ouvrirWhatsApp(page, 'Envoyer sur WhatsApp')
    await expect(page.getByRole('heading', { name: 'Votre annonce' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Votre annonce' })).toBeVisible()
    await expect(page.getByText('En cours')).toBeVisible()

    await page.getByRole('button', { name: 'Faire une nouvelle annonce' }).click()
    await expect(page.getByLabel('Nom du cabinet')).toHaveValue('Cabinet des Tilleuls')
    await expect(page.getByLabel('Ville')).toHaveValue('Angers')
    await expect(page.getByLabel('Votre numéro WhatsApp')).toHaveValue('06 12 34 56 78')
  })

  test('copier le message compte aussi comme un envoi', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/#/annoncer')
    await remplirFormulaire(page)
    await page.getByRole('button', { name: 'Copier le message' }).click()
    const copie = await page.evaluate(() => navigator.clipboard.readText())
    expect(copie).toContain('Cabinet des Tilleuls (Angers)')
    await expect(page.getByRole('heading', { name: 'Votre annonce' })).toBeVisible()
  })
})

test.describe('saisie du cabinet', () => {
  test('un formulaire incomplet explique ce qui manque, sans rien envoyer', async ({ page }) => {
    await page.goto('/#/annoncer')
    await expect(page.getByRole('button', { name: 'Copier le message' })).toBeDisabled()
    await page.getByRole('button', { name: 'Envoyer sur WhatsApp' }).click()
    await expect(page.getByText('Indiquez le nom du cabinet.')).toBeVisible()
    await expect(page.getByText('Indiquez la ville.')).toBeVisible()
    await expect(page.getByLabel('Votre numéro WhatsApp')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByRole('heading', { name: 'Votre annonce' })).toHaveCount(0)
  })

  test('un numéro fixe est refusé avec une explication', async ({ page }) => {
    await page.goto('/#/annoncer')
    await remplirFormulaire(page, '02 41 00 00 00')
    await page.getByRole('button', { name: 'Envoyer sur WhatsApp' }).click()
    await expect(page.getByText('Ce numéro est un fixe')).toBeVisible()
  })

  test('les durées proposées règlent le dernier jour et déplacer le début garde la durée', async ({
    page,
  }) => {
    await page.goto('/#/annoncer')
    await page.getByRole('button', { name: '3 semaines' }).click()
    await expect(page.getByText(/^21 jours · du /)).toBeVisible()
    await page.getByLabel('Du', { exact: true }).fill('2030-03-04')
    await expect(page.getByLabel('Au', { exact: true })).toHaveValue('2030-03-24')
    await expect(
      page.getByText('21 jours · du lundi 4 mars au dimanche 24 mars 2030'),
    ).toBeVisible()
  })

  test('une fin avant le début est signalée', async ({ page }) => {
    await page.goto('/#/annoncer')
    await remplirFormulaire(page)
    await page.getByLabel('Au', { exact: true }).fill('2020-01-01')
    await page.getByRole('button', { name: 'Envoyer sur WhatsApp' }).click()
    await expect(page.getByText('Le dernier jour suit le premier.')).toBeVisible()
  })
})

test.describe('page du remplaçant', () => {
  const lienDe = (objet: object) =>
    `/#/annonce/${Buffer.from(JSON.stringify(objet)).toString('base64url')}`

  test('un lien abîmé ne montre rien d’inventé', async ({ page }) => {
    await page.goto('/#/annonce/n-importe-quoi')
    await expect(
      page.getByRole('heading', { name: 'Ce lien d’annonce n’est pas valide' }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Je suis partant(e)' })).toHaveCount(0)
  })

  test('une annonce passée n’invite plus à répondre', async ({ page }) => {
    await page.goto(
      lienDe({
        c: 'Cabinet Ancien',
        v: 'Nantes',
        d: '2020-01-01',
        f: '2020-01-10',
        t: '33612345678',
      }),
    )
    await expect(page.getByText('Annonce terminée')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Je suis partant(e)' })).toHaveCount(0)
  })

  test('un ancien lien, sans numéro, laisse choisir la conversation', async ({ page }) => {
    await page.goto(
      lienDe({ c: 'Cabinet Ancien', v: 'Nantes', d: '2099-01-01', f: '2099-01-10', m: 'Congés' }),
    )
    const reponse = await ouvrirWhatsApp(page, 'Je suis partant(e)')
    expect(reponse.numero).toBe('')
    await expect(page.getByText('choisissez le cabinet dans vos conversations')).toBeVisible()
  })

  test('un nom de cabinet piégé reste du texte', async ({ page }) => {
    await page.goto(
      lienDe({ c: '<img src=x onerror=alert(1)>', v: 'Nantes', d: '2099-01-01', f: '2099-01-10' }),
    )
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      '<img src=x onerror=alert(1)>',
    )
    await expect(page.locator('main img')).toHaveCount(0)
  })
})

test.describe('anciens liens et pages annexes', () => {
  test('l’ancien lien de démonstration ouvre l’outil d’annonce', async ({ page }) => {
    await page.goto('/?demo=cabinet')
    await expect(
      page.getByRole('heading', { name: 'Annoncer mon absence', level: 1 }),
    ).toBeVisible()
  })

  test('une adresse inconnue ramène à l’accueil', async ({ page }) => {
    await page.goto('/#/compte')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Prévenez vos remplaçants')
  })

  test('les mentions légales s’affichent', async ({ page }) => {
    await page.goto('/#/legal/mentions')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})

test.describe('qualité des pages', () => {
  const pages = [
    ['accueil', '/'],
    ['outil d’annonce', '/#/annoncer'],
    [
      'page du remplaçant',
      `/#/annonce/${Buffer.from(JSON.stringify({ c: 'Cabinet des Tilleuls', v: 'Angers', d: '2099-01-01', f: '2099-01-14', t: '33612345678' })).toString('base64url')}`,
    ],
  ] as const

  for (const [nom, adresse] of pages) {
    test(`${nom} : aucune erreur de console, aucun défaut d’accessibilité`, async ({ page }) => {
      const erreurs: string[] = []
      page.on('pageerror', e => erreurs.push(e.message))
      page.on('console', m => m.type() === 'error' && erreurs.push(m.text()))
      await page.goto(adresse)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const rapport = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
      expect(rapport.violations.map(v => `${v.id} : ${v.help}`)).toEqual([])
      expect(erreurs).toEqual([])
    })
  }

  test('aucune page ne déborde horizontalement sur mobile', async ({ page }) => {
    for (const adresse of ['/', '/#/annoncer']) {
      await page.goto(adresse)
      const debordement = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(debordement, adresse).toBeLessThanOrEqual(0)
    }
  })
})
