import { useEffect, useMemo, useState } from 'react'
import { Avatar, Banner, Btn, Ic, Pill } from '../../components/ui'
import { controlesDe, mondeDemo } from '../../lib/demoFixtures'
import { formatDate } from '../../lib/domain'
import { Feuille, type PropsBloc } from './Feuille'

const jourDecale = (iso: string, n: number) => new Date(new Date(iso).getTime() + n * 86_400_000).toISOString().slice(0, 10)

/** Bloc 5 (inclus pour tous) : contrôles qui bloquent, fenêtre d'accès à la fiche, protection des données. */
export function BlocConfiance({ onClose }: PropsBloc) {
  const monde = useMemo(() => mondeDemo(), [])
  const [etape, setEtape] = useState(0)
  const [verifies, setVerifies] = useState(0)
  const [lance, setLance] = useState(false)
  const [decalage, setDecalage] = useState(-10)

  useEffect(() => {
    if (!lance) return
    const t = [1, 2, 3].map(n => setTimeout(() => setVerifies(n), 450 * n))
    return () => t.forEach(clearTimeout)
  }, [lance])

  const resultats = useMemo(() => monde.candidats.map(c => controlesDe(c, monde.mission)), [monde])
  const bloques = resultats.filter(r => r.some(c => c.gravite === 'bloquant')).length
  const visible = decalage >= -7 && decalage <= 3
  const julien = monde.candidats[0]

  const actions = etape === 0
    ? (verifies < 3 ? <Btn block disabled={lance} onClick={() => setLance(true)}>Vérifier les 3 candidats</Btn> : <Btn block onClick={() => setEtape(1)}>Continuer <Ic.chevron /></Btn>)
    : etape === 1
      ? <Btn block onClick={() => setEtape(2)}>Et mes données ? <Ic.chevron /></Btn>
      : <Btn block variant="ghost" onClick={onClose}>Terminer</Btn>

  return (
    <Feuille id={5} etape={etape} total={3} onClose={onClose} actions={actions}>
      {etape === 0 && (
        <div className="stack">
          <p className="small muted">Trois remplaçants se sont proposés. Relève contrôle chaque dossier avant que vous signiez.</p>
          {monde.candidats.map((c, i) => {
            const ctl = resultats[i]
            const fait = verifies > i
            const bloquants = ctl.filter(x => x.gravite === 'bloquant')
            const attentions = ctl.filter(x => x.gravite === 'attention')
            return (
              <div key={c.id} className="candidat">
                <Avatar prenom={c.prenom} nom={c.nom} />
                <div className="grow">
                  <div className="t">{c.prenom} {c.nom} <span className="tiny muted">· {c.ville}</span></div>
                  {!fait && <div className="small muted">Dossier à vérifier</div>}
                  {fait && bloquants.length === 0 && <div className="small" style={{ color: 'var(--ok)' }}><Ic.check /> En règle : autorisation, assurance, remplacements</div>}
                  {fait && bloquants.map(b => <div key={b.titre} className="small apparait" style={{ color: 'var(--danger)' }}><Ic.alert /> {b.titre}</div>)}
                  {fait && attentions.map(b => <div key={b.titre} className="tiny apparait" style={{ color: 'var(--warn)' }}>À voir : {b.titre.toLowerCase()}</div>)}
                </div>
                {fait && <Pill tone={bloquants.length ? 'danger' : 'ok'}>{bloquants.length ? 'Bloqué' : 'Peut signer'}</Pill>}
              </div>
            )
          })}
          {verifies === 3 && <Banner tone="ok" title={`${bloques} remplacements non conformes évités`} text="Avant même la signature : plus de contrat à refaire, plus de sanction à craindre." />}
        </div>
      )}

      {etape === 1 && (
        <div className="stack">
          <p className="small muted">La fiche de passation (accès, pharmacie, consignes) n’est lisible par {julien.prenom} que pendant le remplacement. Faites glisser pour le voir.</p>
          <div className="fenetre" style={{ '--a': '20%', '--b': '86.7%' } as React.CSSProperties}>
            <div className="fenetre-piste"><span /></div>
            <input type="range" min={-10} max={5} step={1} value={decalage} onChange={ev => setDecalage(+ev.target.value)} aria-label="Jour par rapport au début du remplacement" />
            <div className="fenetre-reperes"><span>J-10</span><span>J-7</span><span>J</span><span>J+3</span><span>J+5</span></div>
          </div>
          <div className={`card ${visible ? 'ok' : ''}`} style={{ textAlign: 'center' }}>
            <div className="num" style={{ fontWeight: 700 }}>{decalage === 0 ? 'Jour J' : decalage < 0 ? `J${decalage}` : `J+${decalage}`} · {formatDate(jourDecale(monde.mission.du, decalage))}</div>
            <div style={{ marginTop: 4 }}>{visible ? <><Ic.eye /> {julien.prenom} peut lire la fiche</> : <><Ic.lock /> La fiche est masquée</>}</div>
          </div>
          <p className="tiny muted">Visible de J-7 à J+3, et seulement une fois le contrat signé des deux côtés. Aucune liste de patients n’est enregistrée.</p>
        </div>
      )}

      {etape === 2 && (
        <div className="stack">
          <ul className="coches">
            <li><Ic.shield /><span><strong>Relève ne voit jamais vos patients.</strong> Aucun nom, aucune liste de tournée n’est enregistré.</span></li>
            <li><Ic.lock /><span><strong>Fiches chiffrées,</strong> effacées automatiquement 90 jours après la fin du remplacement.</span></li>
            <li><Ic.file /><span><strong>Vos données vous appartiennent :</strong> export complet et suppression du compte en un tap.</span></li>
          </ul>
          <p className="tiny muted">Mesures développées et testées ; relecture par un avocat prévue avant l’ouverture au public. <a href="#/legal/confidentialite">Politique de confidentialité</a></p>
        </div>
      )}
    </Feuille>
  )
}
