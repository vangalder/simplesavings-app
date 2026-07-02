import { toast } from "sonner";

// Shared Stripe checkout launcher. POSTs to /api/checkout and redirects to the
// returned Stripe URL (or grants test access when admin test-mode is on).
// Reused by ProUpsellModal, InsightsPanel, and PricingSection.
export async function startCheckout(type: "one_time" | "subscription") {
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      toast.error(data.error ?? "Checkout failed — please try again.");
    }
  } catch {
    toast.error("Network error — please try again.");
  }
}
