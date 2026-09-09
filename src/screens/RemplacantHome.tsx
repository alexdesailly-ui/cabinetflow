import { Bar, Btn, Ic, Pill, Ring } from '../components/ui'
import { PIECES, alerteCDOI, conformite, estimerRetrocession, euros, formatDate, joursEntre, montantLigne, palierPour } from '../lib/domain'
import { BADGES, badgesPour } from '../lib/gamification'
import { go } from '../lib/router'
import { compte, contratsDuRemplacant, nbFilleulsActifs, recosVers, useStore } from '../lib/store'
import type { Account } from '../lib/types'
import { MissionCard } from './CabinetHome'

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
  const palier = palierPour(nbFilleulsActifs(e, moi.id))

  // Missions correspondant au profil : département, dates disponibles, soins.
  const suggestions = e.missions.filter(m => m.statut === 'publiee' && m.cabinetId !== moi.id && !e.candidatures.some(c => c.missionId === m.id && c.remplacantId === moi.id))
    .map(m => { const cab = compte(e, m.cabinetId)!; const meme = cab.departement === moi.departement; const dispo = (moi.disponibilites ?? []).some(d => d.du <= m.du && d.au >= m.au); const soins = m.soinsRequis.filter(s => !(moi.soinsMaitrises ?? []).includes(s)).length === 0; return { m, cab, score: (meme ? 2 : 0) + (dispo ? 2 : 0) + (soins ? 1 : 0) } })
    .sort((a, b) => b.score - a.score).slice(0, 3)

  return (
    <div className="stack-l">
      <div className="between"><div><p className="eyebrow">Espace remplaçant</p><h1>Bonjour {moi.prenom}</h1></div><Btn size="sm" variant="encre" onClick={() => go({ name: 'missions' })}>Voir les remplacements</Btn></div>

      <div className={`card ${conf.verifie ? 'ok' : 'warn'} row`} style={{ cursor: 'pointer' }} onClick={() => go({ name: 'dossier' })}>
        <Ring value={conf.score} tone={conf.verifie ? 'ok' : conf.score > 50 ? 'warn' : 'danger'} />
        <div className="grow">
          <h3>{conf.verifie ? 'Dossier vérifié' : 'Dossier à compléter'}</h3>
          <p className="small">{conf.verifie ? 'Les cabinets vous voient en premier.' : `${conf.manquantesCritiques.map(k => PIECES[k].label).join(', ')} : sans ça, aucun cabinet ne peut vous retenir.`}</p>
          {conf.alertes.filter(a => a.etat === 'bientot').map(a => <p key={a.key} className="small" style={{ color: 'var(--ambre)', fontWeight: 600 }}>{PIECES[a.key].label} expire dans {a.jours} jours</p>)}
        </div>
        <Ic.chevron className="" />
      </div>

      {(enAttente.length > 0 || dues.length > 0 || candidatures.length > 0) && (
        <section>
          <div className="section-title"><h2>À faire</h2></div>
          <div className="list card" style={{ paddingTop: 4, paddingBottom: 4 }}>
            {enAttente.map(c => { const m = e.missions.find(x => x.id === c.missionId)!; const cab = compte(e, c.cabinetId)!; return <div key={c.id} className="item tap" onClick={() => go({ name: 'mission', id: m.id })}><span className="pill warn" style={{ width: 10, height: 10, padding: 0 }} /><div className="grow"><div style={{ fontWeight: 600 }}>Contrat à signer — {cab.nomCabinet}</div><div className="small muted">{formatDate(m.du)} → {formatDate(m.au)} · {c.retrocessionPct} %</div></div><Ic.chevron className="" /></div> })}
            {dues.map(l => { const c = e.contrats.find(x => x.id === l.contratId)!; const m = e.missions.find(x => x.id === c.missionId)!; const retard = joursEntre(l.echeance, new Date()); return <div key={l.id} className="item tap" onClick={() => go({ name: 'mission', id: m.id })}><span className={`pill ${retard > 0 ? 'danger' : 'accent'}`} style={{ width: 10, height: 10, padding: 0 }} /><div className="grow"><div style={{ fontWeight: 600 }}>{euros(montantLigne(l))} {retard > 0 ? `en retard de ${retard} j` : `attendus le ${formatDate(l.echeance)}`}</div><div className="small muted">{l.libelle} · {compte(e, c.cabinetId)?.nomCabinet}</div></div><Ic.chevron className="" /></div> })}
            {candidatures.map(cd => { const m = e.missions.find(x => x.id === cd.missionId)!; return <div key={cd.id} className="item tap" onClick={() => go({ name: 'mission', id: m.id })}><span className="pill neutral" style={{ width: 10, height: 10, padding: 0 }} /><div className="grow"><div style={{ fontWeight: 600 }}>Candidature en attente</div><div className="small muted">{compte(e, m.cabinetId)?.nomCabinet} · {formatDate(m.du)}</div></div><Ic.chevron className="" /></div> })}
          </div>
        </section>
      )}

      <section className="grid-2">
        <div className="tile"><span className="k">Rétrocessions perçues</span><span className="v num">{euros(gagne)}</span><span className="s">via Relève</span></div>
        <div className="tile"><span className="k">Recommandations</span><span className="v num">{recos.length}</span><span className="s">vérifiées par contrat</span></div>
      </section>

      {aVenir.length > 0 && <section><div className="section-title"><h2>Mes prochains remplacements</h2></div><div className="stack">{aVenir.map(x => <MissionCard key={x.mission.id} m={x.mission} />)}</div></section>}

      {suggestions.length > 0 && (
        <section>
          <div className="section-title"><h2>Pour vous</h2><button className="linkbtn small" onClick={() => go({ name: 'missions' })}>Tout voir</button></div>
          <div className="stack">
            {suggestions.map(({ m, cab, score }) => { const est = estimerRetrocession(m); return (
              <div key={m.id} className="card tap stack" onClick={() => go({ name: 'mission', id: m.id })} style={{ cursor: 'pointer' }}>
                <div className="between"><div><strong>{cab.nomCabinet}</strong> <span className="small muted">· {cab.ville}</span></div>{score >= 4 && <Pill tone="ok" icon={Ic.sparkle}>Bon match</Pill>}</div>
                <div className="small">{m.motif} · {formatDate(m.du)} → {formatDate(m.au)} · {m.joursTravailles} j</div>
                <div className="row small"><strong className="num">≈ {euros(est.netEstimeRemplacant)} net</strong><span className="muted">· {m.retrocessionPct} %{m.logementFourni ? ' · logement' : ''}{m.vehiculeFourni ? ' · véhicule' : ''}</span></div>
              </div>) })}
          </div>
        </section>
      )}

      <section className="grid-2">
        <div className="card tap stack" onClick={() => go({ name: 'parrainage' })} style={{ cursor: 'pointer' }}>
          <div className="between"><p className="eyebrow">Cercle</p><Pill tone="accent" icon={Ic.gift}>{palier.actuel.nom}</Pill></div>
          <p className="small">Invitez les cabinets que vous remplacez déjà : vos recommandations vérifiées s’y accumulent.</p>
          {palier.suivant && <Bar value={(nbFilleulsActifs(e, moi.id) / palier.suivant.seuil) * 100} />}
        </div>
        <div className="card stack">
          <p className="eyebrow">Badges</p>
          <div className="row">{mesBadges.length === 0 ? <span className="small muted">Complétez votre dossier pour le premier.</span> : mesBadges.map(b => <span key={b.key} title={BADGES.find(x => x.key === b.key)?.description} style={{ fontSize: '1.6rem' }}>{BADGES.find(x => x.key === b.key)?.emoji}</span>)}</div>
          <p className="tiny muted">{mesBadges.length} / {badgesPour(moi).length}</p>
        </div>
      </section>
    </div>
  )
}

/** Liste des remplacements : les miens (cabinet) ou ceux ouverts (remplaçant). */
export function Missions({ moi }: { moi: Account }) {
  const e = useStore()
  if (moi.role === 'cabinet') {
    const mes = e.missions.filter(m => m.cabinetId === moi.id).sort((a, b) => b.du.localeCompare(a.du))
    return <div className="stack-l"><div className="between"><h1>Mes remplacements</h1><Btn size="sm" variant="encre" icon={Ic.plus} onClick={() => go({ name: 'mission-new' })}>Nouveau</Btn></div><div className="stack">{mes.map(m => <MissionCard key={m.id} m={m} />)}</div></div>
  }
  const ouvertes = e.missions.filter(m => m.statut === 'publiee').map(m => ({ m, cab: compte(e, m.cabinetId)! })).sort((a, b) => (a.cab.departement === moi.departement ? 0 : 1) - (b.cab.departement === moi.departement ? 0 : 1) || a.m.du.localeCompare(b.m.du))
  return (
    <div className="stack-l">
      <div><p className="eyebrow">Remplacements ouverts</p><h1>Près de chez vous</h1></div>
      <div className="stack">
        {ouvertes.map(({ m, cab }) => { const est = estimerRetrocession(m); const cand = e.candidatures.find(c => c.missionId === m.id && c.remplacantId === moi.id); return (
          <div key={m.id} className="card tap stack" onClick={() => go({ name: 'mission', id: m.id })} style={{ cursor: 'pointer' }}>
            <div className="between"><div><strong>{cab.nomCabinet}</strong> <span className="small muted">· {cab.ville} ({cab.departement})</span></div>{cand ? <Pill tone={cand.statut === 'retenue' ? 'ok' : 'accent'}>{cand.statut === 'retenue' ? 'Retenu·e' : 'Candidature envoyée'}</Pill> : joursEntre(new Date(), m.publieeLe!) <= 2 ? <Pill tone="warn">Nouveau</Pill> : null}</div>
            <div className="small">{m.motif} · {formatDate(m.du)} → {formatDate(m.au)} · {m.joursTravailles} j · {m.patientsJour} patients/j</div>
            <div className="row small"><strong className="num">≈ {euros(est.netEstimeRemplacant)} net</strong><span className="muted">· {euros(est.brutRemplacant)} rétrocédés ({m.retrocessionPct} %){m.logementFourni ? ' · logement' : ''}{m.vehiculeFourni ? ' · véhicule' : ''}</span></div>
            {m.soinsRequis.length > 0 && <div className="row">{m.soinsRequis.map(s => <Pill key={s} tone={(moi.soinsMaitrises ?? []).includes(s) ? 'ok' : 'neutral'}>{s}</Pill>)}</div>}
          </div>) })}
      </div>
    </div>
  )
}

export function Dossier({ moi }: { moi: Account }) {
  const e = useStore()
  const conf = conformite(moi)
  return (
    <div className="stack-l">
      <div><p className="eyebrow">Dossier de confiance</p><h1>Vos pièces</h1><p className="small muted" style={{ marginTop: 6 }}>Chaque pièce a une échéance. Relève vous prévient 60 jours avant, et empêche qu’un contrat soit signé si une pièce expire avant la fin du remplacement.</p></div>
      <div className="card row"><Ring value={conf.score} tone={conf.verifie ? 'ok' : conf.score > 50 ? 'warn' : 'danger'} /><div className="grow"><h3>{conf.verifie ? 'Dossier vérifié' : `${conf.score} % complet`}</h3><p className="small muted">{conf.verifie ? 'Vous apparaissez en tête du vivier.' : 'Les pièces critiques sont marquées d’un bouclier.'}</p></div></div>
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
