import { Avatar, Banner, Btn, Ic, ListRow, PageHeader, Pill, Pouls, Repere, useCountUp, useRepere } from '../components/ui'
import { alerteCDOI, conformite, euros, formatDate, joursEntre, montantLigne } from '../lib/domain'
import { fiabilite, joursDeReposSecurises, pouls } from '../lib/gamification'
import { go } from '../lib/router'
import { compte, contratDeMission, missionsDuCabinet, useStore } from '../lib/store'
import type { Account, Mission } from '../lib/types'

type Tone = 'danger' | 'warn' | 'info'
interface Action { tone: Tone; titre: string; detail: string; go: () => void }

/** Ce qui demande un geste, trié par urgence : la colonne vertébrale de l'écran. */
export function actionsDuCabinet(moi: Account, e: ReturnType<typeof useStore>): Action[] {
  const actions: Action[] = []
  for (const m of missionsDuCabinet(e, moi.id)) {
    const c = contratDeMission(e, m.id)
    const cands = e.candidatures.filter(x => x.missionId === m.id && x.statut === 'envoyee')
    const ouvrir = () => go({ name: 'mission', id: m.id })
    if (m.statut === 'publiee' && cands.length) actions.push({ tone: 'info', titre: `${cands.length} candidature${cands.length > 1 ? 's' : ''} à examiner`, detail: `${m.motif} · ${formatDate(m.du)} → ${formatDate(m.au)}`, go: () => go({ name: 'mission', id: m.id, onglet: 'candidatures' }) })
    if (m.statut === 'publiee' && !cands.length && joursEntre(new Date(), m.du) < 21) actions.push({ tone: 'warn', titre: 'Aucune candidature à moins de 3 semaines', detail: 'Invitez votre carnet ou élargissez le rayon', go: ouvrir })
    if (c && !c.signatureTitulaire) actions.push({ tone: 'warn', titre: 'Contrat à signer', detail: `Remplacement du ${formatDate(m.du)}`, go: () => go({ name: 'mission', id: m.id, onglet: 'contrat' }) })
    if (c?.signatureTitulaire && c.signatureRemplacant) {
      const a = alerteCDOI(c, m)
      if (a && a.gravite !== 'info') actions.push({ tone: a.gravite === 'bloquant' ? 'danger' : 'warn', titre: a.titre, detail: `Remplacement du ${formatDate(m.du)}`, go: () => go({ name: 'mission', id: m.id, onglet: 'contrat' }) })
      if (!e.fiches.some(f => f.missionId === m.id) && joursEntre(new Date(), m.du) < 15) actions.push({ tone: 'warn', titre: 'Fiche de passation à préparer', detail: `Début dans ${joursEntre(new Date(), m.du)} jours`, go: () => go({ name: 'mission', id: m.id, onglet: 'passation' }) })
      for (const l of e.lignes.filter(l => l.contratId === c.id && !l.payeeLe)) {
        const retard = joursEntre(l.echeance, new Date())
        actions.push({ tone: retard > 0 ? 'danger' : 'warn', titre: retard > 0 ? `Rétrocession en retard de ${retard} j` : `Rétrocession à reverser sous ${-retard} j`, detail: `${euros(montantLigne(l))} · ${l.libelle}`, go: () => go({ name: 'mission', id: m.id, onglet: 'retrocession' }) })
      }
    }
    if (m.statut === 'brouillon') actions.push({ tone: 'info', titre: 'Brouillon à publier', detail: `${m.motif} · ${formatDate(m.du)}`, go: ouvrir })
  }
  const poids = { danger: 0, warn: 1, info: 2 }
  return actions.sort((a, b) => poids[a.tone] - poids[b.tone])
}

export function CabinetHome({ moi }: { moi: Account }) {
  const e = useStore()
  const missions = missionsDuCabinet(e, moi.id)
  const aVenir = missions.filter(m => m.statut !== 'terminee' && new Date(m.au) >= new Date())
  const actions = actionsDuCabinet(moi, e)
  const repos = useCountUp(joursDeReposSecurises(moi, e))
  const fiab = fiabilite(moi, e)
  const cercle = new Set(e.contrats.filter(c => c.cabinetId === moi.id && c.signatureRemplacant).map(c => c.remplacantId)).size + e.invitations.filter(i => i.parId === moi.id && i.filleulId).length
  const pulseNouveau = useRepere('cabinet-home') && aVenir.length === 0
  const evenements = pouls(e, moi.departement)

  return (
    <div className="stack-l">
      <PageHeader title={`Bonjour ${moi.prenom}`} sub={moi.nomCabinet}
        action={<span className={pulseNouveau ? 'pulse' : ''}><Btn icon={Ic.plus} onClick={() => go({ name: 'mission-new' })}>Me faire remplacer</Btn></span>} />
      <Repere k="cabinet-home">Ce qui attend un geste de votre part est ici, du plus urgent au moins urgent.</Repere>

      <div className="two-col">
        <div className="stack-l">
          <section>
            <div className="section-title"><h2>À faire</h2>{actions.length > 0 && <span className="small muted">{actions.length}</span>}</div>
            <div className="card pad-0 list">
              {actions.length === 0 && <div className="empty"><Ic.check /><div style={{ fontWeight: 600, color: 'var(--text)' }}>Rien en attente</div></div>}
              {actions.map((a, i) => <ListRow key={i} onClick={a.go} leading={<span className={`status-dot ${a.tone}`} />} title={a.titre} meta={a.detail} />)}
            </div>
          </section>

          <section>
            <div className="section-title"><h2>Remplacements à venir</h2><button className="linkbtn small" onClick={() => go({ name: 'missions' })}>Tous</button></div>
            <div className="card pad-0 list">
              {aVenir.length === 0 && <div className="empty"><Ic.calendar /><div style={{ fontWeight: 600, color: 'var(--text)' }}>Aucun remplacement prévu</div><Btn size="sm" variant="ghost" onClick={() => go({ name: 'mission-new' })}>Publier une demande</Btn></div>}
              {aVenir.map(m => <MissionRow key={m.id} m={m} />)}
            </div>
          </section>
        </div>

        <aside className="stack">
          <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(104px, 1fr))' }}>
            <div className="tile"><span className="k">Repos sécurisé</span><span className="v num">{repos} j</span><span className="s">en {new Date().getFullYear()}</span></div>
            <div className="tile" style={{ cursor: 'pointer' }} onClick={() => go({ name: 'parrainage' })}><span className="k">Fiabilité</span><span className="v">{fiab.niveau}</span><span className="s num">{fiab.score !== null ? `${fiab.score} / 100` : '—'}</span></div>
            <div className="tile" style={{ cursor: 'pointer' }} onClick={() => go({ name: 'parrainage' })}><span className="k">Cercle</span><span className="v num">{cercle}</span><span className="s">personnes</span></div>
          </div>
          <section>
            <div className="section-title"><h2 className="vivant">Dans le {moi.departement}</h2></div>
            <div className="card pad-0"><Pouls evenements={evenements} max={5} /></div>
          </section>
        </aside>
      </div>
    </div>
  )
}

/** Une ligne par remplacement : dates, état, prochaine étape. */
export function MissionRow({ m }: { m: Mission }) {
  const e = useStore()
  const c = contratDeMission(e, m.id)
  const retenu = compte(e, m.remplacantRetenuId)
  const cands = e.candidatures.filter(x => x.missionId === m.id && x.statut === 'envoyee').length
  const jours = joursEntre(new Date(), m.du)
  const etape = m.statut === 'terminee' ? 6 : m.statut === 'brouillon' ? 0 : !m.remplacantRetenuId ? 1 : !(c?.signatureTitulaire && c?.signatureRemplacant) ? 2 : !c.transmisCDOILe ? 3 : !e.fiches.some(f => f.missionId === m.id) ? 4 : 5
  const statut = [
    <Pill key="0">Brouillon</Pill>,
    cands ? <Pill key="1" tone="accent">{cands} candidature{cands > 1 ? 's' : ''}</Pill> : <Pill key="1" tone="neutral">Recherche</Pill>,
    <Pill key="2" tone="warn">Contrat à signer</Pill>,
    <Pill key="3" tone="warn">À transmettre à l’Ordre</Pill>,
    <Pill key="4" tone="warn">Passation</Pill>,
    <Pill key="5" tone="ok" icon={Ic.check}>Prêt</Pill>,
    <Pill key="6" tone="neutral">Terminé</Pill>,
  ][etape]
  return (
    <ListRow onClick={() => go({ name: 'mission', id: m.id })}
      leading={retenu ? <Avatar prenom={retenu.prenom} nom={retenu.nom} /> : <span className="avatar" style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}><Ic.calendar /></span>}
      title={`${formatDate(m.du)} → ${formatDate(m.au)}`}
      meta={`${m.motif} · ${m.joursTravailles} j · ${m.retrocessionPct} %${retenu ? ` · ${retenu.prenom} ${retenu.nom}${conformite(retenu).verifie ? '' : ' (dossier incomplet)'}` : ''}${jours >= 0 && m.statut !== 'terminee' ? ` · dans ${jours} j` : ''}`}
      trailing={statut} />
  )
}

export const MissionCard = MissionRow
