// PostHog browser client — SiteLens
// Initializes PostHog once and exports the shared instance.
// Import this only in Client Components or client-side code.
//
// Usage:
//   import posthog from "@/lib/posthog/client";
//   posthog.capture("event_name", { property: "value" });

import posthog from "posthog-js";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

if (typeof window !== "undefined" && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // Capture pageviews manually via the provider (see provider.tsx)
    capture_pageview: false,
    // Disable in non-production environments to avoid polluting analytics
    loaded(ph) {
      if (process.env.NODE_ENV !== "production") {
        ph.opt_out_capturing();
      }
    },
  });
}

export default posthog;
