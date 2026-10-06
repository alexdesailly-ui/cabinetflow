-- Fonctions utilisées par les Edge Functions Stripe.
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

rollback;
