import { useState } from 'react'
import { Bar, Btn, Field, Ic, Modal, Pill, QR, useToast } from '../components/ui'
import { inviter, simulerActivationFilleul } from '../lib/actions'
import { PALIERS, formatDate, lienParrainage, palierPour } from '../lib/domain'
import { invitationsDe, nbFilleulsActifs, useStore } from '../lib/store'
import type { Account, Invitation } from '../lib/types'

export function Parrainage({ moi }: { moi: Account }) {
  const e = useStore()
  const { toast } = useToast()
  const invitations = invitationsDe(e, moi.id)
  const nbActifs = nbFilleulsActifs(e, moi.id)
  const palier = palierPour(nbActifs)
  const lien = lienParrainage(moi.codeParrain)
  const [modal, setModal] = useState<'qr' | 'affiche' | 'carnet' | null>(null)
  const [nomInvite, setNomInvite] = useState('')

  const message = `Bonjour ! J’utilise Relève pour trouver et contractualiser mes remplaçants (dossier vérifié, contrat conforme, rétrocession suivie). Avec mon invitation tu as 1 mois offert : ${lien}`

  const copier = async () => {
    try { await navigator.clipboard.writeText(lien); toast('Lien copié') } catch { toast('Copiez le lien affiché ci-dessous') }
    inviter(moi.id, 'Lien copié', 'lien')
  }
  const partager = async (canal: Invitation['canal']) => {
    inviter(moi.id, nomInvite.trim() || `Invitation ${canal}`, canal)
    setNomInvite('')
    const url = canal === 'whatsapp' ? `https://wa.me/?text=${encodeURIComponent(message)}`
      : canal === 'sms' ? `sms:?&body=${encodeURIComponent(message)}`
      : `mailto:?subject=${encodeURIComponent('Une invitation pour se faire remplacer sereinement')}&body=${encodeURIComponent(message)}`
    if (navigator.share && canal !== 'email') {
      try { await navigator.share({ title: 'Relève', text: message }); return } catch { /* l'utilisateur a annulé */ }
    }
    window.open(url, '_blank')
  }

  // Classement départemental : de vraies personnes du département plus quelques cabinets de contexte.
  const classement = e.accounts
    .filter(a => a.departement === moi.departement && a.role === moi.role)
    .map(a => ({ a, n: nbFilleulsActifs(e, a.id) }))
    .sort((x, y) => y.n - x.n)
    .slice(0, 5)

  return (
    <div className="stack-l">
      <div>
        <p className="eyebrow">Parrainage</p>
        <h1>Agrandissez le cercle</h1>
        <p className="muted" style={{ marginTop: 6 }}>Chaque confrère que vous amenez rend le vivier plus riche pour tout le monde — et vous place en tête de file.</p>
      </div>

      <div className="card encre stack">
        <div className="between">
          <div><p className="eyebrow" style={{ color: 'rgba(255,255,255,.7)' }}>Votre niveau</p><h2 style={{ fontSize: '1.8rem' }}>{palier.actuel.nom}</h2></div>
          <div className="display num" style={{ fontSize: '2.4rem', fontWeight: 700 }}>{nbActifs}<span style={{ fontSize: '1rem', opacity: .7, fontFamily: 'var(--corps)' }}> actif{nbActifs > 1 ? 's' : ''}</span></div>
        </div>
        {palier.suivant ? (
          <>
            <div className="bar" style={{ background: 'rgba(255,255,255,.18)' }}><span style={{ width: `${(nbActifs / palier.suivant.seuil) * 100}%`, background: '#F2C94C' }} /></div>
            <p className="muted">Encore <strong style={{ color: '#fff' }}>{palier.reste} filleul{palier.reste > 1 ? 's' : ''} actif{palier.reste > 1 ? 's' : ''}</strong> pour devenir {palier.suivant.nom} — {palier.suivant.rarete.toLowerCase()}</p>
          </>
        ) : <p className="muted">Niveau maximal. Relève vous est offert tant que vos filleuls restent actifs.</p>}
        {moi.role === 'cabinet' && <p className="small muted">{moi.moisOfferts} mois offert{moi.moisOfferts > 1 ? 's' : ''} accumulé{moi.moisOfferts > 1 ? 's' : ''} sur votre abonnement.</p>}
      </div>

      <section className="card stack">
        <h3>Votre lien personnel</h3>
        <div className="input num" style={{ wordBreak: 'break-all', fontSize: '.9rem', background: 'var(--surface-2)' }}>{lien}</div>
        <div className="grid-2">
          <Btn variant="encre" icon={Ic.msg} onClick={() => partager('whatsapp')}>WhatsApp</Btn>
          <Btn variant="ghost" icon={Ic.phone} onClick={() => partager('sms')}>SMS</Btn>
          <Btn variant="ghost" icon={Ic.mail} onClick={() => partager('email')}>Email</Btn>
          <Btn variant="ghost" icon={Ic.copy} onClick={copier}>Copier</Btn>
        </div>
        <div className="row">
          <Btn size="sm" variant="soft" icon={Ic.qr} onClick={() => setModal('qr')}>QR code</Btn>
          <Btn size="sm" variant="soft" icon={Ic.print} onClick={() => setModal('affiche')}>Affiche pour la salle de soins</Btn>
        </div>
        <Field label="À qui l’envoyez-vous ? (facultatif)" hint="Pour suivre vos invitations par nom."><input id="par-nom" className="input" value={nomInvite} onChange={ev => setNomInvite(ev.target.value)} placeholder="Ex. Cabinet Bellevue, Segré" /></Field>
      </section>

      <section className="stack">
        <h2>Ce que vous gagnez, et ce qu’ils gagnent</h2>
        <div className="card ok small stack" style={{ gap: 6 }}>
          <div className="row"><Ic.gift className="" /><strong>Votre filleul reçoit tout de suite :</strong></div>
          <div>1 mois offert · vérification de dossier prioritaire · votre cercle de confiance.</div>
        </div>
        <div className="list card" style={{ paddingTop: 4, paddingBottom: 4 }}>
          {PALIERS.map(p => {
            const atteint = nbActifs >= p.seuil
            const courant = palier.actuel.niveau === p.niveau
            return (
              <div key={p.niveau} className="item" style={{ alignItems: 'flex-start' }}>
                <div className={`avatar ${atteint ? 'encre' : ''}`} style={{ width: 36, height: 36, fontSize: '.9rem' }}>{atteint ? <Ic.check className="" /> : p.seuil}</div>
                <div className="grow">
                  <div className="between"><strong>{p.nom}</strong>{courant && <Pill tone="accent">Vous êtes ici</Pill>}</div>
                  <div className="small">{p.avantage}</div>
                  <div className="small" style={{ color: 'var(--accent-fonce)', fontWeight: 600 }}><Ic.sparkle className="" style={{ width: 13, height: 13, verticalAlign: '-2px' }} /> {p.rarete}</div>
                </div>
              </div>
            )
          })}
        </div>
        <p className="small muted">Un filleul est « actif » quand il a signé son premier contrat sur Relève — pas simplement créé un compte. Vous êtes récompensé quand la plateforme lui a vraiment servi.</p>
      </section>

      <section className="stack">
        <div className="section-title"><h2>Vos invitations</h2><span className="small muted">{invitations.length}</span></div>
        <div className="list card" style={{ paddingTop: 4, paddingBottom: 4 }}>
          {invitations.length === 0 && <div className="item muted">Personne pour l’instant. Le premier confrère est le plus facile : celui qui vous a déjà demandé comment vous faisiez.</div>}
          {invitations.map(i => (
            <div key={i.id} className="item">
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{i.nom}</div>
                <div className="small muted">{i.canal} · {formatDate(i.le)}</div>
              </div>
              {i.actifLe ? <Pill tone="ok" icon={Ic.check}>Actif</Pill> : i.filleulId ? <Pill tone="accent">Inscrit</Pill> : <Pill>Invité</Pill>}
              {!i.actifLe && (
                <button className="linkbtn tiny no-print" title="Démonstration : simule l'inscription et la première signature de ce filleul"
                  onClick={() => { simulerActivationFilleul(i.id); toast(`${i.nom.split('(')[0].trim()} vient de signer son premier contrat`, true) }}>simuler</button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="stack">
        <div className="section-title"><h2>Dans le {moi.departement}</h2><Pill icon={Ic.trophy}>Classement</Pill></div>
        <div className="list card" style={{ paddingTop: 4, paddingBottom: 4 }}>
          {classement.map(({ a, n }, i) => (
            <div key={a.id} className="item">
              <div className="display" style={{ width: 28, fontWeight: 700, color: i === 0 ? 'var(--ambre)' : 'var(--texte-3)' }}>{i + 1}</div>
              <div className="grow"><div style={{ fontWeight: a.id === moi.id ? 700 : 500 }}>{a.id === moi.id ? 'Vous' : `${a.prenom} ${a.nom[0]}.`}{a.nomCabinet && a.id !== moi.id ? ` — ${a.nomCabinet}` : ''}</div></div>
              <div className="num small"><strong>{n}</strong> actif{n > 1 ? 's' : ''}</div>
            </div>
          ))}
        </div>
        <p className="tiny muted">Le classement se remet à zéro chaque 1er septembre : la saison des remplacements d’été démarre en janvier.</p>
      </section>

      <Modal open={modal === 'qr'} onClose={() => setModal(null)} title="À scanner">
        <div className="stack" style={{ alignItems: 'center', textAlign: 'center' }}>
          <QR text={lien} />
          <p className="small muted">Un confrère scanne, atterrit sur une page à votre nom, et démarre avec un mois offert.</p>
          <Btn variant="ghost" onClick={() => { inviter(moi.id, 'QR scanné', 'qr'); setModal(null); toast('Invitation par QR enregistrée') }}>J’ai montré le QR à quelqu’un</Btn>
        </div>
      </Modal>

      <Modal open={modal === 'affiche'} onClose={() => setModal(null)}>
        <div className="stack" style={{ alignItems: 'center', textAlign: 'center', padding: '8px 0' }}>
          <p className="eyebrow">Affiche A5</p>
          <h1 style={{ fontSize: '1.6rem' }}>Vous cherchez un remplaçant pour cet été ?</h1>
          <p className="muted">{moi.prenom} {moi.nom}{moi.nomCabinet ? ` · ${moi.nomCabinet}` : ''} vous offre un mois de Relève.</p>
          <QR text={lien} />
          <p className="small num">{lien}</p>
          <p className="tiny muted">Dossier vérifié · contrat conforme · rétrocession suivie</p>
          <Btn icon={Ic.print} onClick={() => window.print()} block>Imprimer</Btn>
        </div>
      </Modal>
    </div>
  )
}
