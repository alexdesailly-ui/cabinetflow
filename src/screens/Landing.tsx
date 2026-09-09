import { Btn, Ic, Pill } from '../components/ui'
import { seConnecter } from '../lib/actions'
import { DEMO_CABINET, DEMO_REMPLACANT } from '../lib/seed'
import { go } from '../lib/router'
import { useStore } from '../lib/store'

export function Landing() {
  const e = useStore()
  const demoOk = e.accounts.some(a => a.id === DEMO_CABINET)
  const essayer = (idc: string) => { seConnecter(idc); go({ name: 'home' }) }

  return (
    <div className="stack-l">
      <section className="hero">
        <Pill tone="accent" icon={Ic.shield}>Pensé pour les cabinets infirmiers libéraux</Pill>
        <h1>Partez en congés. <em>Votre tournée est entre de bonnes mains.</em></h1>
        <p className="lead">
          Relève trouve, vérifie et contractualise votre remplaçant — puis suit la passation et la rétrocession.
          Tout ce qu’un site d’annonces ne fait pas.
        </p>
        <div className="row">
          <Btn variant="encre" onClick={() => go({ name: 'onboarding', role: 'cabinet' })}>Je suis titulaire <Ic.chevron /></Btn>
          <Btn variant="ghost" onClick={() => go({ name: 'onboarding', role: 'remplacant' })}>Je suis remplaçant·e</Btn>
        </div>
        {demoOk && (
          <div className="card accent">
            <div className="between">
              <div>
                <div style={{ fontWeight: 700 }}>Essayer sans créer de compte</div>
                <div className="small muted">Un cabinet fictif à Angers, avec un remplacement d’été en cours.</div>
              </div>
              <div className="row">
                <Btn size="sm" onClick={() => essayer(DEMO_CABINET)}>Côté cabinet</Btn>
                <Btn size="sm" variant="ghost" onClick={() => essayer(DEMO_REMPLACANT)}>Côté remplaçant</Btn>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="proof">
        <div className="tile"><span className="k">Infirmiers libéraux</span><span className="v num">145 000</span><span className="s">en France, âge moyen 49 ans</span></div>
        <div className="tile"><span className="k">Congés payés</span><span className="v num">0</span><span className="s">chaque jour non remplacé est perdu</span></div>
        <div className="tile"><span className="k">Règle de l’Ordre</span><span className="v num">2 max</span><span className="s">remplacements simultanés par remplaçant</span></div>
        <div className="tile"><span className="k">Transmission</span><span className="v">Avant J</span><span className="s">du contrat au conseil départemental</span></div>
      </section>

      <section className="stack">
        <p className="eyebrow">Ce que Relève fait à votre place</p>
        <div className="card stack">
          <Feature icon={Ic.shield} titre="Un remplaçant vérifié, pas un inconnu de Facebook"
            texte="Autorisation de remplacement, inscription à l’Ordre, RCP, URSSAF : chaque pièce a une échéance, Relève alerte avant qu’elle n’expire — et bloque si elle expire avant la fin de votre remplacement." />
          <Feature icon={Ic.euro} titre="La rétrocession calculée avant de discuter"
            texte="Vous saisissez votre CA journalier, Relève affiche ce que touchera le remplaçant, brut et net estimé. Fini les négociations à l’aveugle et les rancœurs à la fin." />
          <Feature icon={Ic.file} titre="Le contrat conforme, signé, transmis à l’Ordre"
            texte="Mentions obligatoires, signature des deux parties, compte à rebours de la transmission au conseil départemental. Vous êtes en règle sans y penser." />
          <Feature icon={Ic.map} titre="La passation de tournée sans le cahier à spirale"
            texte="Patients en initiales, créneaux, soins, codes d’accès, consignes : une fiche partagée uniquement pendant le remplacement." />
          <Feature icon={Ic.users} titre="Le cercle de confiance"
            texte="Une recommandation n’existe que si un contrat a été signé. Un remplaçant recommandé par un confrère que vous connaissez vaut plus que dix avis anonymes." />
        </div>
      </section>

      <section className="stack">
        <p className="eyebrow">Pourquoi les cabinets le recommandent</p>
        <div className="card stack">
          <p className="quote">« J’ai pris trois semaines cet été pour la première fois en onze ans. Le contrat était parti à l’Ordre avant même que j’y pense. »</p>
          <p className="small muted">Titulaire fictive, pour illustrer l’usage — les témoignages réels viendront des premiers cabinets pilotes.</p>
        </div>
        <div className="card encre stack">
          <div className="row"><Ic.gift className="" /><h3>Parrainez un confrère, gagnez ce qui ne s’achète pas</h3></div>
          <p className="muted">Un mois offert pour vous et pour lui, puis un accès prioritaire aux nouveaux remplaçants de votre département. Les bons remplaçants partent tôt : être vu en premier compte plus qu’une remise.</p>
        </div>
      </section>

      <section className="grid-2">
        <div className="card">
          <p className="eyebrow">Cabinet</p>
          <div className="display" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--encre)' }}>29 € <span className="small muted" style={{ fontFamily: 'var(--corps)', fontWeight: 500 }}>/ mois</span></div>
          <p className="small muted">Premier mois offert. Sans engagement. Moins qu’une demi-journée de tournée.</p>
        </div>
        <div className="card">
          <p className="eyebrow">Remplaçant</p>
          <div className="display" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--encre)' }}>Gratuit</div>
          <p className="small muted">Toujours. Votre dossier vérifié vous suit de cabinet en cabinet.</p>
        </div>
      </section>

      <p className="tiny muted" style={{ textAlign: 'center' }}>
        Relève est une démonstration : aucune donnée réelle de patient ne doit y être saisie. Les calculs de rétrocession sont des estimations.
      </p>
    </div>
  )
}

function Feature({ icon: Icon, titre, texte }: { icon: (p: { className?: string }) => JSX.Element; titre: string; texte: string }) {
  return (
    <div className="feature">
      <div className="ic"><Icon /></div>
      <div><h3>{titre}</h3><p className="small muted" style={{ marginTop: 4 }}>{texte}</p></div>
    </div>
  )
}

/** Page d'atterrissage d'un lien de parrainage : nominative, elle dit qui invite et ce que gagne l'invité. */
export function Invite({ code, nom }: { code: string; nom?: string }) {
  const e = useStore()
  const parrain = e.accounts.find(a => a.codeParrain === code)
  const prenom = parrain ? `${parrain.prenom} ${parrain.nom}` : (nom ?? 'Un confrère')
  const cabinet = parrain?.nomCabinet
  return (
    <div className="stack-l">
      <section className="hero">
        <Pill tone="accent" icon={Ic.gift}>Invitation personnelle</Pill>
        <h1>{prenom} vous invite sur <em>Relève</em></h1>
        <p className="lead">
          {cabinet ? `${cabinet} utilise Relève pour se faire remplacer sereinement.` : 'Un confrère utilise Relève pour se faire remplacer sereinement.'}{' '}
          En rejoignant avec cette invitation, vous démarrez avec <strong>un mois offert</strong> et votre dossier est vérifié en priorité.
        </p>
        <div className="card ok stack">
          <div className="row"><Ic.check /><strong>1 mois offert</strong> <span className="muted">pour vous, et pour {parrain?.prenom ?? 'votre parrain'}</span></div>
          <div className="row"><Ic.check /><strong>Vérification prioritaire</strong> <span className="muted">de votre dossier sous 24 h</span></div>
          <div className="row"><Ic.check /><strong>Cercle de confiance</strong> <span className="muted">vous rejoignez le réseau de {parrain?.prenom ?? 'votre parrain'}</span></div>
        </div>
        <div className="row">
          <Btn variant="encre" onClick={() => go({ name: 'onboarding', role: 'cabinet', parrain: code })}>Je suis titulaire <Ic.chevron /></Btn>
          <Btn variant="ghost" onClick={() => go({ name: 'onboarding', role: 'remplacant', parrain: code })}>Je suis remplaçant·e</Btn>
        </div>
        <button className="linkbtn small" onClick={() => go({ name: 'landing' })}>Découvrir Relève d’abord</button>
      </section>
    </div>
  )
}
