begin;

alter table public.daily_sales
  add column if not exists bag_type text,
  add column if not exists bag_quantity integer not null default 0,
  add column if not exists marketing_tool text,
  add column if not exists marketing_quantity integer not null default 0;

alter table public.daily_sales
  drop constraint if exists daily_sales_bag_quantity_check;

alter table public.daily_sales
  add constraint daily_sales_bag_quantity_check
  check (bag_quantity >= 0);

alter table public.daily_sales
  drop constraint if exists daily_sales_marketing_quantity_check;

alter table public.daily_sales
  add constraint daily_sales_marketing_quantity_check
  check (marketing_quantity >= 0);

with ancillary_rows as (
  select
    daily_sales_id,
    trans_date,
    pof_number,
    username,
    member_name,
    upper(trim(package_type)) as package_type,
    coalesce(quantity, 0) as quantity
  from public.daily_sales
  where upper(trim(package_type)) in (
    'SILVER_BAG',
    'BLUE_BAG',
    'BROCHURE',
    'TRIFOLD',
    'FLYERS',
    'TUMBLER'
  )
),
main_rows as (
  select distinct on (trans_date, pof_number, username, member_name)
    daily_sales_id,
    trans_date,
    pof_number,
    username,
    member_name
  from public.daily_sales
  where upper(trim(package_type)) not in (
    'SILVER_BAG',
    'BLUE_BAG',
    'BROCHURE',
    'TRIFOLD',
    'FLYERS',
    'TUMBLER'
  )
  order by trans_date, pof_number, username, member_name, daily_sales_id asc
),
rolled_up as (
  select
    m.daily_sales_id,
    max(case when a.package_type = 'SILVER_BAG' then 'SILVER_BAG' end) as bag_type_silver,
    sum(case when a.package_type = 'SILVER_BAG' then a.quantity else 0 end) as bag_qty_silver,
    max(case when a.package_type = 'BLUE_BAG' then 'BLUE_BAG' end) as bag_type_blue,
    sum(case when a.package_type = 'BLUE_BAG' then a.quantity else 0 end) as bag_qty_blue,
    max(case when a.package_type = 'BROCHURE' then 'BROCHURE' end) as tool_brochure,
    sum(case when a.package_type = 'BROCHURE' then a.quantity else 0 end) as tool_qty_brochure,
    max(case when a.package_type = 'TRIFOLD' then 'TRIFOLD' end) as tool_trifold,
    sum(case when a.package_type = 'TRIFOLD' then a.quantity else 0 end) as tool_qty_trifold,
    max(case when a.package_type = 'FLYERS' then 'FLYERS' end) as tool_flyers,
    sum(case when a.package_type = 'FLYERS' then a.quantity else 0 end) as tool_qty_flyers,
    max(case when a.package_type = 'TUMBLER' then 'TUMBLER' end) as tool_tumbler,
    sum(case when a.package_type = 'TUMBLER' then a.quantity else 0 end) as tool_qty_tumbler
  from main_rows m
  join ancillary_rows a
    on a.trans_date = m.trans_date
   and a.pof_number = m.pof_number
   and a.username = m.username
   and a.member_name = m.member_name
  group by m.daily_sales_id
)
update public.daily_sales d
set
  bag_type = case
    when coalesce(r.bag_qty_silver, 0) > 0 then 'SILVER_BAG'
    when coalesce(r.bag_qty_blue, 0) > 0 then 'BLUE_BAG'
    else d.bag_type
  end,
  bag_quantity = case
    when coalesce(r.bag_qty_silver, 0) > 0 then r.bag_qty_silver
    when coalesce(r.bag_qty_blue, 0) > 0 then r.bag_qty_blue
    else coalesce(d.bag_quantity, 0)
  end,
  marketing_tool = case
    when coalesce(r.tool_qty_brochure, 0) > 0 then 'BROCHURE'
    when coalesce(r.tool_qty_trifold, 0) > 0 then 'TRIFOLD'
    when coalesce(r.tool_qty_flyers, 0) > 0 then 'FLYERS'
    when coalesce(r.tool_qty_tumbler, 0) > 0 then 'TUMBLER'
    else d.marketing_tool
  end,
  marketing_quantity = case
    when coalesce(r.tool_qty_brochure, 0) > 0 then r.tool_qty_brochure
    when coalesce(r.tool_qty_trifold, 0) > 0 then r.tool_qty_trifold
    when coalesce(r.tool_qty_flyers, 0) > 0 then r.tool_qty_flyers
    when coalesce(r.tool_qty_tumbler, 0) > 0 then r.tool_qty_tumbler
    else coalesce(d.marketing_quantity, 0)
  end
from rolled_up r
where d.daily_sales_id = r.daily_sales_id;

delete from public.daily_sales
where upper(trim(package_type)) in (
  'SILVER_BAG',
  'BLUE_BAG',
  'BROCHURE',
  'TRIFOLD',
  'FLYERS',
  'TUMBLER'
);

commit;
