create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

revoke all on function public.current_recruiter_id() from public, anon;
revoke all on function public.is_my_recruiter(uuid) from public, anon;
revoke all on function public.is_recruiter_applicant(uuid) from public, anon;
revoke all on function public.recruiter_applicant_emails() from public, anon;

grant execute on function public.current_recruiter_id() to authenticated, service_role;
grant execute on function public.is_my_recruiter(uuid) to authenticated, service_role;
grant execute on function public.is_recruiter_applicant(uuid) to authenticated, service_role;
grant execute on function public.recruiter_applicant_emails() to authenticated, service_role;