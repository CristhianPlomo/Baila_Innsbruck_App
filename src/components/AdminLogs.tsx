import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Bell, CheckCircle2, CircleAlert, Clock3, Database, Eye, Filter, RefreshCw, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatAuditDate, getAdminAuditLogs, shortAuditId, type AdminAuditLog, type AdminNotification, type AuditCategory, type AuditSeverity } from "../lib/admin-logs";

type SeverityFilter = "all" | AuditSeverity;
type CategoryFilter = "all" | AuditCategory;

function severityIcon(severity: AuditSeverity) {
  if (severity === "critical") return <ShieldAlert size={17} aria-hidden="true" />;
  if (severity === "warning") return <AlertTriangle size={17} aria-hidden="true" />;
  return <Activity size={17} aria-hidden="true" />;
}

function displayLabel(value: string) {
  return value.replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function AdminLogs() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(0);
  const [tableAvailable, setTableAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [selected, setSelected] = useState<AdminAuditLog | null>(null);

  async function loadLogs() {
    setLoading(true);
    const result = await getAdminAuditLogs();
    setLogs(result.logs);
    setNotifications(result.notifications);
    setNotificationsOpen(result.notifications.length);
    setTableAvailable(result.tableAvailable);
    setSelected((current) => current ? result.logs.find((log) => log.id === current.id) ?? null : result.logs[0] ?? null);
    setLoading(false);
  }

  useEffect(() => { void loadLogs(); }, []);

  const filteredLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("en-US");
    return logs.filter((log) => {
      if (severity !== "all" && log.severity !== severity) return false;
      if (category !== "all" && log.category !== category) return false;
      if (!normalizedQuery) return true;
      return [log.action, log.summary, log.actorUserId, log.targetType, log.targetId, log.requestId].filter(Boolean).join(" ").toLocaleLowerCase("en-US").includes(normalizedQuery);
    });
  }, [category, logs, query, severity]);

  const openCritical = logs.filter((log) => log.severity === "critical" && log.alertStatus !== "resolved").length;
  const openWarnings = logs.filter((log) => log.severity === "warning" && log.alertStatus !== "resolved").length;
  const today = logs.filter((log) => new Date(log.createdAt).toDateString() === new Date().toDateString()).length;

  return <div className="admin-logs-page">
    <div className="admin-logs-heading">
      <div>
        <p className="eyebrow"><ShieldCheck size={15} /> {t("admin.logs.eyebrow")}</p>
        <h2>{t("admin.logs.title")}</h2>
        <p>{t("admin.logs.copy")}</p>
      </div>
      <button className="secondary-button compact" type="button" onClick={() => void loadLogs()} disabled={loading}>
        <RefreshCw size={15} className={loading ? "admin-logs-spin" : ""} /> {t("admin.logs.refresh")}
      </button>
    </div>

    <div className={`admin-logs-connection ${tableAvailable ? "connected" : "pending"}`} role="status">
      {tableAvailable ? <Database size={17} /> : <CircleAlert size={17} />}
      <div><strong>{tableAvailable ? t("admin.logs.connectedTitle") : t("admin.logs.pendingTitle")}</strong><span>{tableAvailable ? t("admin.logs.connectedCopy") : t("admin.logs.pendingCopy")}</span></div>
    </div>

    <div className="admin-logs-stats">
      <article><span className="admin-log-stat-icon critical"><ShieldAlert size={18} /></span><strong>{openCritical}</strong><small>{t("admin.logs.openCritical")}</small></article>
      <article><span className="admin-log-stat-icon warning"><AlertTriangle size={18} /></span><strong>{openWarnings}</strong><small>{t("admin.logs.openWarnings")}</small></article>
      <article><span className="admin-log-stat-icon info"><Activity size={18} /></span><strong>{today}</strong><small>{t("admin.logs.eventsToday")}</small></article>
      <article><span className="admin-log-stat-icon neutral"><Clock3 size={18} /></span><strong>{notificationsOpen}</strong><small>{t("admin.logs.openNotifications")}</small></article>
    </div>

    <section className="admin-notifications-panel">
      <div className="admin-notifications-heading"><div><p className="eyebrow"><Bell size={14} /> {t("admin.logs.notificationsEyebrow")}</p><h3>{t("admin.logs.notificationsTitle")}</h3><p>{t("admin.logs.notificationsCopy")}</p></div><span className="admin-log-count">{notificationsOpen}</span></div>
      {notifications.length > 0 ? <div className="admin-notifications-list">{notifications.map((notification) => <article className="admin-notification-row" key={notification.id}><span className={`admin-log-severity ${notification.severity}`}>{severityIcon(notification.severity)}</span><div><strong>{notification.title}</strong><p>{notification.message}</p><small>{formatAuditDate(notification.createdAt)}{notification.entityType ? ` · ${displayLabel(notification.entityType)}` : ""}</small></div><span className={`admin-log-badge ${notification.severity}`}>{t(`admin.logs.severityLabels.${notification.severity}`)}</span></article>)}</div> : <div className="admin-notifications-empty"><CheckCircle2 size={18} /><span>{t("admin.logs.noOpenNotifications")}</span></div>}
    </section>

    <div className="admin-logs-layout">
      <section className="admin-logs-list-panel">
        <div className="admin-logs-toolbar">
          <label className="admin-logs-search"><Search size={16} /><span className="sr-only">{t("admin.logs.search")}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("admin.logs.searchPlaceholder")} /></label>
          <label className="admin-logs-filter"><Filter size={14} /><span className="sr-only">{t("admin.logs.severity")}</span><select value={severity} onChange={(event) => setSeverity(event.target.value as SeverityFilter)}><option value="all">{t("admin.logs.allSeverities")}</option><option value="critical">{t("admin.logs.severityLabels.critical")}</option><option value="warning">{t("admin.logs.severityLabels.warning")}</option><option value="info">{t("admin.logs.severityLabels.info")}</option></select></label>
          <label className="admin-logs-filter"><span className="sr-only">{t("admin.logs.category")}</span><select value={category} onChange={(event) => setCategory(event.target.value as CategoryFilter)}><option value="all">{t("admin.logs.allCategories")}</option><option value="auth">{t("admin.logs.categoryLabels.auth")}</option><option value="commerce">{t("admin.logs.categoryLabels.commerce")}</option><option value="catalog">{t("admin.logs.categoryLabels.catalog")}</option><option value="qr">{t("admin.logs.categoryLabels.qr")}</option><option value="admin">{t("admin.logs.categoryLabels.admin")}</option><option value="system">{t("admin.logs.categoryLabels.system")}</option></select></label>
        </div>
        <div className="admin-logs-list" aria-live="polite">
          {loading ? <div className="admin-logs-empty"><RefreshCw size={25} className="admin-logs-spin" /><strong>{t("admin.logs.loading")}</strong></div> : filteredLogs.length === 0 ? <div className="admin-logs-empty"><Database size={25} /><strong>{tableAvailable ? t("admin.logs.noResults") : t("admin.logs.noEvents")}</strong><p>{tableAvailable ? t("admin.logs.noResultsCopy") : t("admin.logs.noEventsCopy")}</p></div> : filteredLogs.map((log) => <button type="button" className={`admin-log-row ${selected?.id === log.id ? "selected" : ""}`} key={log.id} onClick={() => setSelected(log)}>
            <span className={`admin-log-severity ${log.severity}`}>{severityIcon(log.severity)}</span>
            <span className="admin-log-row-main"><strong>{log.summary}</strong><small>{displayLabel(log.action)} · {formatAuditDate(log.createdAt)}</small></span>
            <span className={`admin-log-badge ${log.severity}`}>{t(`admin.logs.severityLabels.${log.severity}`)}</span>
          </button>)}
        </div>
      </section>

      <aside className="admin-log-detail-panel">
        {selected ? <>
          <div className="admin-log-detail-heading"><div><p className="eyebrow">{t("admin.logs.detailEyebrow")}</p><h3>{selected.summary}</h3></div><span className={`admin-log-badge ${selected.severity}`}>{t(`admin.logs.severityLabels.${selected.severity}`)}</span></div>
          <dl className="admin-log-detail-facts"><div><dt>{t("admin.logs.action")}</dt><dd>{selected.action}</dd></div><div><dt>{t("admin.logs.category")}</dt><dd>{t(`admin.logs.categoryLabels.${selected.category}`)}</dd></div><div><dt>{t("admin.logs.occurred")}</dt><dd>{formatAuditDate(selected.createdAt)}</dd></div><div><dt>{t("admin.logs.actor")}</dt><dd>{shortAuditId(selected.actorUserId)}</dd></div><div><dt>{t("admin.logs.target")}</dt><dd>{selected.targetType ? `${selected.targetType}${selected.targetId ? ` · ${shortAuditId(selected.targetId)}` : ""}` : "—"}</dd></div><div><dt>{t("admin.logs.requestId")}</dt><dd>{shortAuditId(selected.requestId)}</dd></div></dl>
          <div className="admin-log-metadata"><p className="eyebrow">{t("admin.logs.metadata")}</p>{Object.keys(selected.metadata).length > 0 ? <pre>{JSON.stringify(selected.metadata, null, 2)}</pre> : <p>{t("admin.logs.noMetadata")}</p>}</div>
        </> : <div className="admin-logs-detail-empty"><Eye size={23} /><strong>{t("admin.logs.selectEvent")}</strong><p>{t("admin.logs.selectEventCopy")}</p></div>}
      </aside>
    </div>

    <section className="admin-logs-guardrails">
      <div className="admin-logs-guardrails-icon"><ShieldCheck size={19} /></div>
      <div><p className="eyebrow">{t("admin.logs.guardrailsEyebrow")}</p><h3>{t("admin.logs.guardrailsTitle")}</h3><p>{t("admin.logs.guardrailsCopy")}</p></div>
      <ul><li>{t("admin.logs.guardrails.server")}</li><li>{t("admin.logs.guardrails.private")}</li><li>{t("admin.logs.guardrails.retention")}</li></ul>
    </section>
  </div>;
}
