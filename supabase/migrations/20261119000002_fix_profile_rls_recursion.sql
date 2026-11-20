create or replace function public.current_university_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select university_id
  from public.profiles
  where id = auth.uid()
    and is_active = true
$$;

drop policy if exists "university admins read scoped profiles" on public.profiles;
create policy "university admins read scoped profiles" on public.profiles for select
using (
  public.current_role() = 'UNIVERSITY_ADMIN'::public.app_role
  and (
    university_id = public.current_university_id()
    or (
      role = 'PROVIDER'::public.app_role
      and exists (
        select 1 from public.properties prop
        where prop.provider_id = profiles.id
          and public.can_access_university(prop.university_id)
      )
    )
  )
);

drop policy if exists "university admins read assigned university" on public.universities;
create policy "university admins read assigned university" on public.universities for select
using (
  id = public.current_university_id()
  and public.current_role() = 'UNIVERSITY_ADMIN'::public.app_role
);
