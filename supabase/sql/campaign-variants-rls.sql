-- Allow read access to campaign variants when service_role is not available.
-- Apply with: npx supabase db query --linked -f supabase/sql/campaign-variants-rls.sql

alter table public.campaign_message_variants enable row level security;

drop policy if exists "public_read_campaign_message_variants" on public.campaign_message_variants;

create policy "public_read_campaign_message_variants"
  on public.campaign_message_variants
  for select
  to anon, authenticated
  using (true);
