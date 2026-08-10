import { supabase } from "./supabase";
import type { CourseCartItem } from "./cart";
import type { CommercialCategory, EnrollmentMode } from "./pricing";

export type PurchaseKind = "monthly" | "quarterly" | "package" | "membership";
export type PurchaseStatus = "paid" | "pending" | "refunded";
export type PurchaseSessionStatus = "available" | "consumed";
export type SimulatedPaymentMethod = "card" | "class";
export const rejectedPurchaseRetentionMs = 2 * 60 * 60 * 1000;

export type PurchaseSession = {
  id: string;
  number: number;
  status: PurchaseSessionStatus;
  qrValue: string;
  consumedAt: string | null;
};

export type UserPurchase = {
  id: string;
  userId?: string;
  customerName?: string;
  customerEmail?: string;
  productName: string;
  productKey?: "monthlyAllActivities" | "quarterlyPlan" | "tenClassPackage" | "monthlySolo" | "monthlyDuo" | "monthlyFull" | "quarterlySolo" | "quarterlyDuo" | "annualMembership";
  kind: PurchaseKind;
  amount: number;
  baseAmount?: number;
  discountPercentage?: number;
  currency: string;
  status: PurchaseStatus;
  purchasedAt: string;
  cancelledAt?: string | null;
  validUntil: string | null;
  invoiceNumber: string | null;
  invoicePdfUrl: string | null;
  paymentMethod: string | null;
  courseName: string | null;
  levelNames: string | null;
  customerCategory: string | null;
  customerCategoryKey?: CommercialCategory;
  enrollmentMode?: EnrollmentMode;
  classesIncluded: number | null;
  benefitKey?: "allRegularActivities" | "quarterlyRegularActivities" | "tenFlexibleSessions" | "annualMemberBenefits";
  qrValue?: string;
  sessions?: PurchaseSession[];
  isSimulation?: boolean;
};

export type PurchaseHistoryResult = {
  purchases: UserPurchase[];
  source: "supabase" | "demo" | "simulator" | "mixed";
  unavailable: boolean;
};

export type SimulatorPlan = {
  kind: PurchaseKind;
  durationDays: number;
  classesIncluded: number | null;
};

export const simulatorPlans: SimulatorPlan[] = [
  { kind: "monthly", durationDays: 30, classesIncluded: null },
  { kind: "quarterly", durationDays: 77, classesIncluded: null },
  { kind: "package", durationDays: 120, classesIncluded: 10 },
];

type PurchaseRow = {
  id: string;
  product_type: string;
  product_name: string;
  product_name_snapshot: string | null;
  amount: number | string;
  currency: string;
  status: string;
  created_at: string;
  expires_at: string | null;
  invoice_number: string | null;
  invoice_pdf_url: string | null;
  payment_method: string | null;
  course_name: string | null;
  level_names: string | null;
  customer_category_snapshot: string | null;
};

const demoPurchases: UserPurchase[] = [
  {
    id: "BAI-2026-014",
    productName: "Solo monthly pass",
    productKey: "monthlySolo",
    kind: "monthly",
    amount: 64,
    currency: "EUR",
    status: "paid",
    purchasedAt: "2026-06-18T10:30:00.000Z",
    validUntil: "2026-07-17T23:59:59.000Z",
    invoiceNumber: "INV-2026-014",
    invoicePdfUrl: null,
    paymentMethod: "Cash at the studio",
    courseName: "One regular course",
    levelNames: "Subject to the selected class level",
    customerCategory: "Regular",
    classesIncluded: null,
  },
  {
    id: "BAI-2026-008",
    productName: "Solo 11-week term",
    productKey: "quarterlySolo",
    kind: "quarterly",
    amount: 180,
    currency: "EUR",
    status: "paid",
    purchasedAt: "2026-03-28T16:10:00.000Z",
    validUntil: "2026-06-13T23:59:59.000Z",
    invoiceNumber: "INV-2026-008",
    invoicePdfUrl: null,
    paymentMethod: "Bank transfer",
    courseName: "One regular course",
    levelNames: "Subject to the selected class level",
    customerCategory: "Regular",
    classesIncluded: null,
  },
  {
    id: "BAI-2026-003",
    productName: "10-class package",
    productKey: "tenClassPackage",
    kind: "package",
    amount: 160,
    currency: "EUR",
    status: "paid",
    purchasedAt: "2026-01-12T18:45:00.000Z",
    validUntil: "2026-05-12T23:59:59.000Z",
    invoiceNumber: "INV-2026-003",
    invoicePdfUrl: null,
    paymentMethod: "Cash at the studio",
    courseName: "Regular dance classes",
    levelNames: "Compatible level required",
    customerCategory: "Regular",
    classesIncluded: 10,
    benefitKey: "tenFlexibleSessions",
  },
];

function simulatorStorageKey(userId: string) {
  return `baila-purchase-simulator:${userId}`;
}

const simulatedClassPaymentsKey = "baila-simulated-class-payments";

function normalizeLegacyTestPurchase(purchase: UserPurchase): UserPurchase {
  const id = purchase.id.replace(/^SIM-/, "TEST-");
  const invoiceNumber = purchase.status === "paid" ? purchase.invoiceNumber?.replace(/^SIM-INV-/, "TEST-INV-") ?? null : null;
  const normalizeQr = (value: string) => value.replace(/^BAILA-DEMO\|/, "BAILA-TEST|").replace(`|${purchase.id}|`, `|${id}|`);
  return {
    ...purchase,
    id,
    invoiceNumber,
    invoicePdfUrl: purchase.status === "paid" ? purchase.invoicePdfUrl : null,
    paymentMethod: purchase.paymentMethod?.replace(/^Simulated card/, "Test card") ?? null,
    qrValue: purchase.qrValue ? normalizeQr(purchase.qrValue) : undefined,
    sessions: purchase.sessions?.map((session) => ({
      ...session,
      id: session.id.replace(purchase.id, id),
      qrValue: normalizeQr(session.qrValue),
    })),
  };
}

function readSimulatedPurchases(userId: string): UserPurchase[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(simulatorStorageKey(userId)) ?? "[]");
    return Array.isArray(parsed) ? parsed.map((purchase) => normalizeLegacyTestPurchase(purchase as UserPurchase)) : [];
  } catch {
    return [];
  }
}

/**
 * Construction-only read adapter for staff tools. Production access records
 * must come from Supabase/server validation, never from browser storage.
 */
export function getSimulatedPurchasesForAdmin(): UserPurchase[] {
  if (typeof localStorage === "undefined") return [];
  const purchases: UserPurchase[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith("baila-purchase-simulator:")) continue;
    const userId = key.slice("baila-purchase-simulator:".length);
    purchases.push(...readSimulatedPurchases(userId));
  }
  return purchases;
}

function writeSimulatedPurchases(userId: string, purchases: UserPurchase[]) {
  localStorage.setItem(simulatorStorageKey(userId), JSON.stringify(purchases));
}

export function getSimulatedClassPaymentRequests(): UserPurchase[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(simulatedClassPaymentsKey) ?? "[]");
    return Array.isArray(parsed) ? parsed.map((purchase) => normalizeLegacyTestPurchase(purchase as UserPurchase)) : [];
  } catch {
    return [];
  }
}

function writeSimulatedClassPaymentRequests(purchases: UserPurchase[]) {
  localStorage.setItem(simulatedClassPaymentsKey, JSON.stringify(purchases));
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function endOfCalendarMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function getSimulatedCheckoutPrice(kind: PurchaseKind, baseAmount: number, date = new Date()) {
  const discountPercentage = kind === "monthly" && date.getDate() >= 15 ? 40 : 0;
  const amount = Math.round(baseAmount * (1 - discountPercentage / 100) * 100) / 100;
  return { amount, baseAmount, discountPercentage };
}

function createSimulatorId(prefix: string) {
  const randomPart = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8).toUpperCase()
    : Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}-${randomPart}`;
}

export function simulateCoursePurchase(userId: string, items: CourseCartItem[], plan: SimulatorPlan, amount: number, category: CommercialCategory, enrollmentMode: EnrollmentMode, paymentMethod: SimulatedPaymentMethod, customer: { name: string; email: string }, baseAmount = amount, discountPercentage = 0): UserPurchase {
  const purchasedAt = new Date();
  const validUntil = plan.kind === "monthly" ? endOfCalendarMonth(purchasedAt) : addDays(purchasedAt, plan.durationDays);
  const id = createSimulatorId("TEST");
  const isFullMonth = enrollmentMode === "full" && plan.kind === "monthly";
  const courseName = isFullMonth ? "All regular courses" : items.map((item) => item.styleName ? `${item.courseName} · ${item.styleName}` : item.courseName).join(", ");
  const levelNames = isFullMonth ? "Full access to the regular course catalogue" : items.map((item) => item.levelName).join(", ");
  const qrValue = `BAILA-TEST|PASS|${id}|${validUntil.toISOString()}`;
  const sessions = plan.classesIncluded
    ? Array.from({ length: plan.classesIncluded }, (_, index) => ({
        id: `${id}-S${index + 1}`,
        number: index + 1,
        status: "available" as const,
        qrValue: `BAILA-TEST|SESSION|${id}|${index + 1}|${validUntil.toISOString()}`,
        consumedAt: null,
      }))
    : undefined;
  const purchase: UserPurchase = {
    id,
    userId,
    customerName: customer.name,
    customerEmail: customer.email,
    productName: isFullMonth ? "Full Month pass" : plan.kind === "monthly" ? `${enrollmentMode} monthly course pass` : plan.kind === "quarterly" ? `${enrollmentMode} quarterly course pass` : "10-session package",
    productKey: isFullMonth ? "monthlyFull" : plan.kind === "package" ? "tenClassPackage" : `${plan.kind}${enrollmentMode === "solo" ? "Solo" : "Duo"}` as UserPurchase["productKey"],
    kind: plan.kind,
    amount,
    baseAmount,
    discountPercentage,
    currency: "EUR",
    status: paymentMethod === "class" ? "pending" : "paid",
    purchasedAt: purchasedAt.toISOString(),
    validUntil: validUntil.toISOString(),
    invoiceNumber: paymentMethod === "class" ? null : createSimulatorId("TEST-INV"),
    invoicePdfUrl: null,
    paymentMethod: paymentMethod === "class" ? "Pay in class" : "Test card ···· 4242",
    courseName,
    levelNames,
    customerCategory: category === "discount" ? "Member / Student" : category === "erasmus" ? "Erasmus" : "Regular",
    customerCategoryKey: category,
    enrollmentMode,
    classesIncluded: plan.classesIncluded,
    qrValue,
    sessions,
    isSimulation: true,
    benefitKey: isFullMonth ? "allRegularActivities" : plan.kind === "package" ? "tenFlexibleSessions" : undefined,
  };
  writeSimulatedPurchases(userId, [purchase, ...readSimulatedPurchases(userId)]);
  if (paymentMethod === "class") writeSimulatedClassPaymentRequests([purchase, ...getSimulatedClassPaymentRequests()]);
  return purchase;
}

export function simulateMembershipPurchase(userId: string, paymentMethod: SimulatedPaymentMethod, customer: { name: string; email: string }): UserPurchase {
  const purchasedAt = new Date();
  const validUntil = addDays(purchasedAt, 365);
  const id = createSimulatorId("TEST");
  const purchase: UserPurchase = {
    id,
    userId,
    customerName: customer.name,
    customerEmail: customer.email,
    productName: "Annual membership",
    productKey: "annualMembership",
    kind: "membership",
    amount: 25,
    baseAmount: 25,
    discountPercentage: 0,
    currency: "EUR",
    status: paymentMethod === "class" ? "pending" : "paid",
    purchasedAt: purchasedAt.toISOString(),
    validUntil: validUntil.toISOString(),
    invoiceNumber: paymentMethod === "class" ? null : createSimulatorId("TEST-INV"),
    invoicePdfUrl: null,
    paymentMethod: paymentMethod === "class" ? "Pay in class" : "Test card ···· 4242",
    courseName: null,
    levelNames: null,
    customerCategory: "Member",
    customerCategoryKey: "discount",
    classesIncluded: null,
    benefitKey: "annualMemberBenefits",
    isSimulation: true,
  };
  writeSimulatedPurchases(userId, [purchase, ...readSimulatedPurchases(userId)]);
  if (paymentMethod === "class") writeSimulatedClassPaymentRequests([purchase, ...getSimulatedClassPaymentRequests()]);
  return purchase;
}

export function updateSimulatedClassPaymentStatus(purchaseId: string, status: "paid" | "refunded") {
  const requests = getSimulatedClassPaymentRequests();
  const request = requests.find((purchase) => purchase.id === purchaseId);
  if (!request?.userId) return null;
  const updatedRequest = { ...request, status, cancelledAt: status === "refunded" ? new Date().toISOString() : null, invoiceNumber: status === "paid" ? request.invoiceNumber ?? createSimulatorId("INV") : null, paymentMethod: status === "paid" ? "Pay in class · approved" : "Pay in class · rejected" } satisfies UserPurchase;
  writeSimulatedClassPaymentRequests(requests.map((purchase) => purchase.id === purchaseId ? updatedRequest : purchase));
  const userPurchases = readSimulatedPurchases(request.userId);
  writeSimulatedPurchases(request.userId, userPurchases.map((purchase) => purchase.id === purchaseId ? updatedRequest : purchase));
  return updatedRequest;
}

export function consumeSimulatedSession(userId: string, purchaseId: string, sessionId: string): UserPurchase | null {
  const purchases = readSimulatedPurchases(userId);
  let updatedPurchase: UserPurchase | null = null;
  const updated = purchases.map((purchase) => {
    if (purchase.id !== purchaseId || !purchase.isSimulation) return purchase;
    const sessions = purchase.sessions?.map((session) => session.id === sessionId && session.status === "available"
      ? { ...session, status: "consumed" as const, consumedAt: new Date().toISOString() }
      : session);
    updatedPurchase = { ...purchase, sessions };
    return updatedPurchase;
  });
  writeSimulatedPurchases(userId, updated);
  return updatedPurchase;
}

function normalizeKind(value: string): PurchaseKind {
  const normalized = value.toLowerCase();
  if (normalized.includes("member") || normalized.includes("mitglied")) return "membership";
  if (normalized.includes("quarter") || normalized.includes("trimes")) return "quarterly";
  if (normalized.includes("month") || normalized.includes("mensual")) return "monthly";
  return "package";
}

function normalizeStatus(value: string): PurchaseStatus {
  if (value === "refunded") return "refunded";
  if (value === "pending") return "pending";
  return "paid";
}

function mapPurchase(row: PurchaseRow): UserPurchase {
  const status = normalizeStatus(row.status);
  return {
    id: row.id,
    productName: row.product_name_snapshot ?? row.product_name,
    kind: normalizeKind(row.product_type),
    amount: Number(row.amount),
    currency: row.currency || "EUR",
    status,
    purchasedAt: row.created_at,
    validUntil: row.expires_at,
    invoiceNumber: status === "paid" ? row.invoice_number : null,
    invoicePdfUrl: status === "paid" ? row.invoice_pdf_url : null,
    paymentMethod: row.payment_method,
    courseName: row.course_name,
    levelNames: row.level_names,
    customerCategory: row.customer_category_snapshot,
    classesIncluded: null,
  };
}

export async function getUserPurchaseHistory(userId: string): Promise<PurchaseHistoryResult> {
  const simulated = readSimulatedPurchases(userId);
  if (!supabase) return {
    purchases: [...simulated, ...demoPurchases],
    source: simulated.length ? "mixed" : "demo",
    unavailable: false,
  };

  const { data, error } = await supabase
    .from("purchases")
    .select("id, product_type, product_name, product_name_snapshot, amount, currency, status, created_at, expires_at, invoice_number, invoice_pdf_url, payment_method, course_name, level_names, customer_category_snapshot")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return {
    purchases: simulated,
    source: simulated.length ? "simulator" : "supabase",
    unavailable: true,
  };
  if (!data?.length) return {
    purchases: simulated,
    source: simulated.length ? "simulator" : "supabase",
    unavailable: false,
  };
  return {
    purchases: [...simulated, ...(data as PurchaseRow[]).map(mapPurchase)],
    source: simulated.length ? "mixed" : "supabase",
    unavailable: false,
  };
}
