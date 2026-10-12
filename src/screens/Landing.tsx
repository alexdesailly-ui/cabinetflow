import { Logo, Mark } from '../components/Logo'
import { Ic } from '../components/ui'
import { CONTACT } from '../lib/produit'
import { href } from '../lib/router'

const ETAPES = [
  {
    titre: 'Vos dates',
    texte:
      'Du premier au dernier jour d’absence, votre cabinet et votre numéro WhatsApp. Vingt secondes.',
  },
  {
    titre: 'Vous envoyez',
    texte: 'L’annonce part sur WhatsApp, dans vos groupes ou à vos remplaçants habituels.',
  },
  {
    titre: 'Ils répondent d’un tap',
    texte: '« Je suis partant(e) » ouvre une conversation avec vous, message déjà écrit.',
  },
]

/** Accueil du Lot 1 : une promesse, un bouton. */
export function Landing() {
  return (
    <div className="stack-l page-etroite">
      <section className="hero">
        <Mark size={44} />
        <h1>
          Prévenez vos remplaçants <em>en 20 secondes.</em>
        </h1>
        <p className="lead">
          Vous partez en congés, en formation ? Indiquez vos dates et envoyez l’annonce sur WhatsApp
          : vos remplaçants répondent d’un tap, directement chez vous.
        </p>
        <a className="btn primary grand" href={href({ name: 'annoncer' })}>
          <Ic.send />
          Annoncer mon absence
        </a>
        <p className="tiny muted">
          Gratuit, sans compte. Rien n’est enregistré sur nos serveurs : l’annonce voyage dans le
          lien.
        </p>
      </section>

      <section className="stack" aria-labelledby="comment">
        <h2 id="comment">Comment ça marche</h2>
        <ol className="pas">
          {ETAPES.map(etape => (
            <li key={etape.titre}>
              <div>
                <h3>{etape.titre}</h3>
                <p className="small muted">{etape.texte}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="card stack" aria-labelledby="remplacant">
        <h2 id="remplacant">Vous êtes remplaçant·e ?</h2>
        <p className="small muted">
          Rien à installer, rien à créer. Le lien reçu s’ouvre sur une page claire (dates, lieu,
          durée) ; un tap vous met en relation avec le cabinet.
        </p>
      </section>

      <section className="stack" aria-labelledby="suite">
        <h2 id="suite">Et ensuite ?</h2>
        <p className="small muted">
          Contrat conforme, signature depuis le téléphone, suivi des honoraires : à venir, une fois
          cet outil éprouvé avec vous.
          {CONTACT && (
            <>
              {' '}
              Ce qui vous ferait gagner le plus de temps ?{' '}
              <a href={`mailto:${CONTACT}?subject=${encodeURIComponent('Relève : ma remarque')}`}>
                Écrivez-nous
              </a>
              .
            </>
          )}
        </p>
      </section>

      <footer className="footer">
        <Logo size={20} />
        <span>Aucune donnée de patient. Les dates et le nom du cabinet voyagent dans le lien.</span>
        <span className="footer-liens">
          <a href="#/legal/mentions">Mentions légales</a>
          <a href="#/legal/confidentialite">Confidentialité</a>
          <a href="#/legal/cgu">CGU</a>
        </span>
      </footer>
    </div>
  )
}
