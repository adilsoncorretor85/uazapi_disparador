-- Separate typing (composing) delay from inter-message delay
-- Apply with: npx supabase db query --linked -f supabase/sql/campaign-typing-delay.sql

alter table public.campaigns
  add column if not exists typing_delay_seconds integer not null default 0;

alter table public.campaign_messages
  add column if not exists typing_delay_seconds integer not null default 0;
