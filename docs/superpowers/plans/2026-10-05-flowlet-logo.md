# Flowlet Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the official "Streamline Fluid F" logo for Flowlet across the application (vector component, sidebar, mobile header, login page, and static icon assets).

**Architecture:** Pure React SVG component (`src/components/ui/Logo.tsx`) with zero gradients and zero emojis, styled via Tailwind CSS and CSS variables. Integrates cleanly into AppShell and login screens with responsive sizing.

**Tech Stack:** Next.js (App Router), React, TypeScript strict, Tailwind CSS, Lucide icons, Vitest, Testing Library.

## Global Constraints

- Zero gradients and zero emojis anywhere (enforced by `npm run check:design`).
- Must pass `npm run lint`, `npm run typecheck`, `npx vitest run`, and `npm run build`.
- Strictly adhere to YAGNI and minimalist code principles (ponytail).
- SVG coordinates follow viewBox `0 0 64 64` with squircle `rx="16"`.

---

### Task 1: Static SVG Asset and Reusable Logo Component with Tests

**Files:**
- Create: `public/icon.svg`
- Test: `src/components/ui/Logo.test.tsx`
- Create: `src/components/ui/Logo.tsx`

**Interfaces:**
- Produces: `export function Logo({ size, className, showWordmark, showSubtitle, ariaLabel }: LogoProps): React.JSX.Element`

- [ ] **Step 1: Create static vector asset `public/icon.svg`**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" rx="16" fill="#1F5FBF"/>
  <rect x="18" y="16" width="7" height="32" rx="3.5" fill="#FFFFFF"/>
  <path d="M22 20C30 20 42 18 46 22C46.8 22.8 46 25 44 26C38 28.5 28 27 22 27V20Z" fill="#FFFFFF"/>
  <path d="M22 31C28 31 36 29.5 39 32.5C39.6 33.1 39 35 37.5 35.8C33 37.5 27 36.5 22 36.5V31Z" fill="#FFFFFF"/>
  <circle cx="43" cy="34" r="2.5" fill="#5FCB92"/>
</svg>
```

- [ ] **Step 2: Write unit test `src/components/ui/Logo.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Logo } from "./Logo";

describe("Logo", () => {
  it("renders the SVG mark with default size", () => {
    const { container } = render(<Logo />);
    const svg = container.querySelector("svg");
    expect(svg).toBeDefined();
    expect(svg?.getAttribute("width")).toBe("32");
    expect(svg?.getAttribute("height")).toBe("32");
  });

  it("renders with custom size", () => {
    const { container } = render(<Logo size={24} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("24");
    expect(svg?.getAttribute("height")).toBe("24");
  });

  it("renders wordmark and subtitle when enabled", () => {
    render(<Logo showWordmark showSubtitle />);
    expect(screen.getByText("Flowlet")).toBeDefined();
    expect(screen.getByText("Personal cash & assets")).toBeDefined();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/ui/Logo.test.tsx`
Expected: FAIL with "Cannot find module './Logo'"

- [ ] **Step 4: Implement `src/components/ui/Logo.tsx`**

```tsx
import React from "react";

export interface LogoProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
  showSubtitle?: boolean;
  ariaLabel?: string;
}

export function Logo({
  size = 32,
  className = "",
  showWordmark = false,
  showSubtitle = false,
  ariaLabel = "Flowlet logo",
}: LogoProps) {
  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label={ariaLabel}
      role="img"
    >
      <rect
        width="64"
        height="64"
        rx="16"
        className="fill-[var(--accent)]"
      />
      <rect x="18" y="16" width="7" height="32" rx="3.5" fill="#FFFFFF" />
      <path
        d="M22 20C30 20 42 18 46 22C46.8 22.8 46 25 44 26C38 28.5 28 27 22 27V20Z"
        fill="#FFFFFF"
      />
      <path
        d="M22 31C28 31 36 29.5 39 32.5C39.6 33.1 39 35 37.5 35.8C33 37.5 27 36.5 22 36.5V31Z"
        fill="#FFFFFF"
      />
      <circle cx="43" cy="34" r="2.5" fill="#5FCB92" />
    </svg>
  );

  if (!showWordmark) {
    return mark;
  }

  return (
    <div className="flex items-center gap-2.5">
      {mark}
      <div className="flex flex-col justify-center min-w-0">
        <span className="text-base font-semibold text-[var(--text)] tracking-tight leading-tight">
          Flowlet
        </span>
        {showSubtitle && (
          <span className="text-xs text-[var(--text-muted)] leading-tight mt-0.5">
            Personal cash & assets
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/ui/Logo.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add public/icon.svg src/components/ui/Logo.tsx src/components/ui/Logo.test.tsx
git commit -m "feat: add Flowlet logo component and icon asset"
```

---

### Task 2: Integrate Logo into AppShell and Login Page

**Files:**
- Modify: `src/components/AppShell.tsx`
- Modify: `src/components/AppShell.test.tsx`
- Modify: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `Logo` from `src/components/ui/Logo`

- [ ] **Step 1: Update `src/components/AppShell.tsx`**

Integrate `<Logo size={24} />` into mobile top header and `<Logo size={36} showWordmark showSubtitle />` into desktop sidebar.

- [ ] **Step 2: Update `src/app/login/page.tsx`**

Integrate `<Logo size={44} showWordmark showSubtitle />` into login page header.

- [ ] **Step 3: Run existing AppShell tests**

Run: `npx vitest run src/components/AppShell.test.tsx`
Expected: PASS (checks that "Flowlet" is rendered in both desktop sidebar and mobile header).

- [ ] **Step 4: Commit**

```bash
git add src/components/AppShell.tsx src/components/AppShell.test.tsx src/app/login/page.tsx
git commit -m "feat: integrate Flowlet logo in AppShell and login page"
```

---

### Task 3: Comprehensive Verification & Design Audit

**Files:**
- Modify: `PLAN.md`

- [ ] **Step 1: Run design rule audit**

Run: `npm run check:design`
Expected: 0 gradients, 0 emojis, PASS

- [ ] **Step 2: Run linter and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: PASS with 0 errors

- [ ] **Step 3: Run complete Vitest suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Run production build**

Run: `npm run build`
Expected: Successful build

- [ ] **Step 5: Update `PLAN.md` and commit**

Record completed Task T20 in `PLAN.md` and commit changes.
