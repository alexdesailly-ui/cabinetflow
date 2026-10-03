-- Relève — fonctions serveur appelées par les Edge Functions Stripe (service_role uniquement).

/** Limitation de débit utilisable depuis une Edge Function. */
create or replace function public.verifier_quota(cle text, max int, secondes int) returns void
language sql security definer set search_path = '' as $$
  select private.quota(cle, max, secondes)
$$;
revoke all on function public.verifier_quota(text, int, int) from public, anon, authenticated;
grant execute on function public.verifier_quota(text, int, int) to service_role;

/** Essai restant (jours) d'un cabinet : 14 jours + 30 par mois offert, depuis la création. */
create or replace function public.essai_restant_jours(cabinet uuid) returns int
language sql stable security definer set search_path = '' as $$
  select greatest(0, ceil(extract(epoch from (c.cree_le + interval '14 days' + make_interval(days => 30 * c.mois_offerts) - now())) / 86400)::int)
  from public.comptes c where c.id = cabinet and c.role = 'cabinet'
$$;
revoke all on function public.essai_restant_jours(uuid) from public, anon, authenticated;
grant execute on function public.essai_restant_jours(uuid) to service_role;

/** Le plan affiché suit l'abonnement Stripe. */
create or replace function private.plan_depuis_abonnement() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.comptes set plan = case when new.statut in ('active', 'trialing', 'past_due') then 'cabinet' else 'essai' end
  where id = new.cabinet_id and role = 'cabinet';
  return null;
end $$;
drop trigger if exists plan on public.subscriptions;
create trigger plan after insert or update of statut on public.subscriptions for each row execute function private.plan_depuis_abonnement();
