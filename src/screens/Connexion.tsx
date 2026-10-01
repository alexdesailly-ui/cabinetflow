import { useState } from 'react'
import { Btn, Field, Ic, PageHeader } from '../components/ui'
import { envoyerCode, verifierCode } from '../lib/cloud/auth'
import { go } from '../lib/router'

/** Connexion / fin d'inscription par code à 6 chiffres reçu par email. */
export function Connexion({ email: emailInitial }: { email?: string }) {
  const [email, setEmail] = useState(emailInitial ?? '')
  const [code, setCode] = useState('')
  const [envoye, setEnvoye] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  const agir = async (fn: () => Promise<void>) => {
    setEnCours(true); setErreur('')
    try { await fn() } catch (e) { setErreur(e instanceof Error ? e.message : String(e)) } finally { setEnCours(false) }
  }
  const envoyer = () => agir(async () => { await envoyerCode(email.trim().toLowerCase()); setEnvoye(true) })
  const verifier = () => agir(async () => {
    const r = await verifierCode(email.trim().toLowerCase(), code)
    go(r === 'pret' ? { name: 'home' } : { name: 'onboarding', role: 'cabinet' })
  })

  return (
    <div className="stack-l" style={{ maxWidth: 480 }}>
      <PageHeader crumb={{ label: 'Retour', onClick: () => go({ name: 'landing' }) }} title={envoye ? 'Vérifiez vos emails' : 'Connexion'}
        sub={envoye ? `Un code à 6 chiffres vient d’être envoyé à ${email}.` : 'Sans mot de passe : nous vous envoyons un code par email.'} />
      <div className="card stack">
        {!envoye ? (
          <>
            <Field label="Email professionnel"><input id="cx-email" className="input" type="email" autoComplete="email" value={email} onChange={ev => setEmail(ev.target.value)} onKeyDown={ev => ev.key === 'Enter' && email.includes('@') && envoyer()} /></Field>
            <Btn block variant="encre" disabled={!email.includes('@') || enCours} onClick={envoyer}>{enCours ? 'Envoi…' : 'Recevoir mon code'} <Ic.chevron /></Btn>
          </>
        ) : (
          <>
            <Field label="Code reçu" hint="Pensez à vérifier les indésirables. Le code expire au bout d’une heure.">
              <input id="cx-code" className="input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={ev => setCode(ev.target.value.replace(/\D/g, ''))} onKeyDown={ev => ev.key === 'Enter' && code.length === 6 && verifier()} autoFocus />
            </Field>
            <Btn block variant="encre" disabled={code.length !== 6 || enCours} onClick={verifier}>{enCours ? 'Vérification…' : 'Valider'}</Btn>
            <button className="linkbtn small" disabled={enCours} onClick={() => { setEnvoye(false); setCode('') }}>Changer d’email ou renvoyer un code</button>
          </>
        )}
        {erreur && <div className="banner danger" role="alert"><Ic.alert /><div className="grow b-text">{erreur}</div></div>}
      </div>
      <p className="tiny muted">En continuant, vous acceptez les <a href="#/legal/cgu">conditions d’utilisation</a> et la <a href="#/legal/confidentialite">politique de confidentialité</a>.</p>
    </div>
  )
}
