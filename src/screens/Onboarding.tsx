import { useState } from 'react'
import { Btn, Chips, Field, Ic, PageHeader, Pill, Stepper, Steps, Toggle } from '../components/ui'
import { creerCompte } from '../lib/actions'
import { go } from '../lib/router'
import { SOINS } from '../lib/seed'
import { MODE_CLOUD } from '../lib/cloud/config'
import { creerCompteCloud, memoriserInscription, ouvrirSession, supabase, type Inscription } from '../lib/cloud/auth'
import { useParrain } from '../lib/cloud/parrain'
import { useToast } from '../components/ui'
import type { Role } from '../lib/types'

export function Onboarding({ role, parrain }: { role: Role; parrain?: string }) {
  const parrainCompte = useParrain(parrain)
  const { toast } = useToast()
  const [enCours, setEnCours] = useState(false)
  const [cgu, setCgu] = useState(false)
  const [etape, setEtape] = useState(0)
  const [f, setF] = useState({
    prenom: '', nom: '', email: '', telephone: '', ville: '', codePostal: '',
    nomCabinet: '', nbTitulaires: 2, patientsTournee: 25, caJournalierMoyen: 450,
    rayonKm: 30, vehicule: true, anneesExperience: 3, soins: [] as string[],
  })
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(x => ({ ...x, [k]: v }))
  const total = 2
  const valide0 = f.prenom && f.nom && f.email.includes('@') && f.codePostal.length === 5 && f.ville

  const terminer = async () => {
    if (MODE_CLOUD) {
      const donnees = {
        prenom: f.prenom.trim(), nom: f.nom.trim(), email: f.email.trim().toLowerCase(), telephone: f.telephone, ville: f.ville.trim(), codePostal: f.codePostal,
        ...(role === 'cabinet'
          ? { nomCabinet: f.nomCabinet || `Cabinet ${f.nom.trim()}`, nbTitulaires: f.nbTitulaires, patientsTournee: f.patientsTournee, caJournalierMoyen: f.caJournalierMoyen }
          : { rayonKm: f.rayonKm, vehicule: f.vehicule, anneesExperience: f.anneesExperience, soinsMaitrises: f.soins }),
      }
      const inscription: Inscription = { role, donnees, parrain }
      setEnCours(true)
      try {
        const { data: { session } } = await supabase().auth.getSession()
        if (session) {
          // Déjà authentifié (code validé sans profil) : on crée le compte tout de suite.
          await creerCompteCloud(inscription)
          await ouvrirSession()
          go({ name: 'home' })
        } else {
          memoriserInscription(inscription)
          go({ name: 'connexion', email: donnees.email })
        }
      } catch (err) {
        toast(err instanceof Error ? err.message : String(err))
      } finally { setEnCours(false) }
      return
    }
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
        <PageHeader crumb={{ label: 'Retour', onClick: () => go({ name: 'landing' }) }} title={etape === 0 ? 'Faisons connaissance' : role === 'cabinet' ? 'Votre cabinet' : 'Votre exercice'} sub={role === 'cabinet' ? 'Compte cabinet' : 'Compte remplaçant'} action={<Pill tone="accent">Étape {etape + 1} / {total}</Pill>} />
        <Steps total={total} done={etape} now={etape} />
        {parrainCompte && (
          <div className="banner ok"><Ic.gift /><div className="grow"><div className="b-title">Invité·e par {parrainCompte.prenom} {parrainCompte.nom}</div><div className="b-text">Premier mois offert, dossier vérifié en priorité.</div></div></div>
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
          <div className="grid-2">
            <Field label="Titulaires"><Stepper id="ob-nbt" value={f.nbTitulaires} min={1} max={12} onChange={v => set('nbTitulaires', v)} /></Field>
            <Field label="Patients par tournée"><Stepper id="ob-pat" value={f.patientsTournee} min={1} max={80} onChange={v => set('patientsTournee', v)} /></Field>
          </div>
          <Field label="CA journalier moyen d’une tournée" hint="Pré-remplit l’estimation de rétrocession. Modifiable à chaque demande."><Stepper id="ob-ca" value={f.caJournalierMoyen} min={100} max={2000} step={10} unit="€" onChange={v => set('caJournalierMoyen', v)} /></Field>
          <Cgu value={cgu} onChange={setCgu} />
          <Btn block variant="encre" disabled={!cgu || enCours} onClick={terminer}>{MODE_CLOUD ? 'Recevoir mon code de connexion' : 'Ouvrir mon espace cabinet'} <Ic.chevron /></Btn>
        </div>
      )}

      {etape === 1 && role === 'remplacant' && (
        <div className="card stack">
          <div className="grid-2">
            <Field label="Rayon de déplacement"><Stepper id="ob-ray" value={f.rayonKm} min={5} max={200} step={5} unit="km" onChange={v => set('rayonKm', v)} /></Field>
            <Field label="Années d’expérience"><Stepper id="ob-exp" value={f.anneesExperience} min={0} max={45} onChange={v => set('anneesExperience', v)} /></Field>
          </div>
          <Toggle label="Je suis véhiculé·e" value={f.vehicule} onChange={v => set('vehicule', v)} />
          <Field label="Soins que vous maîtrisez" hint="Les cabinets filtrent dessus. Restez honnête : ça se vérifie en passation."><Chips options={SOINS} value={f.soins} onChange={v => set('soins', v)} /></Field>
          <Cgu value={cgu} onChange={setCgu} />
          <Btn block variant="encre" disabled={!cgu || enCours} onClick={terminer}>{MODE_CLOUD ? 'Recevoir mon code de connexion' : 'Ouvrir mon espace'} <Ic.chevron /></Btn>
          <p className="tiny muted">Prochaine étape : votre dossier de confiance (autorisation de remplacement, RCP…). Il vous rend visible des cabinets.</p>
        </div>
      )}
    </div>
  )
}

function Cgu({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="row small" style={{ gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
      <input id="ob-cgu" type="checkbox" checked={value} onChange={ev => onChange(ev.target.checked)} style={{ marginTop: 3 }} />
      <span>J’accepte les <a href="#/legal/cgu" target="_blank">conditions d’utilisation</a> et j’ai lu la <a href="#/legal/confidentialite" target="_blank">politique de confidentialité</a>. Je ne saisirai aucune donnée de patient.</span>
    </label>
  )
}
