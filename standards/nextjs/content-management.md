## Content Management Patterns

### MDX for Content Pages
- **Blog posts**: Use MDX files in `content/blog/` with frontmatter for metadata
- **Frontmatter**: Include title, description, date, author, image, tags, published status
- **Components in MDX**: Import and use React components in MDX for rich content (callouts, tabs, code blocks)
- **Remote MDX**: Use `next-mdx-remote` for CMS-stored MDX content
- **Local MDX**: Use `@next/mdx` or file-system based approach for static content

### Frontmatter Schema
- **Required fields**: title, description, date, slug
- **Optional fields**: author, image, tags, category, published, updatedDate
- **Validate**: Use Zod or similar to validate frontmatter at build time
- **Type safety**: Generate TypeScript types from frontmatter schema

### Headless CMS Integration
- **API layer**: Create a typed API client in `lib/cms.ts` for CMS queries
- **Type generation**: Generate TypeScript types from CMS schema
- **Preview mode**: Implement draft/preview mode for content editors
- **Revalidation**: Use on-demand revalidation via CMS webhooks
- **Fallback**: Handle missing content gracefully with fallback UI

### Content Modeling
- **Pages**: Title, slug, sections (array of block types), SEO metadata
- **Blog posts**: Title, slug, body (rich text/MDX), author, date, category, tags
- **Authors**: Name, bio, avatar, social links
- **Navigation**: Menu items with label, href, children (nested menus)
- **Site settings**: Brand name, logo, social links, default SEO

### Static Content Patterns
- **Constants file**: Store site-wide content (navigation, footer links) in `lib/constants.ts`
- **Feature data**: Define feature lists, pricing plans, FAQ items as typed arrays
- **Type the content**: Use TypeScript interfaces for all content structures
- **Single source of truth**: Avoid duplicating content across components

### Image Content
- **CMS images**: Use CMS image URLs with next/image `loader` or `remotePatterns`
- **Remote patterns**: Configure `images.remotePatterns` in next.config.ts for CMS domains
- **Responsive images**: Provide `sizes` prop based on layout breakpoints
- **Placeholder images**: Use blurred placeholders from CMS or generated at build time
