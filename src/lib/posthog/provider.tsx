// PostHog provider — SiteLens
// Wraps the app with PostHog context and handles pageview tracking on route change.
// This is a Client Component; it is included in the root layout.
//
// `useSearchParams` requires a Suspense boundary during SSR (Next.js 16 / React 19).
// PageviewTracker is wrapped in <Suspense> here to satisfy that requirement.

"use client";

import posthog from "@/lib/posthog/client";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, type ReactNode } from "react";

// Inner component: tracks a pageview on every navigation.
// Isolated so it can be wrapped in <Suspense> without affecting the rest of the tree.
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  useEffect(() => {
    if (pathname && ph) {
      let url = window.origin + pathname;
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
      ph.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams, ph]);

  return null;
}

interface PostHogProviderProps {
  children: ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  return (
    <PHProvider client={posthog}>
      {/* Suspense is required because PageviewTracker calls useSearchParams() */}
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </PHProvider>
  );
}
