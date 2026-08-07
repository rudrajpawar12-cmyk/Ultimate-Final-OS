alter table public.recruiters replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='recruiters'
  ) then
    alter publication supabase_realtime add table public.recruiters;
  end if;
end $$;