-- Server-only RPC for N8N to fetch connected instances with token.
-- Apply with: npx supabase db query --linked -f supabase/sql/instances-dispatch.sql

drop function if exists public.list_whatsapp_instances_dispatch();

create or replace function public.list_whatsapp_instances_dispatch()
returns table (
  id uuid,
  name text,
  instance_name text,
  owner_number text,
  base_url text,
  token text,
  conexao_w text,
  campanha_pause boolean,
  campanha_horario_pause time,
  campanha_horario_reinicio time,
  is_active boolean,
  throttle_per_minute integer
)
language sql
security definer
set search_path = private, public
as $$
  select id,
         name,
         instance_name,
         owner_number,
         base_url,
         token,
         conexao_w,
         campanha_pause,
         campanha_horario_pause,
         campanha_horario_reinicio,
         is_active,
         throttle_per_minute
    from private.whatsapp_instances
   where lower(coalesce(conexao_w, '')) = 'conectado'
     and is_active is true
   order by created_at desc;
$$;

revoke all on function public.list_whatsapp_instances_dispatch() from public;
grant execute on function public.list_whatsapp_instances_dispatch() to service_role;
