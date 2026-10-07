# Transactions Page Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full performance, UX, data integrity, and period summary improvements on the `/transactions` page and database schema while strictly adhering to AGENTS.md hard rules.

**Architecture:**
- Database: Add composite and partial index migration for transactions (`0005_transactions_indexes.sql`) and ensure migration files are tracked in version control.
- Server Components & Actions: Validate URL search params with Zod, escape ILIKE wildcards, eliminate query waterfalls by fetching profile cached data and `month_summary` RPC in parallel with categories/sources, and throw unhandled query errors to Next.js error boundaries. Hardened server actions to sanitize error messages and validate UUIDs.
- Client UI: Add a lightweight period summary bar (Income, Expense, Net) powered by `month_summary`, switch pagination to `limit + 1` hasMore detection, eliminate layout reflow animation lag by removing `layout` prop on `motion.li`, and prevent scroll jumping via `router.replace(url, { scroll: false })`.

**Tech Stack:** Next.js (App Router), Supabase Postgres, Tailwind CSS, Zod, Motion, Vitest, Testing Library.

## Global Constraints
- Cash-flow money is an integer (`bigint` in Postgres, integer in JS). Never use floats.
- No gradients and no emojis, anywhere. Enforced by `npm run check:design`.
- All schema changes go through migration files in `supabase/migrations/`.
- Validate all input on the server with Zod. Client-side validation is for UX only.
- Row Level Security is enabled on every table in the public schema with `user_id = auth.uid()`.
- Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` before declaring completion.

---

### Task 1: Un-ignore Supabase, Scripts, and Docs in Git

**Files:**
- Modify: `.gitignore:44-47`

- [ ] **Step 1: Update .gitignore**
Remove `/supabase`, `/scripts`, and `/docs` from `.gitignore` so schema migrations, performance/design scripts, and superpowers plans are properly versioned.

- [ ] **Step 2: Verify git status of supabase and scripts**
Run: `git status -s`
Expected: `supabase/migrations/`, `supabase/tests/`, `scripts/`, `docs/` appear as untracked files ready to be committed.

- [ ] **Step 3: Commit migration and script baselines**
Run: `git add .gitignore supabase/ scripts/ docs/ && git commit -m "chore: track supabase migrations, test scripts, and docs in git"`

---

### Task 2: Create Migration 0005 for Database Indexes

**Files:**
- Create: `supabase/migrations/0005_transactions_indexes.sql`

- [ ] **Step 1: Write migration 0005**
Add composite index covering `(user_id, date desc, created_at desc)` for efficient sorting, drop redundant `transactions_user_date_idx`, and add partial foreign key indexes for `category_id` and `source_id` to speed up restrict-checks on cascade deletes.

```sql
-- Migration 0005: Optimize transactions indexes
create index ifnot exists transactions_user_date_created_idx
  on public.transactions (user_id, date desc, created_at desc);

drop index if exists public.transactions_user_date_idx;

create index if not exists transactions_category_idx
  on public.transactions (category_id)
  where category_id is not null;

create index if not exists transactions_source_idx
  on public.transactions (source_id)
  where source_id is not null;
```

- [ ] **Step 2: Commit migration**
Run: `git add supabase/migrations/0005_transactions_indexes.sql && git commit -m "feat(db): add composite and partial indexes for transactions"`

---

### Task 3: Server Actions Hardening & Generic Errors

**Files:**
- Modify: `src/actions/transactions.ts:80-165`
- Test: `src/actions/transactions.test.ts`

**Interfaces:**
- `deleteTransaction(id: string): Promise<ActionResult>`: Validates UUID format with `z.string().uuid()` before querying database. Returns safe error string on failure rather than leaking raw Postgres error details.
- `createTransaction`, `updateTransaction`: Return safe friendly error messages on database failure.

- [ ] **Step 1: Write test for UUID validation and sanitized error on deleteTransaction**
In `src/actions/transactions.test.ts`:
```ts
it("rejects invalid transaction id on delete", async () => {
  const res = await deleteTransaction("invalid-uuid");
  expect(res.error).toBe("Invalid transaction ID");
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/actions/transactions.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement validation and error sanitization in `src/actions/transactions.ts`**
Add `const idSchema = z.string().uuid("Invalid transaction ID");` in `deleteTransaction`.
Sanitize `error.message` returns to user-safe messages like `"Failed to save transaction"` / `"Failed to delete transaction"`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/actions/transactions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
Run: `git add src/actions/transactions.ts src/actions/transactions.test.ts && git commit -m "fix(actions): sanitize errors and validate uuid in deleteTransaction"`

---

### Task 4: Transactions Page: SearchParams Validation, Escape Search, Parallel Fetching & Error Handling

**Files:**
- Modify: `src/app/(app)/transactions/page.tsx`
- Create/Modify: `src/lib/parse.ts` (helper for escaping ilike pattern and validating transaction search params)
- Test: `src/lib/parse.test.ts`

**Interfaces:**
- `escapeIlike(term: string): string`: Escapes `%` and `_` characters with backslashes so literal searches don't become wildcards.
- `parseTransactionFilters(params: Record<string, string | undefined>): ValidatedFilters`
- `TransactionsPage`:
  - Parallel step: `const [startDay, { data: categories, error: catErr }, { data: sources, error: srcErr }] = await Promise.all([getMonthStartDay(), ...])`
  - Fetch `month_summary(pYear, pMonth, startDay)` RPC.
  - Fetch transactions with `.limit(limit + 1)`. Determine `hasMore = txs.length > limit`, slice to `limit`.
  - Throw if any query error exists.

- [ ] **Step 1: Write unit tests for search query escaping and filter parsing**
In `src/lib/parse.test.ts`:
Test `escapeIlike` with `"100%"`, `"food_drink"`, `"normal text"`.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/lib/parse.test.ts`

- [ ] **Step 3: Implement `escapeIlike` in `src/lib/parse.ts`**
```ts
export function escapeIlike(str: string): string {
  return str.replace(/[%_\\]/g, "\\$&");
}
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/lib/parse.test.ts`

- [ ] **Step 5: Update `src/app/(app)/transactions/page.tsx`**
- Validate URL params with Zod:
  - `month`: regex `^\d{4}-(0[1-9]|1[0-2])$`
  - `limit`: clamped integer between 50 and 500 (default 50)
  - `type`: enum `["all", "income", "expense"]` (default "all")
  - `entityId`: regex UUID or undefined
- Parallelize profile `getMonthStartDay()` with categories, sources, and `month_summary`.
- Query transactions with `.limit(limit + 1)` and no `count: "exact"`.
- Compute `hasMore = transactions.length > limit`. If `hasMore`, `transactions.pop()`.
- Pass `summary` and `hasMore` to `TransactionList`.
- Check for errors and throw if database queries fail.

- [ ] **Step 6: Verify compilation**
Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 7: Commit**
Run: `git add src/lib/parse.ts src/lib/parse.test.ts src/app/\(app\)/transactions/page.tsx && git commit -m "feat(transactions): validate params, escape search, parallelize fetch, and load month summary"`

---

### Task 5: TransactionList UX & Period Summary Component

**Files:**
- Modify: `src/components/transactions/TransactionList.tsx`
- Test: `src/components/transactions/TransactionList.test.tsx`

**Interfaces:**
- `TransactionListProps`:
  ```ts
  export interface PeriodSummary {
    total_income: number;
    total_expense: number;
    net: number;
  }

  export interface TransactionListProps {
    initialTransactions: TransactionListItem[];
    categories: FilterOption[];
    sources: FilterOption[];
    currentPeriodLabel: string;
    hasMore: boolean;
    periodSummary?: PeriodSummary;
  }
  ```
- UX changes:
  - Add Period Summary Bar/Pill Cards under header: Total Income (+), Total Expenses (-), Net Balance. Respects privacy mode if toggled or standard IDR format.
  - In `handleLoadMore` & `updateFilters`: Use `router.replace(`${pathname}?${params.toString()}`, { scroll: false })` instead of `router.push`.
  - In transaction rows: Remove `layout` prop on `motion.li` to prevent expensive layout calculations on large lists.
  - "Load more" button shows if `hasMore` is true.

- [ ] **Step 1: Write component test for TransactionList**
Create `src/components/transactions/TransactionList.test.tsx` verifying:
- Renders period summary figures.
- Clicking "Load more" updates `limit` via `router.replace` without scrolling.
- Renders transaction list without crashing.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/components/transactions/TransactionList.test.tsx`

- [ ] **Step 3: Implement updates in `TransactionList.tsx`**
- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/components/transactions/TransactionList.test.tsx`

- [ ] **Step 5: Commit**
Run: `git add src/components/transactions/TransactionList.tsx src/components/transactions/TransactionList.test.tsx && git commit -m "feat(ui): add period summary cards, smooth pagination, and remove motion layout thrash"`

---

### Task 6: Final Verification & PLAN.md Update

**Files:**
- Modify: `PLAN.md`

- [ ] **Step 1: Run design rule audit**
Run: `npm run check:design`
Expected: 0 errors, 0 gradients, 0 emojis.

- [ ] **Step 2: Run linter**
Run: `npm run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Run TypeScript compiler check**
Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 4: Run Vitest test suite**
Run: `npm run test`
Expected: All tests pass.

- [ ] **Step 5: Run production build**
Run: `npm run build`
Expected: Next.js build passes cleanly.

- [ ] **Step 6: Update PLAN.md**
Document completed task T21 (Transactions Performance, Validation, and Period Summary Optimization).

- [ ] **Step 7: Final commit**
Run: `git add PLAN.md && git commit -m "docs: record T21 transactions improvements in PLAN.md"`
