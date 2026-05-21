## Next.js App Router Standards

### Route Structure
- **App Directory**: All routes live under `app/`
- **Colocation**: Place components, styles, and utilities next to routes that use them
- **Route Groups**: Use `(group)` folders for layout organization without URL impact
- **Dynamic Routes**: Use `[slug]` for content pages, `[...slug]` for catch-all routes
- **Parallel Routes**: Use `@slot` for complex layouts (modals, sidebars)

### File Conventions
- **page.tsx**: Route UI entry point; export default component
- **layout.tsx**: Shared layout wrapper; receives `children` prop
- **loading.tsx**: Suspense fallback for route segments
- **error.tsx**: Error boundary with `'use client'` directive
- **not-found.tsx**: Custom 404 page per route segment
- **opengraph-image.tsx**: Dynamic OG image generation

### Server vs Client Components
- **Default to Server Components**: All components are Server Components unless marked otherwise
- **Use `'use client'` sparingly**: Only for interactive components (forms, modals, animations, event handlers)
- **Push `'use client'` to leaves**: Keep it as deep in the tree as possible
- **No hooks in Server Components**: useState, useEffect, etc. require `'use client'`
- **Pass Server Data Down**: Fetch data in Server Components, pass as props to Client Components

### Data Fetching
- **Server Components**: Use `async` components with direct `fetch()` or database calls
- **No getServerSideProps/getStaticProps**: These are Pages Router patterns; do not use
- **Cache Control**: Use `fetch()` options or `unstable_cache` for caching strategies
- **Static Generation**: Default behavior; pages are statically generated at build time
- **Dynamic Rendering**: Use `dynamic = 'force-dynamic'` or `cookies()`/`headers()` when needed

### Layouts
- **Root Layout**: Must include `<html>` and `<body>` tags; configure fonts and metadata here
- **Nested Layouts**: Use for section-specific chrome (marketing layout vs blog layout)
- **No Re-rendering**: Layouts do not re-render on navigation; state is preserved
- **Template vs Layout**: Use `template.tsx` only when you need re-initialization on navigation

### Project Structure
```
app/
  (marketing)/
    page.tsx              # Homepage
    about/page.tsx        # About page
    pricing/page.tsx      # Pricing page
    contact/page.tsx      # Contact page
    layout.tsx            # Marketing layout with header/footer
  (blog)/
    blog/
      page.tsx            # Blog listing
      [slug]/page.tsx     # Blog post
    layout.tsx            # Blog layout
  layout.tsx              # Root layout (fonts, metadata, analytics)
  not-found.tsx           # Global 404
  sitemap.ts              # Dynamic sitemap
  robots.ts               # Robots.txt
components/
  ui/                     # Reusable UI primitives (Button, Card, Badge)
  marketing/              # Marketing-specific components (Hero, CTA, Testimonial)
  layout/                 # Layout components (Header, Footer, Navigation)
lib/
  utils.ts                # Utility functions
  constants.ts            # Site-wide constants
  types.ts                # Shared TypeScript types
content/
  blog/                   # MDX blog posts
  pages/                  # MDX page content (optional)
public/
  images/                 # Static images
  fonts/                  # Local font files (if not using next/font Google)
```
