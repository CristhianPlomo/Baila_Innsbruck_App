import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, Check, CheckCircle2, CircleAlert, CircleX, ScanLine, Search, ShieldCheck, Ticket, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  approveQrPurchase,
  consumeQrAccess,
  getAdminQrAccessRecords,
  rejectQrPurchase,
  validateQrValue,
  type QrAccessRecord,
  type QrAccessStatus,
  type QrValidationResult,
} from "../lib/qr-access";
import ConfirmDialog from "./ConfirmDialog";

type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
};
type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

function getBarcodeDetector() {
  return (globalThis as typeof globalThis & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector ?? null;
}

function statusClass(status: QrAccessStatus) {
  return status === "active" ? "active" : status === "pending" ? "pending" : status === "refunded" ? "refunded" : "draft";
}

function dateLabel(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function recordMatches(record: QrAccessRecord, query: string) {
  const haystack = [record.name, record.email, record.productName, record.courseSummary, record.id].join(" ").toLocaleLowerCase();
  return haystack.includes(query);
}

export default function AdminQrControl() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<QrAccessRecord[]>(() => getAdminQrAccessRecords());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | QrAccessStatus>("all");
  const [code, setCode] = useState("");
  const [selected, setSelected] = useState<QrAccessRecord | null>(null);
  const [validation, setValidation] = useState<QrValidationResult | null>(null);
  const [message, setMessage] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraDetectionAvailable, setCameraDetectionAvailable] = useState(true);
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | "consume" | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const scanningRef = useRef(false);

  function refreshRecords() {
    const next = getAdminQrAccessRecords();
    setRecords(next);
    if (selected) {
      const nextSelected = next.find((record) => record.id === selected.id) ?? null;
      setSelected(nextSelected);
      if (nextSelected) setValidation(validateQrValue(nextSelected.qrValue, next));
    }
  }

  function stopCamera() {
    scanningRef.current = false;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraDetectionAvailable(true);
    setCameraActive(false);
  }

  useEffect(() => () => stopCamera(), []);

  function applyCode(value: string) {
    const result = validateQrValue(value, records);
    setCode(value);
    setValidation(result);
    setSelected(result.record);
    setMessage("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applyCode(code);
  }

  async function startCamera() {
    setCameraError("");
    const BarcodeDetector = getBarcodeDetector();
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t("admin.qrControl.cameraUnavailable"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      if (!videoRef.current) {
        stopCamera();
        return;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      scanningRef.current = true;
      setCameraActive(true);
      if (!BarcodeDetector) {
        setCameraDetectionAvailable(false);
        setCameraError(t("admin.qrControl.cameraDetectionUnavailable"));
        return;
      }
      let detector: BarcodeDetectorLike;
      try {
        detector = new BarcodeDetector({ formats: ["qr_code"] });
      } catch {
        setCameraDetectionAvailable(false);
        setCameraError(t("admin.qrControl.cameraDetectionUnavailable"));
        return;
      }
      const scanFrame = async () => {
        if (!scanningRef.current || !videoRef.current) return;
        try {
          const results = await detector.detect(videoRef.current);
          const value = results[0]?.rawValue?.trim();
          if (value) {
            applyCode(value);
            stopCamera();
            return;
          }
        } catch {
          setCameraError(t("admin.qrControl.cameraError"));
          stopCamera();
          return;
        }
        frameRef.current = requestAnimationFrame(() => void scanFrame());
      };
      frameRef.current = requestAnimationFrame(() => void scanFrame());
    } catch {
      setCameraError(t("admin.qrControl.cameraError"));
      stopCamera();
    }
  }

  function performAction(action: "approve" | "reject" | "consume") {
    if (!selected) return;
    setPendingAction(action);
  }

  function confirmAction() {
    if (!selected || !pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    const result = action === "approve" ? approveQrPurchase(selected) : action === "reject" ? rejectQrPurchase(selected) : consumeQrAccess(selected);
    if (!result) {
      setMessage(t("admin.qrControl.actionUnavailable"));
      return;
    }
    setMessage(action === "approve" ? t("admin.qrControl.approved") : action === "reject" ? t("admin.qrControl.rejected") : t("admin.qrControl.consumed"));
    refreshRecords();
  }

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredRecords = records.filter((record) => (statusFilter === "all" || record.status === statusFilter) && (!normalizedQuery || recordMatches(record, normalizedQuery)));
  const activeCount = records.filter((record) => record.status === "active").length;
  const pendingCount = records.filter((record) => record.status === "pending").length;
  const selectedIsRepeatable = selected?.kind === "pass" && selected.status === "active";
  const selectedCanConsume = selected?.status === "active" && (selected.kind === "session" || selected.kind === "free-trial");

  return <div className="qr-control-layout">
    <section className="admin-panel qr-control-scanner">
      <div className="admin-list-header"><div><p className="eyebrow"><ScanLine size={14} />{t("admin.qrControl.eyebrow")}</p><h2>{t("admin.qrControl.title")}</h2><p className="qr-control-copy">{t("admin.qrControl.copy")}</p></div><ShieldCheck size={22} /></div>
      <div className="qr-control-notice"><ShieldCheck size={16} /><p>{t("admin.qrControl.constructionNotice")}</p></div>
      <form className="qr-control-input" onSubmit={handleSubmit}><label htmlFor="admin-qr-code">{t("admin.qrControl.inputLabel")}</label><div><input id="admin-qr-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder={t("admin.qrControl.inputPlaceholder")} autoComplete="off" /><button className="primary-button small" type="submit"><ScanLine size={16} />{t("admin.qrControl.scanButton")}</button></div></form>
      <div className="qr-camera-area"><div className="qr-camera-header"><div><strong>{t("admin.qrControl.cameraTitle")}</strong><p>{t("admin.qrControl.cameraCopy")}</p></div>{cameraActive ? <button className="secondary-button compact" type="button" onClick={stopCamera}><X size={14} />{t("admin.qrControl.stopCamera")}</button> : <button className="secondary-button compact" type="button" onClick={() => void startCamera()}><Camera size={14} />{t("admin.qrControl.cameraButton")}</button>}</div><div className={`qr-camera-viewport${cameraActive ? " active" : ""}`}><video ref={videoRef} muted playsInline aria-label={t("admin.qrControl.cameraTitle")} /><span><ScanLine size={28} />{cameraActive ? (cameraDetectionAvailable ? t("admin.qrControl.cameraActive") : t("admin.qrControl.cameraManual")) : t("admin.qrControl.cameraPlaceholder")}</span></div>{cameraError && <p className={`form-message ${cameraDetectionAvailable ? "error" : "notice"}`} role="status"><CircleAlert size={15} />{cameraError}</p>}</div>
      {validation && <div className={`qr-validation-result ${validation.ok ? "valid" : "invalid"}`} role="status"><span>{validation.ok ? <CheckCircle2 size={19} /> : <CircleX size={19} />}</span><div><strong>{validation.ok ? t("admin.qrControl.validCode") : validation.reason === "notFound" ? t("admin.qrControl.notFound") : validation.reason === "empty" ? t("admin.qrControl.reason.empty") : t(`admin.qrControl.status.${validation.reason}`)}</strong><p>{validation.ok ? t("admin.qrControl.validCodeCopy") : validation.reason === "notFound" ? t("admin.qrControl.reason.notFound") : t(`admin.qrControl.reason.${validation.reason}`)}</p></div></div>}
      {message && <p className="form-message success" role="status"><Check size={15} />{message}</p>}
      {selected && <QrAccessDetails record={selected} repeatable={selectedIsRepeatable} canConsume={Boolean(selectedCanConsume)} onAction={performAction} />}
    </section>
    <section className="admin-panel admin-list-panel qr-control-records">
      <div className="admin-list-header"><div><p className="eyebrow"><Ticket size={14} />{t("admin.qrControl.recordsEyebrow")}</p><h2>{t("admin.qrControl.recordsTitle")}</h2></div><button className="secondary-button compact" type="button" onClick={refreshRecords}><Check size={14} />{t("admin.qrControl.refresh")}</button></div>
      <div className="qr-control-summary"><div><strong>{activeCount}</strong><span>{t("admin.qrControl.activeCount")}</span></div><div><strong>{pendingCount}</strong><span>{t("admin.qrControl.pendingCount")}</span></div><div><strong>{records.length}</strong><span>{t("admin.qrControl.totalCount")}</span></div></div>
      <div className="qr-record-toolbar"><label className="admin-search"><Search size={15} /><span className="sr-only">{t("admin.qrControl.searchLabel")}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("admin.qrControl.searchPlaceholder")} /></label><select className="status-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | QrAccessStatus)} aria-label={t("admin.qrControl.filterLabel")}><option value="all">{t("admin.qrControl.filterAll")}</option><option value="active">{t("admin.qrControl.status.active")}</option><option value="pending">{t("admin.qrControl.status.pending")}</option><option value="expired">{t("admin.qrControl.status.expired")}</option><option value="consumed">{t("admin.qrControl.status.consumed")}</option></select></div>
      {filteredRecords.length > 0 ? <div className="qr-record-list">{filteredRecords.map((record) => <button key={record.id} className={`qr-record-row${selected?.id === record.id ? " selected" : ""}`} type="button" onClick={() => { setSelected(record); setCode(record.qrValue); setValidation(validateQrValue(record.qrValue, records)); }}><span className="qr-record-icon"><ScanLine size={17} /></span><span className="qr-record-main"><strong>{record.name || t("admin.qrControl.unknownStudent")}</strong><small>{record.productName}</small><em>{record.courseSummary}</em></span><span className="qr-record-meta"><span className={`admin-status ${statusClass(record.status)}`}>{t(`admin.qrControl.status.${record.status}`)}</span><small>{dateLabel(record.validUntil)}</small></span></button>)}</div> : <div className="empty-state"><ScanLine size={22} /><strong>{t("admin.qrControl.noRecords")}</strong><p>{t("admin.qrControl.noRecordsCopy")}</p></div>}
    </section>
    <ConfirmDialog open={Boolean(pendingAction)} eyebrow={t("confirmations.eyebrow")} title={pendingAction === "approve" ? t("confirmations.approveTitle") : pendingAction === "reject" ? t("confirmations.rejectTitle") : t("confirmations.consumeTitle")} copy={pendingAction === "approve" ? t("confirmations.approveCopy") : pendingAction === "reject" ? t("confirmations.rejectCopy") : t("confirmations.consumeCopy")} confirmLabel={pendingAction === "approve" ? t("confirmations.approve") : pendingAction === "reject" ? t("confirmations.reject") : t("confirmations.consume")} cancelLabel={t("confirmations.cancel")} destructive={pendingAction === "reject" || pendingAction === "consume"} onConfirm={confirmAction} onCancel={() => setPendingAction(null)} />
  </div>;
}

function QrAccessDetails({ record, repeatable, canConsume, onAction }: { record: QrAccessRecord; repeatable: boolean; canConsume: boolean; onAction: (action: "approve" | "reject" | "consume") => void }) {
  const { t } = useTranslation();
  return <section className="qr-access-details"><div className="qr-access-details-heading"><div><p className="eyebrow">{t("admin.qrControl.detailsEyebrow")}</p><h3>{record.name || t("admin.qrControl.unknownStudent")}</h3></div><span className={`admin-status ${statusClass(record.status)}`}>{t(`admin.qrControl.status.${record.status}`)}</span></div><div className="qr-access-data"><div><small>{t("admin.qrControl.student")}</small><strong>{record.email || "—"}</strong></div><div><small>{t("admin.qrControl.product")}</small><strong>{record.productName}</strong></div><div><small>{t("admin.qrControl.classes")}</small><strong>{record.courseSummary}</strong></div><div><small>{t("admin.qrControl.validUntil")}</small><strong>{dateLabel(record.validUntil)}</strong></div></div>{record.kind === "session" && <p className="qr-access-rule"><Ticket size={15} />{t("admin.qrControl.singleUseRule")}</p>}{repeatable && <p className="qr-access-rule"><CheckCircle2 size={15} />{t("admin.qrControl.repeatableRule")}</p>}<div className="qr-access-actions">{record.status === "pending" && <><button className="primary-button small" type="button" onClick={() => onAction("approve")}><Check size={15} />{t("admin.qrControl.approve")}</button><button className="secondary-button compact danger" type="button" onClick={() => onAction("reject")}><CircleX size={15} />{t("admin.qrControl.reject")}</button></>}{canConsume && <button className="primary-button small" type="button" onClick={() => onAction("consume")}><CheckCircle2 size={15} />{t("admin.qrControl.consume")}</button>}</div></section>;
}
