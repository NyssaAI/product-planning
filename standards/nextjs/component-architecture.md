## Component Architecture for Marketing Sites

### Component Hierarchy
- **UI Primitives**: Button, Badge, Card, Input, Container -- reusable across the site
- **Marketing Blocks**: Hero, CTA, Testimonials, Features, Pricing, FAQ -- compose primitives
- **Layout Components**: Header, Footer, Navigation, MobileMenu -- site structure
- **Page Sections**: Full composed sections that combine blocks with content

### Naming Conventions
- **PascalCase filenames**: Match component name to filename (`HeroSection.tsx`)
- **Props interface**: Name as `{ComponentName}Props` (e.g., `HeroSectionProps`)
- **Export default**: Use named exports for components; default export only in `page.tsx`

### Component Design Rules
- **Props over hardcoded content**: All text, images, and links should be configurable via props
- **Sensible defaults**: Provide default values for optional props
- **Composition with children**: Use `children` and slots over deeply nested prop objects
- **Variant props**: Use discriminated unions or string literals for component variants
- **No business logic**: Marketing components should be purely presentational

### Marketing Block Patterns

#### Hero Section
- Heading (h1), subheading, CTA button(s), optional media (image/video)
- Support both left-aligned and centered layouts
- Background variants: solid color, gradient, image, video

#### Call-to-Action (CTA)
- Headline, description, primary button, optional secondary button
- Standalone and inline variants
- Support light and dark backgrounds

#### Feature Grid
- Heading, optional description, grid of feature cards
- Each card: icon, title, description
- Support 2, 3, or 4 column layouts

#### Testimonials
- Quote text, author name, author role/company, optional avatar
- Single testimonial, carousel, and grid layouts
- Optional star rating

#### Pricing Table
- Plan name, price, billing period, feature list, CTA button
- Highlight recommended plan
- Support monthly/annual toggle

#### FAQ
- Question/answer pairs
- Accordion expand/collapse pattern
- Support structured data (FAQPage schema)

### Props Pattern
```typescript
// Use discriminated unions for variant-based components
interface HeroSectionProps {
  heading: string;
  subheading?: string;
  cta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  alignment?: 'left' | 'center';
  background?: 'light' | 'dark' | 'gradient';
}
```

### Server vs Client Split
- **Server Components**: Hero, Features, Testimonials, Footer -- static content
- **Client Components**: FAQ accordion, pricing toggle, mobile menu, form elements, carousels
- **Pattern**: Create a Server Component wrapper that passes data to a small Client Component for interactivity
