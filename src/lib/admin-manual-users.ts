import { supabase } from "./supabase";

export type ManualAccessMode = "email-invite" | "temporary-password";
export type ManualCommercialCategory = "regular" | "student" | "member" | "erasmus";
export type ManualAppRole = "user" | "student" | "admin";
export type ManualDanceRole = "leader" | "follower" | "both";

export type ManualUserDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  danceRole: ManualDanceRole;
  appRole: ManualAppRole;
  commercialCategory: ManualCommercialCategory;
  categoryVerified: boolean;
  accessMode: ManualAccessMode;
  temporaryPassword: string;
  sendWelcomeEmail: boolean;
  adminNotes: string;
};

export type ManualUserResult = {
  ok: boolean;
  code?: "endpointMissing" | "invalid" | "unauthorized" | "requestFailed";
  message?: string;
};

export function getManualUserEndpoint() {
  return (import.meta.env.VITE_ADMIN_USER_ENDPOINT as string | undefined)?.trim() ?? "";
}

function isAllowedEndpoint(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
  } catch {
    return false;
  }
}

export function validateManualUserDraft(draft: ManualUserDraft) {
  if (!draft.firstName.trim() || !draft.lastName.trim() || !draft.email.trim() || !draft.address.trim() || !draft.postalCode.trim() || !draft.city.trim()) return false;
  if (draft.commercialCategory !== "regular" && !draft.categoryVerified) return false;
  if (draft.accessMode === "temporary-password" && draft.temporaryPassword.length < 8) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim());
}

export async function createManualUser(draft: ManualUserDraft): Promise<ManualUserResult> {
  if (!validateManualUserDraft(draft)) return { ok: false, code: "invalid" };
  const endpoint = getManualUserEndpoint();
  if (!endpoint || !isAllowedEndpoint(endpoint)) return { ok: false, code: "endpointMissing" };
  if (!supabase) return { ok: false, code: "unauthorized" };

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) return { ok: false, code: "unauthorized" };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      profile: {
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        email: draft.email.trim().toLocaleLowerCase("en-US"),
        phone: draft.phone.trim() || null,
        address: draft.address.trim(),
        postalCode: draft.postalCode.trim(),
        city: draft.city.trim(),
        danceRole: draft.danceRole,
      },
      appRole: draft.appRole,
      commercialCategory: draft.commercialCategory,
      categoryVerified: draft.categoryVerified,
      accessMode: draft.accessMode,
      temporaryPassword: draft.accessMode === "temporary-password" ? draft.temporaryPassword : undefined,
      sendWelcomeEmail: draft.sendWelcomeEmail,
      adminNotes: draft.adminNotes.trim() || null,
    }),
  });

  if (!response.ok) return { ok: false, code: "requestFailed", message: await response.text().catch(() => "") };
  return { ok: true };
}
