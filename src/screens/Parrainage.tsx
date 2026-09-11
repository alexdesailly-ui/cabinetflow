import { useState } from 'react'
import { Avatar, Bar, Btn, Field, Ic, Modal, Pill, Pouls, QR, Repere, useCountUp, useToast } from '../components/ui'
import { inviter, simulerActivationFilleul } from '../lib/actions'
import { PLAFOND_MOIS_OFFERTS_PAR_AN, formatDate, lienParrainage } from '../lib/domain'
import { fiabilite, pouls } from '../lib/gamification'
import { compte, invitationsDe, useStore } from '../lib/store'
import type { Account, Invitation } from '../lib/types'

/**
 * Le cercle : les gens avec qui l'on a réellement travaillé, plus ceux
 * qu'on a invités. Le parrainage est réciproque et plafonné ; la progression
 * vient de la fiabilité, jamais du nombre de personnes amenées.
 */
export function Parrainage({ moi }: { moi: Account }) {
  const e = useStore()
  const { toast } = useToast()
  const invitations = invitationsDe(e, moi.id)
  const lien = lienParrainage(moi.codeParrain)
  const [modal, setModal] = useState<'qr' | 'affiche' | null>(null)
  const [nomInvite, setNomInvite] = useState('')
  const evenements = pouls(e, moi.departement)

  // Le cercle réel : co-signataires de contrats, filleuls arrivés, parrain.
  const ids = new Set<string>()
  for (const c of e.contrats) {
    if (!c.signatureTitulaire || !c.signatureRemplacant) continue
    if (c.cabinetId === moi.id) ids.add(c.remplacantId)
    if (c.remplacantId === moi.id) ids.add(c.cabinetId)
  }
  for (const i of invitations) if (i.filleulId) ids.add(i.filleulId)
  const parrain = e.accounts.find(a => a.codeParrain === moi.parrainePar); if (parrain) ids.add(parrain.id)
  ids.delete(moi.id)
  const cercle = [...ids].map(id => compte(e, id)!).filter(Boolean)
  const nbCercle = useCountUp(cercle.length)
  const mois = useCountUp(moi.moisOfferts)

  const message = `Bonjour ! J’utilise Relève pour trouver et contractualiser mes remplaçants. Avec mon invitation on a chacun un mois offert : ${lien}`
  const copier = async () => {
    try { await navigator.clipboard.writeText(lien); toast('Lien copié') } catch { toast('Copiez le lien affiché') }
    inviter(moi.id, nomInvite.trim() || 'Lien copié', 'lien'); setNomInvite('')
  }
  const partager = async (canal: Invitation['canal']) => {
    inviter(moi.id, nomInvite.trim() || `Invitation ${canal}`, canal); setNomInvite('')
    const url = canal === 'whatsapp' ? `https://wa.me/?text=${encodeURIComponent(message)}`
      : canal === 'sms' ? `sms:?&body=${encodeURIComponent(message)}`
      : `mailto:?subject=${encodeURIComponent('Une invitation Relève')}&body=${encodeURIComponent(message)}`
    if (navigator.share && canal !== 'email') { try { await navigator.share({ title: 'Relève', text: message }); return } catch { /* annulé */ } }
    window.open(url, '_blank')
  }

  return (
    <div className="stack-l">
      <div>
        <p className="eyebrow">Cercle</p>
        <h1>Les gens avec qui vous travaillez</h1>
      </div>
      <Repere k="parrainage">Un confrère invité et vous gagnez chacun un mois. Rien de plus : ici, on progresse en faisant bien, pas en recrutant.</Repere>

      <div className="card stack">
        <div className="between">
          <div className="display num" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--encre)' }}>{nbCercle} <span className="small muted" style={{ fontFamily: 'var(--corps)', fontWeight: 500 }}>personne{cercle.length > 1 ? 's' : ''} dans votre cercle</span></div>
          <div className="cercle-avatars">{cercle.slice(0, 6).map(a => <Avatar key={a.id} prenom={a.prenom} nom={a.nom} encre={a.role === 'cabinet'} />)}</div>
        </div>
        <p className="small muted">Un cercle se construit par les contrats signés et les confrères invités. Les remplaçants recommandés par votre cercle apparaissent en premier dans votre vivier.</p>
      </div>

      <FiabiliteBloc moi={moi} />

      <section className="card stack">
        <div className="between"><h3>Inviter un confrère</h3>{moi.role === 'cabinet' && <Pill tone="ok" icon={Ic.gift}>{mois} mois offert{moi.moisOfferts > 1 ? 's' : ''}</Pill>}</div>
        <p className="small">Il démarre avec un mois offert et son dossier est vérifié en priorité. Quand il signe son premier contrat, vous recevez un mois aussi. {moi.role === 'cabinet' && <span className="muted">Plafonné à {PLAFOND_MOIS_OFFERTS_PAR_AN} mois par an.</span>}</p>
        <div className="input num" style={{ wordBreak: 'break-all', fontSize: '.9rem', background: 'var(--surface-2)' }}>{lien}</div>
        <Field label="À qui ? (facultatif)"><input id="par-nom" className="input" value={nomInvite} onChange={ev => setNomInvite(ev.target.value)} placeholder="Ex. Cabinet Bellevue, Segré" /></Field>
        <div className="grid-2">
          <Btn variant="encre" icon={Ic.msg} onClick={() => partager('whatsapp')}>WhatsApp</Btn>
          <Btn variant="ghost" icon={Ic.phone} onClick={() => partager('sms')}>SMS</Btn>
          <Btn variant="ghost" icon={Ic.mail} onClick={() => partager('email')}>Email</Btn>
          <Btn variant="ghost" icon={Ic.copy} onClick={copier}>Copier</Btn>
        </div>
        <div className="row">
          <Btn size="sm" variant="soft" icon={Ic.qr} onClick={() => setModal('qr')}>QR code</Btn>
          <Btn size="sm" variant="soft" icon={Ic.print} onClick={() => setModal('affiche')}>Affiche salle de soins</Btn>
        </div>
      </section>

      {invitations.length > 0 && (
        <section className="stack">
          <div className="section-title"><h2>Vos invitations</h2><span className="small muted">{invitations.length}</span></div>
          <div className="list card" style={{ paddingTop: 4, paddingBottom: 4 }}>
            {invitations.map(i => (
              <div key={i.id} className="item">
                <div className="grow"><div style={{ fontWeight: 600 }}>{i.nom}</div><div className="small muted">{i.canal} · {formatDate(i.le)}</div></div>
                {i.actifLe ? <Pill tone="ok" icon={Ic.check}>A signé</Pill> : i.filleulId ? <Pill tone="accent">Inscrit</Pill> : <Pill>Invité</Pill>}
                {!i.actifLe && <button className="linkbtn tiny no-print" onClick={() => { simulerActivationFilleul(i.id); toast(`${i.nom.split('(')[0].trim()} vient de signer son premier contrat`, true) }}>simuler</button>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="stack">
        <div className="section-title"><h2 className="vivant">Dans le {moi.departement}</h2><span className="small muted">{evenements.filter(x => Date.now() - new Date(x.le).getTime() < 7 * 86_400_000).length} cette semaine</span></div>
        <div className="card"><Pouls evenements={evenements} max={6} /></div>
      </section>

      <Modal open={modal === 'qr'} onClose={() => setModal(null)} title="À scanner">
        <div className="stack" style={{ alignItems: 'center', textAlign: 'center' }}>
          <QR text={lien} />
          <p className="small muted">La page d’arrivée porte votre nom.</p>
          <Btn variant="ghost" onClick={() => { inviter(moi.id, 'QR scanné', 'qr'); setModal(null) }}>J’ai montré le QR à quelqu’un</Btn>
        </div>
      </Modal>
      <Modal open={modal === 'affiche'} onClose={() => setModal(null)}>
        <div className="stack" style={{ alignItems: 'center', textAlign: 'center', padding: '8px 0' }}>
          <h1 style={{ fontSize: '1.6rem' }}>Vous cherchez un remplaçant ?</h1>
          <p className="muted">{moi.prenom} {moi.nom}{moi.nomCabinet ? ` · ${moi.nomCabinet}` : ''} vous offre un mois de Relève.</p>
          <QR text={lien} />
          <p className="small num">{lien}</p>
          <Btn icon={Ic.print} onClick={() => window.print()} block>Imprimer</Btn>
        </div>
      </Modal>
    </div>
  )
}

/** La fiabilité, expliquée critère par critère : chacun sait quoi faire pour monter. */
export function FiabiliteBloc({ moi, compact }: { moi: Account; compact?: boolean }) {
  const e = useStore()
  const f = fiabilite(moi, e)
  const score = useCountUp(f.score ?? 0)
  const tone = f.niveau === 'Référence' ? 'ok' : f.niveau === 'Fiable' ? 'accent' : 'neutral'
  return (
    <div className="card stack">
      <div className="between">
        <div><p className="eyebrow">Fiabilité</p><h3>{f.niveau}{f.score !== null && <span className="muted num" style={{ fontWeight: 500, fontSize: '1rem', fontFamily: 'var(--corps)' }}> · {score} / 100</span>}</h3></div>
        {compact ? <Pill tone={tone} icon={Ic.shield}>{f.niveau}</Pill> : <span className={`pill ${tone}`} style={{ whiteSpace: 'normal' }}><Ic.shield />{f.avantage}</span>}
      </div>
      {compact && <p className="tiny muted">{f.avantage}</p>}
      {!compact && (
        <div>
          {f.criteres.map(c => (
            <div key={c.label} className="crit">
              <span style={{ flex: 2 }}>{c.label}</span>
              <Bar value={c.total ? (c.ok / c.total) * 100 : 0} tone={c.total && c.ok === c.total ? 'ok' : undefined} />
              <span className="num tiny muted" style={{ width: 36, textAlign: 'right' }}>{c.total ? `${c.ok}/${c.total}` : '—'}</span>
            </div>
          ))}
          <p className="tiny muted" style={{ marginTop: 8 }}>Fiable dès 40, Référence dès 75. Aucun critère ne dépend du nombre de personnes que vous invitez.</p>
        </div>
      )}
    </div>
  )
}
