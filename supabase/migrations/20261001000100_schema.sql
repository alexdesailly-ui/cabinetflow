-- Relève — schéma initial.
-- Objet central : la MISSION (un besoin de remplacement). Tout gravite autour :
-- candidatures, contrat, lignes de rétrocession, fiche de passation.
-- Les noms reprennent le vocabulaire de src/lib/types.ts, en snake_case.
-- Rejouable : chaque objet est créé « if not exists » ou remplacé.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

/* ------------------------------------------------------------------ */
/* Comptes : un compte = un cabinet ou un remplaçant (le « tenant »)   */
/* ------------------------------------------------------------------ */

create table if not exists public.comptes (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('cabinet', 'remplacant')),
  cree_le timestamptz not null default now(),

  prenom text not null check (char_length(prenom) between 1 and 80),
  nom text not null check (char_length(nom) between 1 and 80),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  telephone text check (telephone is null or char_length(telephone) <= 30),
  ville text not null check (char_length(ville) between 1 and 120),
  code_postal text not null check (code_postal ~ '^[0-9]{5}$'),
  departement text generated always as (left(code_postal, 2)) stored,

  -- Cabinet
  nom_cabinet text check (nom_cabinet is null or char_length(nom_cabinet) <= 160),
  nb_titulaires int check (nb_titulaires is null or nb_titulaires between 1 and 50),
  patients_tournee int check (patients_tournee is null or patients_tournee between 0 and 500),
  ca_journalier_moyen int check (ca_journalier_moyen is null or ca_journalier_moyen between 0 and 20000),

  -- Remplaçant
  rayon_km int check (rayon_km is null or rayon_km between 0 and 1000),
  vehicule boolean,
  annees_experience int check (annees_experience is null or annees_experience between 0 and 60),
  soins_maitrises text[] not null default '{}',
  disponibilites jsonb not null default '[]' check (jsonb_typeof(disponibilites) = 'array'),

  -- Parrainage et abonnement : jamais modifiables directement par l'utilisateur
  code_parrain text not null unique check (code_parrain ~ '^[A-Z]{1,6}-[A-Z0-9]{3,6}$'),
  parraine_par text references public.comptes (code_parrain) on update cascade on delete set null,
  plan text not null default 'essai' check (plan in ('essai', 'cabinet', 'gratuit')),
  mois_offerts int not null default 0 check (mois_offerts between 0 and 120),

  -- RGPD : un compte supprimé dont les contrats doivent être conservés est anonymisé
  anonymise_le timestamptz
);
create index if not exists comptes_role_dep_idx on public.comptes (role, departement);
create index if not exists comptes_parraine_par_idx on public.comptes (parraine_par);

/** Qui (utilisateur authentifié) agit pour quel compte. Un cabinet de groupe = plusieurs membres. */
create table if not exists public.compte_membres (
  compte_id uuid not null references public.comptes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'titulaire' check (role in ('titulaire', 'admin')),
  ajoute_le timestamptz not null default now(),
  primary key (compte_id, user_id)
);
create index if not exists compte_membres_user_idx on public.compte_membres (user_id);

/** Dossier de confiance du remplaçant. */
create table if not exists public.pieces (
  id uuid primary key default gen_random_uuid(),
  compte_id uuid not null references public.comptes (id) on delete cascade,
  key text not null check (key in ('diplome', 'ordre', 'autorisation', 'rcp', 'urssaf', 'cps', 'rib')),
  reference text check (reference is null or char_length(reference) <= 120),
  expire_le date,
  fournie_le timestamptz,
  unique (compte_id, key)
);

/* ------------------------------------------------------------------ */
/* Mission : l'objet central                                           */
/* ------------------------------------------------------------------ */

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid not null references public.comptes (id) on delete cascade,
  motif text not null check (motif in ('Congés', 'Maladie', 'Formation', 'Maternité / paternité', 'Renfort d’activité')),
  du date not null,
  au date not null,
  jours_travailles int not null check (jours_travailles between 1 and 366),
  dimanches_feries int not null default 0 check (dimanches_feries >= 0),
  ca_journalier int not null check (ca_journalier between 0 and 20000),
  retrocession_pct numeric(5, 2) not null check (retrocession_pct between 0 and 100),
  patients_jour int not null default 0 check (patients_jour between 0 and 500),
  km_jour int not null default 0 check (km_jour between 0 and 2000),
  horaires text not null default '' check (char_length(horaires) <= 200),
  soins_requis text[] not null default '{}',
  vehicule_fourni boolean not null default false,
  logement_fourni boolean not null default false,
  commentaire text check (commentaire is null or char_length(commentaire) <= 4000),
  statut text not null default 'brouillon' check (statut in ('brouillon', 'publiee', 'pourvue', 'terminee')),
  publiee_le timestamptz,
  remplacant_retenu_id uuid references public.comptes (id) on delete set null,
  invites_directs text[] not null default '{}',
  cree_le timestamptz not null default now(),
  check (au >= du),
  check (dimanches_feries <= jours_travailles),
  check (jours_travailles <= (au - du) + 1)
);
create index if not exists missions_cabinet_idx on public.missions (cabinet_id);
create index if not exists missions_statut_du_idx on public.missions (statut, du);
create index if not exists missions_retenu_idx on public.missions (remplacant_retenu_id);

create table if not exists public.candidatures (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions (id) on delete cascade,
  remplacant_id uuid not null references public.comptes (id) on delete cascade,
  message text not null default '' check (char_length(message) <= 2000),
  envoyee_le timestamptz not null default now(),
  statut text not null default 'envoyee' check (statut in ('envoyee', 'retenue', 'ecartee')),
  unique (mission_id, remplacant_id)
);
create index if not exists candidatures_remplacant_idx on public.candidatures (remplacant_id);

create table if not exists public.contrats (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null unique references public.missions (id) on delete cascade,
  cabinet_id uuid not null references public.comptes (id) on delete cascade,
  remplacant_id uuid not null references public.comptes (id) on delete cascade,
  cree_le timestamptz not null default now(),
  retrocession_pct numeric(5, 2) not null check (retrocession_pct between 0 and 100),
  echeance_reversement date not null,
  clause_non_concurrence boolean not null default false,
  -- { parId, le, saisie } : signature simple, à valeur d'engagement
  signature_titulaire jsonb check (signature_titulaire is null or (signature_titulaire ? 'parId' and signature_titulaire ? 'saisie')),
  signature_remplacant jsonb check (signature_remplacant is null or (signature_remplacant ? 'parId' and signature_remplacant ? 'saisie')),
  transmis_cdoi_le timestamptz,
  check (cabinet_id <> remplacant_id)
);
create index if not exists contrats_cabinet_idx on public.contrats (cabinet_id);
create index if not exists contrats_remplacant_idx on public.contrats (remplacant_id);

create table if not exists public.lignes_retrocession (
  id uuid primary key default gen_random_uuid(),
  contrat_id uuid not null references public.contrats (id) on delete cascade,
  libelle text not null check (char_length(libelle) between 1 and 200),
  du date not null,
  au date not null,
  ca_encaisse numeric(10, 2) not null check (ca_encaisse >= 0),
  pct numeric(5, 2) not null check (pct between 0 and 100),
  echeance date not null,
  payee_le timestamptz,
  check (au >= du)
);
create index if not exists lignes_contrat_idx on public.lignes_retrocession (contrat_id);

/** Une recommandation n'existe que si un contrat signé lie les deux comptes. */
create table if not exists public.recommandations (
  id uuid primary key default gen_random_uuid(),
  contrat_id uuid not null references public.contrats (id) on delete cascade,
  de_id uuid not null references public.comptes (id) on delete cascade,
  vers_id uuid not null references public.comptes (id) on delete cascade,
  note int not null check (note between 1 and 5),
  texte text not null check (char_length(texte) between 10 and 2000),
  le timestamptz not null default now(),
  unique (contrat_id, de_id),
  check (de_id <> vers_id)
);
create index if not exists recos_vers_idx on public.recommandations (vers_id);

/**
 * Fiche de passation. Contient potentiellement des DONNÉES DE SANTÉ
 * (initiales + rue + soins) et des secrets d'accès (codes) : stockée
 * chiffrée, jamais lisible directement, uniquement via fiche_lire().
 */
create table if not exists public.fiches_tournee (
  mission_id uuid primary key references public.missions (id) on delete cascade,
  contenu_chiffre bytea not null,
  nb_patients int not null default 0,
  maj_le timestamptz not null default now(),
  maj_par uuid references auth.users (id) on delete set null
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  par_id uuid not null references public.comptes (id) on delete cascade,
  nom text not null check (char_length(nom) between 1 and 160),
  canal text not null check (canal in ('sms', 'whatsapp', 'email', 'lien', 'qr')),
  le timestamptz not null default now(),
  filleul_id uuid references public.comptes (id) on delete set null,
  actif_le timestamptz
);
create index if not exists invitations_par_idx on public.invitations (par_id);
create index if not exists invitations_filleul_idx on public.invitations (filleul_id);

create table if not exists public.badges (
  compte_id uuid not null references public.comptes (id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9-]{2,40}$'),
  le timestamptz not null default now(),
  primary key (compte_id, key)
);

/* ------------------------------------------------------------------ */
/* Journal d'audit (RGPD : traçabilité des accès et modifications)     */
/* ------------------------------------------------------------------ */

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  le timestamptz not null default now(),
  user_id uuid,
  compte_id uuid,
  action text not null,
  cible_table text,
  cible_id text,
  -- Noms des colonnes modifiées, jamais les valeurs (pas de copie de données sensibles)
  details jsonb not null default '{}'
);
create index if not exists audit_compte_le_idx on public.audit_log (compte_id, le desc);
create index if not exists audit_le_idx on public.audit_log (le);

/* ------------------------------------------------------------------ */
/* Limitation de débit (anti-abus des RPC sensibles)                   */
/* ------------------------------------------------------------------ */

create table if not exists private.quotas (
  cle text not null,
  fenetre timestamptz not null,
  compteur int not null default 0,
  primary key (cle, fenetre)
);
