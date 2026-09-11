import { useMemo, useState } from 'react'
import { Btn, Chips, Field, Ic, PageHeader, Repere, Stepper, Steps, Toggle, useToast } from '../components/ui'
import { enregistrerMission, publierMission } from '../lib/actions'
import { dansNJours, estimerRetrocession, euros, joursEntre } from '../lib/domain'
import { go } from '../lib/router'
import { SOINS } from '../lib/seed'
import type { Account, MotifRemplacement } from '../lib/types'

const MOTIFS: MotifRemplacement[] = ['Congés', 'Maladie', 'Formation', 'Maternité / paternité', 'Renfort d’activité']

/** Compte les jours ouvrés et les dimanches/fériés (approximation : dimanches) entre deux dates. */
function compterJours(du: string, au: string, dimanches: boolean) {
  const d1 = new Date(du), d2 = new Date(au)
  if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d2 < d1) return { total: 0, dimanches: 0 }
  let total = 0, dim = 0
  for (let t = d1.getTime(); t <= d2.getTime(); t += 86_400_000) {
    const j = new Date(t).getDay()
    if (j === 0) { if (dimanches) { total++; dim++ } } else total++
  }
  return { total, dimanches: dim }
}

export function MissionNew({ moi }: { moi: Account }) {
  const { toast } = useToast()
  const [etape, setEtape] = useState(0)
  const [f, setF] = useState({
    motif: 'Congés' as MotifRemplacement, du: dansNJours(45), au: dansNJours(59), dimanches: true,
    caJournalier: moi.caJournalierMoyen ?? 450, retrocessionPct: 85,
    patientsJour: moi.patientsTournee ?? 25, kmJour: 50, horaires: '6 h 30 – 13 h / 17 h – 19 h 30',
    soins: [] as string[], vehicule: true, logement: false, commentaire: '',
  })
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(x => ({ ...x, [k]: v }))
  const jours = useMemo(() => compterJours(f.du, f.au, f.dimanches), [f.du, f.au, f.dimanches])
  const est = estimerRetrocession({ joursTravailles: jours.total, dimanchesFeries: jours.dimanches, caJournalier: f.caJournalier, retrocessionPct: f.retrocessionPct })
  const anticipation = joursEntre(new Date(), f.du)

  const sauver = (publier: boolean) => {
    const mid = enregistrerMission({
      cabinetId: moi.id, motif: f.motif, du: f.du, au: f.au, joursTravailles: jours.total, dimanchesFeries: jours.dimanches,
      caJournalier: f.caJournalier, retrocessionPct: f.retrocessionPct, patientsJour: f.patientsJour, kmJour: f.kmJour,
      horaires: f.horaires, soinsRequis: f.soins, vehiculeFourni: f.vehicule, logementFourni: f.logement,
      commentaire: f.commentaire || undefined, statut: 'brouillon', invitesDirects: [],
    })
    if (publier) { publierMission(mid); toast('Demande publiée — les remplaçants du secteur sont prévenus', true) }
    else toast('Brouillon enregistré')
    go({ name: 'mission', id: mid })
  }

  return (
    <div className="stack-l" style={{ maxWidth: 600 }}>
      <PageHeader crumb={{ label: 'Accueil', onClick: () => go({ name: 'home' }) }} title={['Quand et pourquoi', 'La tournée', 'La rétrocession'][etape]} sub={`Étape ${etape + 1} sur 3`} />
      <Steps total={3} done={etape} now={etape} />
      {etape === 0 && <Repere k="mission-new">Trois écrans : les dates, la tournée, la rétrocession. Le remplaçant verra ce qu’il touchera net avant de répondre.</Repere>}

      {etape === 0 && (
        <div className="card stack">
          <Field label="Motif"><div className="segment" role="radiogroup">{MOTIFS.map(mo => <button key={mo} type="button" role="radio" aria-checked={f.motif === mo} className={f.motif === mo ? 'on' : ''} onClick={() => set('motif', mo)}>{mo}</button>)}</div></Field>
          <div className="grid-2">
            <Field label="Du"><input id="m-du" type="date" className="input" value={f.du} onChange={ev => set('du', ev.target.value)} /></Field>
            <Field label="Au (inclus)"><input id="m-au" type="date" className="input" value={f.au} min={f.du} onChange={ev => set('au', ev.target.value)} /></Field>
          </div>
          <Toggle label="La tournée tourne le dimanche et les fériés" hint="Majorés dans l’estimation." value={f.dimanches} onChange={v => set('dimanches', v)} />
          <div className={`banner ${anticipation >= 45 ? 'ok' : anticipation >= 21 ? 'warn' : 'danger'}`}><Ic.calendar /><div className="grow"><div className="b-title">{anticipation >= 45 ? 'Bonne anticipation' : anticipation >= 21 ? 'Délai court' : 'Délai très court'}</div><div className="b-text">{Math.max(0, anticipation)} jours avant le début. {anticipation >= 45 ? 'Les remplaçants organisent leur agenda maintenant.' : anticipation >= 21 ? 'Invitez votre carnet dès la publication.' : 'Votre demande sera mise en avant dans le département.'}</div></div></div>
          <Btn block disabled={jours.total === 0} onClick={() => setEtape(1)}>Continuer · {jours.total} jour{jours.total > 1 ? 's' : ''} travaillé{jours.total > 1 ? 's' : ''} <Ic.chevron /></Btn>
        </div>
      )}

      {etape === 1 && (
        <div className="card stack">
          <div className="grid-2">
            <Field label="Patients par jour"><Stepper id="m-pat" value={f.patientsJour} min={1} max={80} onChange={v => set('patientsJour', v)} /></Field>
            <Field label="Kilomètres par jour"><Stepper id="m-km" value={f.kmJour} min={0} max={300} step={5} unit="km" onChange={v => set('kmJour', v)} /></Field>
          </div>
          <Field label="Horaires de la tournée"><input id="m-hor" className="input" value={f.horaires} onChange={ev => set('horaires', ev.target.value)} /></Field>
          <Field label="Soins spécifiques sur la tournée" hint="Relève signalera au candidat ce qu’il n’a pas déclaré maîtriser."><Chips options={SOINS} value={f.soins} onChange={v => set('soins', v)} /></Field>
          <Toggle label="Véhicule fourni" value={f.vehicule} onChange={v => set('vehicule', v)} />
          <Toggle label="Logement fourni" hint="Décisif pour un remplaçant qui vient de loin." value={f.logement} onChange={v => set('logement', v)} />
          <Field label="Un mot sur la tournée" hint="Ce qui donne envie : la patientèle, l’ambiance, la passation prévue."><textarea id="m-com" className="textarea" value={f.commentaire} onChange={ev => set('commentaire', ev.target.value)} placeholder="Tournée rurale, patientèle fidèle, passation sur une journée avec moi avant le départ." /></Field>
          <div className="row"><Btn variant="ghost" onClick={() => setEtape(0)}>Retour</Btn><Btn style={{ flex: 1 }} onClick={() => setEtape(2)}>Continuer <Ic.chevron /></Btn></div>
        </div>
      )}

      {etape === 2 && (
        <div className="stack">
          <div className="card stack">
            <div className="grid-2">
              <Field label="CA journalier moyen" hint="Honoraires d’un jour normal, IFD et IK compris. Le remplaçant ne voit que l’estimation."><Stepper id="m-ca" value={f.caJournalier} min={100} max={2000} step={10} unit="€" onChange={v => set('caJournalier', v)} /></Field>
              <Field label="Rétrocession" hint="Usage : 80 à 90 % selon ce que vous fournissez."><Stepper id="m-pct" value={f.retrocessionPct} min={50} max={100} unit="%" onChange={v => set('retrocessionPct', v)} /></Field>
            </div>
          </div>
          <div className="card accent stack">
            <p className="eyebrow">Ce que verra le remplaçant</p>
            <div className="grid-2">
              <div><div className="display num" style={{ fontSize: '2rem', fontWeight: 700 }}>{euros(est.brutRemplacant)}</div><div className="small muted">rétrocédés sur {jours.total} jours</div></div>
              <div><div className="display num" style={{ fontSize: '2rem', fontWeight: 700 }}>≈ {euros(est.netEstimeRemplacant)}</div><div className="small muted">net estimé après charges</div></div>
            </div>
            <div className="small muted">Soit ≈ {euros(est.netParJour)} net par jour. Vous conservez {euros(est.redevanceCabinet)} de redevance pour les moyens mis à disposition.</div>
          </div>
          <div className="row">
            <Btn variant="ghost" onClick={() => setEtape(1)}>Retour</Btn>
            <Btn variant="ghost" onClick={() => sauver(false)}>Enregistrer le brouillon</Btn>
            <Btn variant="encre" style={{ flex: 1 }} onClick={() => sauver(true)}>Publier <Ic.chevron /></Btn>
          </div>
        </div>
      )}
    </div>
  )
}
