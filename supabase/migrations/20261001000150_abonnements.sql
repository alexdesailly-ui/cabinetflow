-- Abonnements Stripe, synchronisés UNIQUEMENT par le webhook (service_role).
-- Les utilisateurs lisent l'état de leur cabinet, n'écrivent jamais.

create table if not exists public.subscriptions (
  cabinet_id uuid primary key references public.comptes (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  statut text not null default 'incomplete' check (statut in (
    'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused'
  )),
  price_id text,
  intervalle text check (intervalle is null or intervalle in ('month', 'year')),
  trial_end timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  maj_le timestamptz not null default now()
);

/** Idempotence des webhooks : un événement Stripe n'est traité qu'une fois. */
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  recu_le timestamptz not null default now()
);
