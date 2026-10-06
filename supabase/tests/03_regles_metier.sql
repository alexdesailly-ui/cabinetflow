-- Les règles qui protègent un remplacement sont tenues par le SERVEUR, pas par l'écran.
begin;

-- Candidature -----------------------------------------------------------
select tests.connecter(13); -- Thomas
select tests.refuse($$insert into public.candidatures (mission_id, remplacant_id, message)
  values ('30000000-0000-4000-a000-000000000003', '20000000-0000-4000-a000-000000000003', 'x')$$,
  'pas de candidature sur un brouillon');
select tests.refuse($$insert into public.candidatures (mission_id, remplacant_id, message)
  values ('30000000-0000-4000-a000-000000000004', '20000000-0000-4000-a000-000000000001', 'x')$$,
  'Thomas ne candidate pas au nom de Julien');
select tests.refuse($$insert into public.candidatures (mission_id, remplacant_id, message, statut)
  values ('30000000-0000-4000-a000-000000000004', '20000000-0000-4000-a000-000000000003', 'Disponible', 'retenue')$$,
  'le client ne choisit pas le statut d''une candidature');
insert into public.candidatures (mission_id, remplacant_id, message)
  values ('30000000-0000-4000-a000-000000000004', '20000000-0000-4000-a000-000000000003', 'Disponible');
select tests.egal((select statut from public.candidatures where mission_id = '30000000-0000-4000-a000-000000000004' and remplacant_id = '20000000-0000-4000-a000-000000000003'),
  'envoyee', 'une candidature naît « envoyée », quoi qu''envoie le client');
select tests.connecter(12); -- Amina
select tests.refuse($$update public.candidatures set statut = 'retenue'
  where mission_id = '30000000-0000-4000-a000-000000000001' and remplacant_id = '20000000-0000-4000-a000-000000000002'$$,
  'un remplaçant ne se retient pas lui-même', 'statut');

-- Retenir et contracter -------------------------------------------------
select tests.connecter(1); -- Marie
select tests.refuse($$update public.missions set remplacant_retenu_id = '20000000-0000-4000-a000-000000000004'
  where id = '30000000-0000-4000-a000-000000000001'$$, 'on ne retient qu''un candidat', 'candidat');
update public.missions set remplacant_retenu_id = '20000000-0000-4000-a000-000000000003', statut = 'pourvue'
  where id = '30000000-0000-4000-a000-000000000001';
select tests.refuse($$insert into public.contrats (mission_id, cabinet_id, remplacant_id, retrocession_pct, echeance_reversement)
  values ('30000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001', 85, current_date + 60)$$,
  'le contrat lie le remplaçant RETENU, pas un autre');
select tests.refuse($$insert into public.contrats (id, mission_id, cabinet_id, remplacant_id, retrocession_pct, echeance_reversement, signature_titulaire)
  values ('40000000-0000-4000-a000-0000000000aa', '30000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001',
          '20000000-0000-4000-a000-000000000003', 85, current_date + 60,
          '{"parId":"10000000-0000-4000-a000-000000000001","saisie":"Marie Dubois"}')$$,
  'un contrat ne peut pas naître déjà signé');
insert into public.contrats (id, mission_id, cabinet_id, remplacant_id, retrocession_pct, echeance_reversement)
  values ('40000000-0000-4000-a000-0000000000aa', '30000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001',
          '20000000-0000-4000-a000-000000000003', 85, current_date + 60);

-- Thomas n'a pas de RCP : aucune signature possible
select tests.refuse($$update public.contrats set signature_titulaire = '{"parId":"10000000-0000-4000-a000-000000000001","saisie":"Marie Dubois"}'
  where id = '40000000-0000-4000-a000-0000000000aa'$$, 'signature bloquée : remplaçant sans RCP', 'RCP');

-- Julien : dossier complet. On rejoue le parcours avec lui sur la mission de Karim.
select tests.connecter(11);
insert into public.candidatures (mission_id, remplacant_id, message) values ('30000000-0000-4000-a000-000000000005', '20000000-0000-4000-a000-000000000001', 'Dispo');
select tests.connecter(3); -- Karim
update public.missions set remplacant_retenu_id = '20000000-0000-4000-a000-000000000001', statut = 'pourvue' where id = '30000000-0000-4000-a000-000000000005';
insert into public.contrats (id, mission_id, cabinet_id, remplacant_id, retrocession_pct, echeance_reversement)
  values ('40000000-0000-4000-a000-0000000000bb', '30000000-0000-4000-a000-000000000005', '10000000-0000-4000-a000-000000000003',
          '20000000-0000-4000-a000-000000000001', 85, current_date + 70);
select tests.refuse($$update public.contrats set signature_remplacant = '{"parId":"20000000-0000-4000-a000-000000000001","saisie":"Julien Morel"}'
  where id = '40000000-0000-4000-a000-0000000000bb'$$, 'le cabinet ne signe pas à la place du remplaçant', 'Signature remplaçant');
update public.contrats set signature_titulaire = '{"parId":"10000000-0000-4000-a000-000000000003","saisie":"Karim Benali","le":"2000-01-01"}'
  where id = '40000000-0000-4000-a000-0000000000bb';
select tests.ok((select (signature_titulaire ->> 'le')::timestamptz > now() - interval '1 minute' from public.contrats where id = '40000000-0000-4000-a000-0000000000bb'),
  'la date de signature est posée par le serveur (anti-antidatage)');
select tests.refuse($$update public.contrats set retrocession_pct = 70 where id = '40000000-0000-4000-a000-0000000000bb'$$,
  'les termes ne changent plus après une signature', 'termes');

select tests.systeme();
select tests.egal((select mois_offerts from public.comptes where id = '10000000-0000-4000-a000-000000000001'), 1, 'Marie : 1 mois offert avant');
select tests.connecter(11);
select tests.refuse($$update public.contrats set signature_titulaire = '{"parId":"20000000-0000-4000-a000-000000000001","saisie":"x"}'
  where id = '40000000-0000-4000-a000-0000000000bb'$$, 'le remplaçant ne signe pas pour le cabinet');
update public.contrats set signature_remplacant = '{"parId":"20000000-0000-4000-a000-000000000001","saisie":"Julien Morel"}'
  where id = '40000000-0000-4000-a000-0000000000bb';
select tests.systeme();
select tests.ok((select actif_le is not null from public.invitations where filleul_id = '20000000-0000-4000-a000-000000000001'),
  'parrainage : Julien (filleul de Marie) devient actif à sa première signature');
select tests.egal((select mois_offerts from public.comptes where id = '10000000-0000-4000-a000-000000000001'), 2,
  'parrainage : Marie gagne un mois, calculé côté serveur');

-- Transmission à l'Ordre : cabinet uniquement
select tests.connecter(11);
select tests.refuse($$update public.contrats set transmis_cdoi_le = now() where id = '40000000-0000-4000-a000-0000000000bb'$$,
  'seul le cabinet déclare la transmission à l''Ordre');
select tests.connecter(3);
update public.contrats set transmis_cdoi_le = '2000-01-01' where id = '40000000-0000-4000-a000-0000000000bb';
select tests.ok((select transmis_cdoi_le > now() - interval '1 minute' from public.contrats where id = '40000000-0000-4000-a000-0000000000bb'),
  'date de transmission posée par le serveur');

-- Autorisation expirée avant la fin : Amina sur l'été de Marie (autorisation à J+38, fin à J+52)
select tests.systeme();
update public.pieces set fournie_le = now() where compte_id = '20000000-0000-4000-a000-000000000002';
select tests.connecter(1);
update public.missions set remplacant_retenu_id = '20000000-0000-4000-a000-000000000002' where id = '30000000-0000-4000-a000-000000000001';
select tests.refuse($$delete from public.contrats where id = '40000000-0000-4000-a000-0000000000aa'$$, 'un contrat ne se supprime pas depuis l''application');
select tests.systeme();
delete from public.contrats where id = '40000000-0000-4000-a000-0000000000aa';
select tests.connecter(1);
insert into public.contrats (id, mission_id, cabinet_id, remplacant_id, retrocession_pct, echeance_reversement)
  values ('40000000-0000-4000-a000-0000000000cc', '30000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001',
          '20000000-0000-4000-a000-000000000002', 85, current_date + 60);
select tests.refuse($$update public.contrats set signature_titulaire = '{"parId":"10000000-0000-4000-a000-000000000001","saisie":"Marie Dubois"}'
  where id = '40000000-0000-4000-a000-0000000000cc'$$, 'signature bloquée : autorisation expirée avant la fin du remplacement', 'Autorisation');

-- Recommandations : seulement après un contrat signé entre les deux
select tests.connecter(13);
select tests.refuse($$insert into public.recommandations (contrat_id, de_id, vers_id, note, texte)
  values ('40000000-0000-4000-a000-000000000002', '20000000-0000-4000-a000-000000000003', '10000000-0000-4000-a000-000000000001', 5, 'Super cabinet, je recommande')$$,
  'pas de faux avis : Thomas n''a pas de contrat avec Marie', 'row-level security');
select tests.connecter(11);
insert into public.recommandations (contrat_id, de_id, vers_id, note, texte)
  values ('40000000-0000-4000-a000-000000000002', '20000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 5, 'Cabinet très bien organisé.');
select tests.ok(true, 'Julien recommande Marie après leur contrat signé');

-- Rétrocession : le cabinet saisit, le remplaçant consulte
with u as (update public.lignes_retrocession set payee_le = now() where contrat_id = '40000000-0000-4000-a000-000000000002' returning 1)
select tests.egal((select count(*) from u), 0::bigint, 'le remplaçant ne marque pas lui-même une ligne comme payée');
select tests.egal((select count(*) from public.lignes_retrocession where contrat_id = '40000000-0000-4000-a000-000000000002'), 2::bigint,
  'le remplaçant voit les lignes de son contrat');

-- Feature-gating serveur ------------------------------------------------
select tests.connecter(3); -- Karim : essai terminé, pas d'abonnement
select tests.refuse($$insert into public.missions (cabinet_id, motif, du, au, jours_travailles, ca_journalier, retrocession_pct, statut)
  values ('10000000-0000-4000-a000-000000000003', 'Congés', current_date + 10, current_date + 12, 3, 400, 85, 'publiee')$$,
  'gating : essai expiré sans abonnement → publication refusée', 'row-level security');
insert into public.missions (cabinet_id, motif, du, au, jours_travailles, ca_journalier, retrocession_pct, statut)
  values ('10000000-0000-4000-a000-000000000003', 'Congés', current_date + 10, current_date + 12, 3, 400, 85, 'brouillon');
select tests.ok(true, 'gating : un brouillon reste possible (on ne bloque pas la préparation)');
select tests.connecter(4); -- Claire : abonnement actif
insert into public.missions (cabinet_id, motif, du, au, jours_travailles, ca_journalier, retrocession_pct, statut)
  values ('10000000-0000-4000-a000-000000000004', 'Congés', current_date + 10, current_date + 12, 3, 400, 85, 'publiee');
select tests.ok(true, 'gating : abonnement actif → publication acceptée');
select tests.connecter(1); -- Marie : en essai
insert into public.missions (cabinet_id, motif, du, au, jours_travailles, ca_journalier, retrocession_pct, statut)
  values ('10000000-0000-4000-a000-000000000001', 'Congés', current_date + 10, current_date + 12, 3, 400, 85, 'publiee');
select tests.ok(true, 'gating : cabinet en essai → publication acceptée');
select tests.systeme();
update public.subscriptions set statut = 'canceled' where cabinet_id = '10000000-0000-4000-a000-000000000004';
select tests.connecter(4);
select tests.refuse($$insert into public.missions (cabinet_id, motif, du, au, jours_travailles, ca_journalier, retrocession_pct, statut)
  values ('10000000-0000-4000-a000-000000000004', 'Congés', current_date + 10, current_date + 12, 3, 400, 85, 'publiee')$$,
  'gating : abonnement résilié → publication refusée', 'row-level security');

-- Contraintes d'intégrité (validation d'entrée côté base) -----------------
select tests.connecter(1);
select tests.refuse($$insert into public.missions (cabinet_id, motif, du, au, jours_travailles, ca_journalier, retrocession_pct)
  values ('10000000-0000-4000-a000-000000000001', 'Congés', current_date + 10, current_date + 5, 3, 400, 85)$$, 'fin avant début refusée');
select tests.refuse($$insert into public.missions (cabinet_id, motif, du, au, jours_travailles, ca_journalier, retrocession_pct)
  values ('10000000-0000-4000-a000-000000000001', 'Congés', current_date + 10, current_date + 11, 5, 400, 85)$$, 'plus de jours travaillés que de jours refusé');
select tests.refuse($$insert into public.missions (cabinet_id, motif, du, au, jours_travailles, ca_journalier, retrocession_pct)
  values ('10000000-0000-4000-a000-000000000001', 'Vacances', current_date + 10, current_date + 11, 2, 400, 85)$$, 'motif hors liste refusé');
select tests.refuse($$insert into public.missions (cabinet_id, motif, du, au, jours_travailles, ca_journalier, retrocession_pct)
  values ('10000000-0000-4000-a000-000000000001', 'Congés', current_date + 10, current_date + 11, 2, 400, 140)$$, 'rétrocession > 100 % refusée');
select tests.refuse($$update public.comptes set code_postal = '4900' where id = '10000000-0000-4000-a000-000000000001'$$, 'code postal invalide refusé');
select tests.refuse($$update public.comptes set mois_offerts = 99 where id = '10000000-0000-4000-a000-000000000001'$$, 'mois offerts non modifiables');

-- Création de compte et parrainage --------------------------------------
select tests.systeme();
insert into auth.users (id, email) values (tests.uid(99), 'nouvelle@exemple.fr');
select tests.connecter(99);
select tests.ok(public.creer_compte('{"role":"cabinet","prenom":"Élise","nom":"Nouvelle","ville":"Angers","codePostal":"49000","nomCabinet":"Cabinet Neuf"}', 'mardub-7k2') is not null,
  'création de compte cabinet avec code parrain');
select tests.egal((select mois_offerts from public.comptes c join public.compte_membres m on m.compte_id = c.id where m.user_id = tests.uid(99)), 1,
  'la filleule démarre avec un mois offert');
select tests.egal((select email from public.comptes c join public.compte_membres m on m.compte_id = c.id where m.user_id = tests.uid(99)), 'nouvelle@exemple.fr',
  'email repris du compte d''authentification');
select tests.ok((select code_parrain ~ '^ELINOU-' from public.comptes c join public.compte_membres m on m.compte_id = c.id where m.user_id = tests.uid(99)),
  'code de parrainage généré sans accent');
select tests.egal(public.creer_compte('{"role":"cabinet","prenom":"Élise","nom":"Bis","ville":"Angers","codePostal":"49000"}'),
  (select compte_id from public.compte_membres where user_id = tests.uid(99)), 'pas de doublon : un compte par rôle');
select tests.systeme();
select tests.ok(exists (select 1 from public.invitations i join public.compte_membres m on m.compte_id = i.filleul_id
  where m.user_id = tests.uid(99) and i.par_id = '10000000-0000-4000-a000-000000000001'), 'l''invitation apparaît chez la marraine');

rollback;
