"use client";

// Run audit button Client Component.
// Calls POST /api/audits/[projectId] and reloads the page on completion.
// Shows loading state while the PSI audit is in progress (10–30 s typical).

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RunAuditButton({
  projectId,
}: {
  projectId: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "running" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleRun() {
    setState("running");
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/audits/${projectId}`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Audit failed. Please try again.");
        setState("error");
        return;
      }

      // Refresh the page to show the new audit run
      router.refresh();
      setState("idle");
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setState("error");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleRun}
        disabled={state === "running"}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {state === "running" ? (
          <span className="flex items-center gap-2">
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Running audit…
          </span>
        ) : (
          "Run audit"
        )}
      </button>
      {state === "running" && (
        <p className="text-xs text-gray-400">
          Fetching PageSpeed Insights data — this takes 10–30 seconds.
        </p>
      )}
      {state === "error" && errorMsg && (
        <p className="text-xs text-red-600">{errorMsg}</p>
      )}
    </div>
  );
}
