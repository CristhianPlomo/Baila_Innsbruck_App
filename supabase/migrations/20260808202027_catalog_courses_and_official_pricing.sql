begin;

-- This project currently uses course_groups as the user-facing Course layer and
-- courses as either an optional Style or the direct technical record for a
-- course without styles. Keep that compatible model and make Supabase the
-- source of truth for the catalogue shown by the app.

create unique index if not exists courses_slug_key on public.courses (slug);

-- The catalogue can expose levels directly from a course or insert an optional
-- Style step. `supports_styles` records that the course is structurally ready
-- for styles even when its current public navigation remains direct.
alter table public.course_groups
  add column if not exists catalog_mode text not null default 'direct',
  add column if not exists supports_styles boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'course_groups_catalog_mode_valid'
      and conrelid = 'public.course_groups'::regclass
  ) then
    alter table public.course_groups
      add constraint course_groups_catalog_mode_valid
      check (catalog_mode in ('direct', 'styles'));
  end if;
end $$;

alter table public.course_instances
  add column if not exists catalog_code text,
  add column if not exists weekday smallint,
  add column if not exists start_time time without time zone,
  add column if not exists end_time time without time zone;

create unique index if not exists course_instances_catalog_code_key
  on public.course_instances (catalog_code)
  where catalog_code is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'course_instances_weekday_valid'
  ) then
    alter table public.course_instances
      add constraint course_instances_weekday_valid
      check (weekday is null or weekday between 1 and 7);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'course_instances_time_range_valid'
  ) then
    alter table public.course_instances
      add constraint course_instances_time_range_valid
      check (start_time is null or end_time is null or end_time > start_time);
  end if;
end $$;

alter table public.commercial_products
  add column if not exists billing_cycle text,
  add column if not exists enrollment_mode text,
  add column if not exists min_course_count smallint,
  add column if not exists max_course_count smallint,
  add column if not exists session_count smallint,
  add column if not exists validity_days integer,
  add column if not exists mid_month_discount_start_day smallint,
  add column if not exists mid_month_discount_percent numeric(5,2);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'commercial_products_billing_cycle_valid'
  ) then
    alter table public.commercial_products
      add constraint commercial_products_billing_cycle_valid
      check (billing_cycle is null or billing_cycle in (
        'trial', 'single', 'calendar_month', 'eleven_weeks', 'package', 'annual'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'commercial_products_enrollment_mode_valid'
  ) then
    alter table public.commercial_products
      add constraint commercial_products_enrollment_mode_valid
      check (enrollment_mode is null or enrollment_mode in ('solo', 'duo', 'full', 'flexible'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'commercial_products_course_count_valid'
  ) then
    alter table public.commercial_products
      add constraint commercial_products_course_count_valid
      check (
        (min_course_count is null or min_course_count >= 0)
        and (max_course_count is null or max_course_count >= min_course_count)
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'commercial_products_session_count_valid'
  ) then
    alter table public.commercial_products
      add constraint commercial_products_session_count_valid
      check (session_count is null or session_count > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'commercial_products_validity_days_valid'
  ) then
    alter table public.commercial_products
      add constraint commercial_products_validity_days_valid
      check (validity_days is null or validity_days > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'commercial_products_mid_month_discount_valid'
  ) then
    alter table public.commercial_products
      add constraint commercial_products_mid_month_discount_valid
      check (
        (mid_month_discount_start_day is null or mid_month_discount_start_day between 1 and 31)
        and (mid_month_discount_percent is null or mid_month_discount_percent between 0 and 100)
      );
  end if;
end $$;

-- Replace the old mixed Salsa & Bachata group with five independent courses.
-- Bachata deliberately remains direct for now, while supports_styles=true
-- preserves the planned path to Tradicional, Sensual, Bachazouk and Influence.
insert into public.course_groups (
  name,
  slug,
  description,
  sort_order,
  is_active,
  catalog_mode,
  supports_styles
)
values
  ('Salsa', 'salsa', 'Find your timing, flow and musicality.', 1, true, 'styles', true),
  ('Bachata', 'bachata', 'Connection, body movement and confidence.', 2, true, 'direct', true),
  ('Popping', 'popping', 'Isolations, hits and playful musicality.', 3, true, 'direct', false),
  ('Heels', 'heels', 'Confidence, lines and expressive movement.', 4, true, 'direct', false),
  ('Zouk', 'zouk', 'Flow, connection and contemporary movement.', 5, true, 'direct', false)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  catalog_mode = excluded.catalog_mode,
  supports_styles = excluded.supports_styles,
  updated_at = now();

update public.course_groups
set is_active = false, updated_at = now()
where slug = 'salsa-bachata';

-- Reuse the original Salsa, Bachata and Heels records when possible so their
-- identifiers and historical relations remain valid.
update public.courses
set name = 'Salsa On1',
    slug = 'salsa-on1',
    description = 'Our academy favourite: energetic Los Angeles timing with a clear social-dance flow.',
    course_group_id = (select id from public.course_groups where slug = 'salsa'),
    is_active = true,
    updated_at = now()
where slug = 'salsa';

update public.courses
set name = 'Bachata',
    slug = 'bachata',
    description = 'Direct access to the four Bachata classes and their levels.',
    course_group_id = (select id from public.course_groups where slug = 'bachata'),
    is_active = true,
    updated_at = now()
where slug = 'bachata-beginner';

insert into public.courses (name, slug, description, course_group_id, is_active)
values
  ('Salsa On1', 'salsa-on1', 'Our academy favourite: energetic Los Angeles timing with a clear social-dance flow.', (select id from public.course_groups where slug = 'salsa'), true),
  ('Salsa On2', 'salsa-on2', 'Our second most popular Salsa style, focused on precision, rhythm and New York timing.', (select id from public.course_groups where slug = 'salsa'), true),
  ('Salsa cubana', 'salsa-cubana', 'Circular partnerwork, playful movement and the lively character of Cuban Salsa.', (select id from public.course_groups where slug = 'salsa'), true),
  ('Bachata', 'bachata', 'Direct access to the four Bachata classes and their levels.', (select id from public.course_groups where slug = 'bachata'), true),
  ('Popping', 'popping', 'Direct access to the Popping Foundations class.', (select id from public.course_groups where slug = 'popping'), true),
  ('Heels', 'heels', 'Direct access to Heels Lab by Lena.', (select id from public.course_groups where slug = 'heels'), true),
  ('Zouk', 'zouk', 'Direct access to Zouk mode on by Dana.', (select id from public.course_groups where slug = 'zouk'), true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  course_group_id = excluded.course_group_id,
  is_active = excluded.is_active,
  updated_at = now();

-- Only these styles/direct course records form the current public catalogue.
update public.courses
set is_active = false, updated_at = now()
where course_group_id in (
  select id from public.course_groups where slug in ('salsa', 'bachata', 'popping', 'heels', 'zouk')
)
and slug not in ('salsa-on1', 'salsa-on2', 'salsa-cubana', 'bachata', 'popping', 'heels', 'zouk');

with desired_levels(style_slug, level_code, name, description, sort_order) as (
  values
    ('salsa-on1', 'beginner'::public.course_level_code, 'Salsa On1 Beginner', 'Build solid timing, basic partnerwork and confidence from the very first step.', 1),
    ('salsa-on1', 'improver'::public.course_level_code, 'Salsa On1 Improver', 'Expand your vocabulary and make your partnerwork smoother, clearer and more musical.', 2),
    ('salsa-on2', 'beginner'::public.course_level_code, 'Salsa On2 Beginner', 'Understand On2 timing and build a precise, comfortable foundation.', 1),
    ('salsa-on2', 'improver'::public.course_level_code, 'Salsa On2 Improver', 'Develop flow, turn technique and stronger musical interpretation on On2.', 2),
    ('salsa-cubana', 'beginner'::public.course_level_code, 'Salsa cubana Beginner', 'Discover Cuban rhythm, circular movement and the essential partnerwork vocabulary.', 1),
    ('salsa-cubana', 'improver'::public.course_level_code, 'Salsa cubana Improver', 'Connect figures with more freedom, rhythm and playful social-dance energy.', 2),
    ('bachata', 'beginner'::public.course_level_code, 'Bachata Beginner Level', 'A welcoming introduction to Bachata timing, basic steps and partner connection.', 1),
    ('bachata', 'improver'::public.course_level_code, 'Bachata Sensual Improver', 'Build control, body movement and fluid transitions for social dancing.', 2),
    ('bachata', 'intermediate_1'::public.course_level_code, 'Bachata Sensual Intermediate', 'Refine your technique and combine movements with more musical freedom.', 3),
    ('bachata', 'advanced_1'::public.course_level_code, 'Bachata Sensual Advanced', 'Advanced technique, expression and demanding partnerwork for experienced dancers.', 4),
    ('popping', 'open_level'::public.course_level_code, 'Popping Foundations', 'An open-level class to explore hits, grooves, isolations and freestyle tools.', 1),
    ('heels', 'open_level'::public.course_level_code, 'Heels Lab by Lena - Open Level', 'An open-level lab for confident movement, elegant lines and personal expression.', 1),
    ('zouk', 'open_level'::public.course_level_code, 'Zouk mode on by Dana - Open Level', 'An open-level journey through Zouk connection, flow and continuous movement.', 1)
)
insert into public.course_levels (course_id, level_code, name, description, sort_order, is_active)
select c.id, d.level_code, d.name, d.description, d.sort_order, true
from desired_levels d
join public.courses c on c.slug = d.style_slug
on conflict (course_id, level_code) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

with desired_levels(style_slug, level_code) as (
  values
    ('salsa-on1', 'beginner'::public.course_level_code), ('salsa-on1', 'improver'::public.course_level_code),
    ('salsa-on2', 'beginner'::public.course_level_code), ('salsa-on2', 'improver'::public.course_level_code),
    ('salsa-cubana', 'beginner'::public.course_level_code), ('salsa-cubana', 'improver'::public.course_level_code),
    ('bachata', 'beginner'::public.course_level_code), ('bachata', 'improver'::public.course_level_code),
    ('bachata', 'intermediate_1'::public.course_level_code), ('bachata', 'advanced_1'::public.course_level_code),
    ('popping', 'open_level'::public.course_level_code),
    ('heels', 'open_level'::public.course_level_code),
    ('zouk', 'open_level'::public.course_level_code)
)
update public.course_levels cl
set is_active = false, updated_at = now()
from public.courses c
where cl.course_id = c.id
  and c.slug in ('salsa-on1', 'salsa-on2', 'salsa-cubana', 'bachata', 'popping', 'heels', 'zouk')
  and not exists (
    select 1 from desired_levels d
    where d.style_slug = c.slug and d.level_code = cl.level_code
  );

-- Hide superseded test/legacy offerings without deleting their history.
update public.course_instances ci
set is_active = false, is_visible = false, updated_at = now()
from public.courses c
where ci.course_id = c.id
  and c.slug in ('salsa-on1', 'salsa-on2', 'salsa-cubana', 'bachata', 'popping', 'heels', 'zouk')
  and ci.catalog_code is null;

with offerings(
  catalog_code, style_slug, level_code, title, description, teacher_name,
  weekday, start_time, end_time, duration_text, duration_hours, capacity
) as (
  values
    ('salsa-on1-beginner', 'salsa-on1', 'beginner'::public.course_level_code, 'Salsa On1 Beginner', 'On1 timing, basic steps, turns, connection and a first social-dance combination.', 'Cristhian', 2, '18:00'::time, '19:00'::time, 'Tuesday · 18:00–19:00', 1.00, 25),
    ('salsa-on1-improver', 'salsa-on1', 'improver'::public.course_level_code, 'Salsa On1 Improver', 'Cross-body lead variations, turn technique, connection and musical combinations.', 'Cristhian', 2, '19:00'::time, '20:00'::time, 'Tuesday · 19:00–20:00', 1.00, 25),
    ('salsa-on2-beginner', 'salsa-on2', 'beginner'::public.course_level_code, 'Salsa On2 Beginner', 'On2 timing, clave awareness, weight transfer and simple partnerwork.', 'Cristhian', 3, '18:00'::time, '19:00'::time, 'Wednesday · 18:00–19:00', 1.00, 25),
    ('salsa-on2-improver', 'salsa-on2', 'improver'::public.course_level_code, 'Salsa On2 Improver', 'Turn preparation, partnerwork technique, shines and musical combinations.', 'Cristhian', 3, '19:00'::time, '20:00'::time, 'Wednesday · 19:00–20:00', 1.00, 25),
    ('salsa-cubana-beginner', 'salsa-cubana', 'beginner'::public.course_level_code, 'Salsa cubana Beginner', 'Cuban basic step, dile que no, enchufla and circular lead and follow.', 'Cristhian', 4, '18:00'::time, '19:00'::time, 'Thursday · 18:00–19:00', 1.00, 25),
    ('salsa-cubana-improver', 'salsa-cubana', 'improver'::public.course_level_code, 'Salsa cubana Improver', 'Setenta foundations, variations, rueda vocabulary and musical transitions.', 'Cristhian', 4, '19:00'::time, '20:00'::time, 'Thursday · 19:00–20:00', 1.00, 25),
    ('bachata-beginner', 'bachata', 'beginner'::public.course_level_code, 'Bachata Beginner Level', 'Bachata timing, basic step, weight transfer, simple turns and partner connection.', 'Cristhian', 1, '18:00'::time, '19:00'::time, 'Monday · 18:00–19:00', 1.00, 25),
    ('bachata-improver', 'bachata', 'improver'::public.course_level_code, 'Bachata Sensual Improver', 'Body movement, waves, isolations, lead and follow technique and combinations.', 'Cristhian', 1, '19:00'::time, '20:00'::time, 'Monday · 19:00–20:00', 1.00, 25),
    ('bachata-intermediate', 'bachata', 'intermediate_1'::public.course_level_code, 'Bachata Sensual Intermediate', 'Safe body movement, direction changes, musical interpretation and partnerwork.', 'Cristhian', 3, '20:00'::time, '21:15'::time, 'Wednesday · 20:00–21:15', 1.25, 25),
    ('bachata-advanced', 'bachata', 'advanced_1'::public.course_level_code, 'Bachata Sensual Advanced', 'Advanced movement technique, complex transitions, dynamics and expression.', 'Cristhian', 5, '19:30'::time, '20:45'::time, 'Friday · 19:30–20:45', 1.25, 25),
    ('popping-foundations', 'popping', 'open_level'::public.course_level_code, 'Popping Foundations', 'Hits, grooves, isolations, muscle control and freestyle concepts.', 'Matija', 5, '18:00'::time, '19:15'::time, 'Friday · 18:00–19:15', 1.25, 20),
    ('heels-lab-lena', 'heels', 'open_level'::public.course_level_code, 'Heels Lab by Lena - Open Level', 'Heels posture, walking, lines, transitions, choreography and confidence.', 'Lena', 4, '20:00'::time, '21:15'::time, 'Thursday · 20:00–21:15', 1.25, 20),
    ('zouk-mode-on-dana', 'zouk', 'open_level'::public.course_level_code, 'Zouk mode on by Dana - Open Level', 'Zouk foundations, elasticity, flowing turns and safe head-movement technique.', 'Dana', 7, '17:00'::time, '18:15'::time, 'Sunday · 17:00–18:15', 1.25, 20)
)
insert into public.course_instances (
  catalog_code, course_id, course_level_id, title, description, teacher_display_name,
  start_date, end_date, weekday, start_time, end_time, duration_text, duration_hours,
  classes_per_week, location, capacity, requires_contract, contract_type,
  is_active, is_visible
)
select
  o.catalog_code, c.id, cl.id, o.title, o.description, o.teacher_name,
  date '2026-09-01', date '2027-06-30', o.weekday, o.start_time, o.end_time,
  o.duration_text, o.duration_hours, 1, 'Baila Innsbruck · Jahnstraße 20, 6020 Innsbruck',
  o.capacity, false, 'none'::public.contract_type, true, true
from offerings o
join public.courses c on c.slug = o.style_slug
join public.course_levels cl on cl.course_id = c.id and cl.level_code = o.level_code
on conflict (catalog_code) where catalog_code is not null do update set
  course_id = excluded.course_id,
  course_level_id = excluded.course_level_id,
  title = excluded.title,
  description = excluded.description,
  teacher_display_name = excluded.teacher_display_name,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  weekday = excluded.weekday,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  duration_text = excluded.duration_text,
  duration_hours = excluded.duration_hours,
  classes_per_week = excluded.classes_per_week,
  location = excluded.location,
  capacity = excluded.capacity,
  requires_contract = excluded.requires_contract,
  contract_type = excluded.contract_type,
  is_active = true,
  is_visible = true,
  updated_at = now();

-- Official commercial plans. Prices are resolved by product code and customer
-- category; no price is trusted from the browser.
insert into public.commercial_products (
  code, name, description, type, billing_cycle, enrollment_mode,
  min_course_count, max_course_count, session_count, validity_days,
  mid_month_discount_start_day, mid_month_discount_percent, is_active
)
values
  ('trial_class', 'First trial class', 'One free first class.', 'flexible', 'trial', 'flexible', 1, 1, 1, 1, null, null, true),
  ('single_class', 'Single class', 'Access to one selected class.', 'flexible', 'single', 'flexible', 1, 1, 1, 1, null, null, true),
  ('solo_monthly', 'Solo monthly pass', 'Calendar-month access to one selected course.', 'course_pass', 'calendar_month', 'solo', 1, 1, null, null, 15, 40, true),
  ('solo_quarterly_11_weeks', 'Solo 11-week term', 'Eleven-week access to one selected course.', 'course_pass', 'eleven_weeks', 'solo', 1, 1, null, 77, null, null, true),
  ('duo_monthly', 'Duo monthly pass', 'Calendar-month access to two selected courses.', 'course_pass', 'calendar_month', 'duo', 2, 2, null, null, 15, 40, true),
  ('duo_quarterly_11_weeks', 'Duo 11-week term', 'Eleven-week access to two selected courses.', 'course_pass', 'eleven_weeks', 'duo', 2, 2, null, 77, null, null, true),
  ('unlimited_monthly', 'Full Month pass', 'Calendar-month access to every regular course. Available from three selected courses.', 'course_pass', 'calendar_month', 'full', 3, null, null, null, 15, 40, true),
  ('package_10_sessions', '10 Classes Pack', 'Ten flexible sessions valid for four months.', 'flexible', 'package', 'flexible', 1, null, 10, 120, null, null, true),
  ('membership_annual', 'Annual membership', 'Annual membership benefits.', 'membership', 'annual', 'flexible', 0, null, null, 365, null, null, true)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  type = excluded.type,
  billing_cycle = excluded.billing_cycle,
  enrollment_mode = excluded.enrollment_mode,
  min_course_count = excluded.min_course_count,
  max_course_count = excluded.max_course_count,
  session_count = excluded.session_count,
  validity_days = excluded.validity_days,
  mid_month_discount_start_day = excluded.mid_month_discount_start_day,
  mid_month_discount_percent = excluded.mid_month_discount_percent,
  is_active = excluded.is_active,
  updated_at = now();

-- First deactivate the current matrix for these products. Rows explicitly
-- inserted below become active; omitted rows mean "not available".
update public.commercial_product_prices cpp
set is_active = false, updated_at = now()
from public.commercial_products cp
where cpp.commercial_product_id = cp.id
  and cp.code in (
    'trial_class', 'single_class', 'solo_monthly', 'solo_quarterly_11_weeks',
    'duo_monthly', 'duo_quarterly_11_weeks', 'unlimited_monthly',
    'package_10_sessions', 'membership_annual'
  );

with official_prices(product_code, customer_category, amount) as (
  values
    ('trial_class', 'regular', 0.00), ('trial_class', 'student', 0.00), ('trial_class', 'member', 0.00), ('trial_class', 'student_member', 0.00), ('trial_class', 'erasmus', 0.00),
    ('single_class', 'regular', 18.00), ('single_class', 'student', 17.00), ('single_class', 'member', 17.00), ('single_class', 'student_member', 17.00), ('single_class', 'erasmus', 10.00),
    ('solo_monthly', 'regular', 64.00), ('solo_monthly', 'student', 59.00), ('solo_monthly', 'member', 59.00), ('solo_monthly', 'student_member', 59.00), ('solo_monthly', 'erasmus', 39.00),
    ('solo_quarterly_11_weeks', 'regular', 180.00), ('solo_quarterly_11_weeks', 'student', 165.00), ('solo_quarterly_11_weeks', 'member', 165.00), ('solo_quarterly_11_weeks', 'student_member', 165.00), ('solo_quarterly_11_weeks', 'erasmus', 105.00),
    ('duo_monthly', 'regular', 99.00), ('duo_monthly', 'student', 89.00), ('duo_monthly', 'member', 89.00), ('duo_monthly', 'student_member', 89.00), ('duo_monthly', 'erasmus', 59.00),
    ('duo_quarterly_11_weeks', 'regular', 285.00), ('duo_quarterly_11_weeks', 'student', 255.00), ('duo_quarterly_11_weeks', 'member', 255.00), ('duo_quarterly_11_weeks', 'student_member', 255.00), ('duo_quarterly_11_weeks', 'erasmus', 165.00),
    ('unlimited_monthly', 'regular', 130.00), ('unlimited_monthly', 'student', 120.00), ('unlimited_monthly', 'member', 120.00), ('unlimited_monthly', 'student_member', 120.00),
    ('package_10_sessions', 'regular', 160.00), ('package_10_sessions', 'student', 150.00), ('package_10_sessions', 'member', 150.00), ('package_10_sessions', 'student_member', 150.00),
    ('membership_annual', 'regular', 25.00), ('membership_annual', 'student', 25.00), ('membership_annual', 'member', 25.00), ('membership_annual', 'student_member', 25.00)
)
insert into public.commercial_product_prices (
  commercial_product_id, customer_category, amount, currency, is_active
)
select cp.id, p.customer_category, p.amount, 'EUR', true
from official_prices p
join public.commercial_products cp on cp.code = p.product_code
on conflict (commercial_product_id, customer_category) do update set
  amount = excluded.amount,
  currency = excluded.currency,
  is_active = true,
  updated_at = now();

-- Existing tables already have RLS. Keep explicit Data API grants aligned with
-- the public catalogue and authenticated admin mutations.
grant select on public.course_groups, public.courses, public.course_levels,
  public.course_instances, public.commercial_products,
  public.commercial_product_prices to anon, authenticated;
grant insert, update, delete on public.course_groups, public.courses,
  public.course_levels, public.course_instances, public.commercial_products,
  public.commercial_product_prices to authenticated;

commit;
