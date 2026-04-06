-- Normalize status on insert/update to satisfy campaign_messages_status_check
-- Apply with: npx supabase db query --linked -f supabase/sql/campaign-messages-status-normalize.sql

create or replace function public.normalize_campaign_message_status()
returns trigger
language plpgsql
as $$
declare
  v text;
begin
  if new.status is null or btrim(new.status) = '' then
    new.status := 'pending';
    return new;
  end if;

  v := lower(new.status);

  new.status :=
    case v
      when 'pending' then 'pending'
      when 'queued' then 'pending'
      when 'locked' then 'locked'
      when 'sending' then 'sending'
      when 'sent' then 'sent'
      when 'delivered' then 'delivered'
      when 'read' then 'read'
      when 'played' then 'played'
      when 'failed' then 'failed'
      when 'error' then 'failed'
      when 'cancelled' then 'cancelled'
      when 'canceled' then 'cancelled'
      else 'pending'
    end;

  return new;
end;
$$;

drop trigger if exists trg_campaign_messages_normalize_status on public.campaign_messages;

create trigger trg_campaign_messages_normalize_status
before insert or update on public.campaign_messages
for each row
execute function public.normalize_campaign_message_status();
