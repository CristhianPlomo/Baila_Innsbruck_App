import type { CourseCartItem } from "./cart";
import type { PurchaseKind } from "./purchases";
import { supabase } from "./supabase";

type StripeCheckoutResponse = {
  url?: unknown;
};

export function isStripeCheckoutConfigured() {
  return Boolean(import.meta.env.VITE_STRIPE_CHECKOUT_ENDPOINT?.trim());
}

export async function redirectToStripeCheckout(items: CourseCartItem[], plan: PurchaseKind) {
  const endpoint = import.meta.env.VITE_STRIPE_CHECKOUT_ENDPOINT?.trim();
  if (!endpoint || !supabase) throw new Error("Stripe Checkout is not configured.");

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("An authenticated session is required.");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${data.session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan,
      returnPath: "/orders?checkout=success",
      cancelPath: "/orders?checkout=cancelled#checkout",
      items: items.map((item) => ({
        courseId: item.courseId,
        styleId: item.styleId ?? null,
        levelId: item.levelId,
      })),
    }),
  });

  const payload = await response.json().catch(() => ({})) as StripeCheckoutResponse;
  if (!response.ok || typeof payload.url !== "string") throw new Error("Stripe Checkout could not be started.");

  const checkoutUrl = new URL(payload.url);
  if (checkoutUrl.protocol !== "https:") throw new Error("Stripe Checkout returned an invalid URL.");
  window.location.assign(checkoutUrl.toString());
}
