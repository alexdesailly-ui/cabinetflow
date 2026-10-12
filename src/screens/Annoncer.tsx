import { useState, type ReactNode } from 'react'
import { Btn, Champ, Ic, LienBtn, Pill, useToast } from '../components/ui'
import {
  afficherTelephone,
  LIMITES,
  lienAnnonce,
  messageAnnonce,
  messagePourvu,
  messageRelance,
  urlWhatsApp,
  verifierSaisie,
  type Saisie,
} from '../lib/annonce'
import {
  ecrireAnnonceEnvoyee,
  ecrireCoordonnees,
  lireAnnonceEnvoyee,
  lireCoordonnees,
  type AnnonceEnvoyee,
} from '../lib/annonceLocale'
import {
  ajouterJours,
  estJourValide,
  formatPeriode,
  formatPeriodeLongue,
  jourLocal,
  nombreDeJours,
} from '../lib/dates'
import { href } from '../lib/router'

const DUREES = [
  { jours: 7, libelle: '1 semaine' },
  { jours: 14, libelle: '2 semaines' },
  { jours: 21, libelle: '3 semaines' },
  { jours: 30, libelle: '1 mois' },
]
const DUREE_PAR_DEFAUT = 14
const DELAI_PAR_DEFAUT = 14

/** Adresse du site sans requête ni fragment : le lien d'annonce s'y ajoute. */
const baseDuSite = () => `${location.origin}${location.pathname}`

/** Outil du cabinet : trois champs, un aperçu, un bouton. Puis le suivi de l'annonce envoyée. */
export function Annoncer() {
  const aujourdhui = jourLocal()
  const [envoyee, setEnvoyee] = useState<AnnonceEnvoyee | null>(() => {
    const derniere = lireAnnonceEnvoyee()
    return derniere && derniere.annonce.au >= aujourdhui ? derniere : null
  })

  const retenir = (annonce: AnnonceEnvoyee) => {
    ecrireAnnonceEnvoyee(annonce)
    setEnvoyee(annonce)
  }

  return (
    <div className="stack-l page-etroite">
      <header className="stack">
        <a className="linkbtn small retour" href={href({ name: 'landing' })}>
          <Ic.back /> Accueil
        </a>
        <h1>Annoncer mon absence</h1>
      </header>
      {envoyee ? (
        <Suivi envoyee={envoyee} onChange={retenir} onNouvelle={() => setEnvoyee(null)} />
      ) : (
        <Formulaire aujourdhui={aujourdhui} onEnvoyee={retenir} />
      )}
    </div>
  )
}

function saisieInitiale(aujourdhui: string): Saisie {
  const debut = ajouterJours(aujourdhui, DELAI_PAR_DEFAUT)
  const coordonnees = lireCoordonnees()
  return {
    cabinet: coordonnees?.cabinet ?? '',
    ville: coordonnees?.ville ?? '',
    tel: coordonnees?.tel ?? '',
    du: debut,
    au: ajouterJours(debut, DUREE_PAR_DEFAUT - 1),
  }
}

function Formulaire({
  aujourdhui,
  onEnvoyee,
}: {
  aujourdhui: string
  onEnvoyee: (envoyee: AnnonceEnvoyee) => void
}) {
  const { toast } = useToast()
  const [saisie, setSaisie] = useState(() => saisieInitiale(aujourdhui))
  const [tentative, setTentative] = useState(false)

  const verdict = verifierSaisie(saisie, aujourdhui)
  const annonce = 'annonce' in verdict ? verdict.annonce : null
  const erreurs = tentative && 'erreurs' in verdict ? verdict.erreurs : {}
  const lien = annonce ? lienAnnonce(annonce, baseDuSite()) : ''
  const message = annonce ? messageAnnonce(annonce, lien) : ''

  const modifier = (changement: Partial<Saisie>) => setSaisie({ ...saisie, ...changement })
  const periodeValide =
    estJourValide(saisie.du) && estJourValide(saisie.au) && saisie.au >= saisie.du
  const duree = periodeValide ? nombreDeJours(saisie.du, saisie.au) : undefined

  // Déplacer le début garde la durée choisie.
  const changerDebut = (du: string) =>
    modifier({
      du,
      au: estJourValide(du) ? ajouterJours(du, (duree ?? DUREE_PAR_DEFAUT) - 1) : saisie.au,
    })
  const choisirDuree = (jours: number) => {
    if (estJourValide(saisie.du)) modifier({ au: ajouterJours(saisie.du, jours - 1) })
  }

  const confirmerEnvoi = () => {
    if (!annonce) return
    ecrireCoordonnees({ cabinet: annonce.cabinet, ville: annonce.ville, tel: saisie.tel })
    onEnvoyee({ annonce, envoyeeLe: new Date().toISOString(), pourvue: false })
  }
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(message)
      toast('Message copié')
      confirmerEnvoi()
    } catch {
      toast('Copie impossible : utilisez le bouton WhatsApp')
    }
  }

  return (
    <>
      <form className="stack" noValidate onSubmit={ev => ev.preventDefault()}>
        <fieldset className="stack">
          <legend className="eyebrow">Période d’absence</legend>
          <div className="duo">
            <Champ label="Du" erreur={erreurs.du}>
              {controle => (
                <input
                  {...controle}
                  className="input"
                  type="date"
                  min={aujourdhui}
                  value={saisie.du}
                  onChange={ev => changerDebut(ev.target.value)}
                />
              )}
            </Champ>
            <Champ label="Au" erreur={erreurs.au}>
              {controle => (
                <input
                  {...controle}
                  className="input"
                  type="date"
                  min={saisie.du || aujourdhui}
                  value={saisie.au}
                  onChange={ev => modifier({ au: ev.target.value })}
                />
              )}
            </Champ>
          </div>
          <div className="chips" role="group" aria-label="Durée">
            {DUREES.map(({ jours, libelle }) => (
              <button
                key={jours}
                type="button"
                className={`chip ${duree === jours ? 'on' : ''}`}
                aria-pressed={duree === jours}
                onClick={() => choisirDuree(jours)}
              >
                {libelle}
              </button>
            ))}
          </div>
          {duree && (
            <p className="small muted" aria-live="polite">
              {duree} jour{duree > 1 ? 's' : ''} · {formatPeriodeLongue(saisie.du, saisie.au)}
            </p>
          )}
        </fieldset>

        <fieldset className="stack">
          <legend className="eyebrow">Votre cabinet</legend>
          <Champ label="Nom du cabinet" erreur={erreurs.cabinet}>
            {controle => (
              <input
                {...controle}
                className="input"
                autoComplete="organization"
                maxLength={LIMITES.cabinet}
                placeholder="Cabinet infirmier des Tilleuls"
                value={saisie.cabinet}
                onChange={ev => modifier({ cabinet: ev.target.value })}
              />
            )}
          </Champ>
          <Champ label="Ville" erreur={erreurs.ville}>
            {controle => (
              <input
                {...controle}
                className="input"
                autoComplete="address-level2"
                maxLength={LIMITES.ville}
                placeholder="Angers"
                value={saisie.ville}
                onChange={ev => modifier({ ville: ev.target.value })}
              />
            )}
          </Champ>
          <Champ
            label="Votre numéro WhatsApp"
            erreur={erreurs.tel}
            aide="Vos remplaçants vous répondent sur ce numéro. Il figure dans le lien de l’annonce."
          >
            {controle => (
              <input
                {...controle}
                className="input"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="06 12 34 56 78"
                value={saisie.tel}
                onChange={ev => modifier({ tel: ev.target.value })}
              />
            )}
          </Champ>
        </fieldset>
      </form>

      <section className="stack" aria-labelledby="apercu">
        <h2 id="apercu" className="eyebrow">
          Ce que vos remplaçants reçoivent
        </h2>
        <div className="wa-fond">
          <div className="wa-bulle">
            {annonce ? (
              <>
                {message.slice(0, message.length - lien.length)}
                <span className="wa-lien">{lien}</span>
              </>
            ) : (
              <span className="muted">
                Le message apparaît ici dès que le formulaire est complet.
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="stack">
        {annonce ? (
          <LienBtn block grand icon={Ic.send} href={urlWhatsApp(message)} onClick={confirmerEnvoi}>
            Envoyer sur WhatsApp
          </LienBtn>
        ) : (
          <Btn block grand icon={Ic.send} onClick={() => setTentative(true)}>
            Envoyer sur WhatsApp
          </Btn>
        )}
        <Btn block variant="ghost" icon={Ic.copy} disabled={!annonce} onClick={copier}>
          Copier le message
        </Btn>
        <p className="tiny muted">
          WhatsApp s’ouvre sur le message : choisissez un groupe ou une personne, vous pouvez encore
          le modifier avant d’envoyer.
        </p>
      </div>
    </>
  )
}

/** Après l'envoi : relancer, ou prévenir que c'est pourvu. Les réponses, elles, arrivent dans WhatsApp. */
function Suivi({
  envoyee,
  onChange,
  onNouvelle,
}: {
  envoyee: AnnonceEnvoyee
  onChange: (envoyee: AnnonceEnvoyee) => void
  onNouvelle: () => void
}): ReactNode {
  const { toast } = useToast()
  const { annonce, pourvue } = envoyee
  const lien = lienAnnonce(annonce, baseDuSite())
  const jours = nombreDeJours(annonce.du, annonce.au)
  const envoyeeLe = new Date(envoyee.envoyeeLe).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  const copierLien = async () => {
    try {
      await navigator.clipboard.writeText(lien)
      toast('Lien copié')
    } catch {
      toast('Copie impossible')
    }
  }

  return (
    <section className="card stack" aria-labelledby="suivi">
      <div className="between">
        <h2 id="suivi">Votre annonce</h2>
        <Pill tone={pourvue ? 'ok' : 'accent'} icon={pourvue ? Ic.check : Ic.clock}>
          {pourvue ? 'Pourvue' : 'En cours'}
        </Pill>
      </div>

      <div className="facts">
        <div>
          <div className="k">Période</div>
          <div className="v">
            {formatPeriode(annonce.du, annonce.au)} · {jours} jour{jours > 1 ? 's' : ''}
          </div>
        </div>
        <div>
          <div className="k">Cabinet</div>
          <div className="v">
            {annonce.cabinet}, {annonce.ville}
          </div>
        </div>
        <div>
          <div className="k">Réponses sur</div>
          <div className="v">{annonce.tel ? afficherTelephone(annonce.tel) : '—'}</div>
        </div>
      </div>
      <p className="small muted">
        Envoyée le {envoyeeLe}. Les réponses arrivent dans votre WhatsApp.
      </p>

      <div className="stack">
        {pourvue ? (
          <Btn block variant="ghost" onClick={() => onChange({ ...envoyee, pourvue: false })}>
            Rouvrir l’annonce
          </Btn>
        ) : (
          <>
            <LienBtn block icon={Ic.msg} href={urlWhatsApp(messageRelance(annonce, lien))}>
              Relancer sur WhatsApp
            </LienBtn>
            <LienBtn
              block
              variant="soft"
              icon={Ic.check}
              href={urlWhatsApp(messagePourvu(annonce))}
              onClick={() => onChange({ ...envoyee, pourvue: true })}
            >
              Remplacement pourvu : prévenir les autres
            </LienBtn>
          </>
        )}
        <div className="duo">
          <Btn variant="ghost" icon={Ic.copy} onClick={copierLien}>
            Copier le lien
          </Btn>
          <LienBtn variant="ghost" href={lien}>
            Voir côté remplaçant
          </LienBtn>
        </div>
      </div>

      <button type="button" className="linkbtn small" onClick={onNouvelle}>
        Faire une nouvelle annonce
      </button>
    </section>
  )
}
