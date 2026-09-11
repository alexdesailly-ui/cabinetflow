import { useEffect, useRef } from 'react'
import { Avatar, Btn, Ic, Pill, Repere, ToastProvider, useToast } from './components/ui'
import { attribuerBadges, seConnecter, seDeconnecter } from './lib/actions'
import { formatDate } from './lib/domain'
import { BADGES, badgesPour, nouveauxBadges } from './lib/gamification'
import { go, useRoute, type Route } from './lib/router'
import { DEMO_CABINET, DEMO_REMPLACANT, semerDemo } from './lib/seed'
import { compteCourant, reinitialiser, useStore } from './lib/store'
import type { Account } from './lib/types'
import { CabinetHome } from './screens/CabinetHome'
import { Invite, Landing } from './screens/Landing'
import { MissionDetail } from './screens/MissionDetail'
import { MissionNew } from './screens/MissionNew'
import { Onboarding } from './screens/Onboarding'
import { Parrainage } from './screens/Parrainage'
import { Dossier, Missions, RemplacantHome } from './screens/RemplacantHome'
import { RemplacantProfil, Vivier } from './screens/Vivier'
import { Avis, lireAvis, partagerAvis } from './screens/Demo'
import { useState } from 'react'
import { reinitialiserReperes } from './components/ui'

export default function App() {
  return <ToastProvider><Shell /></ToastProvider>
}

function Shell() {
  const e = useStore()
  const route = useRoute()
  const moi = compteCourant(e)
  const { toast } = useToast()

  // Première visite : on installe le monde de démonstration.
  useEffect(() => { if (e.accounts.length === 0) semerDemo() }, [e.accounts.length])

  // Détection des badges : après chaque changement d'état, on regarde ce que l'utilisateur vient de débloquer.
  const enCours = useRef(false)
  useEffect(() => {
    if (!moi || enCours.current) return
    const nouveaux = nouveauxBadges(moi, e)
    if (!nouveaux.length) return
    enCours.current = true
    attribuerBadges(moi.id, nouveaux.map(b => b.key))
    for (const b of nouveaux) toast(`${b.emoji} Badge « ${b.nom} » — ${b.description}`, true)
    setTimeout(() => { enCours.current = false }, 50)
  }, [e, moi, toast])

  const publique = route.name === 'landing' || route.name === 'invite' || route.name === 'onboarding'
  if (!moi && !publique) { go({ name: 'landing' }); return null }
  if (moi && (route.name === 'landing')) { go({ name: 'home' }); return null }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-in">
          <a className="brand" href="#/" onClick={ev => { ev.preventDefault(); go({ name: moi ? 'home' : 'landing' }) }}><span className="brand-mark">R</span>Relève</a>
          <span className="spacer" />
          {moi ? (
            <button className="row" style={{ background: 'none', border: 0, cursor: 'pointer', gap: 8 }} onClick={() => go({ name: 'compte' })} aria-label="Mon compte">
              <span className="small muted" style={{ display: 'none' }}>{moi.prenom}</span>
              <Avatar prenom={moi.prenom} nom={moi.nom} />
            </button>
          ) : route.name !== 'onboarding' && <Btn size="sm" variant="ghost" onClick={() => go({ name: 'onboarding', role: 'cabinet' })}>Créer un compte</Btn>}
        </div>
      </header>

      <main className="main">
        <Ecran route={route} moi={moi} />
      </main>

      {moi && <Nav route={route} moi={moi} />}
    </div>
  )
}

function Ecran({ route, moi }: { route: Route; moi: Account | null }) {
  switch (route.name) {
    case 'landing': return <Landing />
    case 'invite': return <Invite code={route.code} nom={route.nom} />
    case 'onboarding': return <Onboarding role={route.role} parrain={route.parrain} />
  }
  if (!moi) return null
  switch (route.name) {
    case 'home': return moi.role === 'cabinet' ? <CabinetHome moi={moi} /> : <RemplacantHome moi={moi} />
    case 'missions': return <Missions moi={moi} />
    case 'mission-new': return <MissionNew moi={moi} />
    case 'mission': return <MissionDetail id={route.id} moi={moi} ongletInitial={route.onglet} />
    case 'vivier': return <Vivier moi={moi} />
    case 'remplacant': return <RemplacantProfil id={route.id} moi={moi} />
    case 'dossier': return <Dossier moi={moi} />
    case 'parrainage': return <Parrainage moi={moi} />
    case 'compte': return <Compte moi={moi} />
  }
}

function Nav({ route, moi }: { route: Route; moi: Account }) {
  const e = useStore()
  const cabinet = moi.role === 'cabinet'
  const alerteDossier = !cabinet && (moi.pieces ?? []).length < 4
  const items: { r: Route; l: string; I: (p: { className?: string }) => JSX.Element; dot?: boolean }[] = cabinet
    ? [
      { r: { name: 'home' }, l: 'Accueil', I: Ic.home },
      { r: { name: 'missions' }, l: 'Remplacements', I: Ic.briefcase, dot: e.candidatures.some(c => c.statut === 'envoyee' && e.missions.some(m => m.id === c.missionId && m.cabinetId === moi.id && !m.remplacantRetenuId)) },
      { r: { name: 'vivier' }, l: 'Vivier', I: Ic.users },
      { r: { name: 'parrainage' }, l: 'Parrainage', I: Ic.gift },
    ]
    : [
      { r: { name: 'home' }, l: 'Accueil', I: Ic.home },
      { r: { name: 'missions' }, l: 'Remplacements', I: Ic.briefcase },
      { r: { name: 'dossier' }, l: 'Dossier', I: Ic.shield, dot: alerteDossier },
      { r: { name: 'parrainage' }, l: 'Parrainage', I: Ic.gift },
    ]
  return (
    <nav className="nav" aria-label="Navigation principale">
      <div className="nav-in">
        {items.map(it => <button key={it.l} className={route.name === it.r.name ? 'on' : ''} onClick={() => go(it.r)} aria-current={route.name === it.r.name ? 'page' : undefined}><it.I />{it.l}{it.dot && <span className="dot" />}</button>)}
      </div>
    </nav>
  )
}

function Compte({ moi }: { moi: Account }) {
  const e = useStore()
  const { toast } = useToast()
  const mesBadges = e.badges[moi.id] ?? []
  const tous = badgesPour(moi)
  const autre = moi.id === DEMO_CABINET ? DEMO_REMPLACANT : moi.id === DEMO_REMPLACANT ? DEMO_CABINET : null
  const [avisOuvert, setAvisOuvert] = useState(false)
  const nbAvis = lireAvis().length
  return (
    <div className="stack-l">
      <div className="card row"><Avatar prenom={moi.prenom} nom={moi.nom} lg encre /><div className="grow"><h1 style={{ fontSize: '1.4rem' }}>{moi.prenom} {moi.nom}</h1><div className="small muted">{moi.nomCabinet ?? 'Remplaçant·e'} · {moi.ville}</div><div className="small muted">Membre depuis le {formatDate(moi.creeLe)}</div></div></div>
      {moi.role === 'cabinet' && (
        <div className="card stack">
          <div className="between"><h3>Abonnement</h3><Pill tone="accent">{moi.plan === 'essai' ? 'Essai' : 'Cabinet'}</Pill></div>
          <p className="small">29 € / mois après le premier mois offert. <strong>{moi.moisOfferts} mois offert{moi.moisOfferts > 1 ? 's' : ''}</strong> grâce au parrainage{moi.moisOfferts > 0 ? ' — soit ' + (moi.moisOfferts * 29) + ' € économisés' : ''}.</p>
          <Btn variant="soft" size="sm" onClick={() => go({ name: 'parrainage' })}>Gagner des mois offerts</Btn>
        </div>
      )}
      <div className="card stack">
        <div className="between"><h3>Badges</h3><span className="small muted">{mesBadges.length} / {tous.length}</span></div>
        <div className="badges">
          {tous.map(b => { const ok = mesBadges.find(x => x.key === b.key); return <div key={b.key} className={`badge ${ok ? '' : 'off'}`} title={b.description}><span className="e">{b.emoji}</span><span className="n">{b.nom}</span>{ok && <span className="tiny muted">{formatDate(ok.le)}</span>}</div> })}
        </div>
        <p className="tiny muted">Chaque badge récompense quelque chose qui protège vraiment un remplacement : conformité, anticipation, paiement à l’heure.</p>
      </div>
      <div className="card accent stack">
        <h3>Votre avis compte</h3>
        <p className="small">Relève se construit avec les cabinets qui l’essaient. Dites ce qui manque, ce qui gêne, ce pour quoi vous paieriez.</p>
        <div className="row"><Btn variant="encre" icon={Ic.msg} onClick={() => setAvisOuvert(true)}>Donner mon avis</Btn>{nbAvis > 0 && <Btn variant="ghost" size="sm" icon={Ic.share} onClick={() => partagerAvis(toast)}>Partager les {nbAvis} avis</Btn>}</div>
      </div>
      <Avis open={avisOuvert} onClose={() => setAvisOuvert(false)} />
      <div className="card stack">
        <h3>Démonstration</h3>
        {autre && <Btn variant="ghost" block onClick={() => { seConnecter(autre); go({ name: 'home' }); toast(`Vous êtes maintenant ${autre === DEMO_CABINET ? 'Marie Dubois (cabinet)' : 'Julien Morel (remplaçant)'}`) }}>Basculer sur {autre === DEMO_CABINET ? 'le cabinet de Marie' : 'le compte de Julien (remplaçant)'}</Btn>}
        <div className="small muted">Comptes disponibles sur cet appareil :</div>
        <div className="row">{e.accounts.filter(a => a.email && (a.id.startsWith('cab-') || a.id.startsWith('rmp-')) && a.id !== moi.id).slice(0, 8).map(a => <button key={a.id} className="chip" onClick={() => { seConnecter(a.id); go({ name: 'home' }) }}>{a.prenom} {a.nom[0]}. · {a.role === 'cabinet' ? 'cabinet' : 'rempl.'}</button>)}</div>
        <div className="row">
          <Btn variant="ghost" size="sm" onClick={() => { reinitialiserReperes(); toast('Les repères s’afficheront à nouveau') }}>Revoir les repères</Btn>
          <Btn variant="danger" size="sm" onClick={() => { if (confirm('Effacer toutes les données locales et régénérer la démonstration ?')) { reinitialiser(); semerDemo(); reinitialiserReperes(); go({ name: 'landing' }) } }}>Réinitialiser la démonstration</Btn>
        </div>
      </div>
      <Btn variant="ghost" icon={Ic.logout} onClick={() => { seDeconnecter(); go({ name: 'landing' }) }}>Se déconnecter</Btn>
      <p className="tiny muted">Relève — version pilote. Données stockées uniquement dans ce navigateur. Aucune donnée réelle de patient ne doit être saisie. Les montants sont des estimations, pas un calcul fiscal. {BADGES.length} badges, {e.accounts.length} comptes en local.</p>
    </div>
  )
}
