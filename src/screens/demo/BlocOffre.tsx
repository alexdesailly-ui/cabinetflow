import { useEffect, useState } from 'react'
import { Banner, Btn, Ic, Pill, useToast } from '../../components/ui'
import { choisirOffre, definirPrix, definirProfil, JOURS_ESSAI, useDemo, type Prix, type Profil } from '../../lib/demoState'
import { Feuille, type PropsBloc } from './Feuille'
import { AVANTAGES_PREMIUM } from './Premium'

const CODE = '482917'
const PRIX_LIBELLES: { id: Prix; libelle: string }[] = [{ id: 'cher', libelle: 'Trop cher' }, { id: 'correct', libelle: 'Correct' }, { id: 'bon', libelle: 'Bon marché' }]

/** Bloc 2 : création du compte (simulée) puis choix de l'offre. `etapeInitiale` = 2 ouvre directement les offres. */
export function BlocOffre({ onClose, etapeInitiale = 0 }: PropsBloc & { etapeInitiale?: number }) {
  const e = useDemo()
  const { toast } = useToast()
  const [etape, setEtape] = useState(etapeInitiale)
  const [annuel, setAnnuel] = useState(false)
  const [envoye, setEnvoye] = useState(etapeInitiale >= 2)
  const [code, setCode] = useState<string[]>(etapeInitiale >= 2 ? CODE.split('') : [])
  const profil: Profil = e.profil ?? 'Titulaire'
  const essai = e.offre === 'essai'

  useEffect(() => {
    if (!envoye || code.length === CODE.length) return
    const ids = CODE.split('').map((c, i) => setTimeout(() => setCode(prev => (prev.length === i ? [...prev, c] : prev)), 300 * (i + 1)))
    return () => ids.forEach(clearTimeout)
  }, [envoye, code.length])

  const compteCree = code.length === CODE.length
  const actions = etape === 0
    ? <Btn block onClick={() => setEtape(1)}>Continuer <Ic.chevron /></Btn>
    : etape === 1
      ? (compteCree ? <Btn block onClick={() => setEtape(2)}>Choisir mon offre <Ic.chevron /></Btn> : <Btn block disabled={envoye} onClick={() => setEnvoye(true)}>Recevoir mon code</Btn>)
      : <Btn block variant="ghost" onClick={onClose}>Terminer</Btn>

  return (
    <Feuille id={2} etape={etape} total={3} onClose={onClose} actions={actions}>
      {etape === 0 && (
        <div className="stack">
          <p className="small muted">Deux questions, trois taps. Pas de mot de passe.</p>
          <div className="roles" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {(['Titulaire', 'Remplaçant'] as Profil[]).map(p => (
              <button key={p} type="button" className="role" aria-pressed={profil === p} style={profil === p ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : undefined} onClick={() => definirProfil(p)}>
                <span className="t">{p === 'Titulaire' ? <Ic.briefcase /> : <Ic.users />} {p === 'Titulaire' ? 'Titulaire' : 'Remplaçant·e'}</span>
                <span className="d">{p === 'Titulaire' ? 'Je cherche un remplaçant.' : 'Je remplace des confrères.'}</span>
              </button>
            ))}
          </div>
          <p className="tiny muted">Remplaçant·e : Relève est gratuit, toujours.</p>
        </div>
      )}

      {etape === 1 && (
        <div className="stack">
          <p className="small muted">On vous envoie un code à 6 chiffres par e-mail : il remplace le mot de passe.</p>
          <div className="input" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-2)' }}>marie.dubois@exemple.fr</div>
          <div className="code" aria-live="polite" aria-label="Code de connexion">{Array.from({ length: CODE.length }, (_, i) => <span key={i} className={code[i] ? 'plein' : ''}>{code[i] ?? ''}</span>)}</div>
          {compteCree
            ? <Banner tone="ok" title="Compte créé : bienvenue Marie" text="Vous démarrez en version gratuite." />
            : <p className="tiny muted">Simulation : aucun e-mail n’est envoyé.</p>}
        </div>
      )}

      {etape === 2 && (
        <div className="stack">
          {essai
            ? <Banner tone="ok" title={`Essai Premium en cours · ${JOURS_ESSAI} jours offerts`} text="La carte ne vous sera demandée qu’au jour 15." />
            : <p className="small muted">Vous êtes en version gratuite. Premium s’essaie 14 jours, sans carte.</p>}
          <div className="segment" role="group" aria-label="Facturation" style={{ alignSelf: 'flex-start' }}>
            <button type="button" className={!annuel ? 'on' : ''} onClick={() => setAnnuel(false)}>Mensuel</button>
            <button type="button" className={annuel ? 'on' : ''} onClick={() => setAnnuel(true)}>Annuel · 2 mois offerts</button>
          </div>
          <div className="plans">
            <div className={`plan ${!essai ? 'actuel' : ''}`}>
              <div className="between"><h3>Gratuit</h3>{!essai && <Pill tone="neutral">Votre offre</Pill>}</div>
              <div className="plan-prix">0 €</div>
              <ul className="plan-liste"><li><Ic.check />Annoncer sur WhatsApp, voir qui est partant</li><li><Ic.check />Conformité et protection des données</li></ul>
              {essai && <Btn block variant="ghost" onClick={() => choisirOffre('gratuite')}>Revenir au gratuit</Btn>}
            </div>
            <div className={`plan reco ${essai ? 'actuel' : ''}`}>
              <div className="between"><h3>Premium</h3>{essai ? <Pill tone="ok">Essai en cours</Pill> : <Pill tone="accent">{JOURS_ESSAI} jours offerts</Pill>}</div>
              <div className="plan-prix">{annuel ? '24 €' : '29 €'}<span> / mois</span></div>
              <div className="tiny muted">{annuel ? '290 € facturés par an, soit 2 mois offerts' : 'Sans engagement, résiliable en un tap'}</div>
              <ul className="plan-liste">{AVANTAGES_PREMIUM.map(a => <li key={a}><Ic.check />{a}</li>)}</ul>
              {!essai && <Btn block onClick={() => { choisirOffre('essai'); toast('Premium débloqué : les blocs 3 et 4 sont ouverts', true) }}>Essayer {JOURS_ESSAI} jours gratuits</Btn>}
            </div>
          </div>
          <p className="small">Un jour sans remplaçant, c’est environ <strong>480 €</strong> de chiffre d’affaires perdu <span className="muted">(exemple)</span>. Premium : {annuel ? '24' : '29'} € par mois.</p>
          <div className="stack" style={{ gap: 6 }}>
            <div className="eyebrow">Quand est-ce que je paie ?</div>
            <ol className="tl">
              <li><b>Aujourd’hui · 0 €</b><span>L’annonce WhatsApp est gratuite, sans limite.</span></li>
              <li><b>Quand je veux sécuriser · {JOURS_ESSAI} jours offerts</b><span>Contrat, signature, suivi : essai sans carte.</span></li>
              <li><b>Jour 15 · {annuel ? '290 € par an' : '29 € par mois'}</b><span>Paiement par carte, sécurisé. Arrêt en un tap dans « Mon compte ».</span></li>
            </ol>
          </div>
          <div className="field"><label>Ce prix vous semble…</label>
            <div className="chips">{PRIX_LIBELLES.map(p => <button key={p.id} type="button" className={`chip ${e.prix === p.id ? 'on' : ''}`} aria-pressed={e.prix === p.id} onClick={() => definirPrix(p.id)}>{p.libelle}</button>)}</div>
            <span className="hint">Prix indicatif, en cours de test : votre avis le fixe.</span>
          </div>
        </div>
      )}
    </Feuille>
  )
}
