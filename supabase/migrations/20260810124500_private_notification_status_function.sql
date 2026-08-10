-- Keep notification acknowledgement outside the exposed Data API.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

drop function if exists public.update_admin_notification_status(uuid, text);

create or replace function private.update_admin_notification_status(_notification_id uuid, _status text, _admin_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if _admin_id is null or not public.has_role(_admin_id, 'admin'::public.app_role) then
    raise exception 'Administrator access required';
  end if;
  if _status not in ('acknowledged', 'resolved') then
    raise exception 'Invalid notification status';
  end if;

  update public.admin_notifications
  set status = _status,
      read_at = coalesce(read_at, now()),
      read_by = coalesce(read_by, _admin_id),
      resolved_at = case when _status = 'resolved' then now() else resolved_at end,
      resolved_by = case when _status = 'resolved' then _admin_id else resolved_by end
  where id = _notification_id;

  if not found then
    raise exception 'Notification not found';
  end if;

  insert into public.system_logs (admin_id, action_type, entity_type, entity_id, status, message, severity, category, source, alert_status)
  values (_admin_id, 'admin.notification_status_updated', 'admin_notification', _notification_id, 'success', _status, 'info', 'admin', 'server', 'resolved');
end;
$$;

revoke all on function private.update_admin_notification_status(uuid, text, uuid) from public, anon, authenticated;
grant execute on function private.update_admin_notification_status(uuid, text, uuid) to service_role;
