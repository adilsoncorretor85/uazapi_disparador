-- View with live metrics from campaign_messages
-- Apply with: npx supabase db query --linked -f supabase/sql/campaigns-with-metrics.sql

drop view if exists public.campaigns_with_metrics;

create view public.campaigns_with_metrics as
select
  c.id,
  c.instance_id,
  c.title,
  c.description,
  c.status,
  c.use_randomizer,
  c.message_body,
  c.media_type,
  c.media_url,
  c.scheduled_at,
  c.started_at,
  c.completed_at,
  c.timezone,
  c.audience_tags,
  c.audience_tags_exclude,
  c.audience_cities,
  c.audience_bairros,
  c.audience_ruas,
  c.delay_min_seconds,
  c.delay_max_seconds,
  c.batch_size,
  c.max_attempts,
  c.readchat,
  c.use_composing,
  c.typing_delay_seconds,
  c.link_preview,
  c.link_preview_title,
  c.link_preview_description,
  c.link_preview_image,
  c.link_preview_large,
  coalesce(m.total_numbers, 0) as total_numbers,
  coalesce(m.total_processed, 0) as total_processed,
  coalesce(m.total_sent, 0) as total_sent,
  coalesce(m.total_delivered, 0) as total_delivered,
  coalesce(m.total_read, 0) as total_read,
  coalesce(m.total_failed, 0) as total_failed,
  case
    when c.status in ('draft','scheduled','paused','cancelled','error') then c.status
    when coalesce(m.total_numbers, 0) = 0 then c.status
    when coalesce(m.total_processed, 0) >= coalesce(m.total_numbers, 0) then 'completed'
    else 'processing'
  end as derived_status,
  c.created_at,
  c.updated_at
from public.campaigns c
left join (
  select
    campaign_id,
    count(*) as total_numbers,
    count(*) filter (where processed is true) as total_processed,
    count(*) filter (where status in ('sending','sent','delivered','read','played')) as total_sent,
    count(*) filter (where status in ('delivered','read')) as total_delivered,
    count(*) filter (where status = 'read') as total_read,
    count(*) filter (where status = 'failed') as total_failed
  from public.campaign_messages
  group by campaign_id
) m on m.campaign_id = c.id;
