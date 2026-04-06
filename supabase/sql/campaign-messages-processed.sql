alter table public.campaign_messages
  add column if not exists processed boolean not null default false,
  add column if not exists processed_at timestamptz;

create index if not exists idx_campaign_messages_processed
  on public.campaign_messages (processed);

create index if not exists idx_campaign_messages_campaign_processed
  on public.campaign_messages (campaign_id, processed);
