# Design Spec: Liquid Glass Integration & High-Contrast Backdrop

- **Date:** 2026-10-08
- **Topic:** Integration of `@glass-sdk/liquid-glass` in Flowlet and adding visible refraction backdrop

## 1. Objective

Integrate `@glass-sdk/liquid-glass` (v0.0.1) from [liquid-glass.glassapp.dev](https://liquid-glass.glassapp.dev/) into Flowlet to replace standard CSS glassmorphism with physics-based liquid glass refraction and rim highlights on key navigation chrome (desktop sidebar, mobile bottom tab bar, and dialog modals), remove the previous static background blur shapes, and add a high-contrast backdrop so the refraction effect is prominently visible.

## 2. Constraints & Rules

1. **Design Rules Compliance:** Zero gradients and zero emojis across `src/` and `README.md`. Strictly enforce via `npm run check:design`.
2. **Framework & SSR:** Flowlet uses Next.js 16 (App Router) and React 19. All WebGPU / Liquid Glass primitives must execute on the client side within `"use client"` components without disrupting Server Component streaming.
3. **Ponytail Principles:** Minimal code changes, reuse existing semantic links and buttons, avoid unnecessary wrappers or abstractions.
4. **Verification Gate:** Pass all tests (`npm run test`), type checks (`npm run typecheck`), design audits (`npm run check:design`), and production builds (`npm run build`).

## 3. Architecture & Component Structure

### 3.1 Dependencies & Global Styles
- Install `@glass-sdk/liquid-glass@~0.0.1`.
- Import `@glass-sdk/liquid-glass/styles.css` into `src/app/globals.css`.

### 3.2 High-Contrast Backdrop
- Remove the previous 3 static floating shape divs in `src/app/layout.tsx`.
- Introduce a visible, non-gradient geometric backdrop (using rich solid SVG palette elements or wallpaper styling) positioned fixed in the background of the layout. This ensures that when the user loads the app or scrolls, the liquid glass surfaces have distinct patterns and colors to refract through their lens.

### 3.3 AppShell (`src/components/AppShell.tsx`)
- AppShell is already a `"use client"` component.
- Wrap the main shell in `<GlassScene>`:
  - Designate `<main>` as `<GlassContent layout="flow">`, ensuring page content (cards, charts, transaction items) is continuously sampled as the live refracted layer.
  - Wrap the desktop `<aside>` in `<GlassSurface material="regular" radius={22}>`, preserving existing dimensions (`w-64`, sticky positioning, margin, padding) and all navigational links, logo, and sign-out button.
  - Wrap the mobile bottom `<nav>` in `<GlassSurface material="regular" radius={22}>`, preserving the 5-column grid layout, active indicator colors, and debt badges.

### 3.4 Dialog Overlays (`src/components/ui/Dialog.tsx`)
- In `src/components/ui/Dialog.tsx`, wrap the modal content container in `<GlassSurface material="regular" radius={22}>` to display liquid glass effects on modals.

## 4. Testing & Verification

1. Run `npm run check:design` to verify no gradients or emojis were introduced.
2. Run `npm run typecheck` to confirm TypeScript compatibility with React 19.
3. Run `npm run test` to ensure all 104 existing unit and component tests continue to pass.
4. Run `npm run build` to verify Next.js production compilation.
