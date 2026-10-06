-- Isolation stricte : un cabinet ne voit JAMAIS les données privées d'un autre.
-- Utilisateurs : 1 Marie (Tilleuls), 2 Sophie (Loire), 3 Karim (Mauges), 4 Claire (Nantes),
-- 11 Julien, 12 Amina, 13 Thomas, 14 Léa, 15 Nadia (remplaçants).
begin;

-- Matrice : pour chaque paire de cabinets distincts (A, B), A ne voit rien de privé de B.
do $$
declare a int; b int; ca uuid; cb uuid; n int;
begin
  foreach a in array array[1, 2, 3, 4] loop
    foreach b in array array[1, 2, 3, 4] loop
      continue when a = b;
      perform tests.systeme();
      select compte_id into ca from public.compte_membres where user_id = tests.uid(a);
      select compte_id into cb from public.compte_membres where user_id = tests.uid(b);
      perform tests.connecter(a);

      select count(*) into n from public.missions where cabinet_id = cb and statut <> 'publiee';
      perform tests.egal(n, 0, format('cabinet %s ne voit aucune mission non publiée du cabinet %s', a, b));
      select count(*) into n from public.contrats where cabinet_id = cb;
      perform tests.egal(n, 0, format('cabinet %s ne voit aucun contrat du cabinet %s', a, b));
      select count(*) into n from public.lignes_retrocession l join public.contrats k on k.id = l.contrat_id where k.cabinet_id = cb;
      perform tests.egal(n, 0, format('cabinet %s ne voit aucune rétrocession du cabinet %s', a, b));
      select count(*) into n from public.candidatures c where c.mission_id in (select id from public.missions where cabinet_id = cb);
      perform tests.egal(n, 0, format('cabinet %s ne voit aucune candidature reçue par le cabinet %s', a, b));
      select count(*) into n from public.invitations where par_id = cb and filleul_id is distinct from ca;
      perform tests.egal(n, 0, format('cabinet %s ne voit pas le carnet d''invitations du cabinet %s', a, b));
      select count(*) into n from public.audit_log where compte_id = cb;
      perform tests.egal(n, 0, format('cabinet %s ne voit pas le journal du cabinet %s', a, b));
      select count(*) into n from public.subscriptions where cabinet_id = cb;
      perform tests.egal(n, 0, format('cabinet %s ne voit pas l''abonnement du cabinet %s', a, b));
      select count(*) into n from public.compte_membres where compte_id = cb;
      perform tests.egal(n, 0, format('cabinet %s ne voit pas les membres du cabinet %s', a, b));
      select count(*) into n from public.comptes where id = cb;
      perform tests.egal(n, 0, format('cabinet %s ne voit pas l''email/téléphone du cabinet %s', a, b));
      perform tests.egal((select count(*) from public.fiches_visibles() f where (f ->> 'missionId')::uuid in (select id from public.missions where cabinet_id = cb)), 0::bigint,
        format('cabinet %s ne lit aucune fiche de passation du cabinet %s', a, b));
    end loop;
  end loop;
end $$;

-- Écritures croisées refusées (Sophie tente d'agir sur le cabinet de Marie)
select tests.connecter(2);
select tests.refuse($$insert into public.missions (cabinet_id, motif, du, au, jours_travailles, ca_journalier, retrocession_pct)
  values ('10000000-0000-4000-a000-000000000001', 'Congés', current_date + 10, current_date + 12, 3, 400, 85)$$,
  'Sophie ne crée pas de mission au nom de Marie');
with m as (update public.missions set commentaire = 'piraté' where id = '30000000-0000-4000-a000-000000000001' returning 1)
select tests.egal((select count(*) from m), 0::bigint, 'Sophie ne modifie pas la mission publiée de Marie');
with m as (delete from public.missions where id = '30000000-0000-4000-a000-000000000003' returning 1)
select tests.egal((select count(*) from m), 0::bigint, 'Sophie ne supprime pas le brouillon de Marie');
with m as (update public.comptes set telephone = '0000' where id = '10000000-0000-4000-a000-000000000001' returning 1)
select tests.egal((select count(*) from m), 0::bigint, 'Sophie ne modifie pas le compte de Marie');
select tests.refuse($$select public.fiche_enregistrer('30000000-0000-4000-a000-000000000001', '{"patients":[]}')$$,
  'Sophie n''écrit pas la fiche de passation de Marie');
select tests.refuse($$insert into public.invitations (par_id, nom, canal) values ('10000000-0000-4000-a000-000000000001', 'x', 'sms')$$,
  'Sophie n''invite pas au nom de Marie');

-- Remplaçants entre eux
select tests.connecter(11);
select tests.egal((select count(*) from public.candidatures where remplacant_id <> '20000000-0000-4000-a000-000000000001'), 0::bigint,
  'Julien ne voit que ses propres candidatures');
select tests.egal((select count(*) from public.pieces where compte_id = '20000000-0000-4000-a000-000000000002'), 0::bigint,
  'Julien ne voit pas les références des pièces d''Amina');
select tests.connecter(13);
select tests.egal((select count(*) from public.lignes_retrocession), 0::bigint,
  'Thomas (sans contrat) ne voit aucune rétrocession');

-- Ce qui DOIT rester visible (sinon le produit ne marche pas)
select tests.connecter(2);
select tests.ok(exists (select 1 from public.missions where id = '30000000-0000-4000-a000-000000000001'),
  'une mission publiée est visible des autres membres (place de marché)');
select tests.ok(exists (select 1 from public.annuaire() where id = '10000000-0000-4000-a000-000000000001'),
  'l''annuaire montre le cabinet de Marie');
select tests.ok(not exists (select 1 from jsonb_object_keys((select to_jsonb(a) from public.annuaire() a limit 1)) k where k in ('email', 'telephone', 'code_parrain')),
  'l''annuaire n''expose ni email, ni téléphone, ni code de parrainage');
select tests.connecter(1);
select tests.egal((select count(*) from public.candidatures where mission_id = '30000000-0000-4000-a000-000000000001'), 3::bigint,
  'Marie voit les 3 candidatures reçues');
select tests.ok(exists (select 1 from public.comptes where id = '20000000-0000-4000-a000-000000000003' and email is not null),
  'Marie voit le contact de Thomas qui a candidaté chez elle');
select tests.ok(exists (select 1 from public.pieces where compte_id = '20000000-0000-4000-a000-000000000003'),
  'Marie voit le dossier de Thomas qui a candidaté chez elle');
select tests.connecter(4);
select tests.egal((select count(*) from public.pieces where compte_id = '20000000-0000-4000-a000-000000000003'), 0::bigint,
  'Claire (aucun lien avec Thomas) ne voit pas ses références de pièces');

-- Anonyme
select tests.connecter(null);
select tests.refuse('select count(*) from public.comptes', 'anon ne lit pas les comptes');
select tests.refuse('select count(*) from public.missions', 'anon ne lit pas les missions');
select tests.refuse('select public.annuaire()', 'anon n''interroge pas l''annuaire');
select tests.egal((select prenom from public.parrain_par_code('mardub-7k2')), 'Marie', 'anon résout un code de parrainage (page d''invitation)');

rollback;
