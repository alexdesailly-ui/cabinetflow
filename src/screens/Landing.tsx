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
        <h1>Trouvez, vérifiez et contractualisez votre remplaçant.</h1>
        <p className="lead">Dossier vérifié, rétrocession calculée, contrat conforme transmis à l’Ordre, passation de tournée. Pour les cabinets infirmiers libéraux.</p>
        <div className="row">
          <Btn variant="encre" onClick={() => go({ name: 'onboarding', role: 'cabinet' })}>Je suis titulaire <Ic.chevron /></Btn>
          <Btn variant="ghost" onClick={() => go({ name: 'onboarding', role: 'remplacant' })}>Je suis remplaçant·e</Btn>
        </div>
        {demoOk && (
          <div className="banner"><Ic.sparkle /><div className="grow"><div className="b-title">Essayer sans compte</div><div className="b-text">Un cabinet fictif à Angers, un remplacement d’octobre en cours.</div></div><Btn size="sm" onClick={() => essayer(DEMO_CABINET)}>Côté cabinet</Btn><Btn size="sm" variant="ghost" onClick={() => essayer(DEMO_REMPLACANT)}>Côté remplaçant</Btn></div>
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
        <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
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

      <section className="card accent stack">
        <h3>Inviter un confrère : un mois offert pour chacun</h3>
        <p className="muted">Ni paliers ni classement. Ce qui donne l’accès prioritaire aux remplaçants, c’est la fiabilité : contrat transmis à temps, rétrocession réglée à l’heure, passation soignée.</p>
      </section>

      <section className="grid-2">
        <div className="card">
          <p className="eyebrow">Cabinet</p>
          <div className="display" style={{ fontSize: '1.8rem', fontWeight: 700 }}>29 € <span className="small muted" style={{ fontWeight: 500 }}>/ mois</span></div>
          <p className="small muted">Premier mois offert. Sans engagement. Moins qu’une demi-journée de tournée.</p>
        </div>
        <div className="card">
          <p className="eyebrow">Remplaçant</p>
          <div className="display" style={{ fontSize: '1.8rem', fontWeight: 700 }}>Gratuit</div>
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
        <div className="card pad-0 list">
          <div className="item"><Ic.check style={{ color: 'var(--ok)' }} /><div className="grow"><div className="t">1 mois offert</div><div className="m">pour vous, et pour {parrain?.prenom ?? 'votre parrain'}</div></div></div>
          <div className="item"><Ic.check style={{ color: 'var(--ok)' }} /><div className="grow"><div className="t">Vérification prioritaire</div><div className="m">de votre dossier sous 24 h</div></div></div>
          <div className="item"><Ic.check style={{ color: 'var(--ok)' }} /><div className="grow"><div className="t">Cercle de confiance</div><div className="m">vous rejoignez le réseau de {parrain?.prenom ?? 'votre parrain'}</div></div></div>
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
