// Lighthouse CI configuration — SiteLens
// Used by @lhci/cli for local audits and CI runs.
// Run locally: npx lhci autorun
// Docs: https://github.com/GoogleChrome/lighthouse-ci

/** @type {import('@lhci/cli').LighthouseRc} */
module.exports = {
  ci: {
    collect: {
      // Build the Next.js app and serve it before auditing.
      // Swap `startServerCommand` and `url` for the target environment.
      startServerCommand: "PATH=\"/opt/homebrew/bin:$PATH\" npm run start",
      startServerReadyPattern: "started server on",
      url: ["http://localhost:3000/"],
      numberOfRuns: 3,
      settings: {
        // Use desktop preset for consistency; override per-project if needed.
        preset: "desktop",
      },
    },
    assert: {
      // Minimum score thresholds — adjust as the product matures.
      assertions: {
        "categories:performance": ["warn", { minScore: 0.8 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.8 }],
      },
    },
    upload: {
      // SCAFFOLD — configure a real LHCI server or Temporary Public Storage for CI.
      // For CI, set LHCI_BUILD_CONTEXT__CURRENT_BRANCH etc. as env vars.
      // To enable Temporary Public Storage (no server needed):
      //   target: "temporary-public-storage"
      // To use a self-hosted LHCI server:
      //   target: "lhci",
      //   serverBaseUrl: process.env.LHCI_SERVER_URL,
      //   token: process.env.LHCI_TOKEN,
      target: "temporary-public-storage",
    },
  },
};
