## Accessibility Standards (WCAG 2.1 AA)

### Semantic HTML
- **Landmarks**: Use `<header>`, `<nav>`, `<main>`, `<footer>`, `<aside>`, `<section>`
- **Headings**: Maintain strict hierarchy (h1 > h2 > h3); never skip levels
- **Lists**: Use `<ul>`/`<ol>` for groups of related items (nav links, feature lists)
- **Buttons vs Links**: `<button>` for actions, `<a>` for navigation; never use `<div onClick>`
- **Forms**: Every input must have an associated `<label>` with matching `htmlFor`

### Keyboard Navigation
- **Tab order**: Ensure logical tab order follows visual reading order
- **Focus indicators**: Provide visible focus styles; never remove `outline` without replacement
- **Skip link**: Include "Skip to main content" link as first focusable element
- **Escape key**: Close modals, menus, and overlays with Escape key
- **Arrow keys**: Support arrow key navigation in menus and tab interfaces
- **Focus trapping**: Trap focus inside modals when open; restore on close

### Color & Contrast
- **Normal text**: Minimum 4.5:1 contrast ratio against background
- **Large text**: Minimum 3:1 contrast ratio (18px+ or 14px+ bold)
- **UI components**: Minimum 3:1 contrast for interactive element boundaries
- **No color-only information**: Always pair color with text, icons, or patterns
- **Dark mode**: If supported, verify contrast ratios in both themes

### Images & Media
- **Alt text**: Descriptive alt for informational images; empty `alt=""` for decorative images
- **Complex images**: Use `aria-describedby` pointing to a longer description
- **Video**: Provide captions and transcripts
- **Autoplay**: Never autoplay video with sound; provide pause controls
- **Reduced motion**: Respect `prefers-reduced-motion` for all animations

### ARIA Usage
- **Prefer semantic HTML**: Use ARIA only when native semantics are insufficient
- **Live regions**: Use `aria-live="polite"` for dynamic content updates (form errors, notifications)
- **Expanded/collapsed**: Use `aria-expanded` on FAQ accordions and dropdown triggers
- **Current page**: Use `aria-current="page"` on active navigation links
- **Labels**: Use `aria-label` or `aria-labelledby` for elements without visible text
- **Hidden**: Use `aria-hidden="true"` on decorative elements exposed to screen readers

### Interactive Patterns
- **Mobile menu**: Must be keyboard accessible with focus trapping
- **Accordions**: Toggle with Enter/Space; use `aria-expanded` and `aria-controls`
- **Carousels**: Provide previous/next buttons; pause autoplay; announce slide changes
- **Modals**: Trap focus; close on Escape; return focus to trigger on close
- **Tooltips**: Accessible via hover and focus; use `role="tooltip"` and `aria-describedby`

### Testing
- **axe-core**: Run automated accessibility checks in development and CI
- **Keyboard-only testing**: Navigate every page using only keyboard
- **Screen reader testing**: Test with VoiceOver (macOS) or NVDA (Windows)
- **Lighthouse accessibility**: Maintain 90+ score in Lighthouse accessibility audit
