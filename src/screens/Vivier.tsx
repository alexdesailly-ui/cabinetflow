import { useState } from 'react'
import { Avatar, Bar, Btn, Field, Ic, ListRow, PageHeader, Pill, Repere, Ring, useToast } from '../components/ui'
import { inviter } from '../lib/actions'
import { PIECES, conformite, etatPiece, formatDate } from '../lib/domain'
import { fiabilite } from '../lib/gamification'
import { go } from '../lib/router'
import { compte, contratsDuRemplacant, recosVers, useStore } from '../lib/store'
import type { Account } from '../lib/types'

/** Le vivier : les remplaçants du secteur, triés par confiance, pas par date d'inscription. */
export function Vivier({ moi }: { moi: Account }) {
  const e = useStore()
  const { toast } = useToast()
  const [filtre, setFiltre] = useState<'tous' | 'verifies' | 'recommandes'>('tous')
  const [nomCarnet, setNomCarnet] = useState('')
  const fiab = fiabilite(moi, e)

  const remplacants = e.accounts.filter(a => a.role === 'remplacant').map(r => {
    const conf = conformite(r)
    const recos = recosVers(e, r.id)
    // Le score de confiance mêle conformité, recommandations vérifiées et lien avec le cercle du cabinet.
    const dansMonCercle = recos.some(x => x.deId === moi.id || e.invitations.some(i => i.parId === moi.id && i.filleulId === x.deId))
    const score = conf.score * .5 + Math.min(3, recos.length) * 12 + (dansMonCercle ? 14 : 0)
    return { r, conf, recos, dansMonCercle, score }
  }).filter(x => filtre === 'tous' || (filtre === 'verifies' ? x.conf.verifie : x.recos.length > 0))
    .sort((a, b) => b.score - a.score)

  return (
    <div className="stack-l">
      <PageHeader title="Vivier" sub={`${remplacants.length} remplaçant${remplacants.length > 1 ? 's' : ''} · département ${moi.departement}`}
        action={<div className="segment" role="tablist">{(['tous', 'verifies', 'recommandes'] as const).map(k => <button key={k} role="tab" aria-selected={filtre === k} className={filtre === k ? 'on' : ''} onClick={() => setFiltre(k)}>{k === 'tous' ? 'Tous' : k === 'verifies' ? 'Vérifiés' : 'Recommandés'}</button>)}</div>} />
      <Repere k="vivier">Triés par confiance : dossier, recommandations vérifiées, proximité avec votre cercle. {fiab.niveau === 'Référence' ? 'Vous voyez les nouveaux inscrits 24 h avant les autres.' : 'Les cabinets « Référence » voient les nouveaux inscrits 24 h avant les autres.'}</Repere>
      <div className="card pad-0 list">
        {remplacants.map(({ r, conf, recos, dansMonCercle }) => (
          <ListRow key={r.id} onClick={() => go({ name: 'remplacant', id: r.id })} leading={<Avatar prenom={r.prenom} nom={r.nom} />}
            title={<span className="row" style={{ gap: 6 }}>{r.prenom} {r.nom}{dansMonCercle && <Pill tone="accent" icon={Ic.users}>Votre cercle</Pill>}</span>}
            meta={`${r.ville} · ${r.rayonKm} km · ${r.anneesExperience} an${(r.anneesExperience ?? 0) > 1 ? 's' : ''} · ${recos.length} reco${recos.length > 1 ? 's' : ''}${(r.disponibilites?.length ?? 0) > 0 ? ` · dispo ${formatDate(r.disponibilites![0].du)} → ${formatDate(r.disponibilites![0].au)}` : ''}`}
            trailing={conf.verifie ? <Pill tone="ok" icon={Ic.shield}>Vérifié</Pill> : <Pill tone="warn">{conf.score} %</Pill>} />
        ))}
      </div>
      <div className="card stack">
        <h3>Votre carnet d’adresses</h3>
        <p className="small muted">Vos remplaçants habituels ne sont pas encore sur Relève ? Invitez-les : leur dossier vérifié les suivra de cabinet en cabinet, et ils compteront comme filleuls.</p>
        <Field label="Nom du remplaçant"><input id="v-carnet" className="input" value={nomCarnet} onChange={ev => setNomCarnet(ev.target.value)} placeholder="Ex. Camille Roux" /></Field>
        <Btn variant="soft" icon={Ic.share} disabled={!nomCarnet.trim()} onClick={() => { inviter(moi.id, nomCarnet.trim(), 'sms'); setNomCarnet(''); toast('Invitation enregistrée — envoyez-lui votre lien'); go({ name: 'parrainage' }) }}>Inviter</Btn>
      </div>
    </div>
  )
}

export function RemplacantProfil({ id, moi }: { id: string; moi: Account }) {
  const e = useStore()
  const r = compte(e, id)
  if (!r) return <div className="card">Profil introuvable.</div>
  const conf = conformite(r)
  const recos = recosVers(e, r.id).sort((a, b) => b.le.localeCompare(a.le))
  const contrats = contratsDuRemplacant(e, r.id)
  const missionsOuvertes = e.missions.filter(m => m.cabinetId === moi.id && m.statut === 'publiee')
  return (
    <div className="stack-l">
      <PageHeader crumb={{ label: 'Retour', onClick: () => history.back() }} title={<span className="row"><Avatar prenom={r.prenom} nom={r.nom} lg encre />{r.prenom} {r.nom}</span>}
        sub={`${r.ville} (${r.codePostal}) · rayon ${r.rayonKm} km · ${r.anneesExperience} ans d’expérience · ${r.vehicule ? 'véhiculé·e' : 'sans véhicule'}`}
        action={moi.role === 'cabinet' && r.telephone ? <Btn variant="ghost" icon={Ic.phone} onClick={() => location.assign(`tel:${r.telephone!.replace(/\s/g, '')}`)}>{r.telephone}</Btn> : undefined} />
      {(r.soinsMaitrises ?? []).length > 0 && <div className="row">{(r.soinsMaitrises ?? []).map(s => <Pill key={s}>{s}</Pill>)}</div>}
      <div className="card stack">
        <div className="row"><Ring value={conf.score} tone={conf.verifie ? 'ok' : conf.score > 50 ? 'warn' : 'danger'} /><div className="grow"><h3>Dossier de confiance</h3><p className="small muted">{conf.verifie ? 'Toutes les pièces critiques sont valides.' : `${conf.manquantesCritiques.length} pièce${conf.manquantesCritiques.length > 1 ? 's' : ''} critique${conf.manquantesCritiques.length > 1 ? 's' : ''} manquante${conf.manquantesCritiques.length > 1 ? 's' : ''} ou expirée${conf.manquantesCritiques.length > 1 ? 's' : ''}.`}</p></div></div>
        <div className="list">
          {(Object.keys(PIECES) as (keyof typeof PIECES)[]).map(k => {
            const p = r.pieces?.find(x => x.key === k); const et = etatPiece(p)
            return <div key={k} className="item small"><div className="grow">{PIECES[k].label}{p?.expireLe && <span className="muted"> · jusqu’au {formatDate(p.expireLe)}</span>}</div>{et === 'valide' ? <Pill tone="ok" icon={Ic.check}>Valide</Pill> : et === 'bientot' ? <Pill tone="warn">Expire bientôt</Pill> : et === 'expiree' ? <Pill tone="danger">Expirée</Pill> : <Pill>Manquante</Pill>}</div>
          })}
        </div>
      </div>
      <div className="card stack">
        <div className="between"><h3>Recommandations vérifiées</h3><span className="small muted">{contrats.length} contrat{contrats.length > 1 ? 's' : ''} sur Relève</span></div>
        {recos.length === 0 && <p className="small muted">Aucune pour l’instant. Une recommandation ne peut être laissée que par un cabinet ayant signé un contrat avec {r.prenom}.</p>}
        {recos.map(x => { const de = compte(e, x.deId); return <div key={x.id} className="stack" style={{ gap: 2, borderLeft: '3px solid var(--accent)', paddingLeft: 12 }}><div className="small"><span style={{ color: 'var(--ambre)' }}>{'★'.repeat(x.note)}</span> <strong>{de?.nomCabinet ?? `${de?.prenom} ${de?.nom}`}</strong> <span className="muted">· {de?.ville} · {formatDate(x.le)}</span></div><div className="small">« {x.texte} »</div></div> })}
      </div>
      {moi.role === 'cabinet' && missionsOuvertes.length > 0 && (
        <div className="card accent stack">
          <strong>Proposer un de vos remplacements à {r.prenom}</strong>
          {missionsOuvertes.map(m => <Btn key={m.id} variant="ghost" size="sm" onClick={() => go({ name: 'mission', id: m.id })}>{m.motif} · {formatDate(m.du)} → {formatDate(m.au)}</Btn>)}
        </div>
      )}
      <div className="card stack"><h3>Confiance dans le temps</h3><Bar value={Math.min(100, recos.length * 25 + contrats.length * 10)} tone="ok" /><p className="tiny muted">Recommandations vérifiées et contrats menés à terme.</p></div>
    </div>
  )
}
