-- Relève — données de démonstration (100 % fictives), dates relatives à aujourd'hui.
-- Rejouable : tout est supprimé puis recréé. Appliqué par `supabase db reset`
-- en local, ou par scripts/db-test.sh. NE PAS exécuter sur la base de production.
-- Mot de passe de tous les comptes de démo (Supabase local) : via lien magique.

begin;

delete from public.comptes where id::text like '10000000-%' or id::text like '20000000-%';
delete from auth.users where id::text like '00000000-0000-4000-a000-%';

insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-000000000001', 'marie.dubois@exemple.fr'),
  ('00000000-0000-4000-a000-000000000002', 'sophie.lemaire@exemple.fr'),
  ('00000000-0000-4000-a000-000000000003', 'karim.benali@exemple.fr'),
  ('00000000-0000-4000-a000-000000000004', 'claire.rousseau@exemple.fr'),
  ('00000000-0000-4000-a000-000000000011', 'julien.morel@exemple.fr'),
  ('00000000-0000-4000-a000-000000000012', 'amina.cherif@exemple.fr'),
  ('00000000-0000-4000-a000-000000000013', 'thomas.girard@exemple.fr'),
  ('00000000-0000-4000-a000-000000000014', 'lea.fontaine@exemple.fr'),
  ('00000000-0000-4000-a000-000000000015', 'nadia.petit@exemple.fr');

-- Cabinets (le parrain doit exister avant ses filleuls)
insert into public.comptes (id, role, cree_le, prenom, nom, email, telephone, ville, code_postal, nom_cabinet, nb_titulaires, patients_tournee, ca_journalier_moyen, code_parrain, parraine_par, plan, mois_offerts) values
  ('10000000-0000-4000-a000-000000000001', 'cabinet', now() - interval '10 days', 'Marie', 'Dubois', 'marie.dubois@exemple.fr', '06 12 34 56 78', 'Angers', '49000', 'Cabinet infirmier des Tilleuls', 3, 28, 480, 'MARDUB-7K2', null, 'essai', 1),
  ('10000000-0000-4000-a000-000000000004', 'cabinet', now() - interval '300 days', 'Claire', 'Rousseau', 'claire.rousseau@exemple.fr', null, 'Nantes', '44000', 'Cabinet Rousseau', 1, 22, 450, 'CLAROU-4N1', null, 'cabinet', 0);
insert into public.comptes (id, role, cree_le, prenom, nom, email, ville, code_postal, nom_cabinet, nb_titulaires, patients_tournee, ca_journalier_moyen, code_parrain, parraine_par, plan, mois_offerts) values
  ('10000000-0000-4000-a000-000000000002', 'cabinet', now() - interval '140 days', 'Sophie', 'Lemaire', 'sophie.lemaire@exemple.fr', 'Saumur', '49400', 'Cabinet de la Loire', 2, 24, 420, 'SOPLEM-2S8', 'MARDUB-7K2', 'cabinet', 1),
  ('10000000-0000-4000-a000-000000000003', 'cabinet', now() - interval '95 days', 'Karim', 'Benali', 'karim.benali@exemple.fr', 'Cholet', '49300', 'SCP Infirmiers des Mauges', 4, 30, 510, 'KARBEN-9C3', 'MARDUB-7K2', 'cabinet', 1);

-- Remplaçants
insert into public.comptes (id, role, cree_le, prenom, nom, email, telephone, ville, code_postal, rayon_km, vehicule, annees_experience, soins_maitrises, disponibilites, code_parrain, parraine_par, plan) values
  ('20000000-0000-4000-a000-000000000001', 'remplacant', now() - interval '210 days', 'Julien', 'Morel', 'julien.morel@exemple.fr', '06 98 76 54 32', 'Angers', '49100', 40, true, 7,
    '{"Pansements complexes","Perfusions / PICC","Diabète / insuline","Soins palliatifs","Nursing / toilettes"}',
    jsonb_build_array(jsonb_build_object('du', current_date + 20, 'au', current_date + 75), jsonb_build_object('du', current_date + 100, 'au', current_date + 130)),
    'JULMOR-3P9', 'MARDUB-7K2', 'gratuit'),
  ('20000000-0000-4000-a000-000000000002', 'remplacant', now() - interval '160 days', 'Amina', 'Cherif', 'amina.cherif@exemple.fr', null, 'Trélazé', '49800', 30, true, 4,
    '{"Pansements complexes","Diabète / insuline","Nursing / toilettes","Stomies"}',
    jsonb_build_array(jsonb_build_object('du', current_date + 10, 'au', current_date + 60)), 'AMICHE-5T2', 'SOPLEM-2S8', 'gratuit'),
  ('20000000-0000-4000-a000-000000000003', 'remplacant', now() - interval '30 days', 'Thomas', 'Girard', 'thomas.girard@exemple.fr', null, 'Avrillé', '49240', 25, false, 2,
    '{"Nursing / toilettes","Diabète / insuline"}', jsonb_build_array(jsonb_build_object('du', current_date + 30, 'au', current_date + 90)), 'THOGIR-8A4', null, 'gratuit'),
  ('20000000-0000-4000-a000-000000000004', 'remplacant', now() - interval '5 days', 'Léa', 'Fontaine', 'lea.fontaine@exemple.fr', null, 'Saumur', '49400', 50, true, 11,
    '{"Chimiothérapie à domicile","Perfusions / PICC","Soins palliatifs","Pansements complexes","Dialyse péritonéale"}',
    jsonb_build_array(jsonb_build_object('du', current_date + 45, 'au', current_date + 80)), 'LEAFON-6S5', null, 'gratuit'),
  ('20000000-0000-4000-a000-000000000005', 'remplacant', now() - interval '2 days', 'Nadia', 'Petit', 'nadia.petit@exemple.fr', null, 'Angers', '49000', 20, true, 1,
    '{"Nursing / toilettes"}', '[]', 'NADPET-1A6', null, 'gratuit');

insert into public.compte_membres (compte_id, user_id) values
  ('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000001'),
  ('10000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000002'),
  ('10000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000003'),
  ('10000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000004'),
  ('20000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000011'),
  ('20000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000012'),
  ('20000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000013'),
  ('20000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000014'),
  ('20000000-0000-4000-a000-000000000005', '00000000-0000-4000-a000-000000000015');

-- Dossiers de confiance : Amina a une autorisation qui expire avant la fin du remplacement d'été,
-- Thomas n'a pas de RCP, Nadia n'a pas d'autorisation.
insert into public.pieces (compte_id, key, reference, expire_le, fournie_le)
select r.id, p.key, p.reference, p.expire_le, now() from (values
  ('20000000-0000-4000-a000-000000000001'::uuid, 'diplome', '2014', null::date),
  ('20000000-0000-4000-a000-000000000001', 'ordre', '10009876543', null),
  ('20000000-0000-4000-a000-000000000001', 'autorisation', 'AR-49-6543', current_date + 210),
  ('20000000-0000-4000-a000-000000000001', 'rcp', 'MACSF n° 7876543', current_date + 250),
  ('20000000-0000-4000-a000-000000000001', 'urssaf', '812 876543', current_date + 150),
  ('20000000-0000-4000-a000-000000000001', 'cps', 'CPS 6543', current_date + 700),
  ('20000000-0000-4000-a000-000000000001', 'rib', '•••• 4471', null),
  ('20000000-0000-4000-a000-000000000002', 'diplome', '2018', null),
  ('20000000-0000-4000-a000-000000000002', 'ordre', '10005551234', null),
  ('20000000-0000-4000-a000-000000000002', 'autorisation', 'AR-49-1234', current_date + 38),
  ('20000000-0000-4000-a000-000000000002', 'rcp', 'MACSF n° 7851234', current_date + 250),
  ('20000000-0000-4000-a000-000000000003', 'diplome', '2023', null),
  ('20000000-0000-4000-a000-000000000003', 'ordre', '10007771122', null),
  ('20000000-0000-4000-a000-000000000003', 'autorisation', 'AR-49-1122', current_date + 300),
  ('20000000-0000-4000-a000-000000000004', 'diplome', '2015', null),
  ('20000000-0000-4000-a000-000000000004', 'ordre', '10003334455', null),
  ('20000000-0000-4000-a000-000000000004', 'autorisation', 'AR-49-4455', current_date + 330),
  ('20000000-0000-4000-a000-000000000004', 'rcp', 'MACSF n° 7834455', current_date + 45),
  ('20000000-0000-4000-a000-000000000005', 'diplome', '2025', null),
  ('20000000-0000-4000-a000-000000000005', 'ordre', '10002223344', null)
) as p(compte_id, key, reference, expire_le) join public.comptes r on r.id = p.compte_id;

-- Missions
insert into public.missions (id, cabinet_id, motif, du, au, jours_travailles, dimanches_feries, ca_journalier, retrocession_pct, patients_jour, km_jour, horaires, soins_requis, vehicule_fourni, logement_fourni, commentaire, statut, publiee_le, remplacant_retenu_id) values
  ('30000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 'Congés', current_date + 32, current_date + 52, 18, 3, 480, 85, 28, 65,
    '6 h 30 – 13 h / 17 h – 19 h 30', '{"Pansements complexes","Diabète / insuline","Perfusions / PICC"}', true, false,
    'Tournée rurale au nord d’Angers, patientèle fidèle et bienveillante. Passation sur une journée avec moi avant le départ.', 'publiee', now() - interval '4 days', null),
  ('30000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000001', 'Formation', current_date - 40, current_date - 33, 7, 1, 460, 85, 26, 60,
    '6 h 30 – 13 h / 17 h – 19 h', '{"Pansements complexes","Diabète / insuline"}', true, false, null, 'terminee', now() - interval '70 days', '20000000-0000-4000-a000-000000000001'),
  ('30000000-0000-4000-a000-000000000003', '10000000-0000-4000-a000-000000000001', 'Congés', current_date + 105, current_date + 112, 7, 2, 480, 85, 28, 65,
    '6 h 30 – 13 h / 17 h – 19 h 30', '{"Pansements complexes"}', true, false, null, 'brouillon', null, null),
  ('30000000-0000-4000-a000-000000000004', '10000000-0000-4000-a000-000000000002', 'Maternité / paternité', current_date + 15, current_date + 100, 70, 10, 420, 88, 24, 45,
    '7 h – 13 h / 16 h 30 – 19 h', '{"Nursing / toilettes","Diabète / insuline"}', false, true,
    'Long remplacement, idéal pour une remplaçante qui cherche de la stabilité. Logement indépendant fourni.', 'publiee', now() - interval '2 days', null),
  ('30000000-0000-4000-a000-000000000005', '10000000-0000-4000-a000-000000000003', 'Congés', current_date + 40, current_date + 54, 14, 2, 510, 85, 30, 70,
    '6 h – 12 h 30 / 17 h – 20 h', '{"Pansements complexes","Soins palliatifs"}', true, false, null, 'publiee', now() - interval '1 day', null),
  ('30000000-0000-4000-a000-000000000006', '10000000-0000-4000-a000-000000000002', 'Formation', current_date + 12, current_date + 14, 3, 0, 420, 85, 24, 45,
    '7 h – 13 h / 16 h 30 – 19 h', '{"Nursing / toilettes"}', false, false, null, 'pourvue', now() - interval '9 days', '20000000-0000-4000-a000-000000000002'),
  -- Historique : remplacements passés qui fondent les recommandations
  ('30000000-0000-4000-a000-000000000011', '10000000-0000-4000-a000-000000000002', 'Congés', current_date - 140, current_date - 126, 14, 2, 420, 85, 24, 45, '', '{}', false, false, null, 'terminee', now() - interval '160 days', '20000000-0000-4000-a000-000000000001'),
  ('30000000-0000-4000-a000-000000000012', '10000000-0000-4000-a000-000000000004', 'Congés', current_date - 220, current_date - 206, 14, 2, 450, 85, 22, 40, '', '{}', false, false, null, 'terminee', now() - interval '240 days', '20000000-0000-4000-a000-000000000001'),
  ('30000000-0000-4000-a000-000000000013', '10000000-0000-4000-a000-000000000003', 'Maladie', current_date - 110, current_date - 96, 14, 2, 510, 85, 30, 70, '', '{}', false, false, null, 'terminee', now() - interval '120 days', '20000000-0000-4000-a000-000000000004'),
  ('30000000-0000-4000-a000-000000000014', '10000000-0000-4000-a000-000000000002', 'Congés', current_date - 170, current_date - 160, 10, 1, 420, 85, 24, 45, '', '{}', false, false, null, 'terminee', now() - interval '180 days', '20000000-0000-4000-a000-000000000002');

insert into public.candidatures (mission_id, remplacant_id, message, envoyee_le, statut) values
  ('30000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001', 'Bonjour Marie, je connais déjà la tournée pour vous avoir remplacée en avril. Disponible sur toute la période, avec plaisir.', now() - interval '3 days', 'envoyee'),
  ('30000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000002', 'Bonjour, disponible et véhiculée. Je maîtrise les pansements complexes et le suivi diabétique.', now() - interval '2 days', 'envoyee'),
  ('30000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000003', 'Bonjour, très motivé, je peux me libérer sur ces dates.', now() - interval '1 day', 'envoyee'),
  ('30000000-0000-4000-a000-000000000002', '20000000-0000-4000-a000-000000000001', 'Disponible.', now() - interval '60 days', 'retenue'),
  ('30000000-0000-4000-a000-000000000006', '20000000-0000-4000-a000-000000000002', 'Disponible ces trois jours.', now() - interval '8 days', 'retenue');

insert into public.contrats (id, mission_id, cabinet_id, remplacant_id, cree_le, retrocession_pct, echeance_reversement, signature_titulaire, signature_remplacant, transmis_cdoi_le) values
  ('40000000-0000-4000-a000-000000000001', '30000000-0000-4000-a000-000000000006', '10000000-0000-4000-a000-000000000002', '20000000-0000-4000-a000-000000000002', now() - interval '3 days', 85, current_date + 30,
    jsonb_build_object('parId', '10000000-0000-4000-a000-000000000002', 'le', now() - interval '3 days', 'saisie', 'Sophie Lemaire'),
    jsonb_build_object('parId', '20000000-0000-4000-a000-000000000002', 'le', now() - interval '2 days', 'saisie', 'Amina Cherif'), now() - interval '1 day'),
  ('40000000-0000-4000-a000-000000000002', '30000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001', now() - interval '55 days', 85, current_date - 3,
    jsonb_build_object('parId', '10000000-0000-4000-a000-000000000001', 'le', now() - interval '55 days', 'saisie', 'Marie Dubois'),
    jsonb_build_object('parId', '20000000-0000-4000-a000-000000000001', 'le', now() - interval '54 days', 'saisie', 'Julien Morel'), now() - interval '50 days');
insert into public.contrats (id, mission_id, cabinet_id, remplacant_id, cree_le, retrocession_pct, echeance_reversement, signature_titulaire, signature_remplacant, transmis_cdoi_le)
select ('40000000-0000-4000-a000-0000000000' || right(m.id::text, 2))::uuid, m.id, m.cabinet_id, m.remplacant_retenu_id, m.du - 20, 85, m.au + 15,
  jsonb_build_object('parId', m.cabinet_id, 'le', m.du - 20, 'saisie', 'Signé'),
  jsonb_build_object('parId', m.remplacant_retenu_id, 'le', m.du - 19, 'saisie', 'Signé'), m.du - 15
from public.missions m where m.id::text like '30000000-0000-4000-a000-00000000001_';

insert into public.lignes_retrocession (contrat_id, libelle, du, au, ca_encaisse, pct, echeance, payee_le) values
  ('40000000-0000-4000-a000-000000000002', 'Semaine 1 (du lundi au jeudi)', current_date - 40, current_date - 37, 1860, 85, current_date - 20, now() - interval '22 days'),
  ('40000000-0000-4000-a000-000000000002', 'Semaine 1 (vendredi à dimanche)', current_date - 36, current_date - 33, 1540, 85, current_date - 3, null);

insert into public.recommandations (contrat_id, de_id, vers_id, note, texte, le) values
  ('40000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001', 5, 'Julien a pris la tournée comme si c’était la sienne. Les patients ont demandé quand il revenait.', now() - interval '30 days'),
  ('40000000-0000-4000-a000-000000000011', '10000000-0000-4000-a000-000000000002', '20000000-0000-4000-a000-000000000001', 5, 'Ponctuel, rigoureux sur la facturation, passation propre au retour.', now() - interval '120 days'),
  ('40000000-0000-4000-a000-000000000012', '10000000-0000-4000-a000-000000000004', '20000000-0000-4000-a000-000000000001', 4, 'Très bon relationnel. Je le rappellerai.', now() - interval '200 days'),
  ('40000000-0000-4000-a000-000000000013', '10000000-0000-4000-a000-000000000003', '20000000-0000-4000-a000-000000000004', 5, 'Léa gère la chimio à domicile sans stress. Une pointure.', now() - interval '90 days'),
  ('40000000-0000-4000-a000-000000000014', '10000000-0000-4000-a000-000000000002', '20000000-0000-4000-a000-000000000002', 4, 'Sérieuse, à l’écoute des patients.', now() - interval '150 days');

-- Fiche de passation (scénario A : consignes logistiques seulement, aucune ligne patient)
insert into public.fiches_tournee (mission_id, contenu_chiffre, nb_patients, maj_le)
values ('30000000-0000-4000-a000-000000000002', private.chiffrer(jsonb_build_object(
  'patients', '[]'::jsonb,
  'accesCabinet', 'Clé dans la boîte à code du cabinet (code transmis par SMS le matin du départ).',
  'pharmacie', 'Pharmacie des Tilleuls — 02 41 00 00 00 (ouverte 8 h 30 – 19 h 30)',
  'medecinReferent', 'Dr Lambert — MSP de Montreuil-Juigné',
  'consignes', 'La liste des patients et les créneaux sont dans le logiciel de facturation du cabinet. Le cahier de transmissions reste au cabinet.'
)), 0, now() - interval '45 days');

insert into public.invitations (par_id, nom, canal, le, filleul_id, actif_le) values
  ('10000000-0000-4000-a000-000000000001', 'Sophie Lemaire (Saumur)', 'whatsapp', now() - interval '140 days', '10000000-0000-4000-a000-000000000002', now() - interval '120 days'),
  ('10000000-0000-4000-a000-000000000001', 'Karim Benali (Cholet)', 'sms', now() - interval '95 days', '10000000-0000-4000-a000-000000000003', now() - interval '80 days'),
  ('10000000-0000-4000-a000-000000000001', 'Julien Morel', 'lien', now() - interval '70 days', '20000000-0000-4000-a000-000000000001', null),
  ('10000000-0000-4000-a000-000000000001', 'Cabinet Bellevue (Segré)', 'email', now() - interval '12 days', null, null),
  ('10000000-0000-4000-a000-000000000002', 'Amina Cherif', 'lien', now() - interval '100 days', '20000000-0000-4000-a000-000000000002', now() - interval '90 days');

insert into public.badges (compte_id, key, le) values
  ('10000000-0000-4000-a000-000000000001', 'premier-besoin', now() - interval '70 days'),
  ('10000000-0000-4000-a000-000000000001', 'premier-contrat', now() - interval '54 days'),
  ('10000000-0000-4000-a000-000000000001', 'ordre-ok', now() - interval '50 days'),
  ('10000000-0000-4000-a000-000000000001', 'passation', now() - interval '45 days'),
  ('10000000-0000-4000-a000-000000000001', 'retro-a-lheure', now() - interval '22 days'),
  ('10000000-0000-4000-a000-000000000001', 'cercle', now() - interval '120 days'),
  ('20000000-0000-4000-a000-000000000001', 'dossier-complet', now() - interval '200 days'),
  ('20000000-0000-4000-a000-000000000001', 'premiere-mission', now() - interval '54 days'),
  ('20000000-0000-4000-a000-000000000001', 'recommande', now() - interval '200 days');

-- Claire (Nantes) est abonnée : sert à tester le feature-gating.
insert into public.subscriptions (cabinet_id, stripe_customer_id, stripe_subscription_id, statut, price_id, intervalle, current_period_end)
values ('10000000-0000-4000-a000-000000000004', 'cus_demo_rousseau', 'sub_demo_rousseau', 'active', 'price_demo_mensuel', 'month', now() + interval '20 days')
on conflict (cabinet_id) do nothing;

commit;
