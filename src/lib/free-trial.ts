import type { Account } from "./account";

export type FreeTrialClass = {
  id: string;
  courseId: string;
  courseName: string;
  styleId?: string;
  styleName?: string;
  levelId: string;
  levelName: string;
  levelDescription?: string | null;
  day: string;
  time: string;
  duration: string;
  teacher: string;
  address: string;
};

export type FreeTrialRegistration = {
  id: string;
  userId?: string;
  email: string;
  name: string;
  classes: FreeTrialClass[];
  createdAt: string;
  validUntil: string;
  qrValue: string;
  status: "active" | "expired" | "consumed";
  consumedAt?: string;
};

const storageKey = "baila-free-trial-registrations";
const trialDurationMs = 14 * 24 * 60 * 60 * 1000;

function readAll(): FreeTrialRegistration[] {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(registrations: FreeTrialRegistration[]) {
  localStorage.setItem(storageKey, JSON.stringify(registrations));
}

function accountKey(account: Pick<Account, "id" | "email">) {
  return account.id ?? account.email.toLocaleLowerCase("en-US");
}

function makeId() {
  return `trial-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeQrValue(id: string) {
  return `baila:free-trial:${id}`;
}

function withCurrentStatus(registration: FreeTrialRegistration): FreeTrialRegistration {
  if (registration.status === "active" && new Date(registration.validUntil).getTime() < Date.now()) {
    return { ...registration, status: "expired" };
  }
  return registration;
}

export function getFreeTrialRegistrations() {
  const stored = readAll();
  const registrations = stored.map(withCurrentStatus);
  if (registrations.some((registration, index) => registration.status !== stored[index]?.status)) writeAll(registrations);
  return registrations;
}

export function getFreeTrialForAccount(account: Pick<Account, "id" | "email"> | null) {
  if (!account) return null;
  return getFreeTrialRegistrations().find((registration) => registration.userId === accountKey(account) || registration.email.toLocaleLowerCase("en-US") === account.email.toLocaleLowerCase("en-US")) ?? null;
}

export function registerFreeTrial(account: Account, classItem: FreeTrialClass) {
  const registrations = getFreeTrialRegistrations();
  const existing = registrations.find((registration) => registration.userId === accountKey(account) || registration.email.toLocaleLowerCase("en-US") === account.email.toLocaleLowerCase("en-US"));
  const now = new Date();
  const name = [account.profile.firstName, account.profile.lastName].filter(Boolean).join(" ") || account.email;
  if (existing) {
    const status: FreeTrialRegistration["status"] = existing.status === "expired" ? "expired" : "active";
    const next: FreeTrialRegistration = { ...existing, classes: existing.classes.some((item) => item.id === classItem.id) ? existing.classes : [...existing.classes, classItem], status };
    writeAll(registrations.map((registration) => registration.id === existing.id ? next : registration));
    return next;
  }

  const id = makeId();
  const registration: FreeTrialRegistration = {
    id,
    userId: accountKey(account),
    email: account.email,
    name,
    classes: [classItem],
    createdAt: now.toISOString(),
    validUntil: new Date(now.getTime() + trialDurationMs).toISOString(),
    qrValue: makeQrValue(id),
    status: "active",
  };
  writeAll([registration, ...registrations]);
  return registration;
}

export function markFreeTrialConsumed(id: string) {
  const consumedAt = new Date().toISOString();
  const next = getFreeTrialRegistrations().map((registration) => registration.id === id ? { ...registration, status: "consumed" as const, consumedAt } : registration);
  writeAll(next);
  return next.find((registration) => registration.id === id) ?? null;
}
