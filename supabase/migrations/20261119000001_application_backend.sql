alter type public.property_status add value if not exists 'UNDER_REVIEW';

alter table public.profiles
  add column if not exists is_active boolean not null default true,
  add column if not exists rejection_reason text;

alter table public.properties
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists fire_safety_compliant boolean not null default false,
  add column if not exists electrical_safety_compliant boolean not null default false,
  add column if not exists safety_certificates jsonb not null default '[]',
  add column if not exists inspection_reports jsonb not null default '[]',
  add column if not exists accreditation jsonb not null default '{}',
  add column if not exists is_published boolean not null default false;

alter table public.applications
  add column if not exists rejection_reason text;

alter table public.rooms
  add column if not exists occupancy_limit integer not null default 1 check (occupancy_limit > 0);

alter table public.complaints
  add column if not exists booking_id uuid references public.bookings(id),
  add column if not exists assigned_to uuid references public.profiles(id),
  add column if not exists resolution text;

create table if not exists public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.review_flags (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status text not null default 'OPEN' check (status in ('OPEN','RESOLVED','REVIEW_HIDDEN')),
  resolution text,
  resolved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null default 'null',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  status text not null default 'OPEN',
  created_at timestamptz not null default now()
);

create index if not exists properties_status_created_idx on public.properties(status, created_at desc);
create index if not exists properties_campus_idx on public.properties(campus_id);
create index if not exists rooms_property_status_idx on public.rooms(property_id, status);
create index if not exists applications_student_created_idx on public.applications(student_id, created_at desc);
create index if not exists applications_property_status_idx on public.applications(property_id, status);
create index if not exists bookings_student_created_idx on public.bookings(student_id, created_at desc);
create index if not exists notifications_user_status_idx on public.notifications(user_id, status, created_at desc);
create index if not exists reviews_property_created_idx on public.reviews(property_id, created_at desc);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
create unique index if not exists reviews_one_per_booking_idx on public.reviews(booking_id) where booking_id is not null;
create unique index if not exists review_flags_one_per_reporter_idx on public.review_flags(review_id,reporter_id);

create or replace function public.current_role()
returns public.app_role
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() and is_active = true $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role() in ('UNIVERSITY_ADMIN'::public.app_role, 'SYSTEM_ADMIN'::public.app_role)
$$;

create or replace function public.is_provider()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role() = 'PROVIDER'::public.app_role
$$;

create or replace function public.is_provider_owner(property_uuid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.properties p
    where p.id = property_uuid
      and p.provider_id = auth.uid()
      and public.is_provider()
  )
$$;

create or replace function public.is_system_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.current_role() = 'SYSTEM_ADMIN'::public.app_role $$;

create or replace function public.can_access_university(target_university uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_system_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'UNIVERSITY_ADMIN'
        and p.is_active
        and p.university_id = target_university
    )
$$;

create or replace function public.can_access_property(target_property uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.properties p
    where p.id = target_property
      and (
        p.provider_id = auth.uid()
        or p.status = 'APPROVED'
        or public.is_system_admin()
        or public.can_access_university(p.university_id)
      )
  )
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare requested_role text;
begin
  requested_role := upper(coalesce(new.raw_user_meta_data->>'role', 'STUDENT'));
  insert into public.profiles (id,email,first_name,last_name,phone,role,business_name,registration_number,student_number,university_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'phone',
    case when requested_role = 'PROVIDER' then 'PROVIDER'::public.app_role else 'STUDENT'::public.app_role end,
    new.raw_user_meta_data->>'business_name',
    new.raw_user_meta_data->>'registration_number',
    new.raw_user_meta_data->>'student_number',
    case when requested_role = 'STUDENT' then nullif(new.raw_user_meta_data->>'university_id','')::uuid else null end
  )
  on conflict (id) do update set email=excluded.email;
  return new;
end;
$$;

create or replace function public.protect_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role()='service_role' or (auth.role() is null and auth.uid() is null) then
    return new;
  end if;
  if auth.uid() = old.id then
    new.role := old.role;
    new.is_active := old.is_active;
    new.verification_status := old.verification_status;
    new.rejection_reason := old.rejection_reason;
    new.university_id := old.university_id;
  elsif not public.is_system_admin() then
    if new.role is distinct from old.role or new.university_id is distinct from old.university_id then
      raise exception 'Only system administrators can change roles or university assignments';
    end if;
    if new.is_active is distinct from old.is_active
      and not (old.role='PROVIDER'::public.app_role and public.current_role()='UNIVERSITY_ADMIN'::public.app_role) then
      raise exception 'Not authorized to change account access';
    end if;
  end if;
  if new.campus_id is not null and not exists(
    select 1 from public.campuses c where c.id=new.campus_id and c.university_id=new.university_id
  ) then raise exception 'The selected campus does not belong to the assigned university'; end if;
  return new;
end;
$$;
drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges before update on public.profiles
for each row execute function public.protect_profile_privileges();

create or replace function public.guard_application_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.student_id <> auth.uid() or public.current_role() <> 'STUDENT'::public.app_role then
      raise exception 'Only students can submit their own applications';
    end if;
    if not exists (select 1 from public.properties p where p.id=new.property_id and p.status='APPROVED') then
      raise exception 'Applications are only accepted for approved properties';
    end if;
    if new.room_id is not null and not exists (
      select 1 from public.rooms r where r.id=new.room_id and r.property_id=new.property_id and r.status='AVAILABLE'
    ) then raise exception 'The selected room is not available for this property'; end if;
    if new.status <> 'SUBMITTED' then raise exception 'Application must start as submitted'; end if;
    return new;
  end if;

  if new.student_id is distinct from old.student_id
    or new.property_id is distinct from old.property_id
    or new.room_id is distinct from old.room_id then
    raise exception 'Application ownership and property fields cannot be changed';
  end if;

  if public.current_role() = 'STUDENT'::public.app_role then
    if old.student_id <> auth.uid()
      or new.note is distinct from old.note
      or new.rejection_reason is distinct from old.rejection_reason
      or (new.status <> old.status and new.status='CANCELLED'::public.application_status and old.status not in ('SUBMITTED'::public.application_status,'UNDER_REVIEW'::public.application_status))
      or (new.status <> old.status and new.status='BOOKED'::public.application_status and (old.status <> 'APPROVED'::public.application_status or not exists(select 1 from public.bookings b where b.application_id=old.id and b.student_id=auth.uid())))
      or new.status not in ('CANCELLED'::public.application_status,'BOOKED'::public.application_status,old.status) then
      raise exception 'Students may only cancel their own applications';
    end if;
  elsif public.current_role() = 'PROVIDER'::public.app_role then
    if not public.is_provider_owner(old.property_id)
      or new.note is distinct from old.note
      or (new.status <> old.status and not (
        (old.status='SUBMITTED'::public.application_status and new.status in ('UNDER_REVIEW'::public.application_status,'APPROVED'::public.application_status,'REJECTED'::public.application_status))
        or (old.status='UNDER_REVIEW'::public.application_status and new.status in ('APPROVED'::public.application_status,'REJECTED'::public.application_status))
      )) then
      raise exception 'Provider cannot change this application';
    end if;
  elsif not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  return new;
end;
$$;
drop trigger if exists applications_guard_changes on public.applications;
create trigger applications_guard_changes before insert or update on public.applications
for each row execute function public.guard_application_changes();

create or replace function public.create_booking_from_application(application_uuid uuid, booking_start date, booking_end date)
returns public.bookings
language plpgsql security definer set search_path = public
as $$
declare app public.applications; result public.bookings;
begin
  select * into app from public.applications where id=application_uuid for update;
  if not found or app.student_id <> auth.uid() then raise exception 'Application not found'; end if;
  if app.status <> 'APPROVED' then raise exception 'Only approved applications can be booked'; end if;
  if booking_start is null or booking_end is null or booking_end <= booking_start then raise exception 'Invalid booking dates'; end if;
  if app.room_id is not null then
    update public.rooms set status='RESERVED' where id=app.room_id and status='AVAILABLE';
    if not found then raise exception 'Room is no longer available'; end if;
  end if;
  insert into public.bookings(student_id,application_id,property_id,room_id,start_date,end_date,status)
  values(app.student_id,app.id,app.property_id,app.room_id,booking_start,booking_end,'CONFIRMED')
  returning * into result;
  update public.applications set status='BOOKED' where id=app.id;
  return result;
end;
$$;
revoke all on function public.create_booking_from_application(uuid,date,date) from public;
grant execute on function public.create_booking_from_application(uuid,date,date) to authenticated;

create or replace function public.guard_review_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.student_id <> auth.uid() or public.current_role() <> 'STUDENT'::public.app_role then
    raise exception 'Only students can submit reviews for themselves';
  end if;
  if not exists (
    select 1 from public.bookings b
    where b.id=new.booking_id and b.student_id=auth.uid()
      and b.property_id=new.property_id and b.status in ('COMPLETED','ACTIVE')
  ) then raise exception 'A valid booking is required to review this property'; end if;
  if new.status <> 'PUBLISHED' then raise exception 'A new review must be published'; end if;
  return new;
end;
$$;
drop trigger if exists reviews_guard_insert on public.reviews;
create trigger reviews_guard_insert before insert on public.reviews
for each row execute function public.guard_review_insert();

create or replace function public.guard_complaint_insert()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.student_id <> auth.uid() or public.current_role() <> 'STUDENT'::public.app_role then
    raise exception 'Only students can submit their own complaints';
  end if;
  if new.booking_id is not null and not exists (
    select 1 from public.bookings b
    where b.id=new.booking_id and b.student_id=auth.uid()
      and (new.property_id is null or new.property_id=b.property_id)
  ) then raise exception 'The complaint booking does not belong to this student'; end if;
  if new.status <> 'OPEN' then raise exception 'A new complaint must be open'; end if;
  return new;
end;
$$;
drop trigger if exists complaints_guard_insert on public.complaints;
create trigger complaints_guard_insert before insert on public.complaints
for each row execute function public.guard_complaint_insert();

create or replace function public.validate_property_campus()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.campus_id is not null and not exists (
    select 1 from public.campuses c where c.id=new.campus_id and c.university_id=new.university_id
  ) then raise exception 'The selected campus does not belong to the selected university'; end if;
  return new;
end;
$$;
drop trigger if exists properties_validate_campus on public.properties;
create trigger properties_validate_campus before insert or update on public.properties
for each row execute function public.validate_property_campus();

create or replace function public.require_verification_evidence()
returns trigger language plpgsql security definer set search_path=public as $$
declare row_data jsonb; previous_data jsonb; record_id uuid; owner_id uuid;
begin
  row_data:=to_jsonb(new);
  if tg_op <> 'INSERT' then previous_data:=to_jsonb(old); end if;
  record_id:=(row_data->>'id')::uuid;
  if tg_table_name='properties' and row_data->>'status'='APPROVED' then
    owner_id:=(row_data->>'provider_id')::uuid;
    if tg_op='INSERT' or previous_data->>'status' is distinct from row_data->>'status' then
      if not exists(select 1 from public.property_documents d where d.property_id=record_id and d.provider_id=owner_id) then
        raise exception 'At least one property verification document is required before approval';
      end if;
      if not exists(select 1 from public.profiles p where p.id=owner_id and p.is_active and (
        (p.role='PROVIDER'::public.app_role and p.verification_status='APPROVED')
        or p.role='SYSTEM_ADMIN'::public.app_role
      )) then
        raise exception 'The provider must be verified before property approval';
      end if;
    end if;
  elsif tg_table_name='profiles' and row_data->>'role'='PROVIDER' and row_data->>'verification_status'='APPROVED' then
    if tg_op='INSERT' or previous_data->>'verification_status' is distinct from row_data->>'verification_status' then
      if not exists(select 1 from public.provider_documents d where d.provider_id=record_id) then
        raise exception 'At least one provider verification document is required before approval';
      end if;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists properties_require_verification_evidence on public.properties;
create trigger properties_require_verification_evidence before insert or update on public.properties
for each row execute function public.require_verification_evidence();
drop trigger if exists profiles_require_verification_evidence on public.profiles;
create trigger profiles_require_verification_evidence before insert or update on public.profiles
for each row execute function public.require_verification_evidence();

create or replace function public.guard_document_metadata()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_table_name='provider_documents' then
    if new.provider_id <> auth.uid() or public.current_role()<>'PROVIDER'::public.app_role
      or new.storage_path not like (auth.uid()::text || '/company/%') then
      raise exception 'Provider documents must be stored under the authenticated provider account';
    end if;
  elsif tg_table_name='property_documents' then
    if not (public.is_provider_owner(new.property_id) or (public.is_system_admin() and exists(select 1 from public.properties p where p.id=new.property_id and p.provider_id=auth.uid())))
      or new.provider_id <> auth.uid()
      or new.storage_path not like (auth.uid()::text || '/' || new.property_id::text || '/documents/%') then
      raise exception 'Property documents must belong to the provider and property';
    end if;
  elsif tg_table_name='application_documents' then
    if new.student_id <> auth.uid() or not exists (
      select 1 from public.applications a where a.id=new.application_id and a.student_id=auth.uid()
    ) or new.storage_path not like (auth.uid()::text || '/' || new.application_id::text || '/documents/%') then
      raise exception 'Application documents must belong to the student and application';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists provider_documents_guard on public.provider_documents;
create trigger provider_documents_guard before insert or update on public.provider_documents
for each row execute function public.guard_document_metadata();
drop trigger if exists property_documents_guard on public.property_documents;
create trigger property_documents_guard before insert or update on public.property_documents
for each row execute function public.guard_document_metadata();
drop trigger if exists application_documents_guard on public.application_documents;
create trigger application_documents_guard before insert or update on public.application_documents
for each row execute function public.guard_document_metadata();

create or replace function public.guard_property_media()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not exists (
    select 1 from public.properties p
    where p.id=new.property_id and p.provider_id=auth.uid()
      and (public.is_provider() or public.is_system_admin())
  ) or new.storage_path not like (auth.uid()::text || '/' || new.property_id::text || '/%') then
    raise exception 'Property media must belong to the authenticated property owner';
  end if;
  if new.media_type='VIDEO' and coalesce(new.duration_seconds,0)<300 then
    raise exception 'Property videos must be at least five minutes long';
  end if;
  return new;
end;
$$;
drop trigger if exists property_media_guard on public.property_media;
create trigger property_media_guard before insert or update on public.property_media
for each row execute function public.guard_property_media();

create or replace function public.guard_review_flag()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op='INSERT' and (new.reporter_id <> auth.uid() or public.current_role() <> 'STUDENT'::public.app_role) then
    raise exception 'Only students can report reviews';
  end if;
  if tg_op='UPDATE' and not public.is_admin() then raise exception 'Only administrators can resolve flags'; end if;
  return new;
end;
$$;

create or replace function public.create_booking_complaint(booking_uuid uuid, complaint_message text)
returns public.complaints
language plpgsql security definer set search_path=public
as $$
declare booking public.bookings; result public.complaints;
begin
  select * into booking from public.bookings where id=booking_uuid and student_id=auth.uid();
  if not found then raise exception 'Booking not found'; end if;
  if length(trim(coalesce(complaint_message,''))) < 5 then raise exception 'Please describe the issue'; end if;
  insert into public.complaints(student_id,booking_id,property_id,title,description)
  values(auth.uid(),booking.id,booking.property_id,'Maintenance or accommodation issue',trim(complaint_message))
  returning * into result;
  return result;
end;
$$;
revoke all on function public.create_booking_complaint(uuid,text) from public;
grant execute on function public.create_booking_complaint(uuid,text) to authenticated;

create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path=public
as $$
declare new_data jsonb; old_data jsonb;
begin
  if tg_op <> 'DELETE' then new_data:=to_jsonb(new); end if;
  if tg_op <> 'INSERT' then old_data:=to_jsonb(old); end if;
  if tg_table_name='profiles' then
    new_data:=new_data-ARRAY['email','phone','student_number','first_name','last_name','business_name','registration_number']::text[];
    old_data:=old_data-ARRAY['email','phone','student_number','first_name','last_name','business_name','registration_number']::text[];
  elsif tg_table_name='properties' then
    new_data:=new_data-ARRAY['address','contact_email','contact_phone','description']::text[];
    old_data:=old_data-ARRAY['address','contact_email','contact_phone','description']::text[];
  elsif tg_table_name='applications' then
    new_data:=new_data-ARRAY['note']::text[];
    old_data:=old_data-ARRAY['note']::text[];
  end if;
  insert into public.audit_logs(actor_id,action,resource_type,resource_id,details)
  values(auth.uid(),tg_op, tg_table_name, coalesce(new_data->>'id',old_data->>'id'), jsonb_build_object('new',new_data,'old',old_data));
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
drop trigger if exists audit_property_changes on public.properties;
create trigger audit_property_changes after insert or update or delete on public.properties
for each row execute function public.audit_row_change();
drop trigger if exists audit_application_changes on public.applications;
create trigger audit_application_changes after insert or update or delete on public.applications
for each row execute function public.audit_row_change();
drop trigger if exists audit_booking_changes on public.bookings;
create trigger audit_booking_changes after insert or update or delete on public.bookings
for each row execute function public.audit_row_change();
drop trigger if exists audit_profile_changes on public.profiles;
create trigger audit_profile_changes after update on public.profiles
for each row when (old.role is distinct from new.role or old.is_active is distinct from new.is_active or old.verification_status is distinct from new.verification_status)
execute function public.audit_row_change();

create or replace function public.notify_record_change()
returns trigger language plpgsql security definer set search_path=public as $$
declare row_data jsonb:=to_jsonb(new); previous_data jsonb; recipient uuid; status_text text; property_uuid uuid;
begin
  if tg_op <> 'INSERT' then previous_data:=to_jsonb(old); end if;
  status_text:=row_data->>'status';
  if tg_table_name='applications' then
    property_uuid:=(row_data->>'property_id')::uuid;
    if tg_op='INSERT' then
      select provider_id into recipient from public.properties where id=property_uuid;
      if recipient is not null then
        insert into public.notifications(user_id,title,message) values(recipient,'New student application','A student submitted an application for one of your properties.');
      end if;
    elsif previous_data->>'status' is distinct from status_text then
      recipient:=(row_data->>'student_id')::uuid;
      insert into public.notifications(user_id,title,message) values(recipient,'Application update','Your application status is now ' || replace(lower(status_text),'_',' ') || '.');
    end if;
  elsif tg_table_name='properties' and previous_data->>'status' is distinct from status_text then
    recipient:=(row_data->>'provider_id')::uuid;
    insert into public.notifications(user_id,title,message) values(recipient,'Property review update','Your property status is now ' || replace(lower(status_text),'_',' ') || '.');
  elsif tg_table_name='bookings' and tg_op='INSERT' then
    recipient:=(row_data->>'student_id')::uuid;
    insert into public.notifications(user_id,title,message) values(recipient,'Booking confirmed','Your accommodation booking has been confirmed.');
    select provider_id into recipient from public.properties where id=(row_data->>'property_id')::uuid;
    if recipient is not null then
      insert into public.notifications(user_id,title,message) values(recipient,'New booking','A student confirmed a booking at your property.');
    end if;
  elsif tg_table_name='complaints' and tg_op='UPDATE' and previous_data->>'status' is distinct from status_text then
    recipient:=(row_data->>'student_id')::uuid;
    if recipient is not null then
      insert into public.notifications(user_id,title,message) values(recipient,'Complaint update','Your complaint status is now ' || replace(lower(status_text),'_',' ') || '.');
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists notify_application_changes on public.applications;
create trigger notify_application_changes after insert or update on public.applications
for each row execute function public.notify_record_change();
drop trigger if exists notify_property_changes on public.properties;
create trigger notify_property_changes after update on public.properties
for each row execute function public.notify_record_change();
drop trigger if exists notify_booking_changes on public.bookings;
create trigger notify_booking_changes after insert on public.bookings
for each row execute function public.notify_record_change();
drop trigger if exists notify_complaint_changes on public.complaints;
create trigger notify_complaint_changes after update on public.complaints
for each row execute function public.notify_record_change();

drop policy if exists "users update own profile" on public.profiles;
drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles for select using (id=auth.uid());
create policy "system admins read profiles" on public.profiles for select using (public.is_system_admin());
create policy "university admins read scoped profiles" on public.profiles for select
using (
  public.current_role()='UNIVERSITY_ADMIN'::public.app_role
  and (
    university_id=(select p.university_id from public.profiles p where p.id=auth.uid())
    or (role='PROVIDER'::public.app_role and exists(
      select 1 from public.properties prop
      where prop.provider_id=profiles.id and public.can_access_university(prop.university_id)
    ))
  )
);
create policy "providers read their applicants and tenants" on public.profiles for select
using (
  exists(select 1 from public.applications a where a.student_id=profiles.id and public.is_provider_owner(a.property_id))
  or exists(select 1 from public.bookings b where b.student_id=profiles.id and public.is_provider_owner(b.property_id))
);
create policy "users update safe profile fields" on public.profiles for update
using (id=auth.uid()) with check (id=auth.uid());
create policy "system admins manage profiles" on public.profiles for all
using (public.is_system_admin()) with check (public.is_system_admin());
create policy "university admins update scoped providers" on public.profiles for update
using (
  public.current_role()='UNIVERSITY_ADMIN'::public.app_role and role='PROVIDER'::public.app_role
  and exists(select 1 from public.properties prop where prop.provider_id=profiles.id and public.can_access_university(prop.university_id))
)
with check (
  public.current_role()='UNIVERSITY_ADMIN'::public.app_role and role='PROVIDER'::public.app_role
  and exists(select 1 from public.properties prop where prop.provider_id=profiles.id and public.can_access_university(prop.university_id))
);

drop policy if exists "admins manage universities" on public.universities;
create policy "system admins manage universities" on public.universities for all
using (public.is_system_admin()) with check (public.is_system_admin());
create policy "university admins read assigned university" on public.universities for select
using (id=(select p.university_id from public.profiles p where p.id=auth.uid()));
drop policy if exists "admins manage campuses" on public.campuses;
create policy "system admins manage campuses" on public.campuses for all
using (public.is_system_admin()) with check (public.is_system_admin());
create policy "university admins manage assigned campuses" on public.campuses for all
using (public.can_access_university(university_id)) with check (public.can_access_university(university_id));

drop policy if exists "providers read own properties" on public.properties;
drop policy if exists "admins read properties" on public.properties;
drop policy if exists "providers create properties" on public.properties;
drop policy if exists "providers update own properties" on public.properties;
drop policy if exists "admins update properties" on public.properties;
create policy "provider read own properties" on public.properties for select using (provider_id=auth.uid());
create policy "university admins read scoped properties" on public.properties for select using (public.can_access_university(university_id));
create policy "provider insert own properties" on public.properties for insert
with check (provider_id=auth.uid() and public.current_role()='PROVIDER'::public.app_role and status='PENDING'::public.property_status);
create policy "provider update own properties" on public.properties for update
using (provider_id=auth.uid() and public.current_role()='PROVIDER'::public.app_role)
with check (provider_id=auth.uid() and public.current_role()='PROVIDER'::public.app_role);
create policy "admins update scoped properties" on public.properties for update
using (public.can_access_university(university_id)) with check (public.can_access_university(university_id));
create policy "admins insert properties" on public.properties for insert
with check (public.is_system_admin() and provider_id=auth.uid() and status='PENDING'::public.property_status);
create policy "admins read scoped property rooms" on public.rooms for select
using (exists(select 1 from public.properties p where p.id=property_id and public.can_access_university(p.university_id)));
create policy "admins read scoped property media" on public.property_media for select
using (exists(select 1 from public.properties p where p.id=property_id and public.can_access_university(p.university_id)));
create policy "system admins manage property media" on public.property_media for all
using (public.is_system_admin()) with check (public.is_system_admin());

drop policy if exists "students manage own applications" on public.applications;
drop policy if exists "providers read property applications" on public.applications;
create policy "students read own applications" on public.applications for select using (student_id=auth.uid());
create policy "students submit applications" on public.applications for insert
with check (student_id=auth.uid() and public.current_role()='STUDENT'::public.app_role);
create policy "students cancel applications" on public.applications for update
using (student_id=auth.uid()) with check (student_id=auth.uid());
create policy "providers read own property applications" on public.applications for select
using (public.is_provider_owner(property_id));
create policy "providers decide own property applications" on public.applications for update
using (public.is_provider_owner(property_id) and public.current_role()='PROVIDER'::public.app_role)
with check (public.is_provider_owner(property_id) and public.current_role()='PROVIDER'::public.app_role);
create policy "admins read scoped applications" on public.applications for select
using (exists(select 1 from public.properties p where p.id=property_id and public.can_access_university(p.university_id)));
create policy "admins manage scoped applications" on public.applications for update
using (exists(select 1 from public.properties p where p.id=property_id and public.can_access_university(p.university_id)))
with check (exists(select 1 from public.properties p where p.id=property_id and public.can_access_university(p.university_id)));

drop policy if exists "students manage own bookings" on public.bookings;
drop policy if exists "providers read property bookings" on public.bookings;
create policy "students read own bookings" on public.bookings for select using (student_id=auth.uid());
create policy "providers read own property bookings" on public.bookings for select using (public.is_provider_owner(property_id));
create policy "admins read scoped bookings" on public.bookings for select
using (exists(select 1 from public.properties p where p.id=property_id and public.can_access_university(p.university_id)));

drop policy if exists "students manage own reviews" on public.reviews;
create policy "students read own reviews" on public.reviews for select using (student_id=auth.uid());
create policy "students create own reviews" on public.reviews for insert
with check (student_id=auth.uid() and public.current_role()='STUDENT'::public.app_role);
create policy "providers read property reviews" on public.reviews for select using (public.is_provider_owner(property_id));
create policy "providers respond to property reviews" on public.reviews for update
using (public.is_provider_owner(property_id)) with check (public.is_provider_owner(property_id));
create policy "admins manage scoped reviews" on public.reviews for all
using (exists(select 1 from public.properties p where p.id=property_id and public.can_access_university(p.university_id)))
with check (exists(select 1 from public.properties p where p.id=property_id and public.can_access_university(p.university_id)));

create or replace function public.guard_review_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.current_role()='PROVIDER'::public.app_role then
    if new.student_id is distinct from old.student_id
      or new.property_id is distinct from old.property_id
      or new.booking_id is distinct from old.booking_id
      or new.rating is distinct from old.rating
      or new.comment is distinct from old.comment
      or new.status is distinct from old.status then
      raise exception 'Providers may only respond to reviews for their properties';
    end if;
  elsif not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  return new;
end;
$$;
drop trigger if exists reviews_guard_changes on public.reviews;
create trigger reviews_guard_changes before update on public.reviews
for each row execute function public.guard_review_changes();

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications for select using (user_id=auth.uid());
create policy "users update own notifications" on public.notifications for update using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "admins manage notifications" on public.notifications for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "students manage own complaints" on public.complaints;
drop policy if exists "admins read complaints" on public.complaints;
create policy "students read own complaints" on public.complaints for select using (student_id=auth.uid());
create policy "students create own complaints" on public.complaints for insert with check (student_id=auth.uid());
create policy "provider read property complaints" on public.complaints for select using (property_id is not null and public.is_provider_owner(property_id));
create policy "admins manage scoped complaints" on public.complaints for all
using (public.is_admin() and (property_id is null or exists(select 1 from public.properties p where p.id=property_id and public.can_access_university(p.university_id))))
with check (public.is_admin() and (property_id is null or exists(select 1 from public.properties p where p.id=property_id and public.can_access_university(p.university_id))));

drop policy if exists "students manage favourites" on public.favourites;
create policy "students read own favourites" on public.favourites for select
using (student_id=auth.uid() and public.current_role()='STUDENT'::public.app_role);
create policy "students save own favourites" on public.favourites for insert
with check (student_id=auth.uid() and public.current_role()='STUDENT'::public.app_role);
create policy "students remove own favourites" on public.favourites for delete
using (student_id=auth.uid() and public.current_role()='STUDENT'::public.app_role);
drop policy if exists "students manage saved searches" on public.saved_searches;
create policy "students manage own saved searches" on public.saved_searches for all
using (student_id=auth.uid() and public.current_role()='STUDENT'::public.app_role)
with check (student_id=auth.uid() and public.current_role()='STUDENT'::public.app_role);

drop policy if exists "provider document access" on public.provider_documents;
create policy "provider reads own documents" on public.provider_documents for select using (provider_id=auth.uid());
create policy "provider inserts own documents" on public.provider_documents for insert with check (provider_id=auth.uid() and public.current_role()='PROVIDER'::public.app_role);
create policy "admins read scoped provider documents" on public.provider_documents for select
using (
  public.is_system_admin()
  or exists(select 1 from public.properties p where p.provider_id=provider_documents.provider_id and public.can_access_university(p.university_id))
);
drop policy if exists "property document provider access" on public.property_documents;
create policy "provider reads own property documents" on public.property_documents for select using (provider_id=auth.uid());
create policy "provider inserts own property documents" on public.property_documents for insert
with check (provider_id=auth.uid() and public.is_provider_owner(property_id));
create policy "system admins manage own property documents" on public.property_documents for all
using (public.is_system_admin() and provider_id=auth.uid() and exists(select 1 from public.properties p where p.id=property_id and p.provider_id=auth.uid()))
with check (public.is_system_admin() and provider_id=auth.uid() and exists(select 1 from public.properties p where p.id=property_id and p.provider_id=auth.uid()));
create policy "admins read property documents" on public.property_documents for select
using (exists(select 1 from public.properties p where p.id=property_id and public.can_access_university(p.university_id)));
create policy "students read own application documents" on public.application_documents for select using (student_id=auth.uid());
create policy "students upload own application documents" on public.application_documents for insert
with check (student_id=auth.uid() and exists(select 1 from public.applications a where a.id=application_id and a.student_id=auth.uid()));
create policy "providers read application documents" on public.application_documents for select
using (exists(select 1 from public.applications a where a.id=application_id and public.is_provider_owner(a.property_id)));
create policy "admins read application documents" on public.application_documents for select
using (exists(select 1 from public.applications a join public.properties p on p.id=a.property_id where a.id=application_id and public.can_access_university(p.university_id)));

alter table public.application_documents enable row level security;
alter table public.review_flags enable row level security;
alter table public.system_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.contact_messages enable row level security;

create policy "student creates review flag" on public.review_flags for insert
with check (reporter_id=auth.uid() and public.current_role()='STUDENT'::public.app_role);
create policy "reporter reads own review flags" on public.review_flags for select using (reporter_id=auth.uid());
create policy "admins manage scoped review flags" on public.review_flags for all
using (
  exists(select 1 from public.reviews r where r.id=review_id and exists(select 1 from public.properties p where p.id=r.property_id and public.can_access_university(p.university_id)))
)
with check (
  exists(select 1 from public.reviews r where r.id=review_id and exists(select 1 from public.properties p where p.id=r.property_id and public.can_access_university(p.university_id)))
);
drop trigger if exists review_flags_guard on public.review_flags;
create trigger review_flags_guard before insert or update on public.review_flags
for each row execute function public.guard_review_flag();

create policy "system admins manage settings" on public.system_settings for all
using (public.is_system_admin()) with check (public.is_system_admin());
create policy "system admins read audit logs" on public.audit_logs for select using (public.is_system_admin());
create policy "public submit contact messages" on public.contact_messages for insert with check (true);
create policy "admins read contact messages" on public.contact_messages for select using (public.is_admin());

drop policy if exists "provider upload property media" on storage.objects;
drop policy if exists "provider manage property media" on storage.objects;
drop policy if exists "provider upload verification documents" on storage.objects;
drop policy if exists "provider read own verification documents" on storage.objects;
drop policy if exists "admins read verification documents" on storage.objects;
drop policy if exists "providers read application documents" on storage.objects;
create policy "provider uploads media for own properties" on storage.objects for insert
with check (
  bucket_id='property-media'
  and (storage.foldername(name))[1]=auth.uid()::text
  and (public.is_provider() or public.is_system_admin())
  and exists(select 1 from public.properties p where p.id::text=(storage.foldername(name))[2] and p.provider_id=auth.uid())
);
create policy "provider deletes own property media" on storage.objects for delete
using (
  bucket_id='property-media'
  and (storage.foldername(name))[1]=auth.uid()::text
  and (public.is_provider() or public.is_system_admin())
  and exists(select 1 from public.properties p where p.id::text=(storage.foldername(name))[2] and p.provider_id=auth.uid())
);
create policy "provider uploads own verification documents" on storage.objects for insert
with check (
  bucket_id='verification-documents'
  and (storage.foldername(name))[1]=auth.uid()::text
  and (
    (public.current_role()='PROVIDER'::public.app_role and (
      (storage.foldername(name))[2]='company'
      or exists(select 1 from public.properties p where p.id::text=(storage.foldername(name))[2] and p.provider_id=auth.uid())
    ))
    or (public.is_system_admin() and exists(
      select 1 from public.properties p where p.id::text=(storage.foldername(name))[2] and p.provider_id=auth.uid()
    ))
    or (public.current_role()='STUDENT'::public.app_role and exists(
      select 1 from public.applications a where a.id::text=(storage.foldername(name))[2] and a.student_id=auth.uid()
    ))
  )
);
create policy "provider reads own verification documents" on storage.objects for select
using (bucket_id='verification-documents' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "providers read application documents" on storage.objects for select
using (
  bucket_id='verification-documents'
  and exists (
    select 1 from public.application_documents d
    join public.applications a on a.id=d.application_id
    where d.storage_path=name and public.is_provider_owner(a.property_id)
  )
);
create policy "admins read scoped verification documents" on storage.objects for select
using (
  bucket_id='verification-documents'
  and (
    public.is_system_admin()
    or exists (
      select 1 from public.property_documents d
      join public.properties p on p.id=d.property_id
      where d.storage_path=name and public.can_access_university(p.university_id)
    )
    or exists (
      select 1 from public.provider_documents d
      join public.properties p on p.provider_id=d.provider_id
      where d.storage_path=name and public.can_access_university(p.university_id)
    )
    or exists (
      select 1 from public.application_documents d
      join public.applications a on a.id=d.application_id
      join public.properties p on p.id=a.property_id
      where d.storage_path=name and public.can_access_university(p.university_id)
    )
  )
);
