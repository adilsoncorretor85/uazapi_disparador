-- Contacts schema updates for richer profile + multi-instance support
-- Apply with: npx supabase db query --linked -f supabase/sql/contacts.sql

alter table public.contacts
  add column if not exists data_nascimento text,
  add column if not exists genero text,
  add column if not exists bairro text,
  add column if not exists cep text,
  add column if not exists rua text,
  add column if not exists numero_residencia text,
  add column if not exists complemento text,
  add column if not exists ponto_referencia text;

-- Remove global unique constraint so the same number can exist in different instances
alter table public.contacts
  drop constraint if exists contacts_whatsapp_e164_key;

drop index if exists contacts_whatsapp_e164_key;

-- Helpful indexes for filtering
create index if not exists idx_contacts_instance_city
  on public.contacts using btree (instance_id, city)
  where city is not null and city <> '';

create index if not exists idx_contacts_instance_bairro
  on public.contacts using btree (instance_id, bairro)
  where bairro is not null and bairro <> '';

create index if not exists idx_contacts_instance_genero
  on public.contacts using btree (instance_id, genero)
  where genero is not null and genero <> '';

-- Ensure upsert can use ON CONFLICT (instance_id, whatsapp_digits)
drop index if exists public.uq_contacts_instance_whatsapp_digits;

create unique index if not exists uq_contacts_instance_whatsapp_digits
  on public.contacts using btree (instance_id, whatsapp_digits);
