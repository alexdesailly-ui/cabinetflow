-- Relève — durcissement relevé par les contrôles de performance de Supabase.
-- Une clé étrangère sans index ralentit les suppressions en cascade ; une politique qui appelle
-- auth.uid() sans sous-requête est réévaluée à chaque ligne.

create index if not exists fiches_maj_par_idx on public.fiches_tournee (maj_par);
create index if not exists recos_de_idx on public.recommandations (de_id);

alter policy audit_select on public.audit_log
  using (user_id = (select auth.uid()) or compte_id in (select private.mes_comptes()));
