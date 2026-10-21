# SpendTrack — Personal Expense Tracker (Implementation Spec)

This document is the single source of truth for building **SpendTrack**, a personal, offline-first expense tracking mobile app. Read it fully before writing code. Follow the build order in section 14 and the definition of done in section 15.

---

## 1. Overview

SpendTrack lets one person log everything they spend, quickly and daily, and then understand where the money goes. The user enters expenses manually. All data is stored on the device. There is no backend, no account, no login, and no network dependency.

**Primary user:** a single individual tracking their own spending, in India (default currency INR, `₹`).

**Core principles**
- Adding an expense must take under 5 seconds and as few taps as possible.
- Works fully offline. Never makes a network call.
- Data never leaves the device unless the user explicitly exports it.
- Money is stored as integers (paise), never floats.
- Simple, fast, and clean UI. No clutter.

---

## 2. Tech Stack

| Concern | Choice |
|---|---|
| Framework | React Native with **Expo** (latest stable SDK, managed workflow) |
| Language | **TypeScript** (`strict: true`) |
| Navigation | **expo-router** (file-based routing) with bottom tabs |
| Local database | **expo-sqlite** (SQLite, async API) |
| Settings storage | `@react-native-async-storage/async-storage` |
| State management | **Zustand** for UI and settings state; the database is the source of truth for expense data |
| Forms and validation | **react-hook-form** + **zod** |
| Dates | **date-fns** |
| Charts | **react-native-gifted-charts** + **react-native-svg** |
| Icons | `@expo/vector-icons` |
| Styling | React Native `StyleSheet` with a central theme module (colors, spacing, typography, radii). No heavy UI kit. |
| IDs | `expo-crypto` (`randomUUID`) |
| Notifications | **expo-notifications** (local, scheduled daily reminder) |
| Biometric lock | **expo-local-authentication** |
| File export / import | `expo-file-system`, `expo-sharing`, `expo-document-picker` |
| Haptics | `expo-haptics` |
| Build and release | **EAS Build** (Android APK for direct install; AAB optional) |
| Testing | **jest-expo**, **@testing-library/react-native** |
| Lint and format | ESLint (expo config) + Prettier |

Use `npx expo install <pkg>` for every Expo-related package so versions stay compatible with the installed SDK. Do not add libraries beyond this list without a clear reason.

---

## 3. Platform Targets

- **Android** is the primary target (installable APK).
- **iOS** should work from the same codebase with no Android-only code paths in shared logic. Platform-specific code must be isolated and guarded with `Platform.OS`.
- Minimum supported: whatever the current Expo SDK supports by default.
- Portrait orientation only.

---

## 4. Functional Requirements

### 4.1 Expense management
- **Add expense** with fields:
  - Amount (required, > 0, up to 2 decimal places)
  - Category (required)
  - Date (required, defaults to today, can be set to any past or future date)
  - Note (optional, free text, max 200 chars)
  - Payment method (optional): `Cash`, `UPI`, `Credit Card`, `Debit Card`, `Net Banking`, `Other`
- **Edit** any field of an existing expense.
- **Delete** an expense with an **Undo** snackbar (about 5 seconds) before it is permanently removed.
- **Duplicate** an expense (creates a copy dated today).
- **Quick add:** the Add screen opens with the amount field focused and the numeric keypad showing; the last-used category and payment method are pre-selected.
- **Recent notes suggestions:** while typing a note, suggest previous notes (autocomplete from past entries) and auto-fill the category if a past note maps to one.

### 4.2 Categories
- Ship with sensible defaults, each with an icon and color: Food, Groceries, Transport, Fuel, Bills & Utilities, Rent, Shopping, Entertainment, Health, Education, Travel, Subscriptions, Gifts, Personal Care, Other.
- Users can **create, rename, recolor, change the icon of, reorder, and archive** categories.
- Archiving hides a category from the picker but keeps it on past expenses. A category with expenses cannot be hard-deleted.
- "Other" cannot be removed or archived.

### 4.3 Home / Expense list
- Shows expenses grouped by day, newest first, with a **daily total** in each group header and friendly labels (Today, Yesterday, then the date).
- **Month switcher** at the top (previous / next month) showing the month's total.
- **Filters:** by category (multi-select), payment method, and amount range.
- **Search** by note text.
- Pull-to-refresh is not required (data is local) but the list must update immediately after any change.
- Tap an item to edit; swipe left to delete; long-press for duplicate.
- Smooth scrolling with a virtualized list (`FlatList` or `SectionList`) for thousands of rows.
- A prominent floating **"+"** button opens the Add screen.

### 4.4 Statistics / Insights
- **Month total** and **daily average**.
- **Comparison vs previous month** (amount and percentage change).
- **Category breakdown:** donut or pie chart plus a ranked list with amount and percentage.
- **Daily spending trend** for the selected month (bar or line chart).
- **Monthly trend** for the last 6 to 12 months.
- **Top 5 expenses** of the selected month.
- **Payment-method split.**
- Tapping a category in the breakdown opens the filtered expense list for that category and month.
- A date-range picker: This month, Last month, Last 3 months, This year, Custom range.

### 4.5 Budgets
- Set an **overall monthly budget** and optional **per-category monthly budgets**.
- Show progress bars on the Stats screen and Home header: spent, remaining, and percentage.
- Visual states: normal, warning at 80%, over budget at 100% or more.
- Send a local notification when spending crosses 80% and 100% of a budget (once per budget per month).

### 4.6 Recurring expenses
- Create recurring rules: amount, category, note, payment method, frequency (`daily`, `weekly`, `monthly`, `yearly`), start date, optional end date.
- On app launch and when returning to foreground, generate any due expenses up to today, exactly once each (idempotent, with no duplicates even if the app was closed for weeks).
- Generated expenses are marked as recurring and link back to their rule.
- Users can pause, edit, or delete rules. Editing or deleting a rule does not alter expenses that were already generated.
- Handle month-end correctly (a rule for the 31st runs on the last day of shorter months).

### 4.7 Reminders
- Optional **daily reminder** notification at a user-chosen time (default 9:00 PM) with text like "Did you log today's spending?".
- Request notification permission only when the user enables reminders. Handle denial gracefully.
- Rescheduling must survive app restarts and time changes.

### 4.8 Data export, import, backup
- **Export CSV** of all expenses or a chosen date range. Columns: `date, amount, category, payment_method, note`. Uses the system share sheet.
- **Export full backup (JSON)** containing expenses, categories, budgets, recurring rules, and settings, with a schema version number.
- **Import / restore from JSON backup** with validation, a confirmation dialog, and a choice of **merge** or **replace**. Reject malformed or newer-version files with a clear error.
- **Delete all data** option with a double confirmation.

### 4.9 Settings
- Currency symbol (default `₹`; selectable), with Indian digit grouping (`12,34,567.00`) when the locale is `en-IN`.
- Theme: Light, Dark, System.
- First day of the week.
- Month start day (for people whose "month" starts on the salary date, for example the 1st to the 31st by default).
- Daily reminder toggle and time.
- Biometric / device-credential app lock toggle.
- Manage categories, budgets, recurring rules.
- Export / import / delete data.
- About screen with the app version.

### 4.10 App lock
- Optional lock using device biometrics or device PIN via `expo-local-authentication`.
- Lock on cold start and when returning from background after a configurable timeout (immediately, 1 minute, 5 minutes).
- Provide a fallback so the user is never permanently locked out if biometrics are unavailable (use the device credential).

### 4.11 Onboarding
- A short first-launch flow: welcome, currency, optional monthly budget, optional reminder time, then home.
- Skippable. Never shown again after completion.

---

## 5. Non-Functional Requirements

- **Offline-first and private:** no analytics, no crash-reporting SDKs that transmit data, no network requests. Do not request the `INTERNET` permission beyond what Expo requires in development.
- **Performance:** cold start to interactive list under about 2 seconds on a mid-range Android phone; list scrolls at 60fps with 10,000 expenses; DB queries are indexed.
- **Reliability:** every DB write is wrapped in a transaction where multiple statements are involved; failures show a user-friendly error and never leave partial data.
- **Correctness of money:** store `amount_paise` as an `INTEGER`. Convert at the UI boundary only. Never use floating-point arithmetic for sums; sum integers in SQL or JS.
- **Accessibility:** all touch targets at least 44x44 dp, proper `accessibilityLabel`s, sufficient contrast in both themes, dynamic font scaling respected.
- **Dark mode:** all screens and charts must render properly in light and dark.
- **Error handling:** an error boundary at the app root; no silent failures.
- **Localization-ready:** all user-facing strings are in a single constants/strings module so they can be translated later. Format dates and numbers with `Intl`/`date-fns`, not by hand.
- **Safe-area handling** on every screen (notches, gesture bars); keyboard-avoiding behavior on forms.

---

## 6. Data Model (SQLite)

All timestamps are Unix epoch milliseconds. All `date` columns are `TEXT` in `YYYY-MM-DD` (local date, no timezone). All IDs are UUID strings.

```sql
CREATE TABLE categories (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  icon         TEXT NOT NULL,
  color        TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_default   INTEGER NOT NULL DEFAULT 0,
  archived     INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL
);

CREATE TABLE expenses (
  id             TEXT PRIMARY KEY,
  amount_paise   INTEGER NOT NULL CHECK (amount_paise > 0),
  category_id    TEXT NOT NULL REFERENCES categories(id),
  note           TEXT,
  payment_method TEXT,
  date           TEXT NOT NULL,
  recurring_id   TEXT REFERENCES recurring_rules(id) ON DELETE SET NULL,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_recurring ON expenses(recurring_id);

CREATE TABLE budgets (
  id            TEXT PRIMARY KEY,
  category_id   TEXT REFERENCES categories(id),  -- NULL = overall budget
  amount_paise  INTEGER NOT NULL CHECK (amount_paise > 0),
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  UNIQUE (category_id)
);

CREATE TABLE recurring_rules (
  id                    TEXT PRIMARY KEY,
  amount_paise          INTEGER NOT NULL CHECK (amount_paise > 0),
  category_id           TEXT NOT NULL REFERENCES categories(id),
  note                  TEXT,
  payment_method        TEXT,
  frequency             TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly','yearly')),
  start_date            TEXT NOT NULL,
  end_date              TEXT,
  last_generated_date   TEXT,
  active                INTEGER NOT NULL DEFAULT 1,
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL
);

CREATE TABLE budget_alerts (
  budget_id   TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  month       TEXT NOT NULL,           -- YYYY-MM
  threshold   INTEGER NOT NULL,        -- 80 or 100
  fired_at    INTEGER NOT NULL,
  PRIMARY KEY (budget_id, month, threshold)
);
```

**Migrations:** keep a `schema_version` using `PRAGMA user_version`. Implement an ordered, idempotent migration runner in `db/migrations/`. Never edit a shipped migration; add a new one. Enable `PRAGMA foreign_keys = ON` on every connection.

**Settings (AsyncStorage keys):** `currency`, `theme`, `weekStart`, `monthStartDay`, `reminderEnabled`, `reminderTime`, `lockEnabled`, `lockTimeout`, `onboardingDone`, `lastUsedCategoryId`, `lastUsedPaymentMethod`.

---

## 7. Architecture

Layered, simple, and testable:

1. **UI layer:** screens and components (`app/`, `components/`). No SQL in components.
2. **Hooks layer:** `hooks/` exposes data to the UI (`useExpenses(month, filters)`, `useStats(range)`, `useBudgets()`, etc.). Re-queries when data changes.
3. **Repository layer:** `db/repositories/` contains all SQL (`expenseRepo`, `categoryRepo`, `budgetRepo`, `recurringRepo`). Pure functions that take the DB handle.
4. **Services:** `services/` for cross-cutting logic (`recurringService`, `notificationService`, `exportService`, `importService`, `lockService`, `budgetAlertService`).
5. **Utils:** `utils/money.ts` (paise/rupee conversion and formatting), `utils/dates.ts`, `utils/csv.ts`, `utils/validation.ts`.

Use a lightweight change-notification mechanism (for example a Zustand "data version" counter bumped after writes) so lists and stats refresh after mutations.

---

## 8. Folder Structure

```
spendtrack/
├── app/
│   ├── _layout.tsx                 # root layout, providers, DB init, lock gate
│   ├── onboarding.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx             # bottom tabs
│   │   ├── index.tsx               # Home / expense list
│   │   ├── stats.tsx               # Insights
│   │   ├── budgets.tsx             # Budgets overview
│   │   └── settings.tsx
│   ├── add-expense.tsx             # modal; also used for edit via ?id=
│   ├── categories/
│   │   ├── index.tsx
│   │   └── edit.tsx
│   ├── recurring/
│   │   ├── index.tsx
│   │   └── edit.tsx
│   ├── export-import.tsx
│   └── lock.tsx
├── components/
│   ├── ExpenseItem.tsx
│   ├── DaySectionHeader.tsx
│   ├── CategoryPicker.tsx
│   ├── AmountInput.tsx
│   ├── MonthSwitcher.tsx
│   ├── BudgetProgress.tsx
│   ├── charts/ (CategoryDonut.tsx, DailyBars.tsx, MonthlyTrend.tsx)
│   ├── Snackbar.tsx
│   └── EmptyState.tsx
├── db/
│   ├── database.ts                 # open DB, pragma, init
│   ├── migrations/
│   ├── seed.ts                     # default categories
│   └── repositories/
├── hooks/
├── services/
├── store/                          # Zustand stores
├── constants/
│   ├── theme.ts
│   ├── strings.ts
│   └── categories.ts
├── utils/
├── __tests__/
├── app.json
├── eas.json
├── tsconfig.json
└── package.json
```

---

## 9. Screens and Navigation

**Bottom tabs:** Home, Stats, Budgets, Settings. The Add Expense screen is a modal opened from the Home FAB (and optionally a center tab button).

| Screen | Purpose |
|---|---|
| Onboarding | First-launch setup |
| Home | Month switcher, month total, budget summary, filters and search, grouped expense list, FAB |
| Add / Edit Expense | Amount (large), category chips/grid, date picker, note with suggestions, payment method, Save |
| Stats | Range selector, totals, comparison, charts, top expenses |
| Budgets | Overall and per-category budgets with progress, set and edit |
| Settings | All preferences and entry points to management screens |
| Categories | List, reorder, add, edit, archive |
| Recurring | List of rules, add, edit, pause, delete |
| Export / Import | CSV export, JSON backup, restore, delete all |
| Lock | Shown when app lock is enabled and the session is locked |

Every list screen needs a meaningful **empty state** and a **loading state**.

---

## 10. Business Rules and Edge Cases

- Amount input accepts digits and one decimal separator only; max 2 decimals; reject 0, negatives, and values over 99,99,99,999 (about 1 billion rupees).
- Rounding: parse user input to paise using string math or `Math.round(parsed * 100)`; never accumulate float error.
- A month is defined by the user's `monthStartDay` (default 1). All "this month" queries must respect it.
- The expense date may be in the future (for planned expenses), but those are visually marked and excluded from "spent so far" when the date is after today.
- Deleting a category that has expenses: only archive. Deleting one with none: hard delete allowed.
- Recurring generation must be idempotent: use `last_generated_date` plus a uniqueness check (`recurring_id` + `date`) so repeated launches never duplicate entries.
- Import with **merge** must skip rows whose `id` already exists; with **replace** it must wipe tables inside a single transaction.
- Backup JSON must include a `version` field; the importer must handle older versions via migration functions.
- Budget alerts fire at most once per budget, month, and threshold (tracked in `budget_alerts`).
- All date logic uses the device's local timezone and avoids off-by-one errors around midnight and DST.

---

## 11. UI / UX Guidelines

- Clean, minimal, card-based design; generous spacing; one accent color with per-category colors for data.
- Amount is the visual hero on Add and in list rows.
- Use haptic feedback on save and delete.
- Animations should be subtle (list item add/remove, progress bars); respect the OS "reduce motion" setting.
- Currency display: `₹1,234.50`, with Indian grouping when `en-IN`.
- Negative or over-budget states use a clear warning color, never color alone (add an icon or text).
- Consistent iconography via `@expo/vector-icons`.

---

## 12. Permissions

Request permissions only when needed and explain why:
- **Notifications:** when enabling the daily reminder or budget alerts.
- **Biometrics:** when enabling app lock.
- No contacts, location, camera, microphone, SMS, or storage permissions are required.

---

## 13. Build, Config, and Release

- `app.json`: set `name: "SpendTrack"`, `slug: "spendtrack"`, a unique Android `package` (for example `com.<yourname>.spendtrack`), `orientation: "portrait"`, `userInterfaceStyle: "automatic"`, an icon, and a splash screen.
- `eas.json` profiles:
  - `development`: development client, internal distribution.
  - `preview`: **APK** (`android.buildType: "apk"`), internal distribution, for direct install on the user's phone.
  - `production`: AAB for store release (optional).
- Provide npm scripts: `start`, `android`, `ios`, `lint`, `typecheck`, `test`, `build:apk` (`eas build -p android --profile preview`).
- Include a `README.md` with setup steps, how to run in Expo Go, how to build the APK, and how backups work.

---

## 14. Build Order

Implement in this order, committing after each step and keeping the app runnable throughout:

1. **Project setup:** create the Expo TypeScript project, install the dependencies, configure ESLint, Prettier, `tsconfig` strict mode, path aliases, theme, and the folder structure.
2. **Database layer:** connection, pragmas, migrations, schema, seed default categories, repositories, and unit tests for the repositories and money utilities.
3. **Core expense flow:** Add/Edit screen, Home list grouped by day, delete with undo, duplicate, month switcher.
4. **Categories management** and the category picker.
5. **Filters and search** on Home.
6. **Stats screen:** totals, comparison, category donut, daily and monthly charts, top expenses, range picker.
7. **Budgets:** model, UI, progress, and alerts.
8. **Recurring expenses:** rules UI and the idempotent generator service.
9. **Settings, theme, currency formatting, and month-start/week-start options.**
10. **Reminders** (notification service).
11. **Export / import / backup / delete all.**
12. **App lock.**
13. **Onboarding.**
14. **Polish:** empty states, loading and error states, accessibility pass, dark-mode pass, animations, haptics.
15. **Testing and build:** unit and component tests, EAS preview APK build, README.

---

## 15. Definition of Done

The work is complete when all of the following hold:

- Every requirement in sections 4 and 5 is implemented and reachable from the UI.
- `npm run typecheck`, `npm run lint`, and `npm test` all pass with no errors.
- Tests exist for: money conversion and formatting, date and month-range logic (including `monthStartDay`), recurring generation (idempotency, month-end), budget threshold logic, CSV generation, and backup import/export round-trip.
- The app works with airplane mode on, with no network calls anywhere in the code.
- Light and dark themes both render correctly on every screen.
- Seeding 10,000 expenses does not noticeably degrade list scrolling or stats loading.
- An installable APK builds successfully via EAS using the `preview` profile.
- The README documents setup, run, build, and backup/restore.

---

## 16. Instructions for the Implementing Agent

- Work through the build order step by step; do not skip ahead or leave stubs.
- Prefer small, focused files and pure functions that are easy to test.
- Do not introduce a backend, authentication, or any cloud service.
- Do not store money as floating-point values anywhere.
- When a requirement is ambiguous, pick the simplest option consistent with the principles in section 1 and note the decision in the README.
- Keep all user-facing strings in `constants/strings.ts`.
- After each major step, run typecheck, lint, and tests, and fix failures before continuing.
