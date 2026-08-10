import type { PurchaseKind } from "./purchases";

export type CommercialCategory = "regular" | "discount" | "erasmus";
export type EnrollmentMode = "solo" | "duo" | "full";

type PriceByCategory = Record<CommercialCategory, number | null>;

const regularCoursePrices: Record<"monthly" | "quarterly", Record<EnrollmentMode, PriceByCategory>> = {
  monthly: {
    solo: { regular: 64, discount: 59, erasmus: 39 },
    duo: { regular: 99, discount: 89, erasmus: 59 },
    full: { regular: 130, discount: 120, erasmus: null },
  },
  quarterly: {
    solo: { regular: 180, discount: 165, erasmus: 105 },
    duo: { regular: 285, discount: 255, erasmus: 165 },
    full: { regular: null, discount: null, erasmus: null },
  },
};

export const flexiblePrices = {
  trial: { regular: 0, discount: 0, erasmus: 0 },
  single: { regular: 18, discount: 17, erasmus: 10 },
  package: { regular: 160, discount: 150, erasmus: null },
  membership: { regular: 25, discount: 25, erasmus: null },
} satisfies Record<string, PriceByCategory>;

export function getEnrollmentMode(selectionIds: string[]): EnrollmentMode {
  const courseCount = new Set(selectionIds).size;
  if (courseCount >= 3) return "full";
  return courseCount === 2 ? "duo" : "solo";
}

export function getVerifiedCommercialCategory(value: unknown): CommercialCategory {
  if (value === "erasmus") return "erasmus";
  if (value === "student" || value === "member" || value === "discount") return "discount";
  return "regular";
}

export function getPlanPrice(kind: PurchaseKind, mode: EnrollmentMode, category: CommercialCategory): number | null {
  if (kind === "membership") return flexiblePrices.membership[category];
  if (mode === "full" && kind === "quarterly") return null;
  if (kind === "package") return flexiblePrices.package[category];
  return regularCoursePrices[kind][mode][category];
}
