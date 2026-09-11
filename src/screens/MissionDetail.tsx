import { useState } from 'react'
import { Avatar, Banner, Btn, Field, Ic, Modal, PageHeader, Pill, Repere, Toggle, useRepere, useToast } from '../components/ui'
import { ajouterLigne, candidater, enregistrerFiche, enregistrerMission, majContrat, marquerPayee, publierMission, recommander, retenir, signer, transmettreCDOI } from '../lib/actions'
import { texteContrat } from '../lib/contrat'
import { alerteCDOI, conformite, controlerAffectation, estimerRetrocession, euros, formatDate, formatDateCourte, joursEntre, montantLigne } from '../lib/domain'
import { go } from '../lib/router'
import { compte, contratDeMission, contratsDuRemplacant, recosVers, useStore } from '../lib/store'
import type { Account, Contrat, Mission, PatientTournee } from '../lib/types'

type Onglet = 'candidatures' | 'contrat' | 'passation' | 'retrocession'

export function MissionDetail({ id, moi, ongletInitial }: { id: string; moi: Account; ongletInitial?: string }) {
  const e = useStore()
  const m = e.missions.find(x => x.id === id)
  if (!m) return <div className="card">Ce remplacement n’existe plus. <button className="linkbtn" onClick={() => go({ name: 'home' })}>Retour</button></div>
  const cabinet = compte(e, m.cabinetId)!
  const estCabinet = moi.id === m.cabinetId
  const c = contratDeMission(e, m.id)
  const retenu = compte(e, m.remplacantRetenuId)
  const est = estimerRetrocession(m)
  const ongletsValides: Onglet[] = ['candidatures', 'contrat', 'passation', 'retrocession']
  const [onglet, setOnglet] = useState<Onglet>(ongletsValides.includes(ongletInitial as Onglet) ? (ongletInitial as Onglet) : m.remplacantRetenuId ? 'contrat' : 'candidatures')
  const jours = joursEntre(new Date(), m.du)

  const onglets: { k: Onglet; l: string; dot?: boolean }[] = [
    { k: 'candidatures', l: estCabinet ? 'Candidats' : 'Ma candidature', dot: estCabinet && e.candidatures.some(x => x.missionId === m.id && x.statut === 'envoyee') && !m.remplacantRetenuId },
    { k: 'contrat', l: 'Contrat', dot: !!c && (estCabinet ? !c.signatureTitulaire : !c.signatureRemplacant) },
    { k: 'passation', l: 'Passation' },
    { k: 'retrocession', l: 'Rétrocession', dot: !!c && e.lignes.some(l => l.contratId === c.id && !l.payeeLe) },
  ]

  // L'étape suivante, dite une fois, en haut : c'est ce qu'un utilisateur cherche en ouvrant la page.
  const fiche = e.fiches.some(f => f.missionId === m.id)
  const signe = !!(c?.signatureTitulaire && c?.signatureRemplacant)
  const maSig = c && (estCabinet ? c.signatureTitulaire : c.signatureRemplacant)
  let suivante: { tone: 'info' | 'ok' | 'warn' | 'danger'; titre: string; texte?: string; onglet?: Onglet } | null = null
  if (m.statut === 'terminee') suivante = { tone: 'ok', titre: 'Remplacement terminé' }
  else if (m.statut === 'brouillon') suivante = { tone: 'info', titre: 'À publier', texte: `${jours} jours avant le début` }
  else if (!m.remplacantRetenuId) suivante = estCabinet ? { tone: 'info', titre: 'Choisir un candidat', texte: 'Retenir un candidat prépare le contrat', onglet: 'candidatures' } : { tone: 'info', titre: 'Candidatures ouvertes', onglet: 'candidatures' }
  else if (c && !maSig) suivante = { tone: 'warn', titre: 'Contrat à signer', texte: 'Signature des deux parties requise', onglet: 'contrat' }
  else if (c && !signe) suivante = { tone: 'info', titre: 'En attente de l’autre signature', onglet: 'contrat' }
  else if (c && !c.transmisCDOILe) { const a = alerteCDOI(c, m); suivante = { tone: a?.gravite === 'bloquant' ? 'danger' : 'warn', titre: a?.titre ?? 'À transmettre à l’Ordre', onglet: 'contrat' } }
  else if (!fiche) suivante = { tone: estCabinet ? 'warn' : 'info', titre: estCabinet ? 'Préparer la fiche de passation' : 'Fiche de passation en préparation', onglet: 'passation' }
  else if (c && e.lignes.some(l => l.contratId === c.id && !l.payeeLe)) suivante = { tone: 'warn', titre: 'Rétrocession à reverser', onglet: 'retrocession' }
  else suivante = { tone: 'ok', titre: 'Tout est prêt', texte: `Début dans ${jours} jours` }

  return (
    <div className="stack-l">
      <PageHeader crumb={{ label: estCabinet ? 'Accueil' : 'Remplacements', onClick: () => go({ name: estCabinet ? 'home' : 'missions' }) }}
        title={`${formatDate(m.du)} → ${formatDate(m.au)}`}
        sub={estCabinet ? m.motif : `${cabinet.nomCabinet} · ${cabinet.ville}`}
        action={m.statut === 'brouillon' ? <Pill>Brouillon</Pill> : m.statut === 'terminee' ? <Pill>Terminé</Pill> : retenu ? <Pill tone="ok" icon={Ic.check}>Pourvu</Pill> : <Pill tone="accent">Publié</Pill>} />

      {suivante && <Banner tone={suivante.tone} title={suivante.titre} text={suivante.texte}
        action={suivante.onglet && suivante.onglet !== onglet ? <Btn size="sm" variant="ghost" onClick={() => setOnglet(suivante!.onglet!)}>Ouvrir</Btn> : estCabinet && m.statut === 'brouillon' ? <Btn size="sm" onClick={() => publierMission(m.id)}>Publier</Btn> : undefined} />}

      <div className="card stack">
        <div className="facts">
          <div><div className="k">Jours travaillés</div><div className="v num">{m.joursTravailles} <span className="muted" style={{ fontWeight: 400 }}>dont {m.dimanchesFeries} dim./fériés</span></div></div>
          <div><div className="k">Tournée</div><div className="v num">{m.patientsJour} patients · {m.kmJour} km / j</div></div>
          <div><div className="k">Horaires</div><div className="v">{m.horaires}</div></div>
          <div><div className="k">Rétrocession</div><div className="v num">{m.retrocessionPct} % · {euros(est.brutRemplacant)}</div></div>
          <div><div className="k">Net estimé remplaçant</div><div className="v num">≈ {euros(est.netEstimeRemplacant)} <span className="muted" style={{ fontWeight: 400 }}>({euros(est.netParJour)} / j)</span></div></div>
          <div><div className="k">Fourni</div><div className="v">{[m.vehiculeFourni && 'véhicule', m.logementFourni && 'logement'].filter(Boolean).join(', ') || '—'}</div></div>
        </div>
        {(m.soinsRequis.length > 0 || m.commentaire) && <div className="divider" />}
        {m.soinsRequis.length > 0 && <div className="row">{m.soinsRequis.map(s => <Pill key={s}>{s}</Pill>)}</div>}
        {m.commentaire && <p className="small muted">{m.commentaire}</p>}
      </div>

      {estCabinet && m.statut === 'publiee' && !m.remplacantRetenuId && (() => {
        const dispo = e.accounts.filter(a => a.role === 'remplacant' && a.departement === cabinet.departement && (a.disponibilites ?? []).some(d => d.du <= m.du && d.au >= m.au)).length
        return dispo > 0 ? <Banner tone="ok" icon={Ic.users} title={`${dispo} remplaçant${dispo > 1 ? 's' : ''} du secteur disponible${dispo > 1 ? 's' : ''} sur ces dates`} action={<Btn size="sm" variant="ghost" onClick={() => go({ name: 'vivier' })}>Voir le vivier</Btn>} /> : null
      })()}

      <div className="tabs" role="tablist">
        {onglets.map(o => <button key={o.k} role="tab" aria-selected={onglet === o.k} className={onglet === o.k ? 'on' : ''} onClick={() => setOnglet(o.k)}>{o.l}{o.dot && <span className="status-dot warn" style={{ display: 'inline-block', marginLeft: 6, verticalAlign: 'middle' }} />}</button>)}
      </div>

      {onglet === 'candidatures' && estCabinet && <Repere k="candidatures">Un point rouge empêche la signature. Un point orange se vérifie de vive voix. Retenir un candidat prépare le contrat.</Repere>}
      {onglet === 'candidatures' && !estCabinet && <Repere k="candidature-r">Le net estimé tient compte de vos charges. Si votre dossier bloque, vous le voyez avant de candidater.</Repere>}
      {onglet === 'contrat' && <Repere k="contrat">Signez en tapant votre nom. Le contrat doit partir au conseil départemental de l’Ordre avant le premier jour.</Repere>}
      {onglet === 'passation' && <Repere k="passation">Initiales, rue, créneau, soins. Jamais de nom. Le remplaçant la voit 7 jours avant, une fois le contrat signé.</Repere>}
      {onglet === 'retrocession' && <Repere k="retrocession">Saisissez les honoraires encaissés par période : le montant à reverser et l’échéance se calculent seuls.</Repere>}
      {onglet === 'candidatures' && <Candidatures m={m} moi={moi} estCabinet={estCabinet} />}
      {onglet === 'contrat' && <ContratOnglet m={m} c={c} moi={moi} estCabinet={estCabinet} cabinet={cabinet} retenu={retenu} />}
      {onglet === 'passation' && <Passation m={m} c={c} estCabinet={estCabinet} />}
      {onglet === 'retrocession' && <Retrocession m={m} c={c} estCabinet={estCabinet} retenu={retenu} />}
    </div>
  )
}

/* ---------------------------------------------------------------- */
function Candidatures({ m, moi, estCabinet }: { m: Mission; moi: Account; estCabinet: boolean }) {
  const e = useStore()
  const { toast } = useToast()
  const cands = e.candidatures.filter(x => x.missionId === m.id).sort((a, b) => a.envoyeeLe.localeCompare(b.envoyeeLe))
  const [message, setMessage] = useState('Bonjour, disponible sur toute la période et véhiculé·e. ')
  const [confirm, setConfirm] = useState<string | null>(null)
  const pulseRetenir = useRepere('candidatures')

  if (!estCabinet) {
    const mienne = cands.find(x => x.remplacantId === moi.id)
    const controles = controlerAffectation(moi, m, contratsDuRemplacant(e, moi.id))
    const bloquants = controles.filter(x => x.gravite === 'bloquant')
    return (
      <div className="stack">
        <Controles controles={controles} />
        {mienne ? (
          <div className={`card ${mienne.statut === 'retenue' ? 'ok' : mienne.statut === 'ecartee' ? 'neutral' : 'accent'}`}>
            <strong>{mienne.statut === 'retenue' ? 'Vous avez été retenu·e.' : mienne.statut === 'ecartee' ? 'Le cabinet a retenu quelqu’un d’autre.' : 'Candidature envoyée.'}</strong>
            <div className="small muted">{formatDate(mienne.envoyeeLe)} — « {mienne.message} »</div>
          </div>
        ) : m.statut === 'publiee' ? (
          <div className="card stack">
            <Field label="Votre message au cabinet"><textarea id="cand-msg" className="textarea" value={message} onChange={ev => setMessage(ev.target.value)} /></Field>
            {bloquants.length > 0 && <p className="small" style={{ color: 'var(--rouge)' }}>Votre dossier bloque cette candidature. <button className="linkbtn small" onClick={() => go({ name: 'dossier' })}>Compléter mon dossier</button></p>}
            <Btn block variant="encre" disabled={bloquants.length > 0} onClick={() => { candidater(m.id, moi.id, message); toast('Candidature envoyée') }}>Je suis disponible</Btn>
          </div>
        ) : <div className="card muted">Ce remplacement n’est plus ouvert.</div>}
      </div>
    )
  }

  return (
    <div className="stack">
      {cands.length === 0 && (
        <div className="card"><div className="empty"><Ic.users /><div style={{ fontWeight: 600, color: 'var(--text)' }}>Aucune candidature pour l’instant</div><div className="small">Invitez votre carnet ou proposez le remplacement depuis le vivier.</div><Btn size="sm" variant="ghost" onClick={() => go({ name: 'vivier' })}>Parcourir le vivier</Btn></div></div>
      )}
      {cands.map(cd => {
        const r = compte(e, cd.remplacantId)!
        const conf = conformite(r)
        const recos = recosVers(e, r.id)
        const controles = controlerAffectation(r, m, contratsDuRemplacant(e, r.id))
        const bloquant = controles.some(x => x.gravite === 'bloquant')
        const dejaChezMoi = e.contrats.some(x => x.cabinetId === m.cabinetId && x.remplacantId === r.id && x.signatureRemplacant)
        return (
          <div key={cd.id} className={`card stack ${cd.statut === 'retenue' ? 'ok' : ''}`}>
            <div className="row" style={{ cursor: 'pointer' }} onClick={() => go({ name: 'remplacant', id: r.id })}>
              <Avatar prenom={r.prenom} nom={r.nom} />
              <div className="grow">
                <div className="row" style={{ gap: 6 }}><strong>{r.prenom} {r.nom}</strong>{conf.verifie ? <Pill tone="ok" icon={Ic.shield}>Vérifié</Pill> : <Pill tone="warn">Dossier {conf.score} %</Pill>}</div>
                <div className="small muted">{r.ville} · {r.anneesExperience} ans d’exp. · {recos.length} recommandation{recos.length > 1 ? 's' : ''}{dejaChezMoi ? ' · vous a déjà remplacé' : ''}</div>
              </div>
              <Ic.chevron className="" />
            </div>
            <p className="small">« {cd.message} »</p>
            <Controles controles={controles} compact />
            {cd.statut === 'envoyee' && !m.remplacantRetenuId && (
              <span className={!bloquant && pulseRetenir ? 'pulse' : ''} style={{ display: 'inline-flex', alignSelf: 'flex-start' }}><Btn size="sm" variant={bloquant ? 'ghost' : 'encre'} disabled={bloquant} onClick={() => setConfirm(r.id)}>{bloquant ? 'Dossier bloquant' : 'Retenir et préparer le contrat'}</Btn></span>
            )}
            {cd.statut === 'retenue' && <Pill tone="ok" icon={Ic.check}>Retenu·e</Pill>}
            {cd.statut === 'ecartee' && <Pill>Non retenu·e</Pill>}
          </div>
        )
      })}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Retenir ce remplaçant ?">
        <div className="stack">
          <p className="small muted">Les autres candidats seront prévenus. Un contrat de remplacement est préparé aussitôt, à signer par vous deux.</p>
          <Btn block variant="encre" onClick={() => { retenir(m.id, confirm!); setConfirm(null); toast('Contrat préparé — à vous de signer', true) }}>Confirmer</Btn>
        </div>
      </Modal>
    </div>
  )
}

export function Controles({ controles, compact }: { controles: ReturnType<typeof controlerAffectation>; compact?: boolean }) {
  if (!controles.length) return compact ? null : <Banner tone="ok" title="Aucun point bloquant" text="Autorisation, RCP et cumul de remplacements conformes sur toute la période." />
  return (
    <div className="stack" style={{ gap: 6 }}>
      {controles.map((k, i) => <Banner key={i} tone={k.gravite === 'bloquant' ? 'danger' : k.gravite === 'attention' ? 'warn' : 'info'} title={k.titre} text={k.detail} />)}
    </div>
  )
}

/* ---------------------------------------------------------------- */
function ContratOnglet({ m, c, moi, estCabinet, cabinet, retenu }: { m: Mission; c?: Contrat; moi: Account; estCabinet: boolean; cabinet: Account; retenu?: Account }) {
  const { toast } = useToast()
  const [saisie, setSaisie] = useState('')
  const [voir, setVoir] = useState(false)
  if (!c || !retenu) return <div className="card muted">Le contrat est préparé automatiquement dès qu’un remplaçant est retenu.</div>
  const maSig = estCabinet ? c.signatureTitulaire : c.signatureRemplacant
  const autreSig = estCabinet ? c.signatureRemplacant : c.signatureTitulaire
  const complet = !!(c.signatureTitulaire && c.signatureRemplacant)
  const alerte = complet ? alerteCDOI(c, m) : null
  const nomAttendu = `${moi.prenom} ${moi.nom}`
  const texte = texteContrat(c, m, cabinet, retenu)

  return (
    <div className="stack">
      <div className="card stack">
        <div className="between"><h3>Contrat de remplacement</h3>{complet ? <Pill tone="ok" icon={Ic.check}>Signé des deux côtés</Pill> : <Pill tone="warn">En attente de signature</Pill>}</div>
        <div className="row small">
          <span>{c.signatureTitulaire ? <Ic.check className="" style={{ width: 14, height: 14, color: 'var(--vert)', verticalAlign: '-2px' }} /> : '○'} Titulaire {c.signatureTitulaire ? `· ${formatDateCourte(c.signatureTitulaire.le)}` : ''}</span>
          <span>{c.signatureRemplacant ? <Ic.check className="" style={{ width: 14, height: 14, color: 'var(--vert)', verticalAlign: '-2px' }} /> : '○'} Remplaçant {c.signatureRemplacant ? `· ${formatDateCourte(c.signatureRemplacant.le)}` : ''}</span>
        </div>
        {estCabinet && !complet && (
          <div className="stack" style={{ gap: 8 }}>
            <Field label={`Rétrocession : ${c.retrocessionPct} %`}><input id="c-pct" type="range" className="range" min={60} max={100} value={c.retrocessionPct} disabled={!!c.signatureRemplacant} onChange={ev => majContrat(c.id, { retrocessionPct: +ev.target.value })} /></Field>
            <Field label="Reversement au plus tard le"><input id="c-ech" type="date" className="input" value={c.echeanceReversement} onChange={ev => majContrat(c.id, { echeanceReversement: ev.target.value })} /></Field>
            <Toggle label="Clause de non-concurrence" hint="Usuelle au-delà de trois mois de remplacement cumulés." value={c.clauseNonConcurrence} onChange={v => majContrat(c.id, { clauseNonConcurrence: v })} />
          </div>
        )}
        <div className="row">
          <Btn size="sm" variant="ghost" icon={Ic.file} onClick={() => setVoir(v => !v)}>{voir ? 'Masquer le texte' : 'Lire le contrat'}</Btn>
          <Btn size="sm" variant="ghost" icon={Ic.print} onClick={() => { setVoir(true); setTimeout(() => window.print(), 100) }}>Imprimer / PDF</Btn>
        </div>
        {voir && <div className="contrat">{texte}</div>}
        {!maSig && (
          <div className="card accent stack">
            <Field label="Signez en tapant votre nom" hint={`Attendu : ${nomAttendu}. Signature simple à valeur d’engagement entre confrères ; le document imprimé peut être signé à la main pour l’Ordre.`}>
              <input id="c-sig" className="input" value={saisie} onChange={ev => setSaisie(ev.target.value)} placeholder={nomAttendu} />
            </Field>
            <Btn block variant="encre" disabled={saisie.trim().toLowerCase() !== nomAttendu.toLowerCase()} onClick={() => { signer(c.id, moi.id, saisie.trim()); toast(autreSig ? 'Contrat signé des deux côtés' : 'Signé — en attente de l’autre partie', !!autreSig) }}>Je signe</Btn>
          </div>
        )}
        {maSig && !autreSig && <p className="small muted">Vous avez signé le {formatDate(maSig.le)}. {estCabinet ? retenu.prenom : cabinet.prenom} est prévenu·e.</p>}
      </div>

      {complet && (
        <div className={`card stack ${c.transmisCDOILe ? 'ok' : alerte?.gravite === 'bloquant' ? 'danger' : alerte?.gravite === 'attention' ? 'warn' : ''}`}>
          <div className="between">
            <h3>Transmission à l’Ordre</h3>
            {c.transmisCDOILe ? <Pill tone="ok" icon={Ic.check}>Transmis le {formatDateCourte(c.transmisCDOILe)}</Pill> : <Pill tone={alerte?.gravite === 'bloquant' ? 'danger' : 'warn'}>À faire</Pill>}
          </div>
          {!c.transmisCDOILe && alerte && <p className="small"><strong>{alerte.titre}.</strong> {alerte.detail}</p>}
          {!c.transmisCDOILe && estCabinet && (
            <div className="stack" style={{ gap: 8 }}>
              <p className="small muted">Envoyez le contrat au conseil départemental de l’Ordre du {cabinet.departement} (courriel ou espace en ligne), puis confirmez ici pour que le remplaçant le voie.</p>
              <Btn variant="encre" onClick={() => { transmettreCDOI(c.id); toast('Transmission enregistrée', true) }}>J’ai transmis le contrat à l’Ordre</Btn>
            </div>
          )}
        </div>
      )}
      {complet && c.transmisCDOILe && estCabinet && <Recommander c={c} retenu={retenu} moi={moi} m={m} />}
    </div>
  )
}

function Recommander({ c, retenu, moi, m }: { c: Contrat; retenu: Account; moi: Account; m: Mission }) {
  const e = useStore()
  const { toast } = useToast()
  const deja = e.recos.find(r => r.contratId === c.id && r.deId === moi.id)
  const [note, setNote] = useState(5)
  const [texte, setTexte] = useState('')
  if (new Date(m.au) > new Date()) return null
  if (deja) return <div className="card ok small"><strong>Vous avez recommandé {retenu.prenom}</strong> ({deja.note}/5) — « {deja.texte} »</div>
  return (
    <div className="card stack">
      <h3>Recommander {retenu.prenom} ?</h3>
      <p className="small muted">Votre recommandation est vérifiée : elle n’existe que parce que ce contrat a été signé. Elle aide {retenu.prenom} à être choisi·e par vos confrères — et les incite à rejoindre votre cercle.</p>
      <div className="row">{[1, 2, 3, 4, 5].map(n => <button key={n} className="linkbtn" aria-label={`${n} sur 5`} onClick={() => setNote(n)} style={{ fontSize: '1.6rem', textDecoration: 'none', color: n <= note ? 'var(--ambre)' : 'var(--ligne)' }}>★</button>)}</div>
      <textarea id="reco-txt" className="textarea" value={texte} onChange={ev => setTexte(ev.target.value)} placeholder="Ce qu’un confrère doit savoir : ponctualité, relation patients, facturation, passation au retour." />
      <Btn variant="encre" disabled={texte.trim().length < 10} onClick={() => { recommander({ contratId: c.id, deId: moi.id, versId: retenu.id, note, texte: texte.trim() }); toast('Recommandation publiée', true) }}>Publier la recommandation</Btn>
    </div>
  )
}

/* ---------------------------------------------------------------- */
function Passation({ m, c, estCabinet }: { m: Mission; c?: Contrat; estCabinet: boolean }) {
  const e = useStore()
  const { toast } = useToast()
  const fiche = e.fiches.find(f => f.missionId === m.id)
  const modele = e.fiches.filter(f => f.missionId !== m.id && e.missions.find(x => x.id === f.missionId)?.cabinetId === m.cabinetId).sort((a, b) => b.majLe.localeCompare(a.majLe))[0]
  const [edit, setEdit] = useState(!fiche && estCabinet)
  const [f, setF] = useState(() => fiche ?? { missionId: m.id, patients: [] as PatientTournee[], accesCabinet: '', pharmacie: '', medecinReferent: '', consignes: '', majLe: '' })
  const complet = !!(c?.signatureTitulaire && c?.signatureRemplacant)
  const visibleRemplacant = complet && joursEntre(new Date(), m.du) <= 7 && joursEntre(new Date(), m.au) >= -3

  if (!estCabinet) {
    if (!fiche) return <div className="card muted">Le cabinet n’a pas encore préparé la fiche de tournée.</div>
    if (!visibleRemplacant) return <div className="card accent small"><strong>Fiche prête.</strong> Elle vous sera visible 7 jours avant le début du remplacement, une fois le contrat signé, et jusqu’à 3 jours après la fin.</div>
  }

  const setP = (i: number, patch: Partial<PatientTournee>) => setF(x => ({ ...x, patients: x.patients.map((p, j) => j === i ? { ...p, ...patch } : p) }))
  const ajouter = () => setF(x => ({ ...x, patients: [...x.patients, { id: Math.random().toString(36).slice(2, 8), initiales: '', rue: '', creneau: '', soins: '', duree: 20 }] }))
  const sauver = () => { enregistrerFiche({ ...f, majLe: '' }); setEdit(false); toast('Fiche de passation enregistrée', f.patients.length >= 3) }

  if (edit) return (
    <div className="stack">
      <div className="card warn small"><strong>Jamais de nom complet ni de donnée médicale identifiante.</strong> Initiales, rue, créneau, soins : ce qu’il faut pour tourner, rien de plus. La fiche n’est visible du remplaçant que pendant le remplacement.</div>
      {modele && f.patients.length === 0 && <Btn variant="soft" onClick={() => setF({ ...f, patients: modele.patients, accesCabinet: modele.accesCabinet, pharmacie: modele.pharmacie, medecinReferent: modele.medecinReferent, consignes: modele.consignes })}>Reprendre la fiche du dernier remplacement ({modele.patients.length} patients)</Btn>}
      <div className="card stack">
        <h3>Tournée</h3>
        {f.patients.map((p, i) => (
          <div key={p.id} className="stack" style={{ gap: 6, paddingBottom: 10, borderBottom: '1px solid var(--ligne)' }}>
            <div className="grid-2">
              <input className="input" placeholder="Initiales (M. R.)" value={p.initiales} onChange={ev => setP(i, { initiales: ev.target.value })} aria-label="Initiales" />
              <input className="input" placeholder="Créneau (6 h 45)" value={p.creneau} onChange={ev => setP(i, { creneau: ev.target.value })} aria-label="Créneau" />
            </div>
            <input className="input" placeholder="Rue, commune" value={p.rue} onChange={ev => setP(i, { rue: ev.target.value })} aria-label="Adresse" />
            <input className="input" placeholder="Soins (glycémie + insuline, pansement…)" value={p.soins} onChange={ev => setP(i, { soins: ev.target.value })} aria-label="Soins" />
            <input className="input" placeholder="Particularités (chien, code, entrer par le garage…)" value={p.particularites ?? ''} onChange={ev => setP(i, { particularites: ev.target.value })} aria-label="Particularités" />
            <button className="linkbtn tiny" onClick={() => setF(x => ({ ...x, patients: x.patients.filter((_, j) => j !== i) }))}>Retirer</button>
          </div>
        ))}
        <Btn variant="ghost" size="sm" icon={Ic.plus} onClick={ajouter}>Ajouter un patient</Btn>
      </div>
      <div className="card stack">
        <h3>Autour de la tournée</h3>
        <Field label="Accès au cabinet et au matériel"><input id="f-acces" className="input" value={f.accesCabinet} onChange={ev => setF({ ...f, accesCabinet: ev.target.value })} /></Field>
        <Field label="Médecin référent"><input id="f-med" className="input" value={f.medecinReferent} onChange={ev => setF({ ...f, medecinReferent: ev.target.value })} /></Field>
        <Field label="Pharmacie"><input id="f-pha" className="input" value={f.pharmacie} onChange={ev => setF({ ...f, pharmacie: ev.target.value })} /></Field>
        <Field label="Consignes"><textarea id="f-cons" className="textarea" value={f.consignes} onChange={ev => setF({ ...f, consignes: ev.target.value })} /></Field>
      </div>
      <div className="row">{fiche && <Btn variant="ghost" onClick={() => setEdit(false)}>Annuler</Btn>}<Btn variant="encre" style={{ flex: 1 }} onClick={sauver}>Enregistrer la fiche</Btn></div>
    </div>
  )

  const ff = fiche!
  const dureeTotale = ff.patients.reduce((s, p) => s + p.duree, 0)
  return (
    <div className="stack">
      <div className="between">
        <div className="small muted">{ff.patients.length} patients · ≈ {Math.round(dureeTotale / 60 * 10) / 10} h de soins · mise à jour {formatDate(ff.majLe)}</div>
        <div className="row">{estCabinet && <Btn size="sm" variant="ghost" onClick={() => { setF(ff); setEdit(true) }}>Modifier</Btn>}<Btn size="sm" variant="ghost" icon={Ic.print} onClick={() => window.print()}>Imprimer</Btn></div>
      </div>
      <div className="list card" style={{ paddingTop: 4, paddingBottom: 4 }}>
        {ff.patients.map(p => (
          <div key={p.id} className="item" style={{ alignItems: 'flex-start' }}>
            <div className="num display" style={{ width: 56, fontWeight: 700, color: 'var(--encre)' }}>{p.creneau}</div>
            <div className="grow">
              <div><strong>{p.initiales}</strong> <span className="muted small">— {p.rue}</span></div>
              <div className="small">{p.soins} <span className="muted">· {p.duree} min</span></div>
              {p.particularites && <div className="small" style={{ color: 'var(--ambre)' }}>⚠ {p.particularites}</div>}
            </div>
          </div>
        ))}
      </div>
      <div className="card stack small">
        {ff.accesCabinet && <div><strong>Accès :</strong> {ff.accesCabinet}</div>}
        {ff.medecinReferent && <div><strong>Médecin :</strong> {ff.medecinReferent}</div>}
        {ff.pharmacie && <div><strong>Pharmacie :</strong> {ff.pharmacie}</div>}
        {ff.consignes && <div><strong>Consignes :</strong> {ff.consignes}</div>}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- */
function Retrocession({ m, c, estCabinet, retenu }: { m: Mission; c?: Contrat; estCabinet: boolean; retenu?: Account }) {
  const e = useStore()
  const { toast } = useToast()
  const [n, setN] = useState({ libelle: '', du: m.du, au: m.au, ca: 0 })
  if (!c || !retenu) return <div className="card muted">Le suivi de rétrocession s’ouvre une fois le contrat signé.</div>
  const lignes = e.lignes.filter(l => l.contratId === c.id).sort((a, b) => a.du.localeCompare(b.du))
  const total = lignes.reduce((s, l) => s + montantLigne(l), 0)
  const paye = lignes.filter(l => l.payeeLe).reduce((s, l) => s + montantLigne(l), 0)
  const est = estimerRetrocession(m)
  return (
    <div className="stack">
      <div className="grid-2">
        <div className="tile"><span className="k">Reversé</span><span className="v num">{euros(paye)}</span><span className="s">sur {euros(total)} dus</span></div>
        <div className="tile"><span className="k">Estimation initiale</span><span className="v num">{euros(est.brutRemplacant)}</span><span className="s">{m.retrocessionPct} % de {euros(est.caPeriode)}</span></div>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Période</th><th className="r">Encaissé</th><th className="r">À reverser</th><th>Échéance</th><th></th></tr></thead>
            <tbody>
              {lignes.length === 0 && <tr><td colSpan={5} className="muted small">Aucune période saisie. Ajoutez le CA encaissé au fil du remplacement : le montant à reverser se calcule seul.</td></tr>}
              {lignes.map(l => {
                const retard = !l.payeeLe && joursEntre(l.echeance, new Date()) > 0
                return (
                  <tr key={l.id}>
                    <td><div style={{ fontWeight: 600 }}>{l.libelle}</div><div className="tiny muted">{formatDateCourte(l.du)} → {formatDateCourte(l.au)}</div></td>
                    <td className="r num">{euros(l.caEncaisse)}</td>
                    <td className="r num"><strong>{euros(montantLigne(l))}</strong><div className="tiny muted">{l.pct} %</div></td>
                    <td className="small">{l.payeeLe ? <Pill tone="ok" icon={Ic.check}>Payé {formatDateCourte(l.payeeLe)}</Pill> : retard ? <Pill tone="danger">Retard · {formatDateCourte(l.echeance)}</Pill> : <Pill tone="warn">{formatDateCourte(l.echeance)}</Pill>}</td>
                    <td>{estCabinet && !l.payeeLe && <Btn size="sm" variant="soft" onClick={() => { marquerPayee(l.id); toast(`${euros(montantLigne(l))} reversés à ${retenu.prenom}`, !retard) }}>Reversé</Btn>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      {estCabinet && (
        <div className="card stack">
          <h3>Ajouter une période</h3>
          <Field label="Libellé"><input id="l-lib" className="input" placeholder="Semaine 2" value={n.libelle} onChange={ev => setN({ ...n, libelle: ev.target.value })} /></Field>
          <div className="grid-2">
            <Field label="Du"><input id="l-du" type="date" className="input" value={n.du} onChange={ev => setN({ ...n, du: ev.target.value })} /></Field>
            <Field label="Au"><input id="l-au" type="date" className="input" value={n.au} onChange={ev => setN({ ...n, au: ev.target.value })} /></Field>
          </div>
          <Field label="Honoraires encaissés sur la période (€)" hint={`À reverser : ${euros(Math.round(n.ca * c.retrocessionPct / 100))}`}><input id="l-ca" type="number" className="input" inputMode="decimal" min={0} value={n.ca || ''} onChange={ev => setN({ ...n, ca: +ev.target.value })} /></Field>
          <Btn variant="encre" disabled={!n.libelle || n.ca <= 0} onClick={() => { ajouterLigne({ contratId: c.id, libelle: n.libelle, du: n.du, au: n.au, caEncaisse: n.ca, pct: c.retrocessionPct, echeance: c.echeanceReversement }); setN({ libelle: '', du: m.du, au: m.au, ca: 0 }); toast('Période ajoutée') }}>Ajouter</Btn>
        </div>
      )}
      {!estCabinet && <p className="small muted">Les honoraires sont encaissés par le cabinet, qui vous reverse {c.retrocessionPct} % au plus tard le {formatDate(c.echeanceReversement)}. Vous voyez ici chaque période et son statut.</p>}
      {estCabinet && m.statut !== 'terminee' && new Date(m.au) < new Date() && <Btn variant="ghost" onClick={() => { enregistrerMission({ ...m, statut: 'terminee' }); toast('Remplacement clôturé') }}>Clôturer le remplacement</Btn>}
    </div>
  )
}
