-- Relève — droits RGPD (accès/portabilité, effacement) et purge de rétention.
-- À coller dans Supabase → SQL Editor. Rejouable.

create or replace function public.rgpd_export() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  ids uuid[];
  resultat jsonb;
begin
  if uid is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  perform private.quota('rgpd_export:' || uid, 5, 86400);
  select coalesce(array_agg(compte_id), '{}') into ids from public.compte_membres where user_id = uid;
  resultat := jsonb_build_object(
    'genere_le', now(),
    'utilisateur', (select jsonb_build_object('id', u.id, 'email', u.email, 'cree_le', u.created_at) from auth.users u where u.id = uid),
    'comptes', (select coalesce(jsonb_agg(to_jsonb(c)), '[]') from public.comptes c where c.id = any (ids)),
    'pieces', (select coalesce(jsonb_agg(to_jsonb(p)), '[]') from public.pieces p where p.compte_id = any (ids)),
    'missions', (select coalesce(jsonb_agg(to_jsonb(m)), '[]') from public.missions m where m.cabinet_id = any (ids) or m.remplacant_retenu_id = any (ids)),
    'candidatures', (select coalesce(jsonb_agg(to_jsonb(c)), '[]') from public.candidatures c where c.remplacant_id = any (ids)),
    'contrats', (select coalesce(jsonb_agg(to_jsonb(k)), '[]') from public.contrats k where k.cabinet_id = any (ids) or k.remplacant_id = any (ids)),
    'lignes_retrocession', (select coalesce(jsonb_agg(to_jsonb(l)), '[]') from public.lignes_retrocession l
      join public.contrats k on k.id = l.contrat_id where k.cabinet_id = any (ids) or k.remplacant_id = any (ids)),
    'recommandations', (select coalesce(jsonb_agg(to_jsonb(r)), '[]') from public.recommandations r where r.de_id = any (ids) or r.vers_id = any (ids)),
    'invitations', (select coalesce(jsonb_agg(to_jsonb(i)), '[]') from public.invitations i where i.par_id = any (ids) or i.filleul_id = any (ids)),
    'badges', (select coalesce(jsonb_agg(to_jsonb(b)), '[]') from public.badges b where b.compte_id = any (ids)),
    'abonnement', (select coalesce(jsonb_agg(to_jsonb(s) - 'stripe_customer_id' - 'stripe_subscription_id'), '[]') from public.subscriptions s where s.cabinet_id = any (ids)),
    'fiches_tournee', (select coalesce(jsonb_agg(private.dechiffrer(f.contenu_chiffre) || jsonb_build_object('missionId', f.mission_id)), '[]')
      from public.fiches_tournee f join public.missions m on m.id = f.mission_id where m.cabinet_id = any (ids)),
    'journal_acces', (select coalesce(jsonb_agg(to_jsonb(a) order by a.le desc), '[]') from public.audit_log a where a.user_id = uid or a.compte_id = any (ids))
  );
  perform private.journaliser('export_rgpd', 'comptes', null, ids[1]);
  return resultat;
end $$;
revoke all on function public.rgpd_export() from public, anon;
grant execute on function public.rgpd_export() to authenticated;

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
      continue; -- d'autres titulaires gardent le cabinet
    elsif exists (select 1 from public.contrats where cabinet_id = c or remplacant_id = c) then
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

create or replace function private.purger() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n_fiches int; n_audit int; n_events int; n_quotas int;
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

create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'releve-purge';
select cron.schedule('releve-purge', '17 3 * * *', 'select private.purger()');
