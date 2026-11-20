insert into public.universities (id, name, city, province)
values ('00000000-0000-0000-0000-000000000001','Tshwane University of Technology','Pretoria','Gauteng')
on conflict (id) do update set name=excluded.name;

insert into public.campuses (university_id,name,city,province) values
('00000000-0000-0000-0000-000000000001','Pretoria Campus (Pretoria West)','Pretoria','Gauteng'),
('00000000-0000-0000-0000-000000000001','Arcadia Campus','Pretoria','Gauteng'),
('00000000-0000-0000-0000-000000000001','Arts Campus','Pretoria','Gauteng'),
('00000000-0000-0000-0000-000000000001','Ga-Rankuwa Campus','Pretoria','Gauteng'),
('00000000-0000-0000-0000-000000000001','Soshanguve North Campus','Pretoria','Gauteng'),
('00000000-0000-0000-0000-000000000001','Soshanguve South Campus','Pretoria','Gauteng'),
('00000000-0000-0000-0000-000000000001','eMalahleni Campus','eMalahleni','Mpumalanga'),
('00000000-0000-0000-0000-000000000001','Mbombela Campus','Mbombela','Mpumalanga'),
('00000000-0000-0000-0000-000000000001','Polokwane Campus','Polokwane','Limpopo'),
('00000000-0000-0000-0000-000000000001','Giyani Campus','Giyani','Limpopo')
on conflict (university_id,name) do nothing;
