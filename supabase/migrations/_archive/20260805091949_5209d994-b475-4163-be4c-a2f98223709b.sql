revoke all on function public.notify_application_insert() from public, anon, authenticated;
revoke all on function public.notify_application_update() from public, anon, authenticated;
revoke all on function public.notify_interview_change() from public, anon, authenticated;
revoke all on function public.notify_job_status_change() from public, anon, authenticated;
revoke all on function public.create_notification(uuid, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.recruiter_user_id(uuid) from public, anon, authenticated;