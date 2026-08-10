import { getFreeTrialRegistrations, markFreeTrialConsumed } from "./free-trial";
import {
  consumeSimulatedSession,
  getSimulatedPurchasesForAdmin,
  updateSimulatedClassPaymentStatus,
  type UserPurchase,
} from "./purchases";
import { validateQrValue as validateQrValueCore, type QrValidationReason as CoreQrValidationReason } from "./qr-access-core";

export type QrAccessKind = "free-trial" | "pass" | "session";
export type QrAccessStatus = "active" | "pending" | "expired" | "consumed" | "refunded";

export type QrAccessRecord = {
  id: string;
  qrValue: string;
  kind: QrAccessKind;
  status: QrAccessStatus;
  source: "construction";
  userId?: string;
  name: string;
  email: string;
  productName: string;
  courseSummary: string;
  createdAt: string;
  validUntil: string | null;
  paymentMethod?: string | null;
  purchaseId?: string;
  sessionId?: string;
  sessionNumber?: number;
  sessionsAvailable?: number;
  sessionsConsumed?: number;
};

export type QrValidationReason = CoreQrValidationReason;

export type QrValidationResult = {
  ok: boolean;
  reason: QrValidationReason;
  record: QrAccessRecord | null;
};

function stateFromPurchase(purchase: UserPurchase, now = Date.now()): QrAccessStatus {
  if (purchase.status === "refunded") return "refunded";
  if (purchase.status === "pending") return "pending";
  if (purchase.validUntil && new Date(purchase.validUntil).getTime() < now) return "expired";
  return "active";
}

function stateFromTrial(status: "active" | "expired" | "consumed"): QrAccessStatus {
  return status;
}

function purchaseName(purchase: UserPurchase) {
  return purchase.customerName || purchase.customerEmail || "";
}

function purchaseRecords(purchase: UserPurchase): QrAccessRecord[] {
  if (!purchase.qrValue || purchase.kind === "membership") return [];
  const state = stateFromPurchase(purchase);
  const sessions = purchase.sessions ?? [];
  const sessionsConsumed = sessions.filter((session) => session.status === "consumed").length;
  const parent: QrAccessRecord = {
    id: `purchase:${purchase.id}`,
    qrValue: purchase.qrValue,
    kind: "pass",
    status: state,
    source: "construction",
    userId: purchase.userId,
    name: purchaseName(purchase),
    email: purchase.customerEmail ?? "",
    productName: purchase.productName,
    courseSummary: purchase.courseName ?? "Regular classes",
    createdAt: purchase.purchasedAt,
    validUntil: purchase.validUntil,
    paymentMethod: purchase.paymentMethod,
    purchaseId: purchase.id,
    sessionsAvailable: purchase.classesIncluded ?? undefined,
    sessionsConsumed: sessions.length ? sessionsConsumed : undefined,
  };
  const sessionRecords = sessions.map((session): QrAccessRecord => ({
    id: `session:${session.id}`,
    qrValue: session.qrValue,
    kind: "session",
    status: state === "active" && session.status === "consumed" ? "consumed" : state,
    source: "construction",
    userId: purchase.userId,
    name: purchaseName(purchase),
    email: purchase.customerEmail ?? "",
    productName: `${purchase.productName} · Session ${session.number}`,
    courseSummary: purchase.courseName ?? "Regular classes",
    createdAt: purchase.purchasedAt,
    validUntil: purchase.validUntil,
    paymentMethod: purchase.paymentMethod,
    purchaseId: purchase.id,
    sessionId: session.id,
    sessionNumber: session.number,
  }));
  return [parent, ...sessionRecords];
}

export function getAdminQrAccessRecords(): QrAccessRecord[] {
  const trialRecords: QrAccessRecord[] = getFreeTrialRegistrations().map((registration) => ({
    id: `trial:${registration.id}`,
    qrValue: registration.qrValue,
    kind: "free-trial" as const,
    status: stateFromTrial(registration.status),
    source: "construction" as const,
    userId: registration.userId,
    name: registration.name,
    email: registration.email,
    productName: "Free first class",
    courseSummary: registration.classes.map((item) => `${item.courseName} · ${item.levelName}`).join(", "),
    createdAt: registration.createdAt,
    validUntil: registration.validUntil,
  }));
  const purchaseRecordsById = new Map<string, QrAccessRecord[]>();
  for (const purchase of getSimulatedPurchasesForAdmin()) {
    purchaseRecordsById.set(purchase.id, purchaseRecords(purchase));
  }
  return [...trialRecords, ...Array.from(purchaseRecordsById.values()).flat()]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function validateQrValue(value: string, records = getAdminQrAccessRecords()): QrValidationResult {
  return validateQrValueCore(value, records);
}

export function approveQrPurchase(record: QrAccessRecord) {
  if (!record.purchaseId || record.status !== "pending") return null;
  return updateSimulatedClassPaymentStatus(record.purchaseId, "paid");
}

export function rejectQrPurchase(record: QrAccessRecord) {
  if (!record.purchaseId || record.status !== "pending") return null;
  return updateSimulatedClassPaymentStatus(record.purchaseId, "refunded");
}

export function consumeQrAccess(record: QrAccessRecord) {
  if (record.status !== "active") return null;
  if (record.kind === "free-trial") return markFreeTrialConsumed(record.id.replace(/^trial:/, ""));
  if (record.kind === "session" && record.userId && record.purchaseId && record.sessionId) {
    return consumeSimulatedSession(record.userId, record.purchaseId, record.sessionId);
  }
  return null;
}
