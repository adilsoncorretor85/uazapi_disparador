-- Custom link preview fields
-- Apply with: npx supabase db query --linked -f supabase/sql/campaign-link-preview-custom.sql

alter table public.campaigns
  add column if not exists link_preview_title text,
  add column if not exists link_preview_description text,
  add column if not exists link_preview_image text,
  add column if not exists link_preview_large boolean not null default false;

alter table public.campaign_messages
  add column if not exists link_preview_title text,
  add column if not exists link_preview_description text,
  add column if not exists link_preview_image text,
  add column if not exists link_preview_large boolean not null default false;
