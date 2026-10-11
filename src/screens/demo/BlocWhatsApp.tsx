import { useEffect, useMemo, useState } from 'react'
import { Avatar, Banner, Btn, Ic, useToast } from '../../components/ui'
import { lienAnnonce, messageAnnonce, nettoyerTelephone, urlWhatsApp, type Annonce } from '../../lib/annonce'
import { DEBUT_PAR_DEFAUT, mondeDemo } from '../../lib/demoFixtures'
import { estVerrouille, useDemo } from '../../lib/demoState'
import { dansNJours, formatPeriode } from '../../lib/domain'
import { Feuille, LienBtn, type PropsBloc } from './Feuille'

const DUREES = [7, 14, 21]
const FORMAT_DATE = /^\d{4}-\d{2}-\d{2}$/
const ajouterJours = (iso: string, n: number) => new Date(new Date(iso).getTime() + n * 86_400_000).toISOString().slice(0, 10)

/** Bloc 1 : l'offre gratuite. L'annonce part vraiment sur WhatsApp ; seules les réponses sont simulées. */
export function BlocWhatsApp({ onClose, onAller }: PropsBloc) {
  const { toast } = useToast()
  const e = useDemo()
  const monde = useMemo(() => mondeDemo(), [])
  const [etape, setEtape] = useState(0)
  const [debutSaisi, setDebutSaisi] = useState(dansNJours(DEBUT_PAR_DEFAUT))
  const [duree, setDuree] = useState(14)
  const [tel, setTel] = useState('')
  const [avecNumero, setAvecNumero] = useState(false)
  const [parti, setParti] = useState(false)

  const debut = FORMAT_DATE.test(debutSaisi) ? debutSaisi : dansNJours(DEBUT_PAR_DEFAUT)
  const annonce: Annonce = { cabinet: monde.cabinet.nomCabinet ?? 'Cabinet', ville: monde.cabinet.ville, du: debut, au: ajouterJours(debut, duree - 1), motif: 'Congés', tel: avecNumero ? nettoyerTelephone(tel) : undefined }
  const lien = lienAnnonce(annonce, `${location.origin}${location.pathname}`)
  const message = messageAnnonce(annonce, lien)

  const copier = async () => {
    try { await navigator.clipboard.writeText(message); toast('Message copié') } catch { toast('Copie impossible : utilisez le bouton WhatsApp') }
  }

  const actions = etape === 0
    ? <Btn block onClick={() => setEtape(1)}>Continuer <Ic.chevron /></Btn>
    : etape === 1
      ? (
        <>
          <LienBtn block variant={parti ? 'ghost' : 'primary'} icon={Ic.send} href={urlWhatsApp(message)} onClick={() => setParti(true)}>{parti ? 'Renvoyer sur WhatsApp' : 'Envoyer sur WhatsApp'}</LienBtn>
          <Btn block variant={parti ? 'primary' : 'ghost'} onClick={() => setEtape(2)}>{parti ? 'J’ai envoyé : voir les réponses' : 'Voir les réponses'} <Ic.chevron /></Btn>
        </>
      )
      : (
        <>
          <Btn block icon={estVerrouille(3, e.offre) ? Ic.lock : undefined} onClick={() => onAller(3)}>Sécuriser avec contrat et signature</Btn>
          <Btn block variant="ghost" onClick={onClose}>Terminer</Btn>
        </>
      )

  return (
    <Feuille id={1} etape={etape} total={3} onClose={onClose} actions={actions}>
      {etape === 0 && (
        <div className="stack">
          <p className="small muted">Version gratuite : vous annoncez, vos remplaçants répondent. Tout se passe dans WhatsApp.</p>
          <div className="field"><label>Pour combien de temps ?</label>
            <div className="chips">{DUREES.map(d => <button key={d} type="button" className={`chip ${duree === d ? 'on' : ''}`} aria-pressed={duree === d} onClick={() => setDuree(d)}>{d / 7} semaine{d > 7 ? 's' : ''}</button>)}</div>
          </div>
          <div className="field"><label htmlFor="wa-debut">À partir du</label>
            <input id="wa-debut" className="input" type="date" value={debutSaisi} min={dansNJours(0)} onChange={ev => setDebutSaisi(ev.target.value)} />
          </div>
          <div className="banner"><Ic.calendar /><div className="grow"><div className="b-title">{formatPeriode(annonce.du, annonce.au)}</div><div className="b-text">{duree} jours · {monde.cabinet.nomCabinet}</div></div></div>
          {!avecNumero
            ? <button type="button" className="linkbtn small" style={{ alignSelf: 'flex-start' }} onClick={() => setAvecNumero(true)}>+ Recevoir les réponses sur mon numéro (facultatif)</button>
            : <div className="field"><label htmlFor="wa-tel">Votre numéro WhatsApp</label><input id="wa-tel" className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="06 12 34 56 78" value={tel} onChange={ev => setTel(ev.target.value)} /><span className="hint">Il est ajouté au lien : la réponse du remplaçant arrive directement dans votre conversation.</span></div>}
        </div>
      )}

      {etape === 1 && (
        <div className="stack">
          <p className="small muted">Voici ce que vos remplaçants reçoivent. Le bouton ouvre WhatsApp : choisissez un groupe ou une personne.</p>
          <div className="wa-fond"><div className="wa-bulle">{message.split(lien)[0]}<span className="wa-lien">{lien}</span></div></div>
          <div className="duo">
            <Btn variant="ghost" icon={Ic.copy} onClick={copier}>Copier le message</Btn>
            <LienBtn variant="ghost" href={lien}>Voir côté remplaçant</LienBtn>
          </div>
          <p className="tiny muted">Le lien complet part avec le message. La page du remplaçant est réelle : il y touche « Je suis partant(e) » et WhatsApp s’ouvre sur une réponse déjà écrite.</p>
        </div>
      )}

      {etape === 2 && <Reponses annonce={annonce} />}
    </Feuille>
  )
}

function Reponses({ annonce }: { annonce: Annonce }) {
  const monde = useMemo(() => mondeDemo(), [])
  const [n, setN] = useState(0)
  useEffect(() => {
    const t = [setTimeout(() => setN(1), 600), setTimeout(() => setN(2), 1400), setTimeout(() => setN(3), 2300)]
    return () => t.forEach(clearTimeout)
  }, [])
  const textes = ['Partant, dispo sur toute la période.', 'Partante, dès le premier jour !', 'Partant aussi, je vérifie mon planning.']
  const delais = ['il y a 2 min', 'il y a 5 min', 'il y a 9 min']
  return (
    <div className="stack">
      <p className="small muted">{n === 0 ? 'Les réponses arrivent…' : `${n} remplaçant${n > 1 ? 's sont partants' : ' est partant'} ${formatPeriode(annonce.du, annonce.au, 'phrase')} (réponses simulées).`}</p>
      <div className="stack" style={{ gap: 8 }}>
        {monde.candidats.slice(0, n).map((c, i) => (
          <div key={c.id} className="rep apparait">
            <Avatar prenom={c.prenom} nom={c.nom} />
            <div className="grow">
              <div className="rep-tete">
                <div><div className="t">{c.prenom} {c.nom}</div><div className="tiny muted">{c.ville} · {delais[i]}</div></div>
                <LienBtn petit variant="soft" href={urlWhatsApp(`Bonjour ${c.prenom}, merci pour votre réponse ! Pouvons-nous en parler ?`)}>Écrire</LienBtn>
              </div>
              <div className="small">« {textes[i]} »</div>
            </div>
          </div>
        ))}
      </div>
      {n === 3 && <Banner tone="ok" title="La mise en relation est faite, gratuitement" text="Reste à sécuriser le remplacement : contrat, signature, suivi des honoraires." />}
    </div>
  )
}
