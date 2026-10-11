import { Btn, Ic } from '../../components/ui'
import { bloc } from '../../lib/demoBlocs'
import type { BlocId } from '../../lib/demoState'
import { useDialogue } from './Feuille'

export const AVANTAGES_PREMIUM = [
  'Tout le gratuit : annonce WhatsApp, protection des données',
  'Contrat conforme et signature électronique',
  'Calcul et suivi des honoraires et des reversements',
]

/** Page de déblocage d'un bloc Premium : le moment où l'on comprend quand et comment on paie. */
export function FeuillePremium({ id, onClose, onDebloquer, onOffres }: { id: BlocId; onClose: () => void; onDebloquer: () => void; onOffres: () => void }) {
  const b = bloc(id)
  const ref = useDialogue(onClose)
  return (
    <div className="modal-bg">
      <div ref={ref} tabIndex={-1} className="modal feuille" role="dialog" aria-modal="true" aria-label="Offre Premium">
        <div className="feuille-tete">
          <span className="bloc-num verrou"><Ic.lock /></span>
          <div className="grow"><div className="eyebrow">Bloc {id} · {b.court}</div><h2>Inclus dans Premium</h2></div>
          <button type="button" className="btn ghost sm" onClick={onClose} aria-label="Fermer"><Ic.x /></button>
        </div>
        <div className="feuille-corps stack">
          <p><strong>{b.titre}</strong> : {b.promesse.charAt(0).toLowerCase() + b.promesse.slice(1)}</p>
          <ul className="plan-liste">{AVANTAGES_PREMIUM.map(a => <li key={a}><Ic.check />{a}</li>)}</ul>
          <div className="banner ok"><Ic.sparkle /><div className="grow"><div className="b-title">14 jours gratuits, sans carte bancaire</div><div className="b-text">Vous ne payez qu’à partir du jour 15 : 29 € par mois, résiliable en un tap.</div></div></div>
        </div>
        <div className="feuille-actions">
          <Btn block onClick={onDebloquer}>Essayer 14 jours gratuits</Btn>
          <Btn block variant="ghost" onClick={onOffres}>Comparer les offres</Btn>
          <button type="button" className="linkbtn small" style={{ alignSelf: 'center' }} onClick={onClose}>Plus tard</button>
        </div>
      </div>
    </div>
  )
}
