---
description: Run SEO pre-release checks (metadataBase, sitemap, robots, manifest, OG, canonical, JSON-LD)
---

1. Ask the user to confirm the target environment and canonical production domain.
   - Required inputs:
     - [environment] = development / preview / production
     - [production-domain] = e.g. https://example.com

2. Check whether the project uses Next.js App Router SEO files and metadata conventions.
   - Inspect:
     - `src/app/layout.tsx`
     - `src/app/sitemap.ts` or `app/sitemap.ts`
     - `src/app/robots.ts` or `app/robots.ts`
     - `src/app/manifest.ts` or `app/manifest.ts`
   - If the project uses a different structure, adapt the remaining checks to the real structure and report it.

3. Verify `metadataBase` in the root layout.
   - Confirm `metadataBase` exists in the root metadata export.
   - Confirm it points to `[production-domain]` for production behavior.
   - If missing or incorrect, report the exact file and the required correction.

4. Verify sitemap implementation.
   - Confirm `sitemap.ts` exists.
   - Confirm it returns valid absolute URLs under `[production-domain]`.
   - Confirm important static routes are included.
   - If the site has dynamic routes, confirm they are included or clearly documented as intentionally excluded.
   - Confirm `lastModified` is present where appropriate.

5. Verify robots implementation.
   - Confirm `robots.ts` exists.
   - Confirm the sitemap URL points to `[production-domain]/sitemap.xml`.
   - Confirm preview or non-production environments do not unintentionally allow indexing.
   - If environment-specific noindex behavior is required, verify it is implemented correctly.

6. Verify manifest implementation.
   - Confirm `manifest.ts` exists if the site is expected to expose a web app manifest.
   - Confirm app name, icons, start URL, display mode, and theme colors are set appropriately.
   - If manifest is intentionally not used, report that explicitly.

7. Verify Open Graph and social metadata.
   - Check root metadata and important page metadata for:
     - title
     - description
     - openGraph
     - twitter
   - Confirm OG images use valid absolute URLs or valid generated image routes.
   - If `opengraph-image.tsx` or equivalent exists, verify that it is wired correctly.

8. Verify canonical behavior.
   - Confirm canonical URLs are consistent with `[production-domain]`.
   - Confirm there is no obvious duplicate-content risk from mismatched canonical behavior, trailing slash inconsistencies, or preview URLs leaking into metadata.

9. Verify structured data.
   - Check whether JSON-LD exists in the root layout and relevant pages.
   - Confirm the schema type is appropriate for the site or page type.
   - Confirm required fields such as name, url, logo, and key entity fields are valid and use `[production-domain]` where needed.
   - Report missing structured data for critical page types.

10. Verify environment-safe SEO behavior.
    - Confirm preview or staging does not accidentally expose production canonical URLs incorrectly.
    - Confirm preview or staging is not unintentionally indexable if it should remain private.
    - Confirm production settings are not weakened by local or preview defaults.

11. Check for release blockers.
    - Report any missing or broken item in:
      - metadataBase
      - sitemap
      - robots
      - manifest
      - Open Graph / Twitter metadata
      - JSON-LD
      - canonical behavior
      - environment-specific indexing controls

12. Provide a final release-readiness report in this format:
    - Ready
    - Not ready
    - Blocking issues
    - Recommended improvements
    - Files to update

13. If fixes are required, list the exact target files and the exact changes needed before release.