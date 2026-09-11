import { useState } from 'react'
import { Btn, Chips, Field, Ic, Modal, useToast } from '../components/ui'
import { formatDate } from '../lib/domain'

/**
 * Recueil d'avis, sans backend : l'avis reste sur l'appareil et s'envoie
 * par email ou partage. Accessible depuis « Mon compte ».
 */
interface Avis {
  id: string; le: string
  role: 'Titulaire' | 'Remplaçant' | 'Autre'; nom: string
  paierait: string[]; reco: number; manque: string; commentaire: string
}
const ETAPES = ['Le remplaçant vérifié', 'La rétrocession calculée et suivie', 'Le contrat + rappel Ordre', 'La passation de tournée', 'Le vivier et les recommandations', 'Inviter des confrères', 'Aucune']
const CLE_AVIS = 'releve:avis'
const CLE_DEST = 'releve:destinataire'
export function lireAvis(): Avis[] { try { return JSON.parse(localStorage.getItem(CLE_AVIS) ?? '[]') } catch { return [] } }

const texteAvis = (a: Avis) => `Avis Relève — ${formatDate(a.le)}
Rôle : ${a.role}${a.nom ? ` · ${a.nom}` : ''}
Paierait 29 €/mois pour : ${a.paierait.join(', ') || '—'}
Recommanderait : ${a.reco}/10
Ce qui manque : ${a.manque || '—'}
Commentaire : ${a.commentaire || '—'}`

export function Avis({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast()
  const [dest, setDest] = useState(() => { try { return localStorage.getItem(CLE_DEST) ?? '' } catch { return '' } })
  const [f, setF] = useState<Omit<Avis, 'id' | 'le'>>({ role: 'Titulaire', nom: '', paierait: [], reco: 8, manque: '', commentaire: '' })
  const enregistrer = (): Avis => {
    const a: Avis = { ...f, id: Math.random().toString(36).slice(2, 8), le: new Date().toISOString() }
    try { localStorage.setItem(CLE_AVIS, JSON.stringify([a, ...lireAvis()])); localStorage.setItem(CLE_DEST, dest) } catch { /* mode privé */ }
    setF({ role: 'Titulaire', nom: '', paierait: [], reco: 8, manque: '', commentaire: '' })
    toast('Merci. Votre avis est enregistré sur cet appareil.', true)
    return a
  }
  return (
    <Modal open={open} onClose={onClose} title="Votre avis">
      <div className="stack">
        <p className="small muted">Deux minutes. Rien n’est envoyé sans votre accord.</p>
        <Field label="Vous êtes"><Chips options={['Titulaire', 'Remplaçant', 'Autre']} value={[f.role]} onChange={v => setF({ ...f, role: (v[v.length - 1] as Avis['role']) ?? f.role })} /></Field>
        <Field label="Prénom ou cabinet (facultatif)"><input id="avis-nom" className="input" value={f.nom} onChange={ev => setF({ ...f, nom: ev.target.value })} /></Field>
        <Field label="Pour quelle étape paieriez-vous 29 € par mois ?" hint="Plusieurs réponses possibles."><Chips options={ETAPES} value={f.paierait} onChange={v => setF({ ...f, paierait: v })} /></Field>
        <Field label={`Le recommanderiez-vous à un confrère ? ${f.reco}/10`}><input id="avis-reco" type="range" className="range" min={0} max={10} value={f.reco} onChange={ev => setF({ ...f, reco: +ev.target.value })} /></Field>
        <Field label="Qu’est-ce qui manque pour que vous l’utilisiez demain ?"><textarea id="avis-manque" className="textarea" value={f.manque} onChange={ev => setF({ ...f, manque: ev.target.value })} /></Field>
        <Field label="Autre chose ?"><textarea id="avis-com" className="textarea" style={{ minHeight: 64 }} value={f.commentaire} onChange={ev => setF({ ...f, commentaire: ev.target.value })} /></Field>
        <Field label="Envoyer à (facultatif)" hint="Mémorisé sur cet appareil."><input id="avis-dest" className="input" type="email" value={dest} onChange={ev => setDest(ev.target.value)} placeholder="adresse email" /></Field>
        <div className="row">
          <Btn variant="ghost" onClick={() => { enregistrer(); onClose() }}>Enregistrer</Btn>
          <Btn variant="encre" style={{ flex: 1 }} icon={Ic.mail} onClick={() => { const a = enregistrer(); onClose(); location.href = `mailto:${dest}?subject=${encodeURIComponent('Avis Relève — ' + a.role)}&body=${encodeURIComponent(texteAvis(a))}` }}>Enregistrer et envoyer</Btn>
        </div>
      </div>
    </Modal>
  )
}

export async function partagerAvis(toast: (m: string) => void) {
  const avis = lireAvis()
  const texte = avis.map(texteAvis).join('\n\n———\n\n')
  if (navigator.share) { try { await navigator.share({ title: 'Avis Relève', text: texte }); return } catch { /* annulé */ } }
  try { await navigator.clipboard.writeText(texte); toast(`${avis.length} avis copiés`) } catch { toast('Copie impossible') }
}
