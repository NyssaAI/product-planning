## Animation & Interaction Patterns

### General Principles
- **Purpose**: Every animation must serve a purpose -- guide attention, provide feedback, or convey hierarchy
- **Performance**: Use `transform` and `opacity` for animations; they are GPU-accelerated
- **Reduced motion**: Always provide a `prefers-reduced-motion` fallback
- **Subtlety**: Marketing animations should feel polished, not distracting; keep durations short

### CSS Transitions (Preferred for Simple Effects)
- **Hover/focus states**: Use Tailwind `transition-*` utilities for color, opacity, transform changes
- **Duration**: 150-300ms for UI interactions; 300-500ms for entrance animations
- **Easing**: Use `ease-out` for entrances, `ease-in` for exits, `ease-in-out` for ongoing
- **Properties**: Transition specific properties, not `all`, for performance

### Framer Motion (For Complex Animations)
- **Client Components only**: Framer Motion requires `'use client'`
- **Layout animations**: Use `layout` prop for shared layout transitions
- **Scroll-triggered**: Use `whileInView` for scroll-reveal animations
- **Stagger children**: Use `staggerChildren` in parent variants for sequential reveals
- **Exit animations**: Use `AnimatePresence` for unmount animations

### Scroll Animations
- **Fade up on scroll**: Standard pattern for marketing sections entering viewport
- **Parallax**: Use sparingly; implement with CSS `transform` or Framer Motion scroll progress
- **Intersection Observer**: Use for triggering animations; Framer Motion handles this via `whileInView`
- **Threshold**: Trigger when 10-20% of element is visible for natural feel

### Reduced Motion
- **CSS**: Use `@media (prefers-reduced-motion: reduce)` to disable transitions and animations
- **Framer Motion**: Check `useReducedMotion()` hook; set animations to instant
- **Never disable functionality**: Remove motion but keep state changes functional
- **Tailwind**: Use `motion-safe:` and `motion-reduce:` variants

### Common Marketing Animation Patterns
- **Hero entrance**: Fade + slight upward slide for hero text and CTA (300-500ms, staggered)
- **Section reveal**: Fade in sections as they scroll into view (400ms, ease-out)
- **Card hover**: Subtle lift with shadow increase on hover (200ms)
- **Button interactions**: Scale slightly on hover (1.02-1.05), press effect on active (0.98)
- **Counter/stat animation**: Animate numbers counting up when visible
- **Logo marquee**: Continuous horizontal scroll for partner/client logos
