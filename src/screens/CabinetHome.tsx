import { Avatar, Bar, Btn, Ic, Pill } from '../components/ui'
import { alerteCDOI, conformite, euros, formatDate, joursEntre, montantLigne, palierPour } from '../lib/domain'
import { BADGES, badgesPour, joursDeReposSecurises } from '../lib/gamification'
import { go } from '../lib/router'
import { compte, contratDeMission, missionsDuCabinet, nbFilleulsActifs, useStore } from '../lib/store'
import type { Account, Mission } from '../lib/types'

export function CabinetHome({ moi }: { moi: Account }) {
  const e = useStore()
  const missions = missionsDuCabinet(e, moi.id)
  const aVenir = missions.filter(m => m.statut !== 'terminee' && new Date(m.au) >= new Date())
  const repos = joursDeReposSecurises(moi, e)
  const objectif = 25
  const nbActifs = nbFilleulsActifs(e, moi.id)
  const palier = palierPour(nbActifs)
  const mesBadges = e.badges[moi.id] ?? []
  const derniersBadges = [...mesBadges].sort((a, b) => b.le.localeCompare(a.le)).slice(0, 4)

  // Ce qui demande une action, trié par urgence : c'est le vrai tableau de bord.
  const actions: { tone: 'danger' | 'warn' | 'info'; titre: string; detail: string; go: () => void }[] = []
  for (const m of missions) {
    const c = contratDeMission(e, m.id)
    const cands = e.candidatures.filter(x => x.missionId === m.id && x.statut === 'envoyee')
    if (m.statut === 'publiee' && cands.length) actions.push({ tone: 'info', titre: `${cands.length} candidature${cands.length > 1 ? 's' : ''} à examiner`, detail: `${m.motif} du ${formatDate(m.du)} au ${formatDate(m.au)}`, go: () => go({ name: 'mission', id: m.id }) })
    if (m.statut === 'publiee' && !cands.length && joursEntre(new Date(), m.du) < 21) actions.push({ tone: 'warn', titre: 'Aucune candidature à moins de 3 semaines', detail: 'Invitez directement votre carnet ou élargissez le rayon.', go: () => go({ name: 'mission', id: m.id }) })
    if (c && !c.signatureTitulaire) actions.push({ tone: 'warn', titre: 'Contrat à signer', detail: `Remplacement du ${formatDate(m.du)}`, go: () => go({ name: 'mission', id: m.id }) })
    if (c?.signatureTitulaire && c.signatureRemplacant) {
      const a = alerteCDOI(c, m)
      if (a && a.gravite !== 'info') actions.push({ tone: a.gravite === 'bloquant' ? 'danger' : 'warn', titre: a.titre, detail: a.detail, go: () => go({ name: 'mission', id: m.id }) })
      if (!e.fiches.some(f => f.missionId === m.id) && joursEntre(new Date(), m.du) < 15) actions.push({ tone: 'warn', titre: 'Fiche de passation à préparer', detail: `Le remplacement commence dans ${joursEntre(new Date(), m.du)} jours.`, go: () => go({ name: 'mission', id: m.id }) })
      const dues = e.lignes.filter(l => l.contratId === c.id && !l.payeeLe)
      for (const l of dues) {
        const retard = joursEntre(l.echeance, new Date())
        actions.push({ tone: retard > 0 ? 'danger' : 'warn', titre: retard > 0 ? `Rétrocession en retard de ${retard} j` : `Rétrocession à reverser sous ${-retard} j`, detail: `${euros(montantLigne(l))} — ${l.libelle}`, go: () => go({ name: 'mission', id: m.id }) })
      }
    }
    if (m.statut === 'brouillon') actions.push({ tone: 'info', titre: 'Brouillon non publié', detail: `${m.motif} du ${formatDate(m.du)} — les bons remplaçants partent tôt.`, go: () => go({ name: 'mission', id: m.id }) })
  }
  const poids = { danger: 0, warn: 1, info: 2 }
  actions.sort((a, b) => poids[a.tone] - poids[b.tone])

  return (
    <div className="stack-l">
      <div className="between">
        <div>
          <p className="eyebrow">{moi.nomCabinet}</p>
          <h1>Bonjour {moi.prenom}</h1>
        </div>
        <Btn size="sm" variant="encre" icon={Ic.plus} onClick={() => go({ name: 'mission-new' })}>Me faire remplacer</Btn>
      </div>

      <div className="card encre stack">
        <div className="between">
          <div>
            <p className="eyebrow" style={{ color: 'rgba(255,255,255,.7)' }}>Jours de repos sécurisés en {new Date().getFullYear()}</p>
            <div className="display num" style={{ fontSize: '2.6rem', fontWeight: 700, lineHeight: 1 }}>{repos} <span style={{ fontSize: '1rem', fontFamily: 'var(--corps)', fontWeight: 500, opacity: .8 }}>/ {objectif} visés</span></div>
          </div>
          <Ic.sun className="" />
        </div>
        <div className="bar" style={{ background: 'rgba(255,255,255,.18)' }}><span style={{ width: `${Math.min(100, (repos / objectif) * 100)}%`, background: '#F2C94C' }} /></div>
        <p className="muted small">Un jour est « sécurisé » quand un contrat de remplacement est signé des deux côtés. {repos < objectif ? `Encore ${objectif - repos} jours pour atteindre 5 semaines.` : 'Cinq semaines. Vous l’avez fait.'}</p>
      </div>

      {actions.length > 0 && (
        <section>
          <div className="section-title"><h2>À faire</h2><span className="small muted">{actions.length}</span></div>
          <div className="list card" style={{ paddingTop: 4, paddingBottom: 4 }}>
            {actions.map((a, i) => (
              <div key={i} className="item tap" onClick={a.go}>
                <span className={`pill ${a.tone === 'info' ? 'accent' : a.tone}`} style={{ width: 10, height: 10, padding: 0, borderRadius: 999 }} aria-hidden="true" />
                <div className="grow"><div style={{ fontWeight: 600 }}>{a.titre}</div><div className="small muted">{a.detail}</div></div>
                <Ic.chevron className="" />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="section-title"><h2>Mes remplacements</h2><button className="linkbtn small" onClick={() => go({ name: 'missions' })}>Tout voir</button></div>
        <div className="stack">
          {aVenir.length === 0 && <div className="card muted">Aucun remplacement à venir. <button className="linkbtn" onClick={() => go({ name: 'mission-new' })}>Publier une demande</button></div>}
          {aVenir.map(m => <MissionCard key={m.id} m={m} />)}
        </div>
      </section>

      <section className="grid-2">
        <div className="card tap stack" onClick={() => go({ name: 'parrainage' })} style={{ cursor: 'pointer' }}>
          <div className="between"><p className="eyebrow">Cercle</p><Pill tone="accent" icon={Ic.gift}>{palier.actuel.nom}</Pill></div>
          <div className="display" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--encre)' }}>{nbActifs} filleul{nbActifs > 1 ? 's' : ''} actif{nbActifs > 1 ? 's' : ''}</div>
          {palier.suivant && <><Bar value={(nbActifs / palier.suivant.seuil) * 100} /><p className="tiny muted">Plus que {palier.reste} pour devenir {palier.suivant.nom} : {palier.suivant.rarete.toLowerCase()}</p></>}
        </div>
        <div className="card stack">
          <p className="eyebrow">Derniers badges</p>
          <div className="row">
            {derniersBadges.length === 0 && <span className="small muted">Aucun pour l’instant.</span>}
            {derniersBadges.map(b => { const meta = BADGES.find(x => x.key === b.key)!; return <span key={b.key} title={meta.description} style={{ fontSize: '1.6rem' }}>{meta.emoji}</span> })}
          </div>
          <p className="tiny muted">{mesBadges.length} / {badgesPour(moi).length} obtenus — <button className="linkbtn tiny" onClick={() => go({ name: 'compte' })}>voir tout</button></p>
        </div>
      </section>
    </div>
  )
}

export function MissionCard({ m }: { m: Mission }) {
  const e = useStore()
  const c = contratDeMission(e, m.id)
  const retenu = compte(e, m.remplacantRetenuId)
  const cands = e.candidatures.filter(x => x.missionId === m.id && x.statut === 'envoyee').length
  const jours = joursEntre(new Date(), m.du)
  const etape = m.statut === 'brouillon' ? 0 : !m.remplacantRetenuId ? 1 : !(c?.signatureTitulaire && c?.signatureRemplacant) ? 2 : !c.transmisCDOILe ? 3 : !e.fiches.some(f => f.missionId === m.id) ? 4 : 5
  const libelles = ['Brouillon', 'Recherche en cours', 'Contrat à signer', 'À transmettre à l’Ordre', 'Passation à préparer', 'Prêt']
  return (
    <div className="card tap stack" onClick={() => go({ name: 'mission', id: m.id })} style={{ cursor: 'pointer' }}>
      <div className="between">
        <div>
          <div style={{ fontWeight: 700 }}>{m.motif} · {formatDate(m.du)} → {formatDate(m.au)}</div>
          <div className="small muted">{m.joursTravailles} jours · {m.retrocessionPct} % · {jours >= 0 ? `dans ${jours} j` : 'passé'}</div>
        </div>
        {m.statut === 'terminee' ? <Pill>Terminé</Pill> : etape === 5 ? <Pill tone="ok" icon={Ic.check}>Prêt</Pill> : etape === 1 && cands ? <Pill tone="accent">{cands} candidature{cands > 1 ? 's' : ''}</Pill> : <Pill tone={etape === 0 ? 'neutral' : 'warn'}>{libelles[etape]}</Pill>}
      </div>
      {m.statut !== 'terminee' && <div className="steps">{libelles.slice(1).map((_, i) => <span key={i} className={i + 1 < etape ? 'done' : i + 1 === etape ? 'now' : ''} />)}</div>}
      {retenu && (
        <div className="row small">
          <Avatar prenom={retenu.prenom} nom={retenu.nom} />
          <div><div style={{ fontWeight: 600 }}>{retenu.prenom} {retenu.nom}</div><div className="muted">{conformite(retenu).verifie ? 'Dossier vérifié' : 'Dossier incomplet'}</div></div>
        </div>
      )}
    </div>
  )
}
