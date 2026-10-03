-- Chiffrement, fenêtre d'accès à la fiche, journal, scénario A/B, droits RGPD, rétention, quotas.
begin;

-- Chiffrement au repos
select tests.systeme();
select tests.ok((select position(convert_to('Tilleuls', 'UTF8') in contenu_chiffre) = 0 from public.fiches_tournee
  where mission_id = '30000000-0000-4000-a000-000000000002'), 'la fiche est illisible en base (chiffrée)');

-- Accès direct interdit, accès par RPC journalisé
select tests.connecter(1);
select tests.refuse('select * from public.fiches_tournee', 'lecture directe de la table des fiches refusée');
select tests.ok((public.fiche_lire('30000000-0000-4000-a000-000000000002') ->> 'pharmacie') like 'Pharmacie des Tilleuls%',
  'le cabinet lit sa fiche via la RPC');
select tests.ok(exists (select 1 from public.audit_log where action = 'lecture' and cible_table = 'fiches_tournee' and user_id = tests.uid(1)),
  'chaque lecture de fiche est journalisée et visible du cabinet');

-- Fenêtre J-7 → J+3 pour le remplaçant
select tests.connecter(11);
select tests.ok(public.fiche_lire('30000000-0000-4000-a000-000000000002') is null,
  'Julien ne lit plus la fiche 33 jours après la fin du remplacement');
select tests.systeme();
update public.missions set du = current_date + 3, au = current_date + 5 where id = '30000000-0000-4000-a000-000000000006';
insert into public.fiches_tournee (mission_id, contenu_chiffre) values ('30000000-0000-4000-a000-000000000006', private.chiffrer('{"consignes":"Code portail 1234"}'));
select tests.connecter(12);
select tests.egal(public.fiche_lire('30000000-0000-4000-a000-000000000006') ->> 'consignes', 'Code portail 1234',
  'Amina lit la fiche à J-3, contrat signé');
select tests.connecter(11);
select tests.ok(public.fiche_lire('30000000-0000-4000-a000-000000000006') is null, 'Julien ne lit pas la fiche d''un remplacement qui n''est pas le sien');
select tests.systeme();
update public.missions set du = current_date + 20, au = current_date + 22 where id = '30000000-0000-4000-a000-000000000006';
select tests.connecter(12);
select tests.ok(public.fiche_lire('30000000-0000-4000-a000-000000000006') is null, 'Amina ne lit pas la fiche avant J-7');

-- Scénario A : liste de patients refusée tant que l'hébergement n'est pas HDS
select tests.connecter(1);
select tests.refuse($$select public.fiche_enregistrer('30000000-0000-4000-a000-000000000001',
  '{"patients":[{"initiales":"M. R.","rue":"Rue des Vignes","soins":"insuline"}]}')$$, 'scénario A : aucune ligne patient acceptée', 'HDS');
select public.fiche_enregistrer('30000000-0000-4000-a000-000000000001', '{"patients":[],"consignes":"Voir logiciel de facturation"}');
select tests.egal(public.fiche_lire('30000000-0000-4000-a000-000000000001') ->> 'consignes', 'Voir logiciel de facturation',
  'scénario A : consignes logistiques enregistrées et relues');
-- Scénario B : un seul paramètre à changer
select tests.systeme();
update private.parametres set valeur = 'true' where cle = 'fiche_patients_autorises';
select tests.connecter(1);
select public.fiche_enregistrer('30000000-0000-4000-a000-000000000001', '{"patients":[{"initiales":"M. R.","rue":"Rue des Vignes","soins":"insuline"}]}');
select tests.egal(jsonb_array_length(public.fiche_lire('30000000-0000-4000-a000-000000000001') -> 'patients'), 1, 'scénario B : lignes patient acceptées');
select tests.refuse($$select public.fiche_enregistrer('30000000-0000-4000-a000-000000000001',
  '{"patients":[{"initiales":"Monsieur Raymond Dupont","soins":"insuline"}]}')$$, 'un nom complet est refusé, seules des initiales passent', 'Initiales');
select tests.egal((public.parametres_publics() ->> 'fichePatientsAutorises'), 'true', 'l''interface connaît le scénario actif');

-- Export RGPD
select tests.connecter(11);
select tests.ok((select (e -> 'comptes' -> 0 ->> 'prenom') = 'Julien' and jsonb_array_length(e -> 'contrats') >= 3
                 from public.rgpd_export() e), 'export RGPD : Julien obtient ses données');
select tests.ok((select not (e::text like '%Amina%Cherif%Trélazé%') from public.rgpd_export() e), 'export RGPD : aucune donnée de profil d''un autre compte');

-- Effacement : compte sans contrat → supprimé
select tests.connecter(15);
select tests.refuse($$select public.rgpd_supprimer_mon_compte('oui')$$, 'confirmation explicite exigée', 'SUPPRIMER');
select public.rgpd_supprimer_mon_compte('SUPPRIMER');
select tests.systeme();
select tests.ok(not exists (select 1 from public.comptes where id = '20000000-0000-4000-a000-000000000005')
  and not exists (select 1 from auth.users where id = tests.uid(15)), 'effacement : Nadia (sans contrat) entièrement supprimée');

-- Effacement : compte lié à des contrats → anonymisé, contrats conservés pour l'autre partie
select tests.connecter(11);
select public.rgpd_supprimer_mon_compte('SUPPRIMER');
select tests.systeme();
select tests.ok((select email is null and telephone is null and nom = 'supprimé' and anonymise_le is not null
                 from public.comptes where id = '20000000-0000-4000-a000-000000000001'), 'effacement : Julien anonymisé');
select tests.ok(not exists (select 1 from public.pieces where compte_id = '20000000-0000-4000-a000-000000000001'), 'effacement : pièces supprimées');
select tests.ok(exists (select 1 from public.contrats where remplacant_id = '20000000-0000-4000-a000-000000000001'), 'effacement : contrats conservés (preuve pour le cabinet)');
select tests.ok(not exists (select 1 from auth.users where id = tests.uid(11)), 'effacement : plus aucune connexion possible');
select tests.connecter(1);
select tests.ok(not exists (select 1 from public.annuaire() where id = '20000000-0000-4000-a000-000000000001'), 'un compte anonymisé disparaît de l''annuaire');

-- Rétention
select tests.systeme();
update public.missions set du = current_date - 120, au = current_date - 100 where id = '30000000-0000-4000-a000-000000000001';
select tests.ok((private.purger() ->> 'fiches')::int >= 1, 'rétention : fiche purgée 90 jours après la fin');
select tests.ok(not exists (select 1 from public.fiches_tournee where mission_id = '30000000-0000-4000-a000-000000000001'), 'rétention : la fiche n''existe plus');
insert into public.audit_log (le, action) values (now() - interval '400 days', 'ancien');
select private.purger();
select tests.ok(not exists (select 1 from public.audit_log where action = 'ancien'), 'rétention : journal purgé au-delà d''un an');

-- Limitation de débit
select tests.connecter(1);
select private.quota('test', 3, 60) from generate_series(1, 3);
select tests.refuse($$select private.quota('test', 3, 60)$$, 'quota : 4e appel dans la fenêtre refusé', 'Trop de requêtes');

rollback;
