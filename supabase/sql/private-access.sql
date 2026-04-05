-- Server-only helper functions to access private schema safely via service_role.
-- Apply with: supabase db query --linked -f supabase/sql/private-access.sql

create or replace function public.list_whatsapp_instances()
returns table (
  id uuid,
  name text,
  provider text,
  base_url text,
  instance_name text,
  owner_number text,
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
         is_active,
         send_readchat,
         send_composing,
         throttle_per_minute,
         created_at,
         updated_at
  from private.whatsapp_instances
  order by created_at desc;
$$;

create or replace function public.save_whatsapp_instance(
  p_id uuid,
  p_name text,
  p_provider text,
  p_base_url text,
  p_instance_name text,
  p_owner_number text,
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

revoke all on function public.list_whatsapp_instances() from public;
revoke all on function public.save_whatsapp_instance(uuid, text, text, text, text, text, text, boolean, boolean, boolean, integer) from public;
revoke all on function public.list_webhook_events(bigint, integer, integer) from public;

grant execute on function public.list_whatsapp_instances() to service_role;
grant execute on function public.save_whatsapp_instance(uuid, text, text, text, text, text, text, boolean, boolean, boolean, integer) to service_role;
grant execute on function public.list_webhook_events(bigint, integer, integer) to service_role;
