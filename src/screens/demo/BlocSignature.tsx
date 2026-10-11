import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Banner, Btn, Ic, useToast } from '../../components/ui'
import { mondeDemo, texteContratDemo } from '../../lib/demoFixtures'
import { alerteCDOI, formatDate, formatPeriode } from '../../lib/domain'
import { Feuille, type PropsBloc } from './Feuille'

/** Bloc 3 (Premium) : le contrat réel du produit, signé d'un glissement de doigt. */
export function BlocSignature({ onClose, onAller }: PropsBloc) {
  const { toast } = useToast()
  const monde = useMemo(() => mondeDemo(), [])
  const texte = useMemo(() => texteContratDemo(monde), [monde])
  const [etape, setEtape] = useState(0)
  const [lire, setLire] = useState(false)
  const [heure] = useState(() => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
  const [julienSigne, setJulienSigne] = useState(false)
  const julien = monde.candidats[0]
  const alerte = alerteCDOI(monde.contrat, monde.mission)

  useEffect(() => {
    if (etape !== 2) return
    const t = setTimeout(() => { setJulienSigne(true); toast('Contrat signé des deux côtés', true) }, 1500)
    return () => clearTimeout(t)
  }, [etape, toast])

  const actions = etape === 0
    ? <Btn block onClick={() => setEtape(1)}>Passer à la signature <Ic.chevron /></Btn>
    : etape === 1
      ? <Btn block variant="ghost" onClick={() => setEtape(0)}>Relire le contrat</Btn>
      : (
        <>
          {julienSigne && <Btn block onClick={() => onAller(4)}>Suite : ce que je reverse à Julien <Ic.chevron /></Btn>}
          <Btn block variant={julienSigne ? 'ghost' : 'primary'} onClick={onClose}>Terminer</Btn>
        </>
      )

  return (
    <Feuille id={3} etape={etape} total={3} onClose={onClose} actions={actions}>
      {etape === 0 && (
        <div className="stack">
          <p className="small muted">Marie a choisi Julien. Le contrat est déjà rédigé avec les mentions attendues par l’Ordre.</p>
          <div className="card facts">
            <div><div className="k">Titulaire</div><div className="v">{monde.cabinet.prenom} {monde.cabinet.nom}</div></div>
            <div><div className="k">Remplaçant</div><div className="v">{julien.prenom} {julien.nom}</div></div>
            <div><div className="k">Dates</div><div className="v">{formatPeriode(monde.mission.du, monde.mission.au)}</div></div>
            <div><div className="k">Rétrocession</div><div className="v">{monde.contrat.retrocessionPct} %</div></div>
            <div><div className="k">Reversement avant le</div><div className="v">{formatDate(monde.contrat.echeanceReversement)}</div></div>
          </div>
          <Btn variant="ghost" size="sm" icon={Ic.file} onClick={() => setLire(l => !l)}>{lire ? 'Masquer le contrat' : 'Lire le contrat'}</Btn>
          {lire && <div className="contrat" tabIndex={0}>{texte}</div>}
        </div>
      )}

      {etape === 1 && (
        <div className="stack">
          <p className="small muted">Votre signature : votre nom et la date, horodatés. Pas d’impression, pas de scan.</p>
          <Glisser onSigne={() => setTimeout(() => setEtape(2), 350)} />
          <p className="tiny muted">Au clavier : appuyez sur Entrée.</p>
        </div>
      )}

      {etape === 2 && (
        <div className="stack">
          <ul className="signatures">
            <li className="ok"><Ic.check /><span><strong>{monde.cabinet.prenom} {monde.cabinet.nom}</strong> (titulaire) · signé à {heure}</span></li>
            <li className={julienSigne ? 'ok' : 'attente'}>{julienSigne ? <Ic.check /> : <Ic.clock />}<span><strong>{julien.prenom} {julien.nom}</strong> (remplaçant) · {julienSigne ? 'signé' : 'invité à signer…'}</span></li>
          </ul>
          {julienSigne && (
            <>
              <Banner tone="ok" title="Contrat signé des deux côtés" text="Signature simple, à valeur d’engagement entre confrères. La signature électronique qualifiée est prévue." />
              {alerte && <Banner tone="info" icon={Ic.calendar} title={alerte.titre} text="Relève vous le rappelle : le contrat part au conseil départemental de l’Ordre avant le premier jour." />}
            </>
          )}
        </div>
      )}
    </Feuille>
  )
}

/** Signature « glisser pour valider » : un geste de jeu, sans clavier. */
function Glisser({ onSigne }: { onSigne: () => void }) {
  const [v, setV] = useState(0)
  const [actif, setActif] = useState(false)
  const termine = useRef(false)
  const maj = (n: number) => {
    setV(n)
    if (n >= 99 && !termine.current) { termine.current = true; onSigne() }
  }
  const relacher = () => { setActif(false); if (!termine.current) setV(0) }
  return (
    <div className={`glisser ${actif ? 'actif' : ''} ${v >= 99 ? 'ok' : ''}`} style={{ '--n': v / 100 } as CSSProperties}>
      <div className="glisser-piste" aria-hidden="true"><span>{v >= 99 ? 'Signé' : 'Glissez pour signer'}</span></div>
      <input type="range" min={0} max={100} value={v} aria-label="Glissez pour signer le contrat"
        onChange={ev => maj(+ev.target.value)} onPointerDown={() => setActif(true)} onPointerUp={relacher} onPointerCancel={relacher}
        onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); maj(100) } }} />
    </div>
  )
}
