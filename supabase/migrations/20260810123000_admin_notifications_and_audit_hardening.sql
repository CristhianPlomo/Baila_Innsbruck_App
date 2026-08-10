-- Baila Innsbruck: secure admin notifications and audit hardening.
-- This migration intentionally reuses the existing public.system_logs table.

alter table public.system_logs
  add column if not exists severity text not null default 'info',
  add column if not exists category text not null default 'system',
  add column if not exists request_id uuid,
  add column if not exists source text not null default 'server',
  add column if not exists alert_status text not null default 'resolved';

create index if not exists system_logs_created_at_idx on public.system_logs (created_at desc);
create index if not exists system_logs_severity_idx on public.system_logs (severity, created_at desc);
create index if not exists system_logs_category_idx on public.system_logs (category, created_at desc);
create index if not exists system_logs_request_id_idx on public.system_logs (request_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'system_logs_severity_check') then
    alter table public.system_logs add constraint system_logs_severity_check check (severity in ('info', 'warning', 'critical'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'system_logs_category_check') then
    alter table public.system_logs add constraint system_logs_category_check check (category in ('auth', 'commerce', 'catalog', 'qr', 'admin', 'system'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'system_logs_alert_status_check') then
    alter table public.system_logs add constraint system_logs_alert_status_check check (alert_status in ('open', 'acknowledged', 'resolved'));
  end if;
end;
$$;

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  severity text not null default 'warning',
  notification_type text not null,
  title text not null,
  message text not null,
  status text not null default 'open',
  audit_log_id uuid references public.system_logs(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  read_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

alter table public.admin_notifications enable row level security;

create index if not exists admin_notifications_status_idx on public.admin_notifications (status, severity, created_at desc);
create index if not exists admin_notifications_entity_idx on public.admin_notifications (entity_type, entity_id);
create index if not exists admin_notifications_actor_idx on public.admin_notifications (actor_user_id, created_at desc);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'admin_notifications_severity_check') then
    alter table public.admin_notifications add constraint admin_notifications_severity_check check (severity in ('info', 'warning', 'critical'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'admin_notifications_status_check') then
    alter table public.admin_notifications add constraint admin_notifications_status_check check (status in ('open', 'acknowledged', 'resolved'));
  end if;
end;
$$;

drop policy if exists "Admins can insert logs" on public.system_logs;
drop policy if exists "Admins can view all notifications" on public.admin_notifications;
create policy "Admins can view all notifications"
  on public.admin_notifications for select
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));

-- The old helper was executable by authenticated clients, which allowed users
-- to forge audit events. Keep it for trusted server compatibility only.
revoke execute on function public.log_action(uuid, uuid, text, text, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.log_action(uuid, uuid, text, text, uuid, text, text, jsonb) to service_role;

create or replace function public.record_security_event(
  _user_id uuid default null,
  _admin_id uuid default null,
  _action_type text default null,
  _entity_type text default 'system',
  _entity_id uuid default null,
  _severity text default 'info',
  _category text default 'system',
  _status text default 'success',
  _message text default null,
  _metadata jsonb default '{}'::jsonb,
  _request_id uuid default null,
  _source text default 'server',
  _notify_admins boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _log_id uuid;
  _safe_metadata jsonb;
  _alert_status text;
begin
  if current_user <> 'service_role' then
    raise exception 'record_security_event is server-only';
  end if;
  if coalesce(length(btrim(_action_type)), 0) = 0 or length(_action_type) > 120 then
    raise exception 'Invalid audit action';
  end if;
  if _severity not in ('info', 'warning', 'critical') then
    raise exception 'Invalid audit severity';
  end if;
  if _category not in ('auth', 'commerce', 'catalog', 'qr', 'admin', 'system') then
    raise exception 'Invalid audit category';
  end if;

  select coalesce(jsonb_object_agg(item.key, item.value), '{}'::jsonb)
    into _safe_metadata
  from jsonb_each(case when jsonb_typeof(_metadata) = 'object' then _metadata else '{}'::jsonb end) as item(key, value)
  where item.key !~* '(password|passwd|secret|token|authorization|cookie|api[_-]?key|service[_-]?role|smtp|qr[_-]?value|payment[_-]?method|card|cvv)'
    and jsonb_typeof(item.value) in ('string', 'number', 'boolean');

  _alert_status := case when _severity in ('warning', 'critical') or _notify_admins then 'open' else 'resolved' end;

  insert into public.system_logs (user_id, admin_id, action_type, entity_type, entity_id, status, message, metadata, severity, category, request_id, source, alert_status)
  values (_user_id, _admin_id, _action_type, coalesce(_entity_type, 'system'), _entity_id, coalesce(_status, 'success'), _message, _safe_metadata, _severity, _category, _request_id, coalesce(_source, 'server'), _alert_status)
  returning id into _log_id;

  if _severity in ('warning', 'critical') or _notify_admins then
    insert into public.admin_notifications (severity, notification_type, title, message, status, audit_log_id, actor_user_id, entity_type, entity_id, metadata)
    values (_severity, _action_type, _action_type, coalesce(_message, _action_type), 'open', _log_id, _user_id, _entity_type, _entity_id, _safe_metadata);
  end if;

  return _log_id;
end;
$$;

revoke all on function public.record_security_event(uuid, uuid, text, text, uuid, text, text, text, text, jsonb, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.record_security_event(uuid, uuid, text, text, uuid, text, text, text, text, jsonb, uuid, text, boolean) to service_role;

create or replace function public.update_admin_notification_status(_notification_id uuid, _status text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_role((select auth.uid()), 'admin'::public.app_role) then
    raise exception 'Administrator access required';
  end if;
  if _status not in ('acknowledged', 'resolved') then
    raise exception 'Invalid notification status';
  end if;

  update public.admin_notifications
  set status = _status,
      read_at = coalesce(read_at, now()),
      read_by = coalesce(read_by, (select auth.uid())),
      resolved_at = case when _status = 'resolved' then now() else resolved_at end,
      resolved_by = case when _status = 'resolved' then (select auth.uid()) else resolved_by end
  where id = _notification_id;

  if not found then
    raise exception 'Notification not found';
  end if;

  insert into public.system_logs (admin_id, action_type, entity_type, entity_id, status, message, severity, category, source, alert_status)
  values ((select auth.uid()), 'admin.notification_status_updated', 'admin_notification', _notification_id, 'success', _status, 'info', 'admin', 'server', 'resolved');
end;
$$;

revoke all on function public.update_admin_notification_status(uuid, text) from public, anon;
grant execute on function public.update_admin_notification_status(uuid, text) to authenticated;
