# Skill: ui-smoke-test

Invoke after every major UI milestone using Playwright CLI.
Tests run against the local development server.

## Prerequisites
```bash
# Ensure dev servers are running
make dev  # or check individual services

# Ensure Playwright is installed
npx playwright install chromium --with-deps
```

## Creator UI Smoke Tests (apps/web — localhost:3000)

Run the creator journey smoke test:
```bash
npx playwright test tests/e2e/creator-smoke.spec.ts --reporter=list
```

Routes to verify:
```
[ ] / (root) → redirects to /dashboard or /onboarding if not auth'd
[ ] /onboarding → form renders, required fields present
[ ] /dashboard → project list loads, "New Project" CTA visible
[ ] /projects/new → goal intake form with all fields, submit button present
[ ] /projects/[id] → run status visible, current step indicator present
[ ] /projects/[id]/history → past runs list renders
```

## Admin UI Smoke Tests (apps/admin — localhost:3001)

Run the admin journey smoke test:
```bash
npx playwright test tests/e2e/admin-smoke.spec.ts --reporter=list
```

Routes to verify:
```
[ ] /admin/dashboard → metrics cards render, no JS errors
[ ] /admin/runs → list with search/filter/pagination renders
[ ] /admin/runs/[id] → event timeline renders with audit events
[ ] /admin/approvals → queue renders (empty state graceful)
[ ] /admin/policies → policy config form renders
[ ] /admin/budgets → cost dashboard with usage bars renders
[ ] /admin/audit → audit event timeline with search renders
```

## What to Verify at Each Route
```
[ ] Page loads without uncaught JavaScript errors (check console)
[ ] Primary call-to-action is visible and not disabled
[ ] Loading states appear when data is fetching
[ ] Empty states render gracefully (not blank/broken)
[ ] No console errors at WARN or ERROR level
[ ] ARIA accessibility: no major violations (use axe-playwright check)
[ ] Auth redirect works if not authenticated
```

## Run Interactive Mode (for debugging)
```bash
npx playwright test tests/e2e/ --ui
```

## Record New Smoke Test
```bash
# Record interactions for a new route
npx playwright codegen http://localhost:3000/dashboard
# Copy generated test to tests/e2e/creator-smoke.spec.ts
```

## View Test Report
```bash
npx playwright show-report
```

## Sample Smoke Test Structure
```typescript
// tests/e2e/creator-smoke.spec.ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Creator UI Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up auth cookie/token for test user
    await page.context().addCookies([{ name: 'test-token', value: getTestToken(), url: 'http://localhost:3000' }])
  })

  test('dashboard loads with project list', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('h1')).toContainText('Projects')
    await expect(page.locator('[data-testid="new-project-btn"]')).toBeVisible()
    
    // Accessibility check
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toHaveLength(0)
  })

  test('goal intake form has all required fields', async ({ page }) => {
    await page.goto('/projects/new')
    await expect(page.locator('textarea[name="goal"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    // No JS errors
    expect(page.on('pageerror', err => { throw new Error(err.message) }))
  })
})
```

## Record Results
After running, add to docs/EXECUTION_LOG.md:
```
[{timestamp}] UI Smoke Test: {N} passed, {N} failed | Creator routes: {status} | Admin routes: {status}
```
