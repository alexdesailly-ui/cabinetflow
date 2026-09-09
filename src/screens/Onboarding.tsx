import { useState } from 'react'
import { Btn, Chips, Field, Ic, Pill, Steps, Toggle } from '../components/ui'
import { creerCompte } from '../lib/actions'
import { go } from '../lib/router'
import { SOINS } from '../lib/seed'
import { useStore } from '../lib/store'
import type { Role } from '../lib/types'

export function Onboarding({ role, parrain }: { role: Role; parrain?: string }) {
  const e = useStore()
  const parrainCompte = e.accounts.find(a => a.codeParrain === parrain)
  const [etape, setEtape] = useState(0)
  const [f, setF] = useState({
    prenom: '', nom: '', email: '', telephone: '', ville: '', codePostal: '',
    nomCabinet: '', nbTitulaires: 2, patientsTournee: 25, caJournalierMoyen: 450,
    rayonKm: 30, vehicule: true, anneesExperience: 3, soins: [] as string[],
  })
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(x => ({ ...x, [k]: v }))
  const total = 2
  const valide0 = f.prenom && f.nom && f.email.includes('@') && f.codePostal.length === 5 && f.ville

  const terminer = () => {
    creerCompte({
      role, prenom: f.prenom.trim(), nom: f.nom.trim(), email: f.email.trim(), telephone: f.telephone, ville: f.ville, codePostal: f.codePostal,
      parrainePar: parrain,
      ...(role === 'cabinet'
        ? { nomCabinet: f.nomCabinet || `Cabinet ${f.nom}`, nbTitulaires: f.nbTitulaires, patientsTournee: f.patientsTournee, caJournalierMoyen: f.caJournalierMoyen }
        : { rayonKm: f.rayonKm, vehicule: f.vehicule, anneesExperience: f.anneesExperience, soinsMaitrises: f.soins, pieces: [], disponibilites: [] }),
    })
    go({ name: 'home' })
  }

  return (
    <div className="stack-l" style={{ maxWidth: 560 }}>
      <div className="stack">
        <button className="linkbtn small row" onClick={() => go({ name: 'landing' })}><Ic.back className="" /> Retour</button>
        <Pill tone="accent">{role === 'cabinet' ? 'Compte cabinet' : 'Compte remplaçant'}</Pill>
        <h1>{etape === 0 ? 'Faisons connaissance' : role === 'cabinet' ? 'Votre cabinet' : 'Votre exercice'}</h1>
        <Steps total={total} done={etape} now={etape} />
        {parrainCompte && (
          <div className="card ok small">
            <strong>Invité·e par {parrainCompte.prenom} {parrainCompte.nom}</strong> — votre premier mois est offert et votre dossier sera vérifié en priorité.
          </div>
        )}
      </div>

      {etape === 0 && (
        <div className="card stack">
          <div className="grid-2">
            <Field label="Prénom"><input id="ob-prenom" className="input" value={f.prenom} onChange={ev => set('prenom', ev.target.value)} autoComplete="given-name" /></Field>
            <Field label="Nom"><input id="ob-nom" className="input" value={f.nom} onChange={ev => set('nom', ev.target.value)} autoComplete="family-name" /></Field>
          </div>
          <Field label="Email professionnel"><input id="ob-email" className="input" type="email" value={f.email} onChange={ev => set('email', ev.target.value)} autoComplete="email" /></Field>
          <Field label="Téléphone" hint="Pour être joint·e rapidement par un remplaçant ou un cabinet."><input id="ob-tel" className="input" type="tel" value={f.telephone} onChange={ev => set('telephone', ev.target.value)} /></Field>
          <div className="grid-2">
            <Field label="Code postal"><input id="ob-cp" className="input" inputMode="numeric" maxLength={5} value={f.codePostal} onChange={ev => set('codePostal', ev.target.value.replace(/\D/g, ''))} /></Field>
            <Field label="Ville"><input id="ob-ville" className="input" value={f.ville} onChange={ev => set('ville', ev.target.value)} /></Field>
          </div>
          <Btn block disabled={!valide0} onClick={() => setEtape(1)}>Continuer <Ic.chevron /></Btn>
        </div>
      )}

      {etape === 1 && role === 'cabinet' && (
        <div className="card stack">
          <Field label="Nom du cabinet"><input id="ob-cab" className="input" value={f.nomCabinet} onChange={ev => set('nomCabinet', ev.target.value)} placeholder={`Cabinet ${f.nom}`} /></Field>
          <Field label={`Titulaires : ${f.nbTitulaires}`}><input id="ob-nbt" className="range" type="range" min={1} max={8} value={f.nbTitulaires} onChange={ev => set('nbTitulaires', +ev.target.value)} /></Field>
          <Field label={`Patients sur une tournée type : ${f.patientsTournee}`}><input id="ob-pat" className="range" type="range" min={8} max={60} value={f.patientsTournee} onChange={ev => set('patientsTournee', +ev.target.value)} /></Field>
          <Field label={`CA journalier moyen d’une tournée : ${f.caJournalierMoyen} €`} hint="Sert à pré-remplir l’estimation de rétrocession. Modifiable à chaque demande.">
            <input id="ob-ca" className="range" type="range" min={200} max={900} step={10} value={f.caJournalierMoyen} onChange={ev => set('caJournalierMoyen', +ev.target.value)} />
          </Field>
          <Btn block variant="encre" onClick={terminer}>Ouvrir mon espace cabinet <Ic.chevron /></Btn>
        </div>
      )}

      {etape === 1 && role === 'remplacant' && (
        <div className="card stack">
          <Field label={`Rayon de déplacement : ${f.rayonKm} km`}><input id="ob-ray" className="range" type="range" min={5} max={120} step={5} value={f.rayonKm} onChange={ev => set('rayonKm', +ev.target.value)} /></Field>
          <Field label={`Années d’expérience : ${f.anneesExperience}`}><input id="ob-exp" className="range" type="range" min={0} max={30} value={f.anneesExperience} onChange={ev => set('anneesExperience', +ev.target.value)} /></Field>
          <Toggle label="Je suis véhiculé·e" value={f.vehicule} onChange={v => set('vehicule', v)} />
          <Field label="Soins que vous maîtrisez" hint="Les cabinets filtrent dessus. Restez honnête : ça se vérifie en passation."><Chips options={SOINS} value={f.soins} onChange={v => set('soins', v)} /></Field>
          <Btn block variant="encre" onClick={terminer}>Ouvrir mon espace <Ic.chevron /></Btn>
          <p className="tiny muted">Prochaine étape : votre dossier de confiance (autorisation de remplacement, RCP…). Il vous rend visible des cabinets.</p>
        </div>
      )}
    </div>
  )
}
