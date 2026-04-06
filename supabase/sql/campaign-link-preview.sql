-- Support link preview content type
-- Apply with: npx supabase db query --linked -f supabase/sql/campaign-link-preview.sql

alter table public.campaigns
  add column if not exists link_preview boolean not null default false;

alter table public.campaign_messages
  add column if not exists link_preview boolean not null default false;
