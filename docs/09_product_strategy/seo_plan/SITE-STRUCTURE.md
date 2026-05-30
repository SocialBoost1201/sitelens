# SiteLens: Site Architecture & URL Structure

## 1. URL Hierarchy
A flat, highly semantic URL structure designed for scalable SaaS growth.

### 1.1. Core Pages
- `/` (Home)
- `/pricing` (Pricing & Plans)
- `/about` (Company/Mission)
- `/contact` (Demo request, Inquiries)

### 1.2. Features (Solutions by Channel)
- `/features/seo` (Traditional SEO & Technical health)
- `/features/meo` (Local visibility & GBP)
- `/features/geo-aio` (AI Search Optimization)
- `/features/reporting` (Unified dashboards & client reporting)

### 1.3. Use Cases (Target Audience Pages)
- `/use-cases/agencies` (For Web Production & SEO Agencies)
- `/use-cases/sme` (For Small & Medium Enterprises)
- `/use-cases/local-business` (For Store Operators)

### 1.4. Comparison Pages (Bottom of Funnel)
- `/compare/sitelens-vs-ahrefs`
- `/compare/sitelens-vs-semrush`
- `/compare/traditional-seo-tools`

### 1.5. Resources & Content (Top/Middle of Funnel)
- `/blog/` (Main blog hub)
- `/blog/category/seo/`
- `/blog/category/geo-aio/`
- `/glossary/` (SEO/GEO/MEO terminology dictionary - for long-tail traffic)

## 2. Internal Linking Strategy
- **Pillar-Cluster Model**: The `/features/*` pages serve as pillars. Blog articles will interlink aggressively back to the relevant feature pages using exact and partial match anchor text.
- **Global Footer**: Links to all Use Case pages, Feature pages, and Comparison pages to ensure crawlability.
- **Breadcrumbs**: Implemented globally (e.g., `Home > Blog > GEO > Article Name`) with `BreadcrumbList` schema.
