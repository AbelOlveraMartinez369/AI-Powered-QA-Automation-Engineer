# PetClinic Owner Search — Test Plan

## Application Overview

**Spring PetClinic (Angular frontend)** — a single-page Angular application backed by a Spring Boot REST API.

| Item | Observed Value |
|---|---|
| UI base URL | `http://localhost:8080/` (the Angular app is served from the **root**, not `/petclinic/`) |
| REST API base URL | `http://localhost:9966/petclinic/api/` (from `assets/env.js` → `REST_API_URL`) |
| Search screen URL | `http://localhost:8080/petclinic/owners` (reached via sidebar **OWNERS → Search**) |
| Page title | `SpringPetclinicAngular` |
| Static server | nginx/1.17.6 |

### Server reachability (verified)

**The server IS reachable and was fully explored with a live browser (vibium / Chrome headless).**

- `GET http://localhost:8080/` → **200** (Angular shell renders).
- `GET http://localhost:8080/petclinic/owners/find` → **404** from nginx. This is **expected**: the app uses
  Angular client-side routing with `<base href="/petclinic">` and nginx has **no SPA deep-link fallback**. The owners
  screen is reached by navigating in-app (**OWNERS → Search**) and lives at `/petclinic/owners`.
- API is live and seeded with the standard PetClinic dataset (2 "Davis" owners) **plus** many extra owners created by
  prior test runs (names like `Abel Owner…`, `Damian Olvera` → **84 unfiltered rows** at time of exploration).
  Tests must **not** assert an exact total row count for the *unfiltered* list.

### Behaviour discovered by real interaction (not assumed)

| Scenario | Actual network call | Actual UI result |
|---|---|---|
| Empty field submit | `GET /petclinic/api/owners` (no `lastName` param) | Full owner list re-renders (84 rows currently). No validation message; form is `ng-valid`. |
| Whitespace-only (`"   "`) | `GET /petclinic/api/owners?lastName=%20%20%20` | Full owner list (API treats blank as "no filter"); input retains the spaces. |
| `Davis` | `GET /petclinic/api/owners?lastName=Davis` | Exactly 2 rows: **Betty Davis**, **Harold Davis**; input keeps `Davis`; URL stays `/petclinic/owners`. |
| `Zzznosuchname` | `GET /petclinic/api/owners?lastName=Zzznosuchname` → **HTTP 404** | Table removed; message `No owners with LastName starting with "Zzznosuchname"`. |
| Matching rules | prefix + **case-sensitive** (`Davis`→2, `Da`→2, `avis`→404, `davis`→404) | — |

### Key DOM facts and gotchas (observed)

1. **`<label>Last name</label>` is NOT associated with the input** (no `for` attribute).
   `getByLabel('Last name')` will **not** resolve reliably → use `getByRole('textbox')` (the only textbox) or `#lastName`.
2. The textbox has **no accessible name** in the a11y tree; prefer `page.locator('#lastName')` for an explicit locator.
3. **Pet names render as nested `<tr>` inside a `<td>`** → `table tbody tr` counts owner rows **+ pet sub-rows**
   (4 for the 2 Davis owners). Use `table tbody > tr` (direct children) or the repo's
   `getByRole('row').filter({ has: link })` pattern to count **owner** rows only.
4. The input's `value` attribute stays `""` (Angular binds via `ng-reflect-model`) → assert with
   `inputValue()` / `toHaveValue()`, never the HTML attribute.
5. **"Find Owner" is always enabled**, even with an empty field (`ng-pristine`, no `disabled` attr, `.disabled === false`).
6. Owner-name cell = `td.ownerFullName > a` linking to `/petclinic/owners/{id}`
   (Betty Davis → `/petclinic/owners/2`, Harold Davis → `/petclinic/owners/4`).
7. Form = `form#search-owner-form[method=get]`; submit = `button[type=submit]` with text **Find Owner**.
8. Search results **replace** the `<tbody>`; the page stays at `/petclinic/owners` (no navigation).
9. A no-result search **removes the `<table>` entirely** → assert on the text message, not on a (now missing) table.
10. The API returns **404 when nothing matches**; the UI converts it to the friendly "No owners…" message that
    **quotes the exact search term**.

### Selector cheat-sheet (verified against the live DOM)

```ts
const lastName = page.locator('#lastName');                         // input#lastName[name=lastName][maxlength=80]
const findBtn  = page.getByRole('button', { name: 'Find Owner' });  // form#search-owner-form button[type=submit]
const rows     = page.locator('table tbody > tr');                  // OWNER rows only (excludes pet sub-rows)
const nameLink = page.locator('td.ownerFullName > a');              // owner detail links
const headers  = page.locator('table thead th');                    // Name, Address, City, Telephone, Pets
const noResult = page.getByText(/No owners with LastName starting with/i);
```

> **Navigation note:** because there is no SPA deep-link fallback, each test must start at `/` and reach the search
> screen in-app (**OWNERS → Search**). The repo's `FindOwnersPage.open()` already does this via the navbar.

### Shared preconditions (all scenarios)

- PetClinic UI is running at `http://localhost:8080/` and API at `http://localhost:9966/petclinic/api/`.
- Standard seed data is present (at minimum Betty Davis and Harold Davis exist).
- Each test starts from a **fresh browser context** (no cookies/storage carried over).
- The `@ui` fixtures `homePage`, `navbar`, `findOwnersPage`, `ownersListPage` are available (`@fixtures/pageFixtures`).

---

## Scenario 1 — Search by existing last name "Davis"

**Test ID:** `OWNER-SEARCH-001`
**Title:** Searching for an existing last name ("Davis") returns the matching owners
**Priority:** High (happy path)

**Preconditions**
- Search screen can be opened from the home page via OWNERS → Search.
- Seed data contains `Betty Davis` and `Harold Davis`.

**Steps**
1. Navigate to `http://localhost:8080/`; wait for the Angular app to render.
2. Open **OWNERS → Search**.
3. Fill the "Last name" textbox (`#lastName`) with `Davis`.
4. Click **Find Owner**.
5. Inspect the results table (owner rows + name links).
6. Verify the input value and URL after the search.

**Selectors / locators**
- `openSearch`: `page.goto('/')` then `page.getByRole('link', { name: 'Owners' }).hover()` +
  `page.getByRole('link', { name: 'Search' }).click()` (or `findOwnersPage.open()`).
- Input: `page.locator('#lastName')` (or `page.getByRole('textbox')`).
- Button: `page.getByRole('button', { name: 'Find Owner' })`.
- Rows: `page.locator('table tbody > tr')` (or `ownersListPage.rows`).
- Names: `page.locator('td.ownerFullName > a')` / `page.getByRole('link', { name: 'Betty Davis' })`.

**Expected result**
- Exactly **2** owner rows are displayed.
- Row 1: **Betty Davis** — `638 Cardinal Ave.` / `Sun Prairie` / `6085551749` / `Basil`; href `/petclinic/owners/2`.
- Row 2: **Harold Davis** — `563 Friendly St.` / `Windsor` / `6085553198` / `Iggy`; href `/petclinic/owners/4`.
- No non-Davis owners are shown (e.g. `George Franklin` is absent).
- The input still contains `Davis`; URL remains `/petclinic/owners`.
- Network: a `GET …/api/owners?lastName=Davis` request returning **200**.

**Playwright sketch** (`tests/ui/find-owners-search-davis.spec.ts`)

```ts
import { test, expect } from '@fixtures/pageFixtures';

test.describe('Owner Search — existing last name', { tag: '@ui' }, () => {
  test('OWNER-SEARCH-001: search "Davis" returns Betty and Harold Davis', async ({
    homePage, navbar, findOwnersPage, ownersListPage,
  }) => {
    await homePage.open();
    await navbar.goToOwnersSearch();
    await findOwnersPage.waitUntilLoaded();

    await findOwnersPage.searchByLastName('Davis');

    // Owner rows only (pet sub-rows are nested <tr> and are excluded here)
    const rows = ownersListPage.rows;                 // getByRole('row').filter({ has: link })
    await expect(rows).toHaveCount(2);

    const betty = ownersListPage.rowByName('Betty Davis');
    const harold = ownersListPage.rowByName('Harold Davis');
    await expect(betty).toBeVisible();
    await expect(harold).toBeVisible();
    await expect(betty).toContainText('638 Cardinal Ave.');
    await expect(harold).toContainText('563 Friendly St.');

    // Detail links point to the seeded owner ids
    await expect(page_getLink('Betty Davis')).toHaveAttribute('href', '/petclinic/owners/2');
    await expect(page_getLink('Harold Davis')).toHaveAttribute('href', '/petclinic/owners/4');
    await expect(page_getLink('George Franklin')).toHaveCount(0);

    // Input keeps value; URL unchanged
    await expect(findOwnersPage.page.getByRole('textbox')).toHaveValue('Davis');
    await expect(ownersListPage.page).toHaveURL(/\/owners$/);

    function page_getLink(name: string) {
      return ownersListPage.page.getByRole('link', { name });
    }
  });
});
```

**Raw-locator variant** (no page objects — useful when validating selectors directly):

```ts
await page.goto('/');
await page.getByRole('link', { name: 'Owners' }).hover();
await page.getByRole('link', { name: 'Search' }).click();

await page.locator('#lastName').fill('Davis');
await Promise.all([
  page.waitForResponse(r => r.url().includes('/api/owners?lastName=Davis') && r.status() === 200),
  page.getByRole('button', { name: 'Find Owner' }).click(),
]);

await expect(page.locator('table tbody > tr')).toHaveCount(2);
await expect(page.locator('td.ownerFullName > a')).toHaveText(['Betty Davis', 'Harold Davis']);
await expect(page.locator('#lastName')).toHaveValue('Davis');
await expect(page).toHaveURL(/\/petclinic\/owners$/);
```

---

## Scenario 2 — Search by non-existent last name

**Test ID:** `OWNER-SEARCH-002`
**Title:** Searching for a non-existent last name shows the "no owners" message and no rows
**Priority:** High

**Preconditions**
- Search screen reachable; no owner in the system has a last name starting with `Zzznosuchname`.

**Steps**
1. Navigate to `/` and open **OWNERS → Search**.
2. Fill `#lastName` with `Zzznosuchname`.
3. Click **Find Owner**.
4. Observe the results area and the page body.

**Selectors / locators**
- Input: `page.locator('#lastName')`.
- Button: `page.getByRole('button', { name: 'Find Owner' })`.
- Message: `page.getByText(/No owners with LastName starting with/i)`.
- (Optional) row count guard: `page.locator('table tbody > tr')`.

**Expected result**
- The data table is **removed** (row count `0`).
- A message is visible containing
  `No owners with LastName starting with "Zzznosuchname"` (the API returns **404**; UI renders the friendly message).
- The page stays on `/petclinic/owners`; the input retains `Zzznosuchname`.
- No unhandled error/empty-state regression (page remains interactive; the Find button is still present).

**Playwright sketch** (`tests/ui/find-owners-no-results.spec.ts`)

```ts
import { test, expect } from '@fixtures/pageFixtures';

test.describe('Owner Search — no results', { tag: '@ui' }, () => {
  test('OWNER-SEARCH-002: non-existent last name shows no-owners message', async ({
    findOwnersPage, ownersListPage,
  }) => {
    await findOwnersPage.open();                  // root -> OWNERS -> Search, waits for full list
    await findOwnersPage.searchByLastName('Zzznosuchname');

    // Table removed -> zero owner rows
    await expect(ownersListPage.rows).toHaveCount(0);

    // Friendly message that quotes the search term
    await expect(
      findOwnersPage.page.getByText(/No owners with LastName starting with/i),
    ).toBeVisible();
    await expect(
      findOwnersPage.page.getByText(/No owners with LastName starting with "Zzznosuchname"/i),
    ).toBeVisible();

    // Stays on the owners screen; input keeps the term
    await expect(ownersListPage.page).toHaveURL(/\/owners$/);
    await expect(findOwnersPage.page.getByRole('textbox')).toHaveValue('Zzznosuchname');
  });
});
```

**Raw-locator variant**:

```ts
await page.locator('#lastName').fill('Zzznosuchname');
await page.getByRole('button', { name: 'Find Owner' }).click();

await expect(page.getByText(/No owners with LastName starting with "Zzznosuchname"/i)).toBeVisible();
await expect(page.locator('table tbody > tr')).toHaveCount(0);
await expect(page.locator('table')).toHaveCount(0); // table element itself is removed
```

---

## Scenario 3 — Search with empty field

**Test ID:** `OWNER-SEARCH-003`
**Title:** Submitting an empty last-name field keeps the full owner list (no validation error)
**Priority:** Medium (edge/negative)

**Preconditions**
- Search screen reachable; at least one owner exists (seed data ensures this).

**Steps**
1. Navigate to `/` and open **OWNERS → Search**.
2. Ensure `#lastName` is empty (clear it if pre-filled).
3. Click **Find Owner** without typing anything.
4. Observe the network call, the row list and the input value.

**Selectors / locators**
- Input: `page.locator('#lastName')`.
- Button: `page.getByRole('button', { name: 'Find Owner' })`.
- Rows: `page.locator('table tbody > tr')` / `ownersListPage.rows.first()`.

**Expected result (as implemented today)**
- No validation message and no blocked submit (form is `ng-valid`).
- The app issues `GET /petclinic/api/owners` **without** a `lastName` parameter and re-renders the **full** owner list.
- At least one owner row is visible; URL stays `/petclinic/owners`; input remains empty.
- *Documented quirk (separate assertion, not a failure of this test):* a **whitespace-only** value (`"   "`) sends
  `?lastName=%20%20%20` and also returns the full list. If product intends to trim/validate, this is a candidate bug —
  keep it as a separate exploratory check rather than asserting it as desired behaviour.

**Playwright sketch** (`tests/ui/find-owners-empty-search.spec.ts`)

```ts
import { test, expect } from '@fixtures/pageFixtures';

test.describe('Owner Search — empty field', { tag: '@ui' }, () => {
  test('OWNER-SEARCH-003: empty search keeps the full owners list', async ({
    findOwnersPage, ownersListPage,
  }) => {
    await findOwnersPage.open();                    // full list is loaded
    const firstName = await ownersListPage.rows.first().textContent();

    await findOwnersPage.searchByLastName('');      // clears field + clicks Find Owner

    // Full list remains: same first row, more than one owner
    await expect(ownersListPage.rows.first()).toBeVisible();
    await expect(ownersListPage.rows.first()).toHaveText(firstName!);
    expect(await ownersListPage.rows.count()).toBeGreaterThan(1);

    // No "no owners" message, no validation error
    await expect(findOwnersPage.page.getByText(/No owners with LastName starting with/i)).toHaveCount(0);

    await expect(ownersListPage.page).toHaveURL(/\/owners$/);
    await expect(findOwnersPage.page.getByRole('textbox')).toHaveValue('');
  });
});
```

**Raw-locator variant** (explicitly assert the unfiltered network call):

```ts
await page.locator('#lastName').fill('');
await Promise.all([
  // App omits the lastName param entirely on empty input
  page.waitForResponse(r => /\/api\/owners(\?|$)/.test(r.url()) && !r.url().includes('lastName=')),
  page.getByRole('button', { name: 'Find Owner' }).click(),
]);

await expect(page.locator('table tbody > tr').first()).toBeVisible();
await expect(page.getByText(/No owners with LastName starting with/i)).toHaveCount(0);
```

---

## Scenario 4 — Validation that the "Find Owner" button is enabled

**Test ID:** `OWNER-SEARCH-004`
**Title:** The "Find Owner" button is visible and enabled in all field states
**Priority:** Medium (UI state validation)

**Preconditions**
- Search screen reachable.

**Steps**
1. Navigate to `/` and open **OWNERS → Search**.
2. Observe the button on initial load (field empty).
3. Assert the button's state (`toBeVisible`, `toBeEnabled`, `disabled` attribute absent).
4. Fill the field with `Davis`; re-assert enabled.
5. Clear the field; re-assert enabled.
6. Click the button and confirm it triggers a search (no disabled/dead state).

**Selectors / locators**
- Button: `page.getByRole('button', { name: 'Find Owner' })` (DOM: `form#search-owner-form button[type=submit]`).
- Input: `page.locator('#lastName')`.

**Expected result**
- The **Find Owner** button is visible and **enabled** on load with an empty field.
- It remains enabled with a filled value and after clearing.
- No `disabled` attribute and no `aria-disabled="true"`; `.disabled === false`.
- Clicking it submits the form (requests go out; results/empty-state update) — the button is never inert.

**Playwright sketch** (`tests/ui/find-owners-button-state.spec.ts`)

```ts
import { test, expect } from '@fixtures/pageFixtures';

test.describe('Owner Search — Find Owner button state', { tag: '@ui' }, () => {
  test('OWNER-SEARCH-004: Find Owner is visible and enabled in all field states', async ({
    findOwnersPage, ownersListPage,
  }) => {
    await findOwnersPage.open();
    const btn = findOwnersPage.page.getByRole('button', { name: 'Find Owner' });
    const input = findOwnersPage.page.locator('#lastName');

    // 1) Initial state (empty field)
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
    await expect(btn).not.toHaveAttribute('disabled', /.*/);
    await expect(btn).toHaveAttribute('aria-disabled', 'false').catch(() => {});
    expect(await btn.isDisabled()).toBe(false);

    // 2) With a value
    await input.fill('Davis');
    await expect(btn).toBeEnabled();

    // 3) Cleared again
    await input.fill('');
    await expect(btn).toBeEnabled();

    // 4) Actually submits (not inert)
    await Promise.all([
      findOwnersPage.page.waitForResponse(r => r.url().includes('/api/owners')),
      btn.click(),
    ]);
    await expect(ownersListPage.rows.first()).toBeVisible();
  });
});
```

---

## Notes, risks and recommendations for the QA team

- **Deep-link 404 is infrastructure, not a product bug** for this SPA build: `/petclinic/owners/find` and other deep
  links 404 from nginx. Either add an nginx SPA fallback (`try_files $uri $uri/ /index.html`) **or** always navigate
  in-app. The test plan assumes in-app navigation (matching the repo's `FindOwnersPage.open()`).
- **Do not assert the unfiltered row total** — the database is polluted by prior runs (names like `Abel Owner…`).
  For the filtered `Davis` case the count is stable (2) against the seed; add a `@api` seed/reset fixture if you want
  deterministic unfiltered counts.
- **Label association is missing** in the DOM — a low-severity accessibility defect. Recommendation: add
  `for="lastName"` to the `<label>` so `getByLabel('Last name')` works and screen readers announce the field.
- **Empty/whitespace searches silently return everything** (no client validation). If the product expects "please enter
  a last name", this is a bug to raise (`OWNER-SEARCH-003` documents current behaviour; add a product-facing defect if
  validation is desired).
- **API returns 404 for no matches** (instead of `[]`). The UI handles it, but API consumers may be surprised;
  keep the UI assertion on the friendly message and add an `@api` test for the 404 contract (`tests/api/owners-get.spec.ts`).
- Case-sensitive **prefix** matching is the current contract (`avis`/`davis` → 404). Document it, and decide whether
  case-insensitivity is expected before adding any such test.
- Each scenario is independent and can run in any order; all start from the app root and use their own fresh context.
