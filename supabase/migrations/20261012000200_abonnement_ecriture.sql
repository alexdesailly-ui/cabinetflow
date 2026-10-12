-- Relève — écriture de l'état d'abonnement par les Edge Functions Stripe (service_role).

/**
 * Enregistre l'abonnement Stripe d'un cabinet. Le webhook et la synchronisation à la
 * sortie du paiement écrivent en même temps : le classement se fait sur l'heure de lecture
 * chez Stripe (maj_le), de sorte qu'une lecture plus ancienne ne remplace jamais une plus
 * récente. L'état final d'un ancien abonnement (résilié, expiré) ne remplace jamais celui
 * d'un abonnement en cours : un cabinet qui se réabonne ne perd pas son accès à cause d'un
 * événement tardif sur l'ancien. Renvoie vrai si la ligne a été écrite.
 */
create or replace function public.enregistrer_abonnement(ligne jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  nouvelle public.subscriptions := jsonb_populate_record(null::public.subscriptions, ligne);
  ecrites int;
begin
  insert into public.subscriptions as s select (nouvelle).*
  on conflict (cabinet_id) do update set
    stripe_customer_id = excluded.stripe_customer_id,
    stripe_subscription_id = excluded.stripe_subscription_id,
    statut = excluded.statut,
    price_id = excluded.price_id,
    intervalle = excluded.intervalle,
    trial_end = excluded.trial_end,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    maj_le = excluded.maj_le
  where s.maj_le <= excluded.maj_le
    and (
      s.stripe_subscription_id is not distinct from excluded.stripe_subscription_id
      or s.stripe_subscription_id is null
      or s.statut in ('canceled', 'incomplete', 'incomplete_expired')
      or excluded.statut not in ('canceled', 'incomplete_expired')
    );
  get diagnostics ecrites = row_count;
  return ecrites > 0;
end $$;
revoke all on function public.enregistrer_abonnement(jsonb) from public, anon, authenticated;
grant execute on function public.enregistrer_abonnement(jsonb) to service_role;
