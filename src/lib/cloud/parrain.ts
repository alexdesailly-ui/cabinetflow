import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { MODE_CLOUD } from './config'
import { supabase } from './auth'

export interface ParrainAffichable { prenom: string; nom: string; nomCabinet?: string }

/** Nom affichable du parrain d'un lien d'invitation : base locale en démo, RPC publique en mode cloud. */
export function useParrain(code?: string): ParrainAffichable | undefined {
  const e = useStore()
  const local = code ? e.accounts.find(a => a.codeParrain === code) : undefined
  const [distant, setDistant] = useState<ParrainAffichable>()
  useEffect(() => {
    if (!MODE_CLOUD || !code || local) return
    let actif = true
    supabase().rpc('parrain_par_code', { code }).then(({ data }) => {
      const p = (data as { prenom: string; nom: string; nom_cabinet: string | null }[] | null)?.[0]
      if (actif && p) setDistant({ prenom: p.prenom, nom: p.nom, nomCabinet: p.nom_cabinet ?? undefined })
    })
    return () => { actif = false }
  }, [code, local])
  return local ?? distant
}
