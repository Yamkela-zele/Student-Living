create extension if not exists pgcrypto;

create type public.app_role as enum ('STUDENT','PROVIDER','UNIVERSITY_ADMIN','SYSTEM_ADMIN');
create type public.property_status as enum ('PENDING','APPROVED','REJECTED','SUSPENDED');
create type public.application_status as enum ('SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','CANCELLED','BOOKED');
create type public.booking_status as enum ('PENDING','CONFIRMED','ACTIVE','COMPLETED','CANCELLED');
create type public.notification_status as enum ('UNREAD','READ');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'STUDENT',
  first_name text,
  last_name text,
  email text,
  phone text,
  student_number text,
  course text,
  year_of_study text,
  university_id uuid,
  campus_id uuid,
  business_name text,
  registration_number text,
  verification_status text default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  city text,
  province text,
  created_at timestamptz not null default now()
);

create table public.campuses (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  name text not null,
  city text,
  province text,
  created_at timestamptz not null default now(),
  unique(university_id, name)
);

alter table public.profiles
  add constraint profiles_university_fk foreign key (university_id) references public.universities(id),
  add constraint profiles_campus_fk foreign key (campus_id) references public.campuses(id);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete cascade,
  university_id uuid references public.universities(id),
  campus_id uuid references public.campuses(id),
  name text not null,
  address text,
  suburb text,
  city text,
  description text,
  facilities text[] not null default '{}',
  furnished boolean not null default false,
  capacity integer check (capacity >= 0),
  price numeric(12,2) check (price >= 0),
  virtual_tour_url text,
  status public.property_status not null default 'PENDING',
  rejection_reason text,
  nsfas_accredited boolean not null default false,
  accreditation_expires_at date,
  reverification_due_at date,
  last_inspection_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  number text not null,
  type text not null,
  price numeric(12,2) not null check (price >= 0),
  status text not null default 'AVAILABLE',
  created_at timestamptz not null default now(),
  unique(property_id, number)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  room_id uuid references public.rooms(id),
  note text,
  status public.application_status not null default 'SUBMITTED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  application_id uuid references public.applications(id),
  property_id uuid not null references public.properties(id),
  room_id uuid references public.rooms(id),
  start_date date,
  end_date date,
  status public.booking_status not null default 'PENDING',
  created_at timestamptz not null default now()
);

create table public.favourites (
  student_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, property_id)
);

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  booking_id uuid references public.bookings(id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  status text not null default 'PUBLISHED',
  provider_response text,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  status public.notification_status not null default 'UNREAD',
  created_at timestamptz not null default now()
);

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id),
  property_id uuid references public.properties(id),
  title text not null,
  description text,
  status text not null default 'OPEN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.property_documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  provider_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null,
  storage_path text not null,
  file_name text,
  mime_type text,
  created_at timestamptz not null default now()
);

create table public.provider_documents (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null,
  storage_path text not null,
  file_name text,
  mime_type text,
  created_at timestamptz not null default now()
);

create table public.property_media (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  media_type text not null check (media_type in ('PHOTO','VIDEO')),
  storage_path text not null,
  file_name text,
  mime_type text,
  duration_seconds integer,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('UNIVERSITY_ADMIN','SYSTEM_ADMIN'));
$$;

create or replace function public.is_provider_owner(property_uuid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.properties where id = property_uuid and provider_id = auth.uid());
$$;

create or replace function public.is_provider()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'PROVIDER');
$$;

create or replace function public.protect_property_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() and new.status is distinct from old.status then
    new.status := old.status;
  end if;
  if not public.is_admin() and new.provider_id is distinct from old.provider_id then
    new.provider_id := old.provider_id;
  end if;
  return new;
end;
$$;
create trigger properties_protect_status before update on public.properties for each row execute function public.protect_property_status();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id,email,first_name,last_name)
  values (new.id,new.email,new.raw_user_meta_data->>'first_name',new.raw_user_meta_data->>'last_name')
  on conflict (id) do update set email=excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger properties_updated before update on public.properties for each row execute function public.set_updated_at();
create trigger applications_updated before update on public.applications for each row execute function public.set_updated_at();
create trigger complaints_updated before update on public.complaints for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.universities enable row level security;
alter table public.campuses enable row level security;
alter table public.properties enable row level security;
alter table public.rooms enable row level security;
alter table public.applications enable row level security;
alter table public.bookings enable row level security;
alter table public.favourites enable row level security;
alter table public.saved_searches enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.complaints enable row level security;
alter table public.property_documents enable row level security;
alter table public.provider_documents enable row level security;
alter table public.property_media enable row level security;

create policy "public read universities" on public.universities for select using (true);
create policy "admins manage universities" on public.universities for all using (public.is_admin()) with check (public.is_admin());
create policy "public read campuses" on public.campuses for select using (true);
create policy "admins manage campuses" on public.campuses for all using (public.is_admin()) with check (public.is_admin());
create policy "public read approved properties" on public.properties for select using (status='APPROVED');
create policy "providers read own properties" on public.properties for select using (provider_id=auth.uid());
create policy "admins read properties" on public.properties for select using (public.is_admin());
create policy "providers create properties" on public.properties for insert with check (provider_id=auth.uid() and public.is_provider());
create policy "providers update own properties" on public.properties for update using (provider_id=auth.uid() and public.is_provider()) with check (provider_id=auth.uid() and public.is_provider());
create policy "admins update properties" on public.properties for update using (public.is_admin());

create policy "public read approved property rooms" on public.rooms for select using (exists(select 1 from public.properties p where p.id=property_id and p.status='APPROVED'));
create policy "providers manage own rooms" on public.rooms for all using (public.is_provider_owner(property_id)) with check (public.is_provider_owner(property_id));

create policy "users read own profile" on public.profiles for select using (id=auth.uid() or public.is_admin());
create policy "users update own profile" on public.profiles for update using (id=auth.uid()) with check (id=auth.uid());

create policy "students manage favourites" on public.favourites for all using (student_id=auth.uid()) with check (student_id=auth.uid());
create policy "students manage saved searches" on public.saved_searches for all using (student_id=auth.uid()) with check (student_id=auth.uid());
create policy "users read own notifications" on public.notifications for all using (user_id=auth.uid()) with check (user_id=auth.uid());

create policy "students manage own applications" on public.applications for all using (student_id=auth.uid()) with check (student_id=auth.uid());
create policy "providers read property applications" on public.applications for select using (exists(select 1 from public.properties p where p.id=property_id and p.provider_id=auth.uid()));
create policy "students manage own bookings" on public.bookings for all using (student_id=auth.uid()) with check (student_id=auth.uid());
create policy "providers read property bookings" on public.bookings for select using (exists(select 1 from public.properties p where p.id=property_id and p.provider_id=auth.uid()));

create policy "public read published reviews" on public.reviews for select using (status='PUBLISHED');
create policy "students manage own reviews" on public.reviews for all using (student_id=auth.uid()) with check (student_id=auth.uid());

create policy "students manage own complaints" on public.complaints for all using (student_id=auth.uid()) with check (student_id=auth.uid());
create policy "admins read complaints" on public.complaints for select using (public.is_admin());

create policy "provider document access" on public.provider_documents for all using (provider_id=auth.uid()) with check (provider_id=auth.uid());
create policy "property document provider access" on public.property_documents for all using (provider_id=auth.uid()) with check (provider_id=auth.uid());
create policy "property media public read" on public.property_media for select using (exists(select 1 from public.properties p where p.id=property_id and p.status='APPROVED'));
create policy "property media provider manage" on public.property_media for all using (public.is_provider_owner(property_id)) with check (public.is_provider_owner(property_id));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values
  ('property-media','property-media',true,524288000,array['image/jpeg','image/png','video/mp4','video/webm','video/quicktime']),
  ('verification-documents','verification-documents',false,52428800,array['application/pdf','image/jpeg','image/png','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "provider upload property media" on storage.objects for insert with check (bucket_id='property-media' and auth.role()='authenticated');
create policy "public read property media" on storage.objects for select using (bucket_id='property-media');
create policy "provider manage property media" on storage.objects for delete using (bucket_id='property-media' and auth.uid()::text=(storage.foldername(name))[1]);
create policy "provider upload verification documents" on storage.objects for insert with check (bucket_id='verification-documents' and auth.role()='authenticated');
create policy "provider read own verification documents" on storage.objects for select using (bucket_id='verification-documents' and auth.uid()::text=(storage.foldername(name))[1]);
create policy "admins read verification documents" on storage.objects for select using (bucket_id='verification-documents' and public.is_admin());
