export type QrValidationStatus = "active" | "pending" | "expired" | "consumed" | "refunded";
export type QrValidationReason = "valid" | "empty" | "notFound" | QrValidationStatus;

export function validateQrValue<T extends { qrValue: string; status: QrValidationStatus }>(value: string, records: T[]) {
  const normalizedValue = value.trim();
  if (!normalizedValue) return { ok: false, reason: "empty" as const, record: null };
  const record = records.find((item) => item.qrValue === normalizedValue) ?? null;
  if (!record) return { ok: false, reason: "notFound" as const, record: null };
  return { ok: record.status === "active", reason: record.status === "active" ? "valid" as const : record.status, record };
}
