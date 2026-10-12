-- Relève — tout ce qui supprime : politiques d'écriture, effacement RGPD, purge de rétention.
--
-- Ce fichier contient des DROP et des DELETE par nature. Les outils d'exécution SQL
-- automatisés le refusent : sur un projet Supabase existant, le coller dans
-- SQL Editor → New query → Run (voir docs/exploitation.md). Il est rejouable.

/* ------------------------------------------------------------------ */
/* Politiques d'écriture : une par commande                            */
/* ------------------------------------------------------------------ */
-- Une politique « for all » s'ajoute à la politique de lecture et force Postgres à évaluer
-- les deux à chaque SELECT. La lecture reste la même : elle est déjà couverte par pieces_select
-- et lignes_select, qui englobent les membres du compte.

drop policy if exists pieces_write on public.pieces;
drop policy if exists pieces_insert on public.pieces;
create policy pieces_insert on public.pieces for insert to authenticated
  with check (private.est_membre(compte_id));
drop policy if exists pieces_update on public.pieces;
create policy pieces_update on public.pieces for update to authenticated
  using (private.est_membre(compte_id)) with check (private.est_membre(compte_id));
drop policy if exists pieces_delete on public.pieces;
create policy pieces_delete on public.pieces for delete to authenticated
  using (private.est_membre(compte_id));

drop policy if exists lignes_write on public.lignes_retrocession;
drop policy if exists lignes_insert on public.lignes_retrocession;
create policy lignes_insert on public.lignes_retrocession for insert to authenticated
  with check (private.est_cabinet_de_contrat(contrat_id));
drop policy if exists lignes_update on public.lignes_retrocession;
create policy lignes_update on public.lignes_retrocession for update to authenticated
  using (private.est_cabinet_de_contrat(contrat_id)) with check (private.est_cabinet_de_contrat(contrat_id));
drop policy if exists lignes_delete on public.lignes_retrocession;
create policy lignes_delete on public.lignes_retrocession for delete to authenticated
  using (private.est_cabinet_de_contrat(contrat_id));

/* ------------------------------------------------------------------ */
/* Effacement RGPD                                                     */
/* ------------------------------------------------------------------ */

/**
 * Un compte sans contrat est supprimé. Un compte lié à un contrat est ANONYMISÉ : le contrat
 * reste une pièce de preuve pour l'autre partie (prescription de 5 ans), mais plus aucune donnée
 * de contact n'est conservée. Un abonnement qui se renouvelle se résilie d'abord : supprimer le
 * compte ne peut pas arrêter un prélèvement chez Stripe.
 */
create or replace function public.rgpd_supprimer_mon_compte(confirmation text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  c uuid;
begin
  if uid is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if confirmation is distinct from 'SUPPRIMER' then
    raise exception 'Confirmation attendue : SUPPRIMER' using errcode = '22023';
  end if;
  for c in select compte_id from public.compte_membres where user_id = uid loop
    perform private.journaliser('suppression_rgpd', 'comptes', c::text, c);
    if exists (select 1 from public.compte_membres where compte_id = c and user_id <> uid) then
      continue; -- d'autres titulaires gardent le cabinet ; seul ce membre disparaît (cascade sur auth.users)
    end if;
    if exists (
      select 1 from public.subscriptions
      where cabinet_id = c and statut in ('trialing', 'active', 'past_due') and not cancel_at_period_end
    ) then
      raise exception 'Résiliez d''abord votre abonnement (Compte, Gérer mon abonnement)' using errcode = '55000';
    end if;
    if exists (select 1 from public.contrats where cabinet_id = c or remplacant_id = c) then
      delete from public.pieces where compte_id = c;
      delete from public.badges where compte_id = c;
      delete from public.invitations where par_id = c;
      delete from public.candidatures where remplacant_id = c and statut = 'envoyee';
      delete from public.fiches_tournee where mission_id in (select id from public.missions where cabinet_id = c);
      delete from public.missions where cabinet_id = c and statut in ('brouillon', 'publiee');
      update public.comptes set
        prenom = 'Compte', nom = 'supprimé', email = null, telephone = null, ville = '—',
        nom_cabinet = case when nom_cabinet is null then null else 'Cabinet supprimé' end,
        soins_maitrises = '{}', disponibilites = '[]', anonymise_le = now()
      where id = c;
    else
      delete from public.comptes where id = c;
    end if;
  end loop;
  delete from auth.users where id = uid;
end $$;
revoke all on function public.rgpd_supprimer_mon_compte(text) from public, anon;
grant execute on function public.rgpd_supprimer_mon_compte(text) to authenticated;

/* ------------------------------------------------------------------ */
/* Rétention                                                           */
/* ------------------------------------------------------------------ */

create or replace function private.purger() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  n_fiches int; n_audit int; n_events int; n_quotas int;
begin
  delete from public.fiches_tournee f using public.missions m
    where m.id = f.mission_id and m.au < current_date - (private.parametre('retention_fiche_jours'))::int;
  get diagnostics n_fiches = row_count;
  delete from public.audit_log where le < now() - make_interval(days => (private.parametre('retention_audit_jours'))::int);
  get diagnostics n_audit = row_count;
  delete from public.stripe_events where recu_le < now() - interval '90 days';
  get diagnostics n_events = row_count;
  delete from private.quotas where fenetre < now() - interval '2 days';
  get diagnostics n_quotas = row_count;
  return jsonb_build_object('fiches', n_fiches, 'audit', n_audit, 'stripe_events', n_events, 'quotas', n_quotas);
end $$;
revoke all on function private.purger() from public, authenticated;

-- Planification quotidienne si pg_cron est disponible (c'est le cas sur Supabase).
do $$ begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule(jobid) from cron.job where jobname = 'releve-purge';
    perform cron.schedule('releve-purge', '17 3 * * *', 'select private.purger()');
  end if;
end $$;
