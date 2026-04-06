-- Audience filters for campaign base selection
-- Apply with: npx supabase db query --linked -f supabase/sql/campaign-audience-filters.sql

alter table public.campaigns
  add column if not exists audience_tags text[],
  add column if not exists audience_tags_exclude text[],
  add column if not exists audience_cities text[],
  add column if not exists audience_bairros text[],
  add column if not exists audience_ruas text[];
