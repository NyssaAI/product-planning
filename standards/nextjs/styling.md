## Styling Standards (Tailwind CSS)

### Tailwind CSS Configuration
- **Use Tailwind v4**: Configure via CSS-first configuration in `app/globals.css`
- **Design tokens**: Define custom colors, fonts, and spacing as Tailwind theme values
- **Dark mode**: Use `class` strategy if dark mode is needed; default to light-only for marketing
- **Container**: Configure `container` with centered and responsive padding

### Utility-First Approach
- **Prefer utilities**: Use Tailwind utility classes directly in JSX
- **Avoid @apply**: Only use `@apply` in rare cases for complex, repeated patterns
- **Component abstraction**: Extract repeated utility combinations into React components, not CSS classes
- **Responsive**: Use responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`)
- **Mobile-first**: Write base styles for mobile, add responsive prefixes for larger screens

### Responsive Design
- **Breakpoints**: Default Tailwind breakpoints (sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px)
- **Container widths**: Use `max-w-7xl` or `max-w-6xl` for content containers
- **Fluid typography**: Use `clamp()` for heading sizes or Tailwind fluid utilities
- **Grid layouts**: Use CSS Grid via Tailwind (`grid`, `grid-cols-*`) for page sections
- **Flexbox**: Use for component-level layout (`flex`, `items-center`, `justify-between`)

### Color System
- **Brand colors**: Define as CSS custom properties referenced in Tailwind theme
- **Semantic naming**: Use names like `primary`, `secondary`, `accent`, `muted`, not raw colors
- **Neutral scale**: Use Tailwind's built-in neutral/slate/gray scale for text and backgrounds
- **Consistent palette**: Limit to 3-5 brand colors plus neutrals

### Typography
- **Font stack**: Define heading and body font families via next/font
- **Scale**: Use a consistent type scale (Tailwind's default or custom)
- **Line height**: Use `leading-relaxed` or `leading-normal` for body text readability
- **Max width**: Limit prose line length with `max-w-prose` or `max-w-2xl`
- **Font weight**: Use a limited set of weights (regular, medium, semibold, bold)

### Spacing & Layout
- **Consistent spacing**: Use Tailwind spacing scale; avoid arbitrary values
- **Section spacing**: Use consistent vertical padding for page sections (`py-16 md:py-24`)
- **Component spacing**: Use `gap` in flex/grid layouts; prefer gap over margin
- **Max width**: Wrap content in centered containers with max-width constraints

### Component Styling Patterns
- **className prop**: Accept `className` prop on reusable components for composition
- **cn() utility**: Use a `cn()` helper (clsx + twMerge) for conditional and merged classes
- **Variants**: Use cva (class-variance-authority) or manual variant objects for component variants
- **No inline styles**: Use Tailwind utilities; reserve `style` prop for truly dynamic values only
