import { Btn, Ic, ListRow, PageHeader, Pill, Pouls, Repere, Ring, useCountUp } from '../components/ui'
import { PIECES, alerteCDOI, conformite, estimerRetrocession, euros, formatDate, joursEntre, montantLigne } from '../lib/domain'
import { BADGES, badgesPour, pouls } from '../lib/gamification'
import { FiabiliteBloc } from './Parrainage'
import { go } from '../lib/router'
import { compte, contratsDuRemplacant, recosVers, useStore } from '../lib/store'
import type { Account } from '../lib/types'
import { MissionRow } from './CabinetHome'

export function RemplacantHome({ moi }: { moi: Account }) {
  const e = useStore()
  const conf = conformite(moi)
  const recos = recosVers(e, moi.id)
  const contrats = contratsDuRemplacant(e, moi.id)
  const aVenir = contrats.filter(x => new Date(x.mission.au) >= new Date())
  const dues = e.lignes.filter(l => contrats.some(x => x.contrat.id === l.contratId) && !l.payeeLe)
  const gagne = e.lignes.filter(l => contrats.some(x => x.contrat.id === l.contratId) && l.payeeLe).reduce((s, l) => s + montantLigne(l), 0)
  const enAttente = e.contrats.filter(c => c.remplacantId === moi.id && !c.signatureRemplacant)
  const candidatures = e.candidatures.filter(c => c.remplacantId === moi.id && c.statut === 'envoyee')
  const mesBadges = e.badges[moi.id] ?? []
  const gagneAnime = useCountUp(gagne)
  const evenements = pouls(e, moi.departement)

  // Missions correspondant au profil : département, dates disponibles, soins.
  const suggestions = e.missions.filter(m => m.statut === 'publiee' && m.cabinetId !== moi.id && !e.candidatures.some(c => c.missionId === m.id && c.remplacantId === moi.id))
    .map(m => { const cab = compte(e, m.cabinetId)!; const meme = cab.departement === moi.departement; const dispo = (moi.disponibilites ?? []).some(d => d.du <= m.du && d.au >= m.au); const soins = m.soinsRequis.filter(s => !(moi.soinsMaitrises ?? []).includes(s)).length === 0; return { m, cab, score: (meme ? 2 : 0) + (dispo ? 2 : 0) + (soins ? 1 : 0) } })
    .sort((a, b) => b.score - a.score).slice(0, 3)

  return (
    <div className="stack-l">
      <PageHeader title={`Bonjour ${moi.prenom}`} sub="Remplaçant·e" action={<Btn icon={Ic.briefcase} onClick={() => go({ name: 'missions' })}>Voir les remplacements</Btn>} />
      <Repere k="remplacant-home">Votre dossier vous suit de cabinet en cabinet. Complet, il vous place en tête du vivier.</Repere>

      <div className="two-col">
        <div className="stack-l">
      <div className="card pad-0 list">
        <ListRow onClick={() => go({ name: 'dossier' })} leading={<Ring value={conf.score} tone={conf.verifie ? 'ok' : conf.score > 50 ? 'warn' : 'danger'} />}
          title={conf.verifie ? 'Dossier vérifié' : 'Dossier à compléter'}
          meta={conf.verifie ? (conf.alertes.filter(a => a.etat === 'bientot').map(a => `${PIECES[a.key].label} expire dans ${a.jours} j`).join(' · ') || 'Les cabinets vous voient en premier.') : `Manque : ${conf.manquantesCritiques.map(k => PIECES[k].label).join(', ')}`}
          trailing={conf.verifie ? <Pill tone="ok" icon={Ic.shield}>Vérifié</Pill> : <Pill tone="warn">{conf.score} %</Pill>} />
      </div>

      {(enAttente.length > 0 || dues.length > 0 || candidatures.length > 0) && (
        <section>
          <div className="section-title"><h2>À faire</h2></div>
          <div className="card pad-0 list">
            {enAttente.map(c => { const m = e.missions.find(x => x.id === c.missionId)!; const cab = compte(e, c.cabinetId)!; return <ListRow key={c.id} onClick={() => go({ name: 'mission', id: m.id, onglet: 'contrat' })} leading={<span className="status-dot warn" />} title={`Contrat à signer · ${cab.nomCabinet}`} meta={`${formatDate(m.du)} → ${formatDate(m.au)} · ${c.retrocessionPct} %`} /> })}
            {dues.map(l => { const c = e.contrats.find(x => x.id === l.contratId)!; const m = e.missions.find(x => x.id === c.missionId)!; const retard = joursEntre(l.echeance, new Date()); return <ListRow key={l.id} onClick={() => go({ name: 'mission', id: m.id, onglet: 'retrocession' })} leading={<span className={`status-dot ${retard > 0 ? 'danger' : 'info'}`} />} title={`${euros(montantLigne(l))} ${retard > 0 ? `en retard de ${retard} j` : `attendus le ${formatDate(l.echeance)}`}`} meta={`${l.libelle} · ${compte(e, c.cabinetId)?.nomCabinet}`} /> })}
            {candidatures.map(cd => { const m = e.missions.find(x => x.id === cd.missionId)!; return <ListRow key={cd.id} onClick={() => go({ name: 'mission', id: m.id })} leading={<span className="status-dot neutral" />} title="Candidature en attente" meta={`${compte(e, m.cabinetId)?.nomCabinet} · ${formatDate(m.du)}`} /> })}
          </div>
        </section>
      )}

      {aVenir.length > 0 && <section><div className="section-title"><h2>Mes prochains remplacements</h2></div><div className="card pad-0 list">{aVenir.map(x => <MissionRow key={x.mission.id} m={x.mission} />)}</div></section>}

      {suggestions.length > 0 && (
        <section>
          <div className="section-title"><h2>Pour vous</h2><button className="linkbtn small" onClick={() => go({ name: 'missions' })}>Tout voir</button></div>
          <div className="card pad-0 list">
            {suggestions.map(({ m, cab, score }) => { const est = estimerRetrocession(m); return (
              <ListRow key={m.id} onClick={() => go({ name: 'mission', id: m.id })} leading={<span className="avatar encre">{cab.nomCabinet?.[0] ?? cab.nom[0]}</span>}
                title={<>{cab.nomCabinet} <span className="muted" style={{ fontWeight: 400 }}>· {cab.ville}</span></>}
                meta={`${m.motif} · ${formatDate(m.du)} → ${formatDate(m.au)} · ≈ ${euros(est.netEstimeRemplacant)} net${m.logementFourni ? ' · logement' : ''}`}
                trailing={score >= 4 ? <Pill tone="ok" icon={Ic.sparkle}>Bon match</Pill> : undefined} />) })}
          </div>
        </section>
      )}
        </div>
        <aside className="stack">
          <div className="grid-2">
            <div className="tile"><span className="k">Rétrocessions perçues</span><span className="v num">{euros(gagneAnime)}</span></div>
            <div className="tile"><span className="k">Recommandations</span><span className="v num">{recos.length}</span></div>
          </div>
          <div onClick={() => go({ name: 'parrainage' })} style={{ cursor: 'pointer' }}><FiabiliteBloc moi={moi} compact /></div>
          <div className="card stack">
            <p className="eyebrow">Badges · {mesBadges.length} / {badgesPour(moi).length}</p>
            <div className="row">{mesBadges.length === 0 ? <span className="small muted">Complétez votre dossier pour le premier.</span> : mesBadges.map(b => <span key={b.key} title={BADGES.find(x => x.key === b.key)?.description} style={{ fontSize: '1.4rem' }}>{BADGES.find(x => x.key === b.key)?.emoji}</span>)}</div>
          </div>
          <section>
            <div className="section-title"><h2 className="vivant">Dans le {moi.departement}</h2></div>
            <div className="card pad-0"><Pouls evenements={evenements} max={4} /></div>
          </section>
        </aside>
      </div>
    </div>
  )
}

/** Liste des remplacements : les miens (cabinet) ou ceux ouverts (remplaçant). */
export function Missions({ moi }: { moi: Account }) {
  const e = useStore()
  if (moi.role === 'cabinet') {
    const mes = e.missions.filter(m => m.cabinetId === moi.id).sort((a, b) => b.du.localeCompare(a.du))
    return <div className="stack-l"><PageHeader title="Mes remplacements" sub={`${mes.length} au total`} action={<Btn icon={Ic.plus} onClick={() => go({ name: 'mission-new' })}>Nouveau</Btn>} /><div className="card pad-0 list">{mes.map(m => <MissionRow key={m.id} m={m} />)}</div></div>
  }
  const ouvertes = e.missions.filter(m => m.statut === 'publiee').map(m => ({ m, cab: compte(e, m.cabinetId)! })).sort((a, b) => (a.cab.departement === moi.departement ? 0 : 1) - (b.cab.departement === moi.departement ? 0 : 1) || a.m.du.localeCompare(b.m.du))
  return (
    <div className="stack-l">
      <PageHeader title="Remplacements ouverts" sub={`${ouvertes.length} près de chez vous`} />
      <div className="card pad-0 list">
        {ouvertes.map(({ m, cab }) => { const est = estimerRetrocession(m); const cand = e.candidatures.find(c => c.missionId === m.id && c.remplacantId === moi.id); const manque = m.soinsRequis.filter(s => !(moi.soinsMaitrises ?? []).includes(s)).length; return (
          <ListRow key={m.id} onClick={() => go({ name: 'mission', id: m.id })} leading={<span className="avatar encre">{cab.nomCabinet?.[0] ?? cab.nom[0]}</span>}
            title={<>{cab.nomCabinet} <span className="muted" style={{ fontWeight: 400 }}>· {cab.ville} ({cab.departement})</span></>}
            meta={`${m.motif} · ${formatDate(m.du)} → ${formatDate(m.au)} · ${m.joursTravailles} j · ≈ ${euros(est.netEstimeRemplacant)} net (${m.retrocessionPct} %)${m.logementFourni ? ' · logement' : ''}${m.vehiculeFourni ? ' · véhicule' : ''}${manque ? ` · ${manque} soin${manque > 1 ? 's' : ''} non déclaré${manque > 1 ? 's' : ''}` : ''}`}
            trailing={cand ? <Pill tone={cand.statut === 'retenue' ? 'ok' : 'accent'}>{cand.statut === 'retenue' ? 'Retenu·e' : 'Candidature envoyée'}</Pill> : joursEntre(new Date(), m.publieeLe!) <= 2 ? <Pill tone="warn">Nouveau</Pill> : undefined} />) })}
      </div>
    </div>
  )
}

export function Dossier({ moi }: { moi: Account }) {
  const e = useStore()
  const conf = conformite(moi)
  return (
    <div className="stack-l">
      <Repere k="dossier">Le bouclier marque les pièces sans lesquelles aucun contrat ne peut être signé. Chaque échéance est surveillée.</Repere>
      <PageHeader title="Dossier de confiance" sub="Alerte 60 jours avant chaque échéance. Une pièce qui expire avant la fin d’un remplacement bloque la signature." action={<div className="row"><Ring value={conf.score} tone={conf.verifie ? 'ok' : conf.score > 50 ? 'warn' : 'danger'} />{conf.verifie ? <Pill tone="ok" icon={Ic.shield}>Vérifié</Pill> : <Pill tone="warn">{conf.score} %</Pill>}</div>} />
      <DossierForm moi={moi} />
      {e.contrats.filter(c => c.remplacantId === moi.id && c.signatureRemplacant).map(c => { const m = e.missions.find(x => x.id === c.missionId)!; const a = alerteCDOI(c, m); return a && a.gravite !== 'info' ? <div key={c.id} className="card warn small"><strong>{a.titre}</strong> — {compte(e, c.cabinetId)?.nomCabinet}. Rappelez-le gentiment au cabinet.</div> : null })}
    </div>
  )
}

import { useState } from 'react'
import { majCompte } from '../lib/actions'
import { ORDRE_PIECES, etatPiece } from '../lib/domain'
import { useToast } from '../components/ui'
import type { Piece } from '../lib/types'

function DossierForm({ moi }: { moi: Account }) {
  const { toast } = useToast()
  const [ouvert, setOuvert] = useState<string | null>(null)
  const [ref, setRef] = useState('')
  const [exp, setExp] = useState('')
  const pieces = moi.pieces ?? []
  const sauver = (key: Piece['key']) => {
    const meta = PIECES[key]
    const p: Piece = { key, reference: ref, fournieLe: new Date().toISOString(), expireLe: meta.echeance ? exp || undefined : undefined }
    const autres = pieces.filter(x => x.key !== key)
    majCompte(moi.id, { pieces: [...autres, p] })
    setOuvert(null); setRef(''); setExp('')
    toast(`${meta.label} enregistrée`)
  }
  return (
    <div className="list card" style={{ paddingTop: 4, paddingBottom: 4 }}>
      {ORDRE_PIECES.map(k => {
        const meta = PIECES[k]; const p = pieces.find(x => x.key === k); const et = etatPiece(p)
        return (
          <div key={k} className="stack" style={{ gap: 6, padding: '10px 0', borderBottom: '1px solid var(--ligne)' }}>
            <div className="row">
              <div className="grow"><div className="row" style={{ gap: 6 }}><strong>{meta.label}</strong>{meta.critique && <Ic.shield className="" style={{ width: 15, height: 15, color: 'var(--accent)' }} />}</div><div className="tiny muted">{meta.aide}</div>{p && <div className="small muted">{p.reference}{p.expireLe ? ` · valable jusqu’au ${formatDate(p.expireLe)}` : ''}</div>}</div>
              {et === 'valide' ? <Pill tone="ok" icon={Ic.check}>Valide</Pill> : et === 'bientot' ? <Pill tone="warn">Expire bientôt</Pill> : et === 'expiree' ? <Pill tone="danger">Expirée</Pill> : <Pill>Manquante</Pill>}
              <Btn size="sm" variant="ghost" onClick={() => { setOuvert(ouvert === k ? null : k); setRef(p?.reference ?? ''); setExp(p?.expireLe ?? '') }}>{p ? 'Mettre à jour' : 'Ajouter'}</Btn>
            </div>
            {ouvert === k && (
              <div className="card accent stack" style={{ gap: 8 }}>
                <input id={`d-ref-${k}`} className="input" placeholder={meta.champ} value={ref} onChange={ev => setRef(ev.target.value)} aria-label={meta.champ} />
                {meta.echeance && <input id={`d-exp-${k}`} type="date" className="input" value={exp} onChange={ev => setExp(ev.target.value)} aria-label="Date d’expiration" />}
                <p className="tiny muted">Dans la version pilote, le justificatif est déclaré ; la vérification documentaire (pièce jointe, contrôle RPPS) arrive avec le backend.</p>
                <Btn size="sm" variant="encre" disabled={!ref || (meta.echeance && !exp)} onClick={() => sauver(k)}>Enregistrer</Btn>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
