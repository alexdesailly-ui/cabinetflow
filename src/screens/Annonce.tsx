import { useMemo } from 'react'
import { Ic, LienBtn, Pill } from '../components/ui'
import { decoderAnnonce, messageReponse, urlWhatsApp } from '../lib/annonce'
import { formatPeriodeLongue, jourLocal, nombreDeJours } from '../lib/dates'
import { href } from '../lib/router'

/**
 * Page ouverte par un remplaçant depuis un lien WhatsApp : l'annonce, un bouton.
 * Aucune inscription, aucun serveur : tout est dans le lien.
 */
export function Annonce({ code }: { code: string }) {
  const annonce = useMemo(() => decoderAnnonce(code), [code])

  if (!annonce) {
    return (
      <div className="stack-l page-etroite">
        <section className="hero">
          <h1>Ce lien d’annonce n’est pas valide</h1>
          <p className="lead">
            Il est peut-être incomplet. Demandez au cabinet de vous le renvoyer.
          </p>
        </section>
        <a className="btn ghost" href={href({ name: 'landing' })}>
          Découvrir Relève
        </a>
      </div>
    )
  }

  const jours = nombreDeJours(annonce.du, annonce.au)
  const terminee = annonce.au < jourLocal()

  return (
    <div className="stack-l page-etroite">
      <section className="hero">
        <div>
          <Pill tone={terminee ? 'neutral' : 'accent'} icon={Ic.calendar}>
            {terminee ? 'Annonce terminée' : 'Annonce de remplacement'}
          </Pill>
        </div>
        <h1>{annonce.cabinet} cherche un·e remplaçant·e</h1>
        <p className="lead">
          {terminee ? 'Ces dates sont passées.' : 'Vous êtes disponible ? Répondez en un tap.'}
        </p>
      </section>

      <div className="card facts">
        <div className="pleine-largeur">
          <div className="k">Dates</div>
          <div className="v">
            {formatPeriodeLongue(annonce.du, annonce.au)} · {jours} jour{jours > 1 ? 's' : ''}
          </div>
        </div>
        <div>
          <div className="k">Lieu</div>
          <div className="v">{annonce.ville}</div>
        </div>
      </div>

      {!terminee && (
        <>
          <LienBtn
            block
            grand
            icon={Ic.msg}
            href={urlWhatsApp(messageReponse(annonce), annonce.tel)}
          >
            Je suis partant(e)
          </LienBtn>
          <p className="small muted">
            {annonce.tel
              ? 'Un tap : WhatsApp s’ouvre sur un message déjà écrit pour le cabinet. Aucune inscription.'
              : 'Un tap : WhatsApp s’ouvre sur un message déjà écrit ; choisissez le cabinet dans vos conversations.'}
          </p>
        </>
      )}
      <p className="tiny muted">
        Annonce créée avec Relève par le cabinet. Vérifiez qui vous écrit avant de transmettre vos
        documents.
      </p>
      <a className="linkbtn small retour" href={href({ name: 'landing' })}>
        Découvrir Relève, l’outil qui a créé cette annonce
      </a>
    </div>
  )
}
