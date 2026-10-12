/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** « oui » active le produit complet (comptes, remplacements, contrat, honoraires). */
  readonly VITE_PRODUIT_COMPLET?: string
  /** Adresse où le public écrit ses remarques. */
  readonly VITE_CONTACT_EMAIL?: string
}
