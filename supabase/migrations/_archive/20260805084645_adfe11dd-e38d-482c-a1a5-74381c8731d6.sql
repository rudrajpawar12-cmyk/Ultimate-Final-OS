revoke execute on function public.current_recruiter_id() from public, anon;
revoke execute on function public.is_recruiter_applicant(uuid) from public, anon;
revoke execute on function public.recruiter_applicant_emails() from public, anon;
grant execute on function public.current_recruiter_id() to authenticated, service_role;
grant execute on function public.is_recruiter_applicant(uuid) to authenticated, service_role;
grant execute on function public.recruiter_applicant_emails() to authenticated, service_role;