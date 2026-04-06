-- Contact filter options (tags, cities, bairros, ruas) by instance
-- Apply with: npx supabase db query --linked -f supabase/sql/contacts-filter-options.sql

create or replace function public.list_contact_filter_options(
  p_instance_id uuid,
  p_city_search text default null,
  p_city text default null,
  p_bairro text default null
)
returns table (
  tags text[],
  cities text[],
  bairros text[],
  ruas text[]
)
language sql
security definer
set search_path = public
as $$
  with base as (
    select *
    from public.contacts c
    where c.instance_id = p_instance_id
      and c.opted_in is true
      and c.is_valid is true
  ),
  tags_cte as (
    select
      coalesce(
        array_agg(distinct tag order by tag)
          filter (where tag is not null and tag <> ''),
        '{}'
      ) as tags
    from base b
    left join lateral unnest(b.tags) as tag on true
  ),
  cities_cte as (
    select
      coalesce(
        array_agg(distinct city order by city)
          filter (where city is not null and city <> ''),
        '{}'
      ) as cities
    from base
    where (p_city_search is null or city ilike '%' || p_city_search || '%')
  ),
  bairros_cte as (
    select
      coalesce(
        array_agg(distinct bairro order by bairro)
          filter (where bairro is not null and bairro <> ''),
        '{}'
      ) as bairros
    from base
    where (p_city is not null and city = p_city)
  ),
  ruas_cte as (
    select
      coalesce(
        array_agg(distinct rua order by rua)
          filter (where rua is not null and rua <> ''),
        '{}'
      ) as ruas
    from base
    where (p_city is not null and city = p_city)
      and (p_bairro is not null and bairro = p_bairro)
  )
  select
    tags_cte.tags,
    cities_cte.cities,
    case when p_city is null then '{}'::text[] else bairros_cte.bairros end,
    case when p_city is null or p_bairro is null then '{}'::text[] else ruas_cte.ruas end
  from tags_cte, cities_cte, bairros_cte, ruas_cte;
$$;

revoke all on function public.list_contact_filter_options(uuid, text, text, text) from public;
grant execute on function public.list_contact_filter_options(uuid, text, text, text) to service_role;
