import { Btn, Ic, Pill } from '../components/ui'
import { Logo, Mark } from '../components/Logo'
import { seConnecter } from '../lib/actions'
import { DEMO_CABINET, DEMO_REMPLACANT } from '../lib/seed'
import { go } from '../lib/router'
import { useStore } from '../lib/store'

export function Landing() {
  const e = useStore()
  const demoOk = e.accounts.some(a => a.id === DEMO_CABINET)
  const essayer = (idc: string) => { seConnecter(idc); go({ name: 'home' }) }

  return (
    <div className="stack-l" style={{ maxWidth: 760 }}>
      <section className="hero">
        <Mark size={44} />
        <h1>Le remplacement infirmier, <em>sans la charge mentale.</em></h1>
        <p className="lead">Pour les cabinets infirmiers libéraux : un remplaçant vérifié, une rétrocession calculée, un contrat conforme transmis à l’Ordre, une passation de tournée propre.</p>
      </section>

      <section className="roles">
        <button className="role" onClick={() => go({ name: 'onboarding', role: 'cabinet' })}>
          <span className="t"><Ic.briefcase /> Je suis titulaire</span>
          <span className="d">Je cherche un remplaçant pour mes congés, une formation, un arrêt.</span>
          <span className="p">29 € / mois · premier mois offert →</span>
        </button>
        <button className="role" onClick={() => go({ name: 'onboarding', role: 'remplacant' })}>
          <span className="t"><Ic.users /> Je suis remplaçant·e</span>
          <span className="d">Je veux des remplacements clairs : net estimé avant de répondre, contrat, reversement suivi.</span>
          <span className="p">Gratuit, toujours →</span>
        </button>
      </section>

      {demoOk && (
        <section className="card pad-0 list">
          <div className="item wrap"><Ic.sparkle style={{ color: 'var(--accent-text)' }} /><div className="grow"><div className="t">Essayer sans créer de compte</div><div className="m">Un cabinet fictif à Angers, un remplacement d’octobre avec trois candidats.</div></div><div className="row"><Btn size="sm" onClick={() => essayer(DEMO_CABINET)}>Côté cabinet</Btn><Btn size="sm" variant="ghost" onClick={() => essayer(DEMO_REMPLACANT)}>Côté remplaçant</Btn></div></div>
        </section>
      )}

      <section className="stack">
        <h2>Ce que Relève fait à votre place</h2>
        <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
          <Feature icon={Ic.shield} titre="Vérifie le remplaçant" texte="Autorisation de remplacement, inscription à l’Ordre, RCP : chaque pièce a une échéance. Une pièce qui expire avant la fin du remplacement bloque la signature." />
          <Feature icon={Ic.euro} titre="Calcule la rétrocession" texte="Votre CA journalier, un pourcentage : le remplaçant voit son brut et son net estimé avant de répondre. Puis chaque reversement est suivi jusqu’au paiement." />
          <Feature icon={Ic.file} titre="Prépare le contrat" texte="Mentions attendues par l’Ordre, signature des deux côtés, rappel de transmission au conseil départemental avant le premier jour." />
          <Feature icon={Ic.map} titre="Structure la passation" texte="Patients en initiales, créneaux, soins, accès, consignes. Visible du remplaçant 7 jours avant, une fois le contrat signé." />
          <Feature icon={Ic.users} titre="Construit votre cercle" texte="Une recommandation n’existe que si un contrat a été signé. Vos confrères invités et vous gagnez chacun un mois." />
        </div>
      </section>

      <section className="proof">
        <div className="tile"><span className="k">Infirmiers libéraux en France</span><span className="v num">145 000</span></div>
        <div className="tile"><span className="k">Congés payés</span><span className="v num">0</span><span className="s">chaque jour non remplacé est perdu</span></div>
        <div className="tile"><span className="k">Remplacements simultanés</span><span className="v num">2 max</span><span className="s">règle de l’Ordre</span></div>
      </section>

      <footer className="footer">
        <Logo size={20} />
        <span>Version pilote · aucune donnée réelle de patient · estimations, pas un conseil juridique</span>
      </footer>
    </div>
  )
}

function Feature({ icon: Icon, titre, texte }: { icon: (p: { className?: string }) => JSX.Element; titre: string; texte: string }) {
  return (
    <div className="feature">
      <div className="ic"><Icon /></div>
      <div><h3>{titre}</h3><p className="small muted" style={{ marginTop: 2 }}>{texte}</p></div>
    </div>
  )
}

/** Page d'atterrissage d'un lien de parrainage : nominative. */
export function Invite({ code, nom }: { code: string; nom?: string }) {
  const e = useStore()
  const parrain = e.accounts.find(a => a.codeParrain === code)
  const prenom = parrain ? `${parrain.prenom} ${parrain.nom}` : (nom ?? 'Un confrère')
  return (
    <div className="stack-l" style={{ maxWidth: 640 }}>
      <section className="hero">
        <Mark size={44} />
        <Pill tone="accent" icon={Ic.gift}>Invitation personnelle</Pill>
        <h1>{prenom} vous invite sur <em>Relève</em></h1>
        <p className="lead">{parrain?.nomCabinet ? `${parrain.nomCabinet} utilise Relève pour se faire remplacer.` : 'Un confrère utilise Relève pour se faire remplacer.'} Avec cette invitation, vous démarrez avec un mois offert.</p>
      </section>
      <div className="card pad-0 list">
        <div className="item"><Ic.check style={{ color: 'var(--ok)' }} /><div className="grow"><div className="t">1 mois offert</div><div className="m">pour vous, et pour {parrain?.prenom ?? 'votre parrain'} quand vous signerez votre premier contrat</div></div></div>
        <div className="item"><Ic.check style={{ color: 'var(--ok)' }} /><div className="grow"><div className="t">Vérification prioritaire</div><div className="m">de votre dossier sous 24 h</div></div></div>
        <div className="item"><Ic.check style={{ color: 'var(--ok)' }} /><div className="grow"><div className="t">Cercle de confiance</div><div className="m">vous rejoignez le réseau de {parrain?.prenom ?? 'votre parrain'}</div></div></div>
      </div>
      <section className="roles">
        <button className="role" onClick={() => go({ name: 'onboarding', role: 'cabinet', parrain: code })}><span className="t"><Ic.briefcase /> Je suis titulaire</span><span className="p">Créer mon compte cabinet →</span></button>
        <button className="role" onClick={() => go({ name: 'onboarding', role: 'remplacant', parrain: code })}><span className="t"><Ic.users /> Je suis remplaçant·e</span><span className="p">Créer mon compte, gratuit →</span></button>
      </section>
      <button className="linkbtn small" onClick={() => go({ name: 'landing' })}>Découvrir Relève d’abord</button>
    </div>
  )
}
