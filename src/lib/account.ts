export type DanceRole = "leader" | "follower" | "both";
export type AppRole = "admin" | "teacher" | "student" | "user";

export type AccountProfile = {
  firstName: string;
  lastName: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  danceRole: DanceRole;
};

export type Account = {
  id?: string;
  email: string;
  profile: AccountProfile;
  source: "supabase" | "demo";
  appMetadata?: Record<string, unknown>;
  role?: AppRole;
};

const configuredAdminEmails = (import.meta.env.VITE_ADMIN_EMAILS as string | undefined ?? "")
  .split(",")
  .map((email) => email.trim().toLocaleLowerCase("en-US"))
  .filter(Boolean);

export function isAdminAccount(account: Account | null) {
  if (!account) return false;
  return account.role === "admin" || account.appMetadata?.role === "admin" || configuredAdminEmails.includes(account.email.toLocaleLowerCase("en-US"));
}

export function isTeacherAccount(account: Account | null) {
  if (!account) return false;
  return account.role === "teacher" || account.appMetadata?.role === "teacher";
}

export function isStaffAccount(account: Account | null) {
  return isAdminAccount(account) || isTeacherAccount(account);
}

const demoAccountKey = "baila-demo-account";
const demoSessionKey = "baila-demo-session";

export function getProfileFromUserMetadata(metadata: Record<string, unknown> | undefined): AccountProfile {
  return {
    firstName: typeof metadata?.first_name === "string" ? metadata.first_name : "",
    lastName: typeof metadata?.last_name === "string" ? metadata.last_name : "",
    address: typeof metadata?.address === "string" ? metadata.address : "",
    postalCode: typeof metadata?.postal_code === "string" ? metadata.postal_code : "",
    city: typeof metadata?.city === "string" ? metadata.city : "",
    phone: typeof metadata?.phone === "string" ? metadata.phone : "",
    danceRole: metadata?.dance_role === "leader" || metadata?.dance_role === "follower" || metadata?.dance_role === "both"
      ? metadata.dance_role
      : "both",
  };
}

export function formatPersonName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("es-ES")
    .split(/(\s|-)/)
    .map((part) => part === " " || part === "-" || part === "" ? part : `${part.slice(0, 1).toLocaleUpperCase("es-ES")}${part.slice(1)}`)
    .join("");
}

export function getDemoAccount(): Account | null {
  const raw = localStorage.getItem(demoAccountKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Account;
    if (parsed.email && parsed.profile) return {
      ...parsed,
      profile: {
        firstName: parsed.profile.firstName ?? "",
        lastName: parsed.profile.lastName ?? "",
        address: parsed.profile.address ?? "",
        postalCode: parsed.profile.postalCode ?? "",
        city: parsed.profile.city ?? "",
        phone: parsed.profile.phone ?? "",
        danceRole: parsed.profile.danceRole ?? "both",
      },
      source: "demo",
    };
  } catch {
    localStorage.removeItem(demoAccountKey);
  }

  return null;
}

export function saveDemoAccount(email: string, profile: AccountProfile): Account {
  const account: Account = { email, profile, source: "demo" };
  localStorage.setItem(demoAccountKey, JSON.stringify(account));
  localStorage.setItem(demoSessionKey, email);
  return account;
}

export function getDemoSession(): Account | null {
  const sessionEmail = localStorage.getItem(demoSessionKey);
  const account = getDemoAccount();
  return account && account.email === sessionEmail ? account : null;
}

export function clearDemoSession() {
  localStorage.removeItem(demoSessionKey);
}
