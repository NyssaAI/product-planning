## SEO Best Practices

### Metadata API
- **Use generateMetadata**: Export `generateMetadata` from page.tsx or layout.tsx for dynamic metadata
- **Static metadata**: Export `metadata` object for pages with fixed metadata
- **Title template**: Define `title.template` in root layout (e.g., `%s | Brand Name`)
- **Descriptions**: Every page must have a unique `description` (120-160 characters)
- **Canonical URLs**: Set `alternates.canonical` for every page

### Open Graph
- **Required tags**: title, description, image, url, type, siteName
- **Image dimensions**: 1200x630px for og:image
- **Dynamic OG images**: Use `opengraph-image.tsx` with ImageResponse for generated images
- **Twitter cards**: Include `twitter.card`, `twitter.site`, `twitter.creator`

### Structured Data (JSON-LD)
- **Organization**: Add to root layout for site-wide identity
- **WebPage**: Add to every page with name, description, url
- **Article**: Add to blog posts with datePublished, author, headline
- **FAQPage**: Add to FAQ sections with question/answer pairs
- **BreadcrumbList**: Add breadcrumb structured data for nested pages
- **Product**: Add to pricing pages with offers and pricing
- **Place JSON-LD in head**: Use a reusable `JsonLd` component in Server Components

### Technical SEO
- **Sitemap**: Generate dynamic sitemap in `app/sitemap.ts`
- **Robots.txt**: Configure via `app/robots.ts`; block staging/preview deployments
- **Trailing slashes**: Pick one convention and enforce it (prefer no trailing slash)
- **Redirects**: Define in `next.config.ts` for URL migrations
- **404 handling**: Custom `not-found.tsx` with helpful navigation

### Content SEO
- **One h1 per page**: Every page has exactly one `<h1>`; subsequent headings follow hierarchy
- **Semantic HTML**: Use `<article>`, `<section>`, `<nav>`, `<aside>` appropriately
- **Alt text**: Every meaningful image has descriptive alt text
- **Internal linking**: Link related content pages to each other
- **URL structure**: Use descriptive, hyphenated slugs (`/blog/nextjs-seo-guide`)

### AI Search Optimization (AIO)
- **Direct answers**: Structure content with clear questions as headings and concise answers in the first 1-2 sentences, then expand — AI models extract these as cited responses
- **Entity clarity**: Define what your product/brand is in plain language early on each page; AI models need unambiguous entity identification
- **Authoritative sourcing**: Include author bios, company credentials, and "About" context — AI models weigh source authority when selecting citations
- **Structured claims**: Present facts, stats, and comparisons in lists or tables rather than prose; AI models parse structured formats more reliably
- **Conversational keywords**: Optimize for natural-language queries (e.g., "how do I..." / "what is the best...") not just short-tail keywords
- **Unique perspective**: Provide original data, benchmarks, or opinions — AI models deprioritize content that merely restates other sources
- **Schema markup for AIO**: Use `FAQPage`, `HowTo`, and `Article` structured data; these feed directly into AI-generated answers
- **Topical depth**: Cover topics comprehensively on a single page rather than splitting across many thin pages; AI models prefer authoritative single-source answers
- **Citation-friendly formatting**: Use blockquotes, named sections, and definition-style patterns (`**Term**: definition`) so AI can attribute and quote cleanly
- **llms.txt**: Add a `/llms.txt` file at the site root describing your site, key pages, and content structure in plain text for AI crawlers

### Performance as SEO
- **Core Web Vitals**: LCP < 2.5s, INP < 200ms, CLS < 0.1
- **Static generation**: Prefer static pages; they score best for LCP
- **Image optimization**: Always use next/image; provide width/height to prevent CLS
- **Font optimization**: Use next/font to eliminate font-related CLS
