/**
 * Le mode cloud s'active uniquement si les deux variables sont fournies au build
 * (fichier .env.local ou secrets CI). Sans elles, l'application reste la démo
 * locale actuelle : aucune régression possible pour le lien déjà partagé.
 */
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ''
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''
export const MODE_CLOUD = SUPABASE_URL.startsWith('https://') || SUPABASE_URL.startsWith('http://localhost') || SUPABASE_URL.startsWith('http://127.0.0.1')
  ? SUPABASE_ANON_KEY.length > 20
  : false
