export type AdminStudioSettings = {
  studioName: string;
  legalName: string;
  supportEmail: string;
  supportPhone: string;
  studioAddress: string;
  timezone: string;
  currency: string;
  defaultClassCapacity: number;
  bookingWindowDays: number;
  cancellationWindowHours: number;
  freeTrialEnabled: boolean;
  freeTrialValidityDays: number;
  packageValidityDays: number;
  requireInClassPaymentApproval: boolean;
  publicCatalogueVisible: boolean;
  registrationNotifications: boolean;
  paymentNotifications: boolean;
  lowCapacityNotifications: boolean;
};

export const defaultAdminStudioSettings: AdminStudioSettings = {
  studioName: "Baila Innsbruck – Dance Studio",
  legalName: "Baila Innsbruck",
  supportEmail: "",
  supportPhone: "",
  studioAddress: "Innsbruck, Austria",
  timezone: "Europe/Vienna",
  currency: "EUR",
  defaultClassCapacity: 25,
  bookingWindowDays: 30,
  cancellationWindowHours: 12,
  freeTrialEnabled: true,
  freeTrialValidityDays: 14,
  packageValidityDays: 120,
  requireInClassPaymentApproval: true,
  publicCatalogueVisible: true,
  registrationNotifications: true,
  paymentNotifications: true,
  lowCapacityNotifications: false,
};

const storageKey = "baila-admin-studio-settings";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function positiveNumber(value: unknown, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
}

export function normalizeAdminStudioSettings(value: unknown): AdminStudioSettings {
  if (!isRecord(value)) return { ...defaultAdminStudioSettings };
  return {
    studioName: typeof value.studioName === "string" ? value.studioName : defaultAdminStudioSettings.studioName,
    legalName: typeof value.legalName === "string" ? value.legalName : defaultAdminStudioSettings.legalName,
    supportEmail: typeof value.supportEmail === "string" ? value.supportEmail : defaultAdminStudioSettings.supportEmail,
    supportPhone: typeof value.supportPhone === "string" ? value.supportPhone : defaultAdminStudioSettings.supportPhone,
    studioAddress: typeof value.studioAddress === "string" ? value.studioAddress : defaultAdminStudioSettings.studioAddress,
    timezone: typeof value.timezone === "string" ? value.timezone : defaultAdminStudioSettings.timezone,
    currency: typeof value.currency === "string" ? value.currency : defaultAdminStudioSettings.currency,
    defaultClassCapacity: positiveNumber(value.defaultClassCapacity, defaultAdminStudioSettings.defaultClassCapacity),
    bookingWindowDays: positiveNumber(value.bookingWindowDays, defaultAdminStudioSettings.bookingWindowDays),
    cancellationWindowHours: positiveNumber(value.cancellationWindowHours, defaultAdminStudioSettings.cancellationWindowHours),
    freeTrialEnabled: typeof value.freeTrialEnabled === "boolean" ? value.freeTrialEnabled : defaultAdminStudioSettings.freeTrialEnabled,
    freeTrialValidityDays: positiveNumber(value.freeTrialValidityDays, defaultAdminStudioSettings.freeTrialValidityDays),
    packageValidityDays: positiveNumber(value.packageValidityDays, defaultAdminStudioSettings.packageValidityDays),
    requireInClassPaymentApproval: typeof value.requireInClassPaymentApproval === "boolean" ? value.requireInClassPaymentApproval : defaultAdminStudioSettings.requireInClassPaymentApproval,
    publicCatalogueVisible: typeof value.publicCatalogueVisible === "boolean" ? value.publicCatalogueVisible : defaultAdminStudioSettings.publicCatalogueVisible,
    registrationNotifications: typeof value.registrationNotifications === "boolean" ? value.registrationNotifications : defaultAdminStudioSettings.registrationNotifications,
    paymentNotifications: typeof value.paymentNotifications === "boolean" ? value.paymentNotifications : defaultAdminStudioSettings.paymentNotifications,
    lowCapacityNotifications: typeof value.lowCapacityNotifications === "boolean" ? value.lowCapacityNotifications : defaultAdminStudioSettings.lowCapacityNotifications,
  };
}

export function getAdminStudioSettings(): AdminStudioSettings {
  if (typeof localStorage === "undefined") return { ...defaultAdminStudioSettings };
  try {
    return normalizeAdminStudioSettings(JSON.parse(localStorage.getItem(storageKey) ?? "null"));
  } catch {
    return { ...defaultAdminStudioSettings };
  }
}

export function saveAdminStudioSettings(settings: AdminStudioSettings): AdminStudioSettings {
  const normalized = normalizeAdminStudioSettings(settings);
  if (typeof localStorage !== "undefined") localStorage.setItem(storageKey, JSON.stringify(normalized));
  return normalized;
}

export function resetAdminStudioSettings(): AdminStudioSettings {
  if (typeof localStorage !== "undefined") localStorage.removeItem(storageKey);
  return { ...defaultAdminStudioSettings };
}
