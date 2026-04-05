-- Server-only helper functions to access private schema safely via service_role.
-- Apply with: supabase db query --linked -f supabase/sql/private-access.sql

alter table private.whatsapp_instances
  add column if not exists usuario uuid,
  add column if not exists descricao text,
  add column if not exists telefone text,
  add column if not exists cidade text,
  add column if not exists estado text,
  add column if not exists acessores text[],
  add column if not exists prazo_solicitacoes text,
  add column if not exists conexao_w text,
  add column if not exists campanha_pause boolean not null default false,
  add column if not exists campanha_horario_pause time not null default '20:00:00'::time,
  add column if not exists campanha_horario_reinicio time not null default '07:00:00'::time;

drop function if exists public.list_whatsapp_instances();

create or replace function public.list_whatsapp_instances()
returns table (
  id uuid,
  name text,
  provider text,
  base_url text,
  instance_name text,
  owner_number text,
  descricao text,
  telefone text,
  cidade text,
  estado text,
  acessores text[],
  prazo_solicitacoes text,
  conexao_w text,
  campanha_pause boolean,
  campanha_horario_pause time,
  campanha_horario_reinicio time,
  is_active boolean,
  send_readchat boolean,
  send_composing boolean,
  throttle_per_minute integer,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = private, public
as $$
  select id,
         name,
         provider,
         base_url,
         instance_name,
         owner_number,
         descricao,
         telefone,
         cidade,
         estado,
         acessores,
         prazo_solicitacoes,
         conexao_w,
         campanha_pause,
         campanha_horario_pause,
         campanha_horario_reinicio,
         is_active,
         send_readchat,
         send_composing,
         throttle_per_minute,
         created_at,
         updated_at
  from private.whatsapp_instances
  order by created_at desc;
$$;

drop function if exists public.save_whatsapp_instance(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  boolean,
  integer
);

create or replace function public.save_whatsapp_instance(
  p_id uuid,
  p_name text,
  p_provider text,
  p_base_url text,
  p_instance_name text,
  p_owner_number text,
  p_descricao text,
  p_telefone text,
  p_cidade text,
  p_estado text,
  p_acessores text[],
  p_prazo_solicitacoes text,
  p_conexao_w text,
  p_campanha_pause boolean,
  p_campanha_horario_pause time,
  p_campanha_horario_reinicio time,
  p_token text,
  p_is_active boolean,
  p_send_readchat boolean,
  p_send_composing boolean,
  p_throttle_per_minute integer
)
returns uuid
language plpgsql
security definer
set search_path = private, public
as $$
declare
  v_id uuid;
begin
  if p_id is null then
    insert into private.whatsapp_instances(
      name,
      provider,
      base_url,
      instance_name,
      owner_number,
      descricao,
      telefone,
      cidade,
      estado,
      acessores,
      prazo_solicitacoes,
      conexao_w,
      campanha_pause,
      campanha_horario_pause,
      campanha_horario_reinicio,
      token,
      is_active,
      send_readchat,
      send_composing,
      throttle_per_minute
    ) values (
      p_name,
      p_provider,
      p_base_url,
      p_instance_name,
      p_owner_number,
      p_descricao,
      p_telefone,
      p_cidade,
      p_estado,
      p_acessores,
      p_prazo_solicitacoes,
      p_conexao_w,
      coalesce(p_campanha_pause, false),
      coalesce(p_campanha_horario_pause, '20:00:00'::time),
      coalesce(p_campanha_horario_reinicio, '07:00:00'::time),
      p_token,
      coalesce(p_is_active, true),
      coalesce(p_send_readchat, false),
      coalesce(p_send_composing, false),
      p_throttle_per_minute
    )
    returning id into v_id;
  else
    update private.whatsapp_instances
    set name = p_name,
        provider = p_provider,
        base_url = p_base_url,
        instance_name = p_instance_name,
        owner_number = p_owner_number,
        descricao = p_descricao,
        telefone = p_telefone,
        cidade = p_cidade,
        estado = p_estado,
        acessores = p_acessores,
        prazo_solicitacoes = p_prazo_solicitacoes,
        conexao_w = p_conexao_w,
        campanha_pause = coalesce(p_campanha_pause, campanha_pause),
        campanha_horario_pause = coalesce(p_campanha_horario_pause, campanha_horario_pause),
        campanha_horario_reinicio = coalesce(p_campanha_horario_reinicio, campanha_horario_reinicio),
        token = case when p_token is null or p_token = '' then token else p_token end,
        is_active = coalesce(p_is_active, is_active),
        send_readchat = coalesce(p_send_readchat, send_readchat),
        send_composing = coalesce(p_send_composing, send_composing),
        throttle_per_minute = p_throttle_per_minute
    where id = p_id
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

create or replace function public.get_whatsapp_instance_secret(p_id uuid)
returns table (
  id uuid,
  base_url text,
  token text,
  instance_name text
)
language sql
security definer
set search_path = private, public
as $$
  select id, base_url, token, instance_name
  from private.whatsapp_instances
  where id = p_id;
$$;

create or replace function public.list_webhook_events(
  p_campaign_id bigint,
  p_limit integer default 200,
  p_offset integer default 0
)
returns table (
  id text,
  campaign_id bigint,
  received_at timestamptz,
  event_type text,
  provider_message_id text,
  process_status text,
  error_message text,
  payload jsonb
)
language sql
security definer
set search_path = private, public
as $$
  select we.id::text as id,
         cm.campaign_id,
         we.received_at,
         we.event_type,
         we.provider_message_id,
         we.process_status,
         we.error_message,
         we.payload
  from private.webhook_events we
  join public.campaign_messages cm
    on cm.provider_message_id = we.provider_message_id
  where cm.campaign_id = p_campaign_id
  order by we.received_at desc
  limit p_limit offset p_offset;
$$;

create or replace function public.update_whatsapp_instance_connection(
  p_id uuid,
  p_conexao_w text
)
returns void
language sql
security definer
set search_path = private, public
as $$
  update private.whatsapp_instances
  set conexao_w = p_conexao_w
  where id = p_id;
$$;

revoke all on function public.list_whatsapp_instances() from public;
revoke all on function public.save_whatsapp_instance(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text[],
  text,
  text,
  boolean,
  time,
  time,
  text,
  boolean,
  boolean,
  boolean,
  integer
) from public;
revoke all on function public.get_whatsapp_instance_secret(uuid) from public;
revoke all on function public.update_whatsapp_instance_connection(uuid, text) from public;
revoke all on function public.list_webhook_events(bigint, integer, integer) from public;

grant execute on function public.list_whatsapp_instances() to service_role;
grant execute on function public.save_whatsapp_instance(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text[],
  text,
  text,
  boolean,
  time,
  time,
  text,
  boolean,
  boolean,
  boolean,
  integer
) to service_role;
grant execute on function public.get_whatsapp_instance_secret(uuid) to service_role;
grant execute on function public.update_whatsapp_instance_connection(uuid, text) to service_role;
grant execute on function public.list_webhook_events(bigint, integer, integer) to service_role;