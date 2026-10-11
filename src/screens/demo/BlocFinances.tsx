import { useMemo, useState } from 'react'
import { Banner, Btn, Ic, Pill, useToast } from '../../components/ui'
import { urlWhatsApp } from '../../lib/annonce'
import { basculerInteretEncaissement, useDemo } from '../../lib/demoState'
import { mondeDemo } from '../../lib/demoFixtures'
import { estimerRetrocession, euros, formatDate, formatPeriode } from '../../lib/domain'
import { Feuille, LienBtn, type PropsBloc } from './Feuille'

/** Bloc 4 (Premium) : calcul et suivi du reversement. L'encaissement automatique n'existe pas encore : on mesure l'intérêt. */
export function BlocFinances({ onClose }: PropsBloc) {
  const e = useDemo()
  const { toast } = useToast()
  const monde = useMemo(() => mondeDemo(), [])
  const { mission, contrat } = monde
  const [etape, setEtape] = useState(0)
  const [ca, setCa] = useState(() => Math.round(estimerRetrocession(mission).caPeriode / 100) * 100)
  const [reverse, setReverse] = useState(false)
  const [envoye, setEnvoye] = useState(false)
  const pct = contrat.retrocessionPct
  const aReverser = Math.round((ca * pct) / 100)
  const conserve = ca - aReverser
  const julien = monde.candidats[0]
  const numero = `${new Date().getFullYear()}-014`
  const texteReleve = `Bonjour ${julien.prenom}, voici le relevé de rétrocession ${numero} (du ${formatDate(mission.du)} au ${formatDate(mission.au)}) : honoraires encaissés ${euros(ca)}, ${pct} % soit ${euros(aReverser)} à vous reverser avant le ${formatDate(contrat.echeanceReversement)}. Merci pour ce remplacement !`

  const actions = etape === 0
    ? <Btn block onClick={() => setEtape(1)}>Générer le relevé <Ic.chevron /></Btn>
    : etape === 1
      ? (
        <>
          <LienBtn block variant={envoye || reverse ? 'ghost' : 'primary'} icon={Ic.send} href={urlWhatsApp(texteReleve)} onClick={() => setEnvoye(true)}>Envoyer le relevé à {julien.prenom}</LienBtn>
          <Btn block variant={envoye || reverse ? 'primary' : 'ghost'} onClick={() => setEtape(2)}>Et l’encaissement ? <Ic.chevron /></Btn>
        </>
      )
      : <Btn block variant="ghost" onClick={onClose}>Terminer</Btn>

  return (
    <Feuille id={4} etape={etape} total={3} onClose={onClose} actions={actions}>
      {etape === 0 && (
        <div className="stack">
          <p className="small muted">Marie encaisse les honoraires sur son compte, puis reverse sa part à Julien. Faites glisser pour saisir ce qui a été encaissé.</p>
          <div className="gros-chiffre num">{euros(ca)}</div>
          <input className="range" type="range" min={2000} max={12000} step={100} value={ca} onChange={ev => setCa(+ev.target.value)} aria-label="Honoraires encaissés sur la période" />
          <div className="grid-2">
            <div className="tile"><span className="k">À reverser à Julien ({pct} %)</span><span className="v num">{euros(aReverser)}</span></div>
            <div className="tile"><span className="k">Vous conservez</span><span className="v num">{euros(conserve)}</span></div>
          </div>
          <p className="tiny muted">Échéance du reversement : {formatDate(contrat.echeanceReversement)}. Relève vous le rappelle.</p>
        </div>
      )}

      {etape === 1 && (
        <div className="stack">
          <div className="doc">
            <div className="between"><strong>Relevé de rétrocession</strong><span className="tiny muted num">N° {numero}</span></div>
            <table><tbody>
              <tr><td>Remplaçant</td><td className="r nb">{julien.prenom} {julien.nom}</td></tr>
              <tr><td>Période</td><td className="r nb">{formatPeriode(mission.du, mission.au)}</td></tr>
              <tr><td>Honoraires encaissés</td><td className="r nb num">{euros(ca)}</td></tr>
              <tr><td>Taux de rétrocession</td><td className="r nb num">{pct} %</td></tr>
              <tr><td><strong>À reverser</strong></td><td className="r nb num"><strong>{euros(aReverser)}</strong></td></tr>
              <tr><td>Échéance</td><td className="r nb">{formatDate(contrat.echeanceReversement)}</td></tr>
            </tbody></table>
            <Pill tone={reverse ? 'ok' : 'warn'} icon={reverse ? Ic.check : Ic.clock}>{reverse ? 'Reversé' : 'À reverser'}</Pill>
          </div>
          {!reverse
            ? <Btn block variant="soft" icon={Ic.check} onClick={() => { setReverse(true); toast('Reversement noté : Julien est prévenu', true) }}>Marquer comme reversé</Btn>
            : <Banner tone="ok" title="Reversement suivi jusqu’au paiement" text="Chaque période est tracée : montant, échéance, date de paiement." />}
        </div>
      )}

      {etape === 2 && (
        <div className="stack">
          <div className="card stack" style={{ borderStyle: 'dashed' }}>
            <div className="between"><h3>Payer le remplaçant à votre place</h3><Pill tone="neutral" icon={Ic.clock}>Bientôt</Pill></div>
            <p className="small">Relève prélève la part due à l’échéance et la verse au remplaçant, via un prestataire de paiement agréé. Plus de relevé à faire, plus de virement à penser.</p>
            <p className="tiny muted">Pas encore disponible : nous mesurons l’intérêt avant de le construire.</p>
            <Btn variant={e.interetEncaissement ? 'encre' : 'ghost'} icon={e.interetEncaissement ? Ic.check : Ic.sparkle} onClick={basculerInteretEncaissement}>{e.interetEncaissement ? 'Ça m’intéresse' : 'Ça m’intéresserait'}</Btn>
          </div>
        </div>
      )}
    </Feuille>
  )
}
