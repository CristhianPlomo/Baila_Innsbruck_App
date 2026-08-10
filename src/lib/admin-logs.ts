import { supabase } from "./supabase";

export type AuditSeverity = "info" | "warning" | "critical";
export type AuditCategory = "auth" | "commerce" | "catalog" | "qr" | "admin" | "system";
export type AuditAlertStatus = "open" | "acknowledged" | "resolved";

export type AdminAuditLog = {
  id: string;
  createdAt: string;
  severity: AuditSeverity;
  category: AuditCategory;
  action: string;
  actorUserId: string | null;
  targetType: string | null;
  targetId: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  requestId: string | null;
  source: string;
  alertStatus: AuditAlertStatus;
};

export type AdminAuditLogResult = {
  logs: AdminAuditLog[];
  notifications: AdminNotification[];
  source: "supabase" | "construction";
  tableAvailable: boolean;
  error: string | null;
};

export type AdminNotification = {
  id: string;
  createdAt: string;
  severity: AuditSeverity;
  type: string;
  title: string;
  message: string;
  status: AuditAlertStatus;
  auditLogId: string | null;
  entityType: string | null;
  entityId: string | null;
};

type AuditLogRow = {
  id: string;
  created_at: string;
  severity: string | null;
  category: string | null;
  action_type: string;
  user_id: string | null;
  admin_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  status: string | null;
  message: string | null;
  metadata: unknown;
  request_id: string | null;
  source: string | null;
  alert_status: string | null;
};

type NotificationRow = {
  id: string;
  created_at: string;
  severity: string | null;
  notification_type: string;
  title: string;
  message: string;
  status: string | null;
  audit_log_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
};

const sensitiveKey = /(password|passwd|secret|token|authorization|cookie|api[_-]?key|service[_-]?role|smtp|qr[_-]?value|payment[_-]?method|card|cvv)/i;

function normalizeSeverity(value: string | null): AuditSeverity {
  return value === "critical" || value === "warning" ? value : "info";
}

function normalizeCategory(value: string | null): AuditCategory {
  return value === "auth" || value === "commerce" || value === "catalog" || value === "qr" || value === "admin" ? value : "system";
}

function normalizeAlertStatus(value: string | null): AuditAlertStatus {
  return value === "acknowledged" || value === "resolved" ? value : "open";
}

function sanitizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, item]) => !sensitiveKey.test(key) && ["string", "number", "boolean"].includes(typeof item)).slice(0, 25));
}

function mapRow(row: AuditLogRow): AdminAuditLog {
  return {
    id: row.id,
    createdAt: row.created_at,
    severity: normalizeSeverity(row.severity),
    category: normalizeCategory(row.category),
    action: row.action_type,
    actorUserId: row.admin_id ?? row.user_id,
    targetType: row.entity_type,
    targetId: row.entity_id,
    summary: row.message ?? row.action_type,
    metadata: sanitizeMetadata(row.metadata),
    requestId: row.request_id,
    source: row.source ?? "server",
    alertStatus: normalizeAlertStatus(row.alert_status),
  };
}

function mapNotification(row: NotificationRow): AdminNotification {
  return { id: row.id, createdAt: row.created_at, severity: normalizeSeverity(row.severity), type: row.notification_type, title: row.title, message: row.message, status: normalizeAlertStatus(row.status), auditLogId: row.audit_log_id, entityType: row.entity_type, entityId: row.entity_id };
}

/** Reads the protected audit and notification stream. The fallback is fail-closed. */
export async function getAdminAuditLogs(): Promise<AdminAuditLogResult> {
  if (!supabase) return { logs: [], notifications: [], source: "construction", tableAvailable: false, error: null };

  const [logsResult, notificationsResult] = await Promise.all([
    supabase.from("system_logs").select("id, created_at, severity, category, action_type, user_id, admin_id, entity_type, entity_id, status, message, metadata, request_id, source, alert_status").order("created_at", { ascending: false }).limit(100),
    supabase.from("admin_notifications").select("id, created_at, severity, notification_type, title, message, status, audit_log_id, entity_type, entity_id").eq("status", "open").order("created_at", { ascending: false }).limit(50),
  ]);

  if (logsResult.error || notificationsResult.error) {
    return { logs: [], notifications: [], source: "construction", tableAvailable: false, error: logsResult.error?.message ?? notificationsResult.error?.message ?? "Unable to read admin logs" };
  }

  return { logs: ((logsResult.data ?? []) as AuditLogRow[]).map(mapRow), notifications: ((notificationsResult.data ?? []) as NotificationRow[]).map(mapNotification), source: "supabase", tableAvailable: true, error: null };
}

export function formatAuditDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function shortAuditId(value: string | null) {
  if (!value) return "—";
  return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}
