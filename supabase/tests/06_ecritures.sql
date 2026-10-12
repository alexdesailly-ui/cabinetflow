-- Écritures sur les pièces et les lignes de rétrocession : une politique par commande.
begin;

-- Pièces : le titulaire gère les siennes, personne d'autre
select tests.connecter(15);
insert into public.pieces (compte_id, key, reference) values ('20000000-0000-4000-a000-000000000005', 'rcp', 'RCP-NADIA');
select tests.ok(exists (select 1 from public.pieces where compte_id = '20000000-0000-4000-a000-000000000005' and key = 'rcp'), 'un titulaire ajoute une de ses pièces');
update public.pieces set reference = 'RCP-NADIA-2' where compte_id = '20000000-0000-4000-a000-000000000005' and key = 'rcp';
select tests.egal((select reference from public.pieces where compte_id = '20000000-0000-4000-a000-000000000005' and key = 'rcp'), 'RCP-NADIA-2', 'un titulaire modifie sa pièce');
select tests.refuse($$insert into public.pieces (compte_id, key) values ('20000000-0000-4000-a000-000000000004', 'rib')$$,
  'impossible d''ajouter une pièce à un autre compte', 'row-level security');
with u as (update public.pieces set reference = 'piraté' where compte_id = '20000000-0000-4000-a000-000000000004' returning 1)
select tests.egal((select count(*) from u), 0::bigint, 'impossible de modifier la pièce d''un autre compte');
with d as (delete from public.pieces where compte_id = '20000000-0000-4000-a000-000000000004' returning 1)
select tests.egal((select count(*) from d), 0::bigint, 'impossible de supprimer la pièce d''un autre compte');
delete from public.pieces where compte_id = '20000000-0000-4000-a000-000000000005' and key = 'rcp';
select tests.ok(not exists (select 1 from public.pieces where compte_id = '20000000-0000-4000-a000-000000000005' and key = 'rcp'), 'un titulaire retire sa pièce');

-- Lignes de rétrocession : le cabinet du contrat écrit, le remplaçant lit
select tests.connecter(1);
insert into public.lignes_retrocession (contrat_id, libelle, du, au, ca_encaisse, pct, echeance)
  values ('40000000-0000-4000-a000-000000000002', 'Semaine 2', current_date - 30, current_date - 27, 1000, 85, current_date + 5);
select tests.egal((select count(*) from public.lignes_retrocession where contrat_id = '40000000-0000-4000-a000-000000000002'), 3::bigint, 'le cabinet ajoute une ligne');
update public.lignes_retrocession set payee_le = now() where libelle = 'Semaine 2';
select tests.ok((select payee_le is not null from public.lignes_retrocession where libelle = 'Semaine 2'), 'le cabinet marque une ligne comme payée');
delete from public.lignes_retrocession where libelle = 'Semaine 2';
select tests.egal((select count(*) from public.lignes_retrocession where contrat_id = '40000000-0000-4000-a000-000000000002'), 2::bigint, 'le cabinet supprime une ligne');

select tests.connecter(11);
select tests.refuse($$insert into public.lignes_retrocession (contrat_id, libelle, du, au, ca_encaisse, pct, echeance)
  values ('40000000-0000-4000-a000-000000000002', 'x', current_date, current_date, 1, 85, current_date)$$, 'le remplaçant n''ajoute pas de ligne', 'row-level security');
with d as (delete from public.lignes_retrocession where contrat_id = '40000000-0000-4000-a000-000000000002' returning 1)
select tests.egal((select count(*) from d), 0::bigint, 'le remplaçant ne supprime pas de ligne');

select tests.connecter(2);
select tests.refuse($$insert into public.lignes_retrocession (contrat_id, libelle, du, au, ca_encaisse, pct, echeance)
  values ('40000000-0000-4000-a000-000000000002', 'x', current_date, current_date, 1, 85, current_date)$$, 'un autre cabinet n''écrit pas sur ce contrat', 'row-level security');

rollback;
