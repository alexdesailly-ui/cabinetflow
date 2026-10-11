import { useEffect, useRef, useState } from 'react'
import { Avatar, Btn, Ic, Pill, ToastProvider, useToast } from './components/ui'
import { attribuerBadges, seConnecter, seDeconnecter } from './lib/actions'
import { formatDate } from './lib/domain'
import { BADGES, badgesPour, nouveauxBadges } from './lib/gamification'
import { go, useRoute, type Route } from './lib/router'
import { DEMO_CABINET, DEMO_REMPLACANT, semerDemo } from './lib/seed'
import { compteCourant, enModeCloud, getEtat, reinitialiser, useStore } from './lib/store'
import { MODE_CLOUD } from './lib/cloud/config'
import { deconnecter, exporterMesDonnees, initialiserCloud, ouvrirStripe, supprimerMonCompte } from './lib/cloud/auth'
import { Connexion } from './screens/Connexion'
import { Legal } from './screens/Legal'
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
import { Annonce } from './screens/Annonce'
import { DemoHub } from './screens/DemoHub'
import { reinitialiserReperes } from './components/ui'
import { Logo } from './components/Logo'

export default function App() {
  return <ToastProvider><Shell /></ToastProvider>
}

function Shell() {
  const e = useStore()
  const route = useRoute()
  const moi = compteCourant(e)
  const { toast } = useToast()

  // Première visite : on installe le monde de démonstration (jamais en mode cloud).
  useEffect(() => { if (!enModeCloud() && e.accounts.length === 0) semerDemo() }, [e.accounts.length])

  // Mode cloud : reprise de session ; erreurs serveur affichées en toast.
  useEffect(() => {
    const h = (ev: Event) => toast((ev as CustomEvent<string>).detail)
    window.addEventListener('releve:erreur', h)
    void initialiserCloud()
    return () => window.removeEventListener('releve:erreur', h)
  }, [toast])

  // Lien direct vers la démo, à coller dans WhatsApp : ?demo=cabinet (démo en blocs) ou ?demo=remplacant.
  // Ignoré dès qu'une adresse interne (#/…) est présente : une annonce partagée ne doit jamais être détournée.
  useEffect(() => {
    const demo = new URLSearchParams(location.search).get('demo')
    if (!demo || location.hash || enModeCloud()) return
    if (getEtat().accounts.length === 0) semerDemo()
    if (demo === 'remplacant') { seConnecter(DEMO_REMPLACANT); go({ name: 'home' }) } else go({ name: 'demo' })
  }, [])

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

  // Les redirections se font après le montage : naviguer pendant le rendu
  // initial partirait avant que l'écouteur de navigation soit en place, et
  // l'écran resterait vide jusqu'au rafraîchissement.
  const publique = route.name === 'landing' || route.name === 'invite' || route.name === 'onboarding' || route.name === 'connexion' || route.name === 'legal' || route.name === 'demo' || route.name === 'annonce'
  // La démo en blocs et les annonces partagées s'affichent seules : ni barre de navigation, ni menu de l'application.
  const plein = route.name === 'demo' || route.name === 'annonce'
  const redirection: 'landing' | 'home' | null = !moi && !publique ? 'landing' : moi && route.name === 'landing' ? 'home' : null
  useEffect(() => { if (redirection) go({ name: redirection }) }, [redirection])
  if (redirection) return null

  return (
    <div className={`shell ${moi && !plein ? 'app' : ''}`}>
      <header className="topbar">
        <div className="topbar-in">
          <a className="brand" href="#/" onClick={ev => { ev.preventDefault(); go({ name: moi ? 'home' : 'landing' }) }} aria-label="Relève, accueil"><Logo size={26} /></a>
          <span className="spacer" />
          {plein ? null : moi ? (
            <button className="row" style={{ background: 'none', border: 0, cursor: 'pointer', gap: 8 }} onClick={() => go({ name: 'compte' })} aria-label="Mon compte">
              <span className="small muted" style={{ display: 'none' }}>{moi.prenom}</span>
              <Avatar prenom={moi.prenom} nom={moi.nom} />
            </button>
          ) : route.name !== 'onboarding' && route.name !== 'connexion' && (
            <div className="row" style={{ gap: 6 }}>
              {MODE_CLOUD && <Btn size="sm" variant="ghost" onClick={() => go({ name: 'connexion' })}>Se connecter</Btn>}
              <Btn size="sm" variant="ghost" onClick={() => go({ name: 'onboarding', role: 'cabinet' })}>Créer un compte</Btn>
            </div>
          )}
        </div>
      </header>

      <main className="main">
        <Ecran route={route} moi={moi} />
      </main>

      {moi && !plein && <Nav route={route} moi={moi} />}
    </div>
  )
}

function Ecran({ route, moi }: { route: Route; moi: Account | null }) {
  switch (route.name) {
    case 'landing': return <Landing />
    case 'invite': return <Invite code={route.code} nom={route.nom} />
    case 'onboarding': return <Onboarding role={route.role} parrain={route.parrain} />
    case 'connexion': return MODE_CLOUD ? <Connexion email={route.email} /> : <Landing />
    case 'legal': return <Legal page={route.page} />
    case 'demo': return <DemoHub />
    case 'annonce': return <Annonce code={route.code} />
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
      <div className="page-head"><div className="row"><Avatar prenom={moi.prenom} nom={moi.nom} lg encre /><div><h1>{moi.prenom} {moi.nom}</h1><div className="sub">{moi.nomCabinet ?? 'Remplaçant·e'} · {moi.ville} · membre depuis le {formatDate(moi.creeLe)}</div></div></div><Btn variant="ghost" icon={Ic.logout} onClick={() => { if (enModeCloud()) void deconnecter(); else seDeconnecter(); go({ name: 'landing' }) }}>Se déconnecter</Btn></div>
      {moi.role === 'cabinet' && e.cloud && <Abonnement moi={moi} />}
      {moi.role === 'cabinet' && !e.cloud && (
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
      {e.cloud && <MesDonnees />}
      {!e.cloud && <div className="card stack">
        <h3>Démonstration</h3>
        {autre && <Btn variant="ghost" block onClick={() => { seConnecter(autre); go({ name: 'home' }); toast(`Vous êtes maintenant ${autre === DEMO_CABINET ? 'Marie Dubois (cabinet)' : 'Julien Morel (remplaçant)'}`) }}>Basculer sur {autre === DEMO_CABINET ? 'le cabinet de Marie' : 'le compte de Julien (remplaçant)'}</Btn>}
        <div className="small muted">Comptes disponibles sur cet appareil :</div>
        <div className="row">{e.accounts.filter(a => a.email && (a.id.startsWith('cab-') || a.id.startsWith('rmp-')) && a.id !== moi.id).slice(0, 8).map(a => <button key={a.id} className="chip" onClick={() => { seConnecter(a.id); go({ name: 'home' }) }}>{a.prenom} {a.nom[0]}. · {a.role === 'cabinet' ? 'cabinet' : 'rempl.'}</button>)}</div>
        <div className="row">
          <Btn variant="ghost" size="sm" onClick={() => { reinitialiserReperes(); toast('Les repères s’afficheront à nouveau') }}>Revoir les repères</Btn>
          <Btn variant="danger" size="sm" onClick={() => { if (confirm('Effacer toutes les données locales et régénérer la démonstration ?')) { reinitialiser(); semerDemo(); reinitialiserReperes(); go({ name: 'landing' }) } }}>Réinitialiser la démonstration</Btn>
        </div>
      </div>}
      <p className="tiny muted">{e.cloud
        ? <>Relève — compte connecté{e.cloud.email ? ` (${e.cloud.email})` : ''}. Aucune donnée de patient ne doit être saisie. Les montants sont des estimations, pas un calcul fiscal.</>
        : <>Relève — version pilote. Données stockées uniquement dans ce navigateur. Aucune donnée réelle de patient ne doit être saisie. Les montants sont des estimations, pas un calcul fiscal. {BADGES.length} badges, {e.accounts.length} comptes en local.</>}
        {' '}<a href="#/legal/mentions">Mentions légales</a> · <a href="#/legal/confidentialite">Confidentialité</a> · <a href="#/legal/cgu">CGU</a></p>
    </div>
  )
}

/** Abonnement réel (mode cloud) : Stripe Checkout pour souscrire, portail client pour gérer. */
function Abonnement({ moi }: { moi: Account }) {
  const e = useStore()
  const { toast } = useToast()
  const abo = e.cloud?.abonnement
  const actif = abo && ['active', 'trialing', 'past_due'].includes(abo.statut)
  const finEssai = new Date(new Date(moi.creeLe).getTime() + (14 + 30 * moi.moisOfferts) * 86_400_000)
  const ouvrir = (a: 'checkout' | 'portal', i?: 'month' | 'year') => ouvrirStripe(a, i).catch(err => toast(err instanceof Error ? err.message : String(err)))
  return (
    <div className="card stack">
      <div className="between"><h3>Abonnement</h3><Pill tone={actif ? 'ok' : 'accent'}>{actif ? (abo!.statut === 'past_due' ? 'Paiement en échec' : 'Actif') : finEssai > new Date() ? 'Essai' : 'Inactif'}</Pill></div>
      {actif ? (
        <>
          <p className="small">Formule {abo!.intervalle === 'year' ? 'annuelle' : 'mensuelle'}{abo!.finPeriode ? ` · ${abo!.annulationFinPeriode ? 'se termine' : 'renouvellement'} le ${formatDate(abo!.finPeriode)}` : ''}.</p>
          {abo!.statut === 'past_due' && <p className="small">Le dernier paiement a échoué. Mettez à jour votre carte pour garder la publication de remplacements.</p>}
          <Btn variant="soft" size="sm" onClick={() => ouvrir('portal')}>Gérer mon abonnement</Btn>
        </>
      ) : (
        <>
          <p className="small">{finEssai > new Date() ? `Essai gratuit jusqu’au ${formatDate(finEssai.toISOString())}` : 'Votre essai est terminé : abonnez-vous pour publier de nouveaux remplacements'}{moi.moisOfferts > 0 ? ` (dont ${moi.moisOfferts} mois offert${moi.moisOfferts > 1 ? 's' : ''} par parrainage)` : ''}.</p>
          <div className="row"><Btn variant="encre" size="sm" onClick={() => ouvrir('checkout', 'month')}>S’abonner — mensuel</Btn><Btn variant="ghost" size="sm" onClick={() => ouvrir('checkout', 'year')}>Annuel</Btn></div>
        </>
      )}
      <Btn variant="ghost" size="sm" onClick={() => go({ name: 'parrainage' })}>Gagner des mois offerts</Btn>
    </div>
  )
}

/** Droits RGPD en libre-service : export et suppression. */
function MesDonnees() {
  const { toast } = useToast()
  const [confirmation, setConfirmation] = useState('')
  const [ouvert, setOuvert] = useState(false)
  return (
    <div className="card stack">
      <h3>Mes données</h3>
      <p className="small muted">Vous pouvez télécharger toutes les données liées à votre compte, ou le supprimer. Un contrat signé est conservé sous forme anonymisée pour votre confrère.</p>
      <div className="row">
        <Btn variant="ghost" size="sm" onClick={() => exporterMesDonnees().catch(err => toast(err instanceof Error ? err.message : String(err)))}>Télécharger mes données</Btn>
        <Btn variant="danger" size="sm" onClick={() => setOuvert(true)}>Supprimer mon compte</Btn>
      </div>
      {ouvert && (
        <div className="card warn stack" style={{ gap: 8 }}>
          <p className="small">Action définitive. Tapez <strong>SUPPRIMER</strong> pour confirmer.</p>
          <input id="rgpd-conf" className="input" value={confirmation} onChange={ev => setConfirmation(ev.target.value)} aria-label="Confirmation" />
          <Btn variant="danger" size="sm" disabled={confirmation !== 'SUPPRIMER'} onClick={() => supprimerMonCompte().then(() => go({ name: 'landing' })).catch(err => toast(err instanceof Error ? err.message : String(err)))}>Supprimer définitivement</Btn>
        </div>
      )}
    </div>
  )
}
