-- Fonctions utilisées par les Edge Functions Stripe et état d'abonnement.
begin;

select tests.connecter(1);
select tests.refuse($$select public.verifier_quota('x', 1, 60)$$, 'quota réservé au service', 'permission denied');
select tests.refuse($$select public.essai_restant_jours('10000000-0000-4000-a000-000000000001')$$, 'essai restant réservé au service', 'permission denied');

select tests.systeme();
-- Marie : créée il y a 10 jours, 1 mois offert → 14 + 30 - 10 = 34 jours
select tests.egal(public.essai_restant_jours('10000000-0000-4000-a000-000000000001'), 34, 'essai restant de Marie : 34 jours');
select tests.egal(public.essai_restant_jours('10000000-0000-4000-a000-000000000003'), 0, 'essai de Karim terminé');
select tests.ok(public.essai_restant_jours('20000000-0000-4000-a000-000000000001') is null, 'pas d''essai pour un remplaçant');

insert into public.subscriptions (cabinet_id, stripe_customer_id, statut) values ('10000000-0000-4000-a000-000000000003', 'cus_karim', 'active');
select tests.egal((select plan from public.comptes where id = '10000000-0000-4000-a000-000000000003'), 'cabinet', 'abonnement actif → plan cabinet');
update public.subscriptions set statut = 'canceled' where cabinet_id = '10000000-0000-4000-a000-000000000003';
select tests.egal((select plan from public.comptes where id = '10000000-0000-4000-a000-000000000003'), 'essai', 'abonnement résilié → plan essai');

insert into public.stripe_events (id, type) values ('evt_1', 'x');
select tests.refuse($$insert into public.stripe_events (id, type) values ('evt_1', 'x')$$, 'un événement Stripe n''est enregistré qu''une fois', 'duplicate');

-- Écriture de l'abonnement : réservée au service, classée par heure de lecture chez Stripe
select tests.systeme();
create function pg_temp.abo(abonnement text, statut text, lu interval, cabinet uuid default '10000000-0000-4000-a000-000000000002') returns jsonb
language sql as $$
  select jsonb_build_object('cabinet_id', cabinet, 'stripe_customer_id', 'cus_sophie', 'stripe_subscription_id', abonnement,
    'statut', statut, 'cancel_at_period_end', false, 'maj_le', now() - lu)
$$;

select tests.connecter(2);
select tests.refuse($$select public.enregistrer_abonnement('{}')$$, 'écriture d''abonnement réservée au service', 'permission denied');

select tests.service();
select tests.egal(public.enregistrer_abonnement(pg_temp.abo('sub_a', 'incomplete', interval '10 minutes')), true, 'première lecture : ligne créée');
select tests.egal(public.enregistrer_abonnement(pg_temp.abo('sub_a', 'active', interval '5 minutes')), true, 'lecture plus récente : ligne remplacée');
select tests.egal((select plan from public.comptes where id = '10000000-0000-4000-a000-000000000002'), 'cabinet', 'abonnement actif → plan cabinet');
select tests.egal(public.enregistrer_abonnement(pg_temp.abo('sub_a', 'incomplete', interval '8 minutes')), false, 'lecture plus ancienne : ignorée');
select tests.egal((select statut from public.subscriptions where cabinet_id = '10000000-0000-4000-a000-000000000002'), 'active', 'l''état récent est conservé');

select tests.egal(public.enregistrer_abonnement(pg_temp.abo('sub_b', 'trialing', interval '4 minutes')), true, 'nouvel abonnement en cours : remplace le précédent');
select tests.egal(public.enregistrer_abonnement(pg_temp.abo('sub_a', 'canceled', interval '1 minute')), false, 'résiliation tardive de l''ancien abonnement : ignorée');
select tests.egal((select stripe_subscription_id || ' ' || statut from public.subscriptions where cabinet_id = '10000000-0000-4000-a000-000000000002'), 'sub_b trialing',
  'le cabinet garde l''accès de son abonnement en cours');
select tests.egal(public.enregistrer_abonnement(pg_temp.abo('sub_b', 'canceled', interval '0')), true, 'résiliation de l''abonnement en cours : enregistrée');
select tests.egal((select plan from public.comptes where id = '10000000-0000-4000-a000-000000000002'), 'essai', 'abonnement résilié → plan essai');
select tests.egal(public.enregistrer_abonnement(pg_temp.abo('sub_c', 'active', interval '0')), true, 'réabonnement après résiliation : accepté');

select tests.egal(public.enregistrer_abonnement(jsonb_build_object('cabinet_id', '10000000-0000-4000-a000-000000000001', 'stripe_customer_id', 'cus_marie',
  'statut', 'incomplete', 'cancel_at_period_end', false, 'maj_le', 'epoch'::timestamptz)), true, 'client créé avant le paiement : ligne provisoire');
select tests.egal(public.enregistrer_abonnement(pg_temp.abo('sub_m', 'active', interval '0') || '{"cabinet_id": "10000000-0000-4000-a000-000000000001", "stripe_customer_id": "cus_marie"}'), true,
  'la ligne provisoire est remplacée par le premier abonnement');

rollback;
